using Domain.Enums.Cms.DemoVisits;

namespace Application.DTOs.Reports;

// DTO thống kê lượt xem /api/reports/visits (07-DANH-SACH-API §5, FR-28, BR-15).
// openRate theo BR-15 (null khi views = 0); share là phần trăm làm tròn 1 chữ số.

/// <summary>Khoảng ngày (giờ Việt Nam) và nhóm ngành cần xem.</summary>
public sealed record VisitReportQuery
{
    /// <summary>yyyy-MM-dd.</summary>
    public DateOnly? From { get; init; }

    /// <summary>yyyy-MM-dd.</summary>
    public DateOnly? To { get; init; }

    public Guid? IndustryId { get; init; }
}

public sealed record VisitReport
{
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
    public VisitTotals Totals { get; init; } = new();

    /// <summary>Đủ mọi ngày trong khoảng.</summary>
    public IReadOnlyList<VisitDailyRow> Daily { get; init; } = [];

    /// <summary>Tối đa 10 demo nhiều lượt xem nhất.</summary>
    public IReadOnlyList<VisitTopDemoRow> TopDemos { get; init; } = [];

    public IReadOnlyList<VisitIndustryRow> ByIndustry { get; init; } = [];
    public IReadOnlyList<VisitDeviceRow> ByDevice { get; init; } = [];
}

public sealed record VisitTotals
{
    public int Views { get; init; }
    public int Opens { get; init; }
    public double? OpenRate { get; init; }
}

public sealed record VisitDailyRow
{
    public DateOnly Date { get; init; }
    public int Views { get; init; }
    public int Opens { get; init; }
    public double? OpenRate { get; init; }
}

public sealed record VisitTopDemoRow
{
    public Guid DemoId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public int Views { get; init; }
    public int Opens { get; init; }
    public double? OpenRate { get; init; }
}

public sealed record VisitIndustryRow
{
    public Guid IndustryId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int Views { get; init; }
    public int Opens { get; init; }
    public double Share { get; init; }
}

public sealed record VisitDeviceRow
{
    public VisitDevice Device { get; init; }
    public int Views { get; init; }
    public double Share { get; init; }
}
