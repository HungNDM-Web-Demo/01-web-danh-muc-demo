using Domain.Enums.Cms.Demos;

namespace Application.DTOs.Demos;

// DTO quản lý demo /api/demos (07-DANH-SACH-API §3). Khớp từng trường với FE features/demos/types/demo.types.ts.

/// <summary>Nhóm ngành gắn trên dòng bảng quản trị.</summary>
public sealed record DemoListIndustry
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
}

/// <summary>Một dòng bảng Quản lý demo (FR-16), thứ tự <c>sortOrder</c>.</summary>
public sealed record DemoListItem
{
    public Guid Id { get; init; }
    public int Number { get; init; }

    /// <summary>"02-fnb-pos-cafe".</summary>
    public string Folder { get; init; } = string.Empty;

    public string ProjectCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public DemoListIndustry Industry { get; init; } = new();
    public DemoDevStatus DevStatus { get; init; }
    public bool IsVisible { get; init; }
    public bool IsFeatured { get; init; }
    public int SortOrder { get; init; }
    public string? CoverUrl { get; init; }
    public int ScreenshotCount { get; init; }

    /// <summary>Chỉ có khi người gọi có <c>demos.view-internal</c>.</summary>
    public string? OwnerName { get; init; }

    /// <summary>firstPublishedAt khác null.</summary>
    public bool EverPublished { get; init; }

    public DateTime UpdatedAt { get; init; }
}

/// <summary>Thẻ tổng hợp đầu trang Quản lý demo (02-SRS §6).</summary>
public sealed record DemoSummary
{
    public int Total { get; init; }
    public int MoiTao { get; init; }
    public int DangLam { get; init; }
    public int DemoDuoc { get; init; }
    public int HoanThien { get; init; }

    /// <summary>Đang hiển thị, gồm Sắp ra mắt.</summary>
    public int Visible { get; init; }

    public int Featured { get; init; }
    public int FeaturedMax { get; init; }
}

/// <summary>Số thứ tự gợi ý khi thêm demo (BR-09).</summary>
public sealed record NextNumberResult
{
    public int Number { get; init; }
}

/// <summary>Ảnh chụp màn hình (kiểu <c>Screenshot</c> của hợp đồng API).</summary>
public sealed record DemoScreenshotDto
{
    public Guid Id { get; init; }
    public string Url { get; init; } = string.Empty;
    public string? Caption { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
    public int SizeBytes { get; init; }
    public int SortOrder { get; init; }
    public bool IsCover { get; init; }
}

public sealed record DemoAccountItem
{
    public string Username { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public string? Purpose { get; init; }
}

public sealed record DemoFaqItem
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
}

/// <summary>Kết quả kiểm tra BR-01, BR-02 cho trạng thái hiện tại.</summary>
public sealed record VisibilityCheck
{
    public bool CanShow { get; init; }
    public IReadOnlyList<string> Missing { get; init; } = [];
}

/// <summary>Thông tin nội bộ, chỉ trả cho người có <c>demos.view-internal</c> (BR-10).</summary>
public sealed record DemoInternalInfo
{
    public string? SwaggerUrl { get; init; }
    public string? RepoUrl { get; init; }
    public string? OwnerName { get; init; }
    public string? DemoPassword { get; init; }
    public string? InternalNotes { get; init; }
    public string? DemoScript { get; init; }
    public IReadOnlyList<DemoFaqItem> Faqs { get; init; } = [];
}

/// <summary>Chi tiết demo cho trang quản trị và khung nội bộ.</summary>
public sealed record DemoDetail
{
    public Guid Id { get; init; }
    public int Number { get; init; }
    public string ProjectCode { get; init; } = string.Empty;
    public string Folder { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;

    /// <summary>Slug cũ còn chuyển hướng về demo này (BR-06).</summary>
    public IReadOnlyList<string> OldSlugs { get; init; } = [];

    public Guid IndustryId { get; init; }
    public string? IdeaCode { get; init; }
    public string? TargetCustomers { get; init; }
    public string? ProblemSolved { get; init; }
    public string? ProductType { get; init; }
    public string? Devices { get; init; }
    public string? ShortDescription { get; init; }
    public string? Description { get; init; }
    public IReadOnlyList<string> Features { get; init; } = [];
    public IReadOnlyList<string> Keywords { get; init; } = [];
    public string? DemoUrl { get; init; }
    public bool RequiresLogin { get; init; }
    public IReadOnlyList<DemoAccountItem> Accounts { get; init; } = [];
    public IReadOnlyList<DemoScreenshotDto> Screenshots { get; init; } = [];
    public DemoDevStatus DevStatus { get; init; }
    public bool IsVisible { get; init; }
    public bool IsFeatured { get; init; }
    public int SortOrder { get; init; }
    public DateTime? FirstPublishedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public VisibilityCheck VisibilityCheck { get; init; } = new();

    /// <summary>Chỉ có khi người gọi có <c>demos.view-internal</c>; không có quyền thì null.</summary>
    public DemoInternalInfo? Internal { get; init; }
}

/// <summary>Thêm, sửa demo (FR-17, FR-19, FR-20).</summary>
public class SaveDemoRequest
{
    public int Number { get; init; }

    /// <summary>Chỉ dùng khi thêm mới; sửa thì bỏ qua (BR-09).</summary>
    public string? ProjectCode { get; init; }

    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public Guid IndustryId { get; init; }
    public string? IdeaCode { get; init; }
    public string? TargetCustomers { get; init; }
    public string? ProblemSolved { get; init; }
    public string? ProductType { get; init; }
    public string? Devices { get; init; }
    public string? ShortDescription { get; init; }
    public string? Description { get; init; }
    public IReadOnlyList<string>? Features { get; init; } = [];
    public IReadOnlyList<string>? Keywords { get; init; } = [];
    public string? DemoUrl { get; init; }
    public string? SwaggerUrl { get; init; }
    public string? RepoUrl { get; init; }
    public string? OwnerName { get; init; }
    public bool RequiresLogin { get; init; } = true;
    public string? DemoPassword { get; init; }
    public string? InternalNotes { get; init; }
    public string? DemoScript { get; init; }

    /// <summary>Thứ tự mảng là thứ tự hiển thị.</summary>
    public IReadOnlyList<DemoAccountItem>? Accounts { get; init; } = [];

    public IReadOnlyList<DemoFaqItem>? Faqs { get; init; } = [];
}

/// <summary>
/// Thêm demo: cùng hình dạng JSON với <see cref="SaveDemoRequest"/>, kiểm tra thêm mã dự án (BR-09).
/// Tách kiểu để validator chỉ bắt mã dự án khi thêm mới.
/// </summary>
public sealed class CreateDemoRequest : SaveDemoRequest
{
}

/// <summary>Đổi trạng thái phát triển (BR-11). Lùi bậc cần <c>reason</c> 10–500 ký tự.</summary>
public sealed record ChangeStatusRequest
{
    public DemoDevStatus Status { get; init; }
    public string? Reason { get; init; }
}

public sealed record SetVisibilityRequest
{
    public bool IsVisible { get; init; }
}

public sealed record SetFeaturedRequest
{
    public bool IsFeatured { get; init; }
}

/// <summary>Toàn bộ demo theo thứ tự mới (BR-18).</summary>
public sealed record ReorderDemosRequest
{
    public IReadOnlyList<Guid>? Ids { get; init; } = [];
}

/// <summary>Một dòng lịch sử đổi trạng thái, mới nhất trước.</summary>
public sealed record StatusHistoryItem
{
    public DemoDevStatus? FromStatus { get; init; }
    public DemoDevStatus ToStatus { get; init; }
    public string? Reason { get; init; }
    public string ChangedByName { get; init; } = string.Empty;
    public DateTime ChangedAt { get; init; }
}

/// <summary>Kết quả tải ảnh: ảnh hợp lệ vẫn được nhận, ảnh lỗi có lý do riêng (TC-28, TC-29).</summary>
public sealed record UploadScreenshotsResult
{
    public IReadOnlyList<DemoScreenshotDto> Accepted { get; init; } = [];
    public IReadOnlyList<RejectedScreenshot> Rejected { get; init; } = [];
}

public sealed record RejectedScreenshot
{
    public string FileName { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
}

/// <summary>Sửa chú thích, thứ tự, ảnh đại diện; danh sách gồm đủ mọi ảnh của demo.</summary>
public sealed record UpdateScreenshotsRequest
{
    public IReadOnlyList<UpdateScreenshotItem>? Items { get; init; } = [];
}

public sealed record UpdateScreenshotItem
{
    public Guid Id { get; init; }
    public string? Caption { get; init; }
    public int SortOrder { get; init; }
    public bool IsCover { get; init; }
}

/// <summary>Một file ảnh tải lên, controller mở luồng đọc từ multipart.</summary>
/// <param name="FileName">Tên file gốc, dùng để báo lý do từ chối.</param>
/// <param name="Length">Dung lượng (byte).</param>
/// <param name="Content">Luồng đọc nội dung; người gọi chịu trách nhiệm đóng.</param>
public sealed record ScreenshotUpload(string FileName, long Length, Stream Content);
