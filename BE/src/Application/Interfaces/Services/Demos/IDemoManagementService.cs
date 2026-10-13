using Application.DTOs.Demos;

namespace Application.Interfaces.Services.Demos;

/// <summary>
/// Quản lý demo (UC-03, UC-05, UC-07, UC-08). Trường nội bộ chỉ trả khi người gọi có <c>demos.view-internal</c> (BR-10).
/// </summary>
public interface IDemoManagementService
{
    /// <summary>Mọi demo theo thứ tự <c>sortOrder</c> (FR-16).</summary>
    Task<IReadOnlyList<DemoListItem>> GetListAsync(CancellationToken ct = default);

    /// <summary>Thẻ tổng hợp đầu trang (02-SRS §6).</summary>
    Task<DemoSummary> GetSummaryAsync(CancellationToken ct = default);

    /// <summary>Số thứ tự gợi ý: số lớn nhất hiện có cộng 1 (BR-09).</summary>
    Task<NextNumberResult> GetNextNumberAsync(CancellationToken ct = default);

    Task<DemoDetail> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Trang chi tiết có khung nội bộ, xem trước demo chưa công khai (FR-12, FR-13); nhận cả slug cũ.</summary>
    Task<DemoDetail> GetBySlugAsync(string slug, CancellationToken ct = default);

    /// <summary>Thêm demo: trạng thái Mới tạo, ẩn (UC-05).</summary>
    Task<DemoDetail> CreateAsync(CreateDemoRequest request, CancellationToken ct = default);

    /// <summary>Sửa thông tin, tài khoản, câu hỏi, nội bộ (BR-02, BR-05, BR-06, BR-08).</summary>
    Task<DemoDetail> UpdateAsync(Guid id, SaveDemoRequest request, CancellationToken ct = default);

    /// <summary>Xóa demo chưa từng công khai (BR-12), kèm file ảnh đã tải lên.</summary>
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Đổi trạng thái phát triển (BR-11, BR-02).</summary>
    Task<DemoDetail> ChangeStatusAsync(Guid id, ChangeStatusRequest request, CancellationToken ct = default);

    /// <summary>Bật/tắt hiển thị (BR-01, BR-02).</summary>
    Task<DemoDetail> SetVisibilityAsync(Guid id, SetVisibilityRequest request, CancellationToken ct = default);

    /// <summary>Đánh dấu nổi bật (BR-04: tối đa 6, chỉ demo công khai).</summary>
    Task<DemoDetail> SetFeaturedAsync(Guid id, SetFeaturedRequest request, CancellationToken ct = default);

    /// <summary>Lưu thứ tự kéo thả, đánh lại 10, 20, 30… (BR-18).</summary>
    Task ReorderAsync(ReorderDemosRequest request, CancellationToken ct = default);

    /// <summary>Lịch sử đổi trạng thái, mới nhất trước (FR-21).</summary>
    Task<IReadOnlyList<StatusHistoryItem>> GetStatusHistoryAsync(Guid id, CancellationToken ct = default);
}
