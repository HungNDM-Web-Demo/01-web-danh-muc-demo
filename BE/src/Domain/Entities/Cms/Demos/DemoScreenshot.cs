using Domain.Base;

namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Ảnh chụp màn hình của demo (<c>Cms_DemoScreenshots</c>, BR-07). Tạo, sửa, xóa qua <see cref="Demo"/>
/// để luôn giữ thứ tự 1, 2, 3… và đúng một ảnh đại diện.
/// </summary>
public class DemoScreenshot : BaseEntity, ICreationTracked, IModificationTracked
{
    private DemoScreenshot()
    {
    }

    internal DemoScreenshot(Guid demoId, string url, string? caption, int width, int height, long sizeBytes, int sortOrder, bool isCover)
    {
        DemoId = demoId;
        Url = url;
        Caption = TrimToNull(caption);
        Width = width;
        Height = height;
        SizeBytes = (int)Math.Min(sizeBytes, int.MaxValue);
        SortOrder = sortOrder;
        IsCover = isCover;
    }

    public Guid DemoId { get; private set; }

    /// <summary><c>/seed/...</c> (ảnh mẫu, FE phục vụ) hoặc <c>/uploads/demos/...</c> (ảnh tải lên).</summary>
    public string Url { get; private set; } = string.Empty;

    public string? Caption { get; private set; }
    public int Width { get; private set; }
    public int Height { get; private set; }
    public int SizeBytes { get; private set; }
    public int SortOrder { get; private set; }

    /// <summary>Ảnh đại diện trên thẻ danh mục và ảnh chia sẻ.</summary>
    public bool IsCover { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    internal void SetCaption(string? caption) => Caption = TrimToNull(caption);

    internal void SetSortOrder(int sortOrder) => SortOrder = sortOrder;

    internal void SetCover(bool isCover) => IsCover = isCover;

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
