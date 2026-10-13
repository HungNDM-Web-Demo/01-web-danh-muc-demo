using Domain.Enums.Cms.Demos;

namespace Infrastructure.Persistence.Seeders;

// Hình dạng của FE/src/mock/seed/demo-data.json (nguồn duy nhất cho FE mock và DemoDataSeeder).
// Ngày ghi tương đối bằng số ngày (…DaysAgo, dayOffset), quy đổi theo hôm nay giờ Việt Nam khi nạp.
// Trường chỉ FE dùng ($comment, screenshots[].layout) được bỏ qua.

internal sealed class DemoSeedFile
{
    public List<IndustrySeed>? Industries { get; init; }
    public List<DemoSeed>? Demos { get; init; }
    public List<VisitStatSeed>? VisitStats { get; init; }
}

internal sealed class IndustrySeed
{
    public int Code { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string Color { get; init; } = string.Empty;
    public int? SortOrder { get; init; }
    public string? Description { get; init; }
}

internal sealed class DemoSeed
{
    public int Number { get; init; }
    public string ProjectCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;

    /// <summary>Slug nhóm ngành.</summary>
    public string Industry { get; init; } = string.Empty;

    public string? IdeaCode { get; init; }
    public string? TargetCustomers { get; init; }
    public string? ProblemSolved { get; init; }
    public string? ProductType { get; init; }
    public string? Devices { get; init; }
    public string? ShortDescription { get; init; }
    public string? Description { get; init; }
    public List<string>? Features { get; init; }
    public List<string>? Keywords { get; init; }
    public string? DemoUrl { get; init; }
    public string? SwaggerUrl { get; init; }
    public string? RepoUrl { get; init; }
    public string? OwnerName { get; init; }
    public bool? RequiresLogin { get; init; }
    public string? DemoPassword { get; init; }
    public string? InternalNotes { get; init; }
    public string? DemoScript { get; init; }
    public DemoDevStatus DevStatus { get; init; }
    public bool? IsVisible { get; init; }
    public bool? IsFeatured { get; init; }
    public int? SortOrder { get; init; }
    public int? FirstPublishedDaysAgo { get; init; }
    public int? CreatedDaysAgo { get; init; }
    public int? UpdatedDaysAgo { get; init; }
    public List<DemoAccountSeed>? Accounts { get; init; }
    public List<DemoFaqSeed>? Faqs { get; init; }
    public List<DemoScreenshotSeed>? Screenshots { get; init; }
    public List<DemoStatusHistorySeed>? StatusHistory { get; init; }
}

internal sealed class DemoAccountSeed
{
    public string Username { get; init; } = string.Empty;
    public string RoleName { get; init; } = string.Empty;
    public string? Purpose { get; init; }
}

internal sealed class DemoFaqSeed
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
}

internal sealed class DemoScreenshotSeed
{
    /// <summary>Tên file trong FE/public/seed/demos/{slug}/.</summary>
    public string File { get; init; } = string.Empty;

    public string? Caption { get; init; }
    public int? Width { get; init; }
    public int? Height { get; init; }
    public long? SizeBytes { get; init; }
    public bool? IsCover { get; init; }
}

internal sealed class DemoStatusHistorySeed
{
    public DemoDevStatus? From { get; init; }
    public DemoDevStatus To { get; init; }
    public int DaysAgo { get; init; }
    public string? Reason { get; init; }

    /// <summary>Tên đăng nhập người đổi; không ghi thì là <c>quanly</c>.</summary>
    public string? By { get; init; }
}

internal sealed class VisitStatSeed
{
    /// <summary>Slug demo.</summary>
    public string Demo { get; init; } = string.Empty;

    /// <summary>Lệch so với hôm nay (âm là quá khứ).</summary>
    public int DayOffset { get; init; }

    public int Views { get; init; }
    public int Opens { get; init; }
    public int MobileViews { get; init; }
    public int DesktopViews { get; init; }
}
