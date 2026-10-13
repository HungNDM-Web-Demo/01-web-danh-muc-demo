using Application.Common.Models;

namespace Application.DTOs.Industries;

// DTO nhóm ngành /api/industries (07-DANH-SACH-API §4).

/// <summary>Nhóm ngành kèm số demo (FR-25).</summary>
public sealed record IndustryDto : IHasGuidId
{
    public Guid Id { get; init; }
    public int Code { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string Color { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int SortOrder { get; init; }

    /// <summary>Mọi demo của nhóm.</summary>
    public int DemoCount { get; init; }

    /// <summary>Demo đang hiển thị, gồm Sắp ra mắt.</summary>
    public int VisibleDemoCount { get; init; }
}

/// <summary>Thêm, sửa nhóm ngành.</summary>
public sealed record SaveIndustryRequest
{
    public int Code { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string Color { get; init; } = string.Empty;
    public string? Description { get; init; }
}

/// <summary>Toàn bộ nhóm ngành theo thứ tự mới.</summary>
public sealed record ReorderIndustriesRequest
{
    public IReadOnlyList<Guid>? Ids { get; init; } = [];
}
