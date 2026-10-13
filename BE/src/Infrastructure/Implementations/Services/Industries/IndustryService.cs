using Application.Common.Exceptions;
using Application.DTOs.Industries;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Industries;
using Application.Mappings.Industries;
using Domain.Entities.Cms.Industries;
using Domain.Enums.Cms.Demos;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Industries;

/// <summary>Quản lý nhóm ngành (UC-09, FR-25, FR-26, BR-13).</summary>
public sealed class IndustryService(
    IGenericRepository<Industry> industries,
    IGenericRepository<DemoEntity> demos,
    IUnitOfWork unitOfWork) : IIndustryService
{
    private const string NotFoundMessage = "Không tìm thấy nhóm ngành";

    public async Task<IReadOnlyList<IndustryDto>> GetListAsync(CancellationToken ct = default)
    {
        var counts = await CountDemosAsync(null, ct);
        var list = await industries.QueryNoTracking().ToListAsync(ct);
        return list
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Code)
            .Select(i => ToDto(i, counts))
            .ToList();
    }

    public async Task<IndustryDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var industry = await industries.QueryNoTracking().FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new NotFoundException(NotFoundMessage);
        return ToDto(industry, await CountDemosAsync(id, ct));
    }

    public async Task<IndustryDto> CreateAsync(SaveIndustryRequest request, CancellationToken ct = default)
    {
        await EnsureUniqueAsync(request, null, ct);

        var maxSort = await industries.QueryNoTracking().MaxAsync(i => (int?)i.SortOrder, ct) ?? 0;
        var industry = Industry.Create(request.Code, request.Name, request.Slug, request.Icon, request.Color, request.Description, maxSort + 1);
        await industries.AddAsync(industry, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return industry.ToDto(0, 0);
    }

    public async Task<IndustryDto> UpdateAsync(Guid id, SaveIndustryRequest request, CancellationToken ct = default)
    {
        var industry = await industries.GetByIdAsync(id, ct) ?? throw new NotFoundException(NotFoundMessage);
        await EnsureUniqueAsync(request, id, ct);

        industry.Update(request.Code, request.Name, request.Slug, request.Icon, request.Color, request.Description);
        await unitOfWork.SaveChangesAsync(ct);

        return ToDto(industry, await CountDemosAsync(id, ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var industry = await industries.GetByIdAsync(id, ct) ?? throw new NotFoundException(NotFoundMessage);

        // BR-13: không xóa nhóm còn demo.
        Industry.EnsureCanBeDeleted(await demos.QueryNoTracking().CountAsync(d => d.IndustryId == id, ct));

        industries.Delete(industry);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task ReorderAsync(ReorderIndustriesRequest request, CancellationToken ct = default)
    {
        var ids = request.Ids ?? [];
        var all = await industries.Query().ToListAsync(ct);
        var unique = ids.ToHashSet();
        if (unique.Count != ids.Count || ids.Count != all.Count || all.Any(i => !unique.Contains(i.Id)))
            throw FieldErrors.Single("ids", "Danh sách sắp xếp phải gồm đủ mọi nhóm ngành");

        var byId = all.ToDictionary(i => i.Id);
        for (var index = 0; index < ids.Count; index++)
            byId[ids[index]].SetSortOrder(index + 1);

        await unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>BR-13: mã và slug nhóm ngành không trùng; trùng thì 409 kèm <c>errors.code</c> hoặc <c>errors.slug</c>.</summary>
    private async Task EnsureUniqueAsync(SaveIndustryRequest request, Guid? currentId, CancellationToken ct)
    {
        var code = (short)request.Code;
        if (await industries.AnyAsync(i => i.Code == code && i.Id != currentId, ct))
            throw new ConflictException($"Mã nhóm {request.Code} đã được dùng", "code");

        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await industries.AnyAsync(i => i.Slug == slug && i.Id != currentId, ct))
            throw new ConflictException("Slug đã được dùng cho nhóm khác", "slug");
    }

    /// <summary>Số demo và số demo đang hiển thị (gồm Sắp ra mắt) theo nhóm.</summary>
    private async Task<Dictionary<Guid, (int Total, int Visible)>> CountDemosAsync(Guid? industryId, CancellationToken ct)
    {
        var query = demos.QueryNoTracking();
        if (industryId is not null)
            query = query.Where(d => d.IndustryId == industryId);

        var rows = await query
            .GroupBy(d => d.IndustryId)
            .Select(g => new
            {
                IndustryId = g.Key,
                Total = g.Count(),
                Visible = g.Count(d => d.IsVisible && d.DevStatus != DemoDevStatus.MoiTao)
            })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.IndustryId, r => (r.Total, r.Visible));
    }

    private static IndustryDto ToDto(Industry industry, Dictionary<Guid, (int Total, int Visible)> counts)
    {
        var (total, visible) = counts.GetValueOrDefault(industry.Id);
        return industry.ToDto(total, visible);
    }
}
