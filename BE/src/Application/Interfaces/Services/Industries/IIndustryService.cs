using Application.DTOs.Industries;

namespace Application.Interfaces.Services.Industries;

/// <summary>Quản lý nhóm ngành (UC-09, FR-25, FR-26, BR-13).</summary>
public interface IIndustryService
{
    /// <summary>Mọi nhóm theo thứ tự, kèm số demo.</summary>
    Task<IReadOnlyList<IndustryDto>> GetListAsync(CancellationToken ct = default);

    Task<IndustryDto> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IndustryDto> CreateAsync(SaveIndustryRequest request, CancellationToken ct = default);

    Task<IndustryDto> UpdateAsync(Guid id, SaveIndustryRequest request, CancellationToken ct = default);

    /// <summary>Chỉ xóa được nhóm không còn demo: "Nhóm đang có N demo".</summary>
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Lưu thứ tự nhóm ngành, đánh lại 1, 2, 3…</summary>
    Task ReorderAsync(ReorderIndustriesRequest request, CancellationToken ct = default);
}
