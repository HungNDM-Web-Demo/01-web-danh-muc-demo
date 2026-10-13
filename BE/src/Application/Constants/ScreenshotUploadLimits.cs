namespace Application.Constants;

/// <summary>Giới hạn request tải ảnh chụp demo (BR-07).</summary>
public static class ScreenshotUploadLimits
{
    /// <summary>
    /// Giới hạn cả request multipart. Lớn hơn nhiều so với 8 ảnh × 2 MB để ảnh quá cỡ vẫn tới được service và nhận lý do
    /// "Ảnh vượt 2 MB" thay vì cả request bị từ chối.
    /// </summary>
    public const long MaxRequestBytes = 40L * 1024 * 1024;
}
