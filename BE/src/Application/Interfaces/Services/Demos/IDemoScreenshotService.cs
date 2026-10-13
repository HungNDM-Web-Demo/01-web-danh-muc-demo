using Application.DTOs.Demos;

namespace Application.Interfaces.Services.Demos;

/// <summary>Quản lý ảnh chụp màn hình của demo (UC-06, FR-18, BR-07, BR-02).</summary>
public interface IDemoScreenshotService
{
    /// <summary>
    /// Tải nhiều ảnh: JPG, PNG, WebP; tối đa 2 MB; rộng tối thiểu 1280 px; tối đa 8 ảnh mỗi demo. Ảnh hợp lệ vẫn được
    /// nhận, ảnh lỗi báo lý do riêng theo thứ tự đã chọn.
    /// </summary>
    Task<UploadScreenshotsResult> UploadAsync(Guid demoId, IReadOnlyList<ScreenshotUpload> files, CancellationToken ct = default);

    /// <summary>Sửa chú thích, thứ tự, ảnh đại diện.</summary>
    Task<IReadOnlyList<DemoScreenshotDto>> UpdateAsync(Guid demoId, UpdateScreenshotsRequest request, CancellationToken ct = default);

    /// <summary>Xóa ảnh; ảnh đại diện bị xóa thì ảnh kế tiếp thành đại diện; không xóa ảnh cuối của demo công khai.</summary>
    Task<IReadOnlyList<DemoScreenshotDto>> DeleteAsync(Guid demoId, Guid screenshotId, CancellationToken ct = default);
}
