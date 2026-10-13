using Application.Common.Exceptions;
using Application.Common.Time;
using Application.DTOs.Catalog;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Catalog;
using Application.Mappings.Catalog;
using Domain.Entities.Cms.Demos;
using Domain.Entities.Cms.DemoVisits;
using Domain.Entities.Cms.Industries;
using Domain.Enums.Cms.Demos;
using Domain.Enums.Cms.DemoVisits;
using Infrastructure.Implementations.Services.Demos;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Catalog;

/// <summary>
/// API công khai của danh mục (UC-01, UC-02, FR-27). Chỉ demo đang hiển thị (BR-01), đúng thứ tự BR-04,
/// ánh xạ qua <see cref="CatalogMappings"/> nên không lộ trường nội bộ (BR-10).
/// </summary>
public sealed class CatalogService(
    IGenericRepository<DemoEntity> demos,
    IGenericRepository<Industry> industries,
    IGenericRepository<DemoSlugHistory> slugHistories,
    IGenericRepository<DemoVisit> visits,
    IGenericRepository<DemoVisitStat> visitStats,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : ICatalogService
{
    /// <summary>FR-09: tối đa 3 demo cùng ngành.</summary>
    private const int RelatedMax = 3;

    public async Task<IReadOnlyList<PublicIndustry>> GetIndustriesAsync(CancellationToken ct = default)
    {
        var counts = await demos.QueryNoTracking()
            .WhereListed()
            .GroupBy(d => d.IndustryId)
            .Select(g => new { IndustryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.IndustryId, x => x.Count, ct);

        var list = await industries.QueryNoTracking().ToListAsync(ct);
        return list
            .Where(i => counts.ContainsKey(i.Id))
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Code)
            .Select(i => i.ToPublicIndustry(counts[i.Id]))
            .ToList();
    }

    public async Task<IReadOnlyList<PublicDemoCard>> GetDemosAsync(CancellationToken ct = default)
    {
        var listed = await ListedDemos().ToListAsync(ct);
        return DemoCatalogOrder.Sort(listed).Select(d => d.ToPublicCard()).ToList();
    }

    public async Task<PublicDemoLookup> GetDemoAsync(string slug, CancellationToken ct = default)
    {
        var key = DemoQueries.NormalizeSlug(slug);
        var demo = await demos.QueryNoTracking()
            .Include(d => d.Industry)
            .Include(d => d.Screenshots)
            .Include(d => d.Accounts)
            .AsSplitQuery()
            .FirstOrDefaultAsync(d => d.Slug == key, ct);

        if (demo is null)
        {
            // BR-06: slug cũ chuyển hướng tới slug mới nếu demo còn hiển thị.
            var target = await slugHistories.QueryNoTracking()
                .Where(h => h.Slug == key)
                .Join(demos.QueryNoTracking().WhereListed(), h => h.DemoId, d => d.Id, (h, d) => d.Slug)
                .FirstOrDefaultAsync(ct);
            return target is not null
                ? new PublicDemoLookup { RedirectSlug = target }
                : throw new NotFoundException(DemoQueries.NotFoundMessage);
        }

        if (!demo.IsListed)
            throw new NotFoundException(DemoQueries.NotFoundMessage);

        // FR-09: demo công khai khác cùng nhóm, thứ tự BR-04.
        var sameIndustry = await ListedDemos()
            .Where(d => d.IndustryId == demo.IndustryId && d.Id != demo.Id && d.DevStatus != DemoDevStatus.DangLam)
            .ToListAsync(ct);
        var related = DemoCatalogOrder.Sort(sameIndustry).Take(RelatedMax).Select(d => d.ToPublicCard()).ToList();

        return new PublicDemoLookup { Demo = demo.ToPublicDetail(related) };
    }

    public async Task<RecordVisitResult> RecordVisitAsync(string slug, RecordVisitRequest request, VisitSource source, CancellationToken ct = default)
    {
        var key = DemoQueries.NormalizeSlug(slug);
        var demoId = await demos.QueryNoTracking()
            .WhereListed()
            .Where(d => d.Slug == key)
            .Select(d => (Guid?)d.Id)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(DemoQueries.NotFoundMessage);

        // BR-14: không tính người đang đăng nhập và bot.
        if (source.HasAuthorization || VisitMetrics.IsBot(source.UserAgent))
            return new RecordVisitResult { Counted = false };

        // BR-14: cùng trình duyệt, cùng demo, cùng loại trong 30 phút chỉ tính 1 lượt.
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var visitorId = request.VisitorId.Trim();
        var since = now - DemoVisit.DedupeWindow;
        var duplicated = await visits.AnyAsync(
            v => v.DemoId == demoId && v.VisitorId == visitorId && v.Type == request.Type && v.OccurredAt > since,
            ct);
        if (duplicated)
            return new RecordVisitResult { Counted = false };

        // Cộng thẳng vào dòng tổng hợp của ngày (giờ Việt Nam) bằng câu UPDATE nguyên tử; chưa có dòng thì thêm mới.
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, VietnamTime.Zone));
        DemoVisitStat? newStat = null;
        if (await IncrementStatAsync(demoId, date, request.Type, request.Device, now, ct) == 0)
        {
            newStat = DemoVisitStat.Create(demoId, date);
            newStat.Add(request.Type, request.Device);
            await visitStats.AddAsync(newStat, ct);
        }

        await visits.AddAsync(DemoVisit.Create(demoId, request.Type, visitorId, request.Device, request.Referrer, now), ct);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (DbUpdateException) when (newStat is not null)
        {
            // Hai lượt đầu tiên trong ngày đến cùng lúc: request kia vừa thêm dòng (DemoId, Date) trước, vướng unique.
            // Bỏ dòng mới, cộng vào dòng đã có rồi lưu lại sự kiện thô.
            visitStats.Delete(newStat);
            if (await IncrementStatAsync(demoId, date, request.Type, request.Device, now, ct) == 0)
                throw;

            await unitOfWork.SaveChangesAsync(ct);
        }

        return new RecordVisitResult { Counted = true };
    }

    /// <summary>
    /// Cộng một lượt vào dòng tổng hợp đã có của ngày bằng một câu UPDATE (không đọc rồi ghi nên không mất lượt khi
    /// nhiều request cùng lúc). Cùng quy tắc với <see cref="DemoVisitStat.Add"/>. Trả số dòng đã cập nhật (0 hoặc 1).
    /// </summary>
    private Task<int> IncrementStatAsync(Guid demoId, DateOnly date, VisitType type, VisitDevice device, DateTime now, CancellationToken ct)
    {
        var row = visitStats.Query().Where(s => s.DemoId == demoId && s.Date == date);
        DateTime? updatedAt = now;
        if (type == VisitType.Open)
        {
            return row.ExecuteUpdateAsync(
                set => set.SetProperty(s => s.Opens, s => s.Opens + 1).SetProperty(s => s.UpdatedAt, updatedAt),
                ct);
        }

        return device == VisitDevice.Mobile
            ? row.ExecuteUpdateAsync(
                set => set.SetProperty(s => s.Views, s => s.Views + 1)
                    .SetProperty(s => s.MobileViews, s => s.MobileViews + 1)
                    .SetProperty(s => s.UpdatedAt, updatedAt),
                ct)
            : row.ExecuteUpdateAsync(
                set => set.SetProperty(s => s.Views, s => s.Views + 1)
                    .SetProperty(s => s.DesktopViews, s => s.DesktopViews + 1)
                    .SetProperty(s => s.UpdatedAt, updatedAt),
                ct);
    }

    /// <summary>Demo đang hiển thị kèm nhóm ngành và ảnh (đủ để dựng thẻ).</summary>
    private IQueryable<DemoEntity> ListedDemos() =>
        demos.QueryNoTracking()
            .WhereListed()
            .Include(d => d.Industry)
            .Include(d => d.Screenshots)
            .AsSplitQuery();
}
