using Application.Common.Exceptions;
using Application.DTOs.Demos;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Demos;
using Application.Interfaces.Services.Roles;
using Application.Interfaces.Services.Uploads;
using Application.Mappings.Demos;
using Domain.Entities.Cms.Demos;
using Domain.Entities.Cms.Industries;
using Domain.Enums.Cms.Demos;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Demos;

/// <summary>
/// Quản lý demo (UC-03, UC-05, UC-07, UC-08). Quy tắc trên một demo nằm trong entity <see cref="DemoEntity"/>;
/// service lo phần cần đọc DB: trùng số thứ tự, mã dự án, slug (kể cả slug cũ), số demo nổi bật, quyền nội bộ.
/// </summary>
public sealed class DemoManagementService(
    IGenericRepository<DemoEntity> demos,
    IGenericRepository<Industry> industries,
    IGenericRepository<DemoSlugHistory> slugHistories,
    IGenericRepository<DemoStatusHistory> statusHistories,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    IPermissionService permissionService,
    IFileStorage fileStorage,
    TimeProvider timeProvider) : IDemoManagementService
{
    private DateTime Now => timeProvider.GetUtcNow().UtcDateTime;

    /// <summary>Tên đăng nhập người thao tác, ghi vào lịch sử trạng thái.</summary>
    private string ChangedByName => currentUser.Username ?? "hệ thống";

    public async Task<IReadOnlyList<DemoListItem>> GetListAsync(CancellationToken ct = default)
    {
        var withInternal = await CanViewInternalAsync(ct);
        var list = await demos.QueryNoTracking()
            .Include(d => d.Industry)
            .Include(d => d.Screenshots)
            .AsSplitQuery()
            .ToListAsync(ct);

        list.Sort(DemoCatalogOrder.CompareAdmin);
        return list.Select(d => d.ToListItem(withInternal)).ToList();
    }

    public async Task<DemoSummary> GetSummaryAsync(CancellationToken ct = default)
    {
        var rows = await demos.QueryNoTracking()
            .Select(d => new { d.DevStatus, d.IsVisible, d.IsFeatured })
            .ToListAsync(ct);

        return new DemoSummary
        {
            Total = rows.Count,
            MoiTao = rows.Count(r => r.DevStatus == DemoDevStatus.MoiTao),
            DangLam = rows.Count(r => r.DevStatus == DemoDevStatus.DangLam),
            DemoDuoc = rows.Count(r => r.DevStatus == DemoDevStatus.DemoDuoc),
            HoanThien = rows.Count(r => r.DevStatus == DemoDevStatus.HoanThien),
            Visible = rows.Count(r => r.IsVisible && r.DevStatus != DemoDevStatus.MoiTao),
            Featured = rows.Count(r => r.IsFeatured),
            FeaturedMax = DemoRules.FeaturedMax
        };
    }

    public async Task<NextNumberResult> GetNextNumberAsync(CancellationToken ct = default)
    {
        var max = await demos.QueryNoTracking().MaxAsync(d => (int?)d.Number, ct) ?? 0;
        return new NextNumberResult { Number = Math.Min(max + 1, DemoRules.NumberMax) };
    }

    public async Task<DemoDetail> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var demo = await demos.QueryNoTracking().WithDetails().FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException(DemoQueries.NotFoundMessage);
        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task<DemoDetail> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var key = DemoQueries.NormalizeSlug(slug);
        var demo = await demos.QueryNoTracking().WithDetails().FirstOrDefaultAsync(d => d.Slug == key, ct);
        if (demo is null)
        {
            // Slug cũ (BR-06) vẫn mở được trang xem trước của demo hiện tại.
            var demoId = await slugHistories.QueryNoTracking()
                .Where(h => h.Slug == key)
                .Select(h => (Guid?)h.DemoId)
                .FirstOrDefaultAsync(ct);
            if (demoId is not null)
                demo = await demos.QueryNoTracking().WithDetails().FirstOrDefaultAsync(d => d.Id == demoId, ct);
        }

        // Endpoint đã yêu cầu demos.view-internal nên luôn kèm thông tin nội bộ.
        return demo?.ToDetail(withInternal: true) ?? throw new NotFoundException(DemoQueries.NotFoundMessage);
    }

    public async Task<DemoDetail> CreateAsync(CreateDemoRequest request, CancellationToken ct = default)
    {
        var projectCode = request.ProjectCode?.Trim() ?? string.Empty;
        await EnsureUniqueAsync(request, currentId: null, projectCode, ct);

        var demo = DemoEntity.Create(projectCode, request.ToContent(), ChangedByName, Now);
        await demos.AddAsync(demo, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task<DemoDetail> UpdateAsync(Guid id, SaveDemoRequest request, CancellationToken ct = default)
    {
        var demo = await LoadForUpdateAsync(id, ct);
        await EnsureUniqueAsync(request, id, projectCode: null, ct);

        demo.Update(request.ToContent(), Now);
        await unitOfWork.SaveChangesAsync(ct);

        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var demo = await LoadForUpdateAsync(id, ct);
        demo.EnsureCanBeDeleted();

        var uploadedUrls = demo.Screenshots.Select(s => s.Url).ToList();
        demos.Delete(demo);
        await unitOfWork.SaveChangesAsync(ct);

        // Ảnh mẫu (/seed/...) do FE phục vụ, IFileStorage tự bỏ qua; chỉ xóa file đã tải lên.
        foreach (var url in uploadedUrls)
            await fileStorage.DeleteAsync(url, ct);
    }

    public async Task<DemoDetail> ChangeStatusAsync(Guid id, ChangeStatusRequest request, CancellationToken ct = default)
    {
        var demo = await LoadForUpdateAsync(id, ct);

        // BR-11: lùi bậc cần lý do; báo tại ô lý do để FE gắn lỗi.
        if (DemoRules.IsBackward(demo.DevStatus, request.Status) && !DemoRules.IsValidReason(request.Reason))
            throw FieldErrors.Single("reason", DemoRules.ReasonMessage);

        if (demo.ChangeStatus(request.Status, request.Reason, ChangedByName, Now))
            await unitOfWork.SaveChangesAsync(ct);

        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task<DemoDetail> SetVisibilityAsync(Guid id, SetVisibilityRequest request, CancellationToken ct = default)
    {
        var demo = await LoadForUpdateAsync(id, ct);
        demo.SetVisibility(request.IsVisible, Now);
        await unitOfWork.SaveChangesAsync(ct);

        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task<DemoDetail> SetFeaturedAsync(Guid id, SetFeaturedRequest request, CancellationToken ct = default)
    {
        var demo = await LoadForUpdateAsync(id, ct);
        var otherFeatured = await demos.QueryNoTracking().CountAsync(d => d.Id != id && d.IsFeatured, ct);

        demo.SetFeatured(request.IsFeatured, otherFeatured);
        await unitOfWork.SaveChangesAsync(ct);

        return demo.ToDetail(await CanViewInternalAsync(ct));
    }

    public async Task ReorderAsync(ReorderDemosRequest request, CancellationToken ct = default)
    {
        var ids = request.Ids ?? [];
        var all = await demos.Query().ToListAsync(ct);
        var unique = ids.ToHashSet();
        if (unique.Count != ids.Count || ids.Count != all.Count || all.Any(d => !unique.Contains(d.Id)))
            throw FieldErrors.Single("ids", "Danh sách sắp xếp phải gồm đủ mọi demo, tải lại trang rồi thử lại");

        // BR-18: đánh lại thứ tự toàn bộ danh sách thành 10, 20, 30… theo vị trí mới.
        var byId = all.ToDictionary(d => d.Id);
        for (var i = 0; i < ids.Count; i++)
            byId[ids[i]].SetSortOrder(DemoRules.SortOrderAt(i));

        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<StatusHistoryItem>> GetStatusHistoryAsync(Guid id, CancellationToken ct = default)
    {
        if (!await demos.AnyAsync(d => d.Id == id, ct))
            throw new NotFoundException(DemoQueries.NotFoundMessage);

        var items = await statusHistories.QueryNoTracking()
            .Where(h => h.DemoId == id)
            .ToListAsync(ct);

        return items
            .OrderByDescending(h => h.ChangedAt)
            .ThenByDescending(h => h.CreatedAt)
            .Select(h => h.ToItem())
            .ToList();
    }

    private async Task<DemoEntity> LoadForUpdateAsync(Guid id, CancellationToken ct) =>
        await demos.Query().WithDetails().FirstOrDefaultAsync(d => d.Id == id, ct)
        ?? throw new NotFoundException(DemoQueries.NotFoundMessage);

    /// <summary>
    /// Nhóm ngành phải tồn tại (400, <c>errors.industryId</c>). BR-05, BR-06, BR-09: số thứ tự, mã dự án (khi thêm),
    /// slug không trùng demo khác và không trùng slug cũ của demo khác; trùng thì 409 kèm <c>errors.{trường}</c>
    /// (QUY-UOC-API §1.3), báo trường trùng đầu tiên theo thứ tự trên form: số thứ tự, mã dự án, slug.
    /// </summary>
    private async Task EnsureUniqueAsync(SaveDemoRequest request, Guid? currentId, string? projectCode, CancellationToken ct)
    {
        if (!await industries.AnyAsync(i => i.Id == request.IndustryId, ct))
            throw FieldErrors.Single("industryId", "Chọn nhóm ngành");

        var number = (short)request.Number;
        if (await demos.AnyAsync(d => d.Number == number && d.Id != currentId, ct))
            throw new ConflictException($"Số thứ tự {request.Number:00} đã được dùng", "number");

        if (projectCode is not null && await demos.AnyAsync(d => d.ProjectCode == projectCode, ct))
            throw new ConflictException("Mã dự án đã tồn tại", "projectCode");

        var slug = DemoQueries.NormalizeSlug(request.Slug);
        if (await demos.AnyAsync(d => d.Slug == slug && d.Id != currentId, ct)
            || await slugHistories.AnyAsync(h => h.Slug == slug && h.DemoId != currentId, ct))
        {
            throw new ConflictException("Slug đã được dùng cho demo khác", "slug");
        }
    }

    private Task<bool> CanViewInternalAsync(CancellationToken ct) =>
        DemoQueries.CanViewInternalAsync(currentUser, permissionService, ct);
}
