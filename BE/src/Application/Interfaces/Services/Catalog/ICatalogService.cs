using Application.DTOs.Catalog;

namespace Application.Interfaces.Services.Catalog;

/// <summary>
/// API công khai của danh mục (UC-01, UC-02, UC-10): không cần đăng nhập, chỉ trả trường công khai (BR-10).
/// </summary>
public interface ICatalogService
{
    /// <summary>Nhóm ngành có ít nhất 1 demo hiển thị, kèm số demo gồm cả Sắp ra mắt (BR-13).</summary>
    Task<IReadOnlyList<PublicIndustry>> GetIndustriesAsync(CancellationToken ct = default);

    /// <summary>Demo hiển thị (BR-01), đúng thứ tự BR-04.</summary>
    Task<IReadOnlyList<PublicDemoCard>> GetDemosAsync(CancellationToken ct = default);

    /// <summary>
    /// Chi tiết demo hiển thị; slug cũ trả <c>redirectSlug</c> (BR-06). Không có hoặc không hiển thị thì
    /// ném NotFoundException (404).
    /// </summary>
    Task<PublicDemoLookup> GetDemoAsync(string slug, CancellationToken ct = default);

    /// <summary>
    /// Ghi lượt xem, lượt mở (BR-14): bỏ qua người đang đăng nhập, bot và lượt trùng trong 30 phút; cộng vào bảng
    /// tổng hợp ngày theo giờ Việt Nam.
    /// </summary>
    Task<RecordVisitResult> RecordVisitAsync(string slug, RecordVisitRequest request, VisitSource source, CancellationToken ct = default);
}
