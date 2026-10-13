namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Phần thông tin quản lý nhập khi thêm, sửa demo (FR-17, FR-19, FR-20): mọi trường trừ mã dự án, trạng thái,
/// hiển thị, nổi bật, thứ tự, ảnh chụp. Chuỗi rỗng được coi là không nhập.
/// </summary>
public sealed record DemoContent
{
    public int Number { get; init; }
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
    public IReadOnlyList<string> Features { get; init; } = [];
    public IReadOnlyList<string> Keywords { get; init; } = [];
    public string? DemoUrl { get; init; }
    public string? SwaggerUrl { get; init; }
    public string? RepoUrl { get; init; }
    public string? OwnerName { get; init; }
    public bool RequiresLogin { get; init; } = true;
    public string? DemoPassword { get; init; }
    public string? InternalNotes { get; init; }
    public string? DemoScript { get; init; }

    /// <summary>Thứ tự trong danh sách là thứ tự hiển thị.</summary>
    public IReadOnlyList<DemoAccountData> Accounts { get; init; } = [];

    public IReadOnlyList<DemoFaqData> Faqs { get; init; } = [];
}
