using Application.Common.Exceptions;
using Application.Common.Models;
using Application.DTOs.Demos;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Demos;
using Application.Interfaces.Services.Uploads;
using Application.Mappings.Demos;
using Domain.Entities.Cms.Demos;
using Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Demos;

/// <summary>
/// Ảnh chụp màn hình của demo (UC-06, BR-07). Định dạng, kích thước đọc từ nội dung file (không tin tên file);
/// file lưu qua <see cref="IFileStorage"/> ở thư mục <c>uploads/demos</c>.
/// </summary>
public sealed class DemoScreenshotService(
    IGenericRepository<DemoEntity> demos,
    IUnitOfWork unitOfWork,
    IImageInspector imageInspector,
    IFileStorage fileStorage) : IDemoScreenshotService
{
    /// <summary>Thư mục con trong uploads; DemoDataSeeder xóa cả thư mục này khi đặt lại dữ liệu.</summary>
    public const string UploadFolder = "demos";

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public async Task<UploadScreenshotsResult> UploadAsync(Guid demoId, IReadOnlyList<ScreenshotUpload> files, CancellationToken ct = default)
    {
        var demo = await LoadAsync(demoId, ct);
        var accepted = new List<DemoScreenshot>();
        var rejected = new List<RejectedScreenshot>();
        var savedUrls = new List<string>();

        try
        {
            // Kiểm tra theo thứ tự đã chọn: định dạng → dung lượng → chiều rộng → số ảnh (TC-28, TC-29).
            foreach (var file in files)
            {
                using var buffer = new MemoryStream();
                await CopyWithLimitAsync(file.Content, buffer, DemoRules.ScreenshotMaxBytes + 1, ct);
                var bytes = buffer.GetBuffer().AsMemory(0, (int)buffer.Length);

                var reason = CheckScreenshot(bytes.Span, Math.Max(file.Length, buffer.Length), out var image);
                if (reason is null && !demo.HasRoomForScreenshot)
                    reason = DemoRules.ScreenshotCountMessage;
                if (reason is not null)
                {
                    rejected.Add(new RejectedScreenshot { FileName = file.FileName, Reason = reason });
                    continue;
                }

                buffer.Position = 0;
                var url = await fileStorage.SaveAsync(buffer, UploadFolder, image!.Extension, ct);
                savedUrls.Add(url);
                accepted.Add(demo.AddScreenshot(url, null, image.Width, image.Height, buffer.Length));
            }

            if (accepted.Count > 0)
                await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            // Không lưu được vào DB thì dọn file vừa ghi.
            foreach (var url in savedUrls)
                await fileStorage.DeleteAsync(url, CancellationToken.None);
            throw;
        }

        return new UploadScreenshotsResult
        {
            Accepted = accepted.OrderBy(s => s.SortOrder).Select(s => s.ToDto()).ToList(),
            Rejected = rejected
        };
    }

    public async Task<IReadOnlyList<DemoScreenshotDto>> UpdateAsync(Guid demoId, UpdateScreenshotsRequest request, CancellationToken ct = default)
    {
        var demo = await LoadAsync(demoId, ct);
        var items = request.Items ?? [];

        var ids = items.Select(i => i.Id).ToHashSet();
        if (items.Count != demo.Screenshots.Count || ids.Count != items.Count || demo.Screenshots.Any(s => !ids.Contains(s.Id)))
            throw FieldErrors.Single("items", "Danh sách ảnh đã thay đổi, tải lại trang rồi thử lại");
        if (items.Count > 0 && items.Count(i => i.IsCover) != 1)
            throw FieldErrors.Single("items", "Chọn đúng 1 ảnh đại diện");

        demo.UpdateScreenshots(items.Select(i => new ScreenshotChange(i.Id, i.Caption, i.SortOrder, i.IsCover)).ToList());
        await unitOfWork.SaveChangesAsync(ct);

        return demo.OrderedScreenshots.Select(s => s.ToDto()).ToList();
    }

    public async Task<IReadOnlyList<DemoScreenshotDto>> DeleteAsync(Guid demoId, Guid screenshotId, CancellationToken ct = default)
    {
        var demo = await LoadAsync(demoId, ct);
        var removed = demo.RemoveScreenshot(screenshotId) ?? throw new NotFoundException("Không tìm thấy ảnh");

        await unitOfWork.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(removed.Url, ct);

        return demo.OrderedScreenshots.Select(s => s.ToDto()).ToList();
    }

    /// <summary>
    /// Lý do từ chối ảnh theo BR-07, null khi hợp lệ. Chỉ nhận JPG, PNG, WebP (nhận diện theo chữ ký file);
    /// tối đa 2 MB; rộng tối thiểu 1280 px.
    /// </summary>
    internal string? CheckScreenshot(ReadOnlySpan<byte> content, long sizeBytes, out ImageInfo? image)
    {
        image = null;
        if (!HasSupportedSignature(content))
            return DemoRules.ScreenshotTypeMessage;
        if (sizeBytes > DemoRules.ScreenshotMaxBytes)
            return DemoRules.ScreenshotSizeMessage;

        image = imageInspector.Inspect(content);
        if (image is null || image.Format == ImageFormat.Svg)
            return DemoRules.ScreenshotTypeMessage;
        if (image.Width < DemoRules.ScreenshotMinWidth)
            return DemoRules.ScreenshotWidthMessage;

        return null;
    }

    private static bool HasSupportedSignature(ReadOnlySpan<byte> content) =>
        content.StartsWith(PngSignature)
        || (content.Length >= 3 && content[0] == 0xFF && content[1] == 0xD8 && content[2] == 0xFF)
        || (content.Length >= 12 && content[..4].SequenceEqual("RIFF"u8) && content.Slice(8, 4).SequenceEqual("WEBP"u8));

    private async Task<DemoEntity> LoadAsync(Guid demoId, CancellationToken ct) =>
        await demos.Query().WithDetails().FirstOrDefaultAsync(d => d.Id == demoId, ct)
        ?? throw new NotFoundException(DemoQueries.NotFoundMessage);

    /// <summary>Đọc tối đa <paramref name="limit"/> byte: đủ để biết file vượt 2 MB mà không phải đọc hết file lớn.</summary>
    private static async Task CopyWithLimitAsync(Stream source, Stream destination, long limit, CancellationToken ct)
    {
        var chunk = new byte[81920];
        long total = 0;
        int read;
        while (total < limit && (read = await source.ReadAsync(chunk.AsMemory(0, (int)Math.Min(chunk.Length, limit - total)), ct)) > 0)
        {
            await destination.WriteAsync(chunk.AsMemory(0, read), ct);
            total += read;
        }
    }
}
