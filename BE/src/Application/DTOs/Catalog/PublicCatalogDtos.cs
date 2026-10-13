using Domain.Enums.Cms.Demos;
using Domain.Enums.Cms.DemoVisits;

namespace Application.DTOs.Catalog;

// DTO của API công khai /api/public/* (07-DANH-SACH-API §2). Chỉ có trường được phép công khai:
// KHÔNG BAO GIỜ thêm mật khẩu demo, ghi chú nội bộ, kịch bản, câu hỏi thường gặp, Swagger, repo, người phụ trách (BR-10).

/// <summary>Nhóm ngành có ít nhất 1 demo hiển thị (BR-13).</summary>
public sealed record PublicIndustry
{
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string Color { get; init; } = string.Empty;
    public int SortOrder { get; init; }

    /// <summary>Số demo hiển thị, gồm Sắp ra mắt.</summary>
    public int Count { get; init; }
}

/// <summary>Nhóm ngành gắn trên thẻ demo.</summary>
public sealed record PublicDemoIndustry
{
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public string? Icon { get; init; }
}

/// <summary>Thẻ demo trên danh mục, đúng thứ tự BR-04.</summary>
public record PublicDemoCard
{
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public PublicDemoIndustry Industry { get; init; } = new();
    public string? ShortDescription { get; init; }

    /// <summary>null thì FE vẽ ảnh mặc định theo màu nhóm ngành (BR-07).</summary>
    public string? CoverUrl { get; init; }

    /// <summary>Chỉ DangLam, DemoDuoc, HoanThien.</summary>
    public DemoDevStatus DevStatus { get; init; }

    /// <summary>devStatus = DangLam.</summary>
    public bool IsComingSoon { get; init; }

    /// <summary>null khi Sắp ra mắt.</summary>
    public string? DemoUrl { get; init; }

    public bool IsFeatured { get; init; }
    public int SortOrder { get; init; }

    /// <summary>Để FE tìm kiếm (BR-03).</summary>
    public IReadOnlyList<string> Features { get; init; } = [];

    public IReadOnlyList<string> Keywords { get; init; } = [];
}

public sealed record PublicDemoAccount
{
    public string Username { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public string? Purpose { get; init; }
}

public sealed record PublicScreenshot
{
    public string Url { get; init; } = string.Empty;
    public string? Caption { get; init; }
    public int Width { get; init; }
    public int Height { get; init; }
    public bool IsCover { get; init; }
}

/// <summary>Trang chi tiết demo công khai (FR-06 → FR-10).</summary>
public sealed record PublicDemoDetail : PublicDemoCard
{
    public PublicDemoDetail()
    {
    }

    /// <summary>Chép các trường của thẻ, rồi bổ sung trường chi tiết bằng object initializer.</summary>
    public PublicDemoDetail(PublicDemoCard card)
        : base(card)
    {
    }

    public string? TargetCustomers { get; init; }
    public string? ProblemSolved { get; init; }
    public string? Description { get; init; }
    public string? ProductType { get; init; }
    public string? Devices { get; init; }
    public bool RequiresLogin { get; init; }

    /// <summary>Rỗng khi demo tắt "Cần đăng nhập" (BR-16).</summary>
    public IReadOnlyList<PublicDemoAccount> Accounts { get; init; } = [];

    public IReadOnlyList<PublicScreenshot> Screenshots { get; init; } = [];

    /// <summary>Tối đa 3 demo công khai khác cùng nhóm, thứ tự BR-04 (FR-09).</summary>
    public IReadOnlyList<PublicDemoCard> Related { get; init; } = [];

    public DateTime UpdatedAt { get; init; }
}

/// <summary>Kết quả tra slug: slug hiện tại trả <see cref="Demo"/>; slug cũ trả <see cref="RedirectSlug"/> (BR-06).</summary>
public sealed record PublicDemoLookup
{
    public PublicDemoDetail? Demo { get; init; }
    public string? RedirectSlug { get; init; }
}

/// <summary>Ghi lượt xem, lượt mở demo (FR-27, BR-14).</summary>
public sealed record RecordVisitRequest
{
    public VisitType Type { get; init; }

    /// <summary>Mã ngẫu nhiên lưu ở localStorage, 16–64 ký tự.</summary>
    public string VisitorId { get; init; } = string.Empty;

    public VisitDevice Device { get; init; }
    public string? Referrer { get; init; }
}

public sealed record RecordVisitResult
{
    /// <summary>false khi trùng trong 30 phút, người đang đăng nhập hoặc bot.</summary>
    public bool Counted { get; init; }
}

/// <summary>Thông tin request dùng để bỏ qua lượt không tính (BR-14), controller đọc từ header.</summary>
/// <param name="HasAuthorization">Request có header <c>Authorization</c> (người đang đăng nhập).</param>
/// <param name="UserAgent">Header <c>User-Agent</c>.</param>
public sealed record VisitSource(bool HasAuthorization, string? UserAgent);
