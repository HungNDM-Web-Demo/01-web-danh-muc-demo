using Application.DTOs.Reports;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Cms.DemoVisits;
using Domain.Entities.Cms.Industries;
using Domain.Enums.Cms.DemoVisits;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Reports;

/// <summary>
/// Thống kê lượt xem (UC-10, FR-28), chỉ đọc bảng tổng hợp ngày <c>Cms_DemoVisitStats</c>. Lọc nhóm ngành áp cho tổng,
/// theo ngày, top demo, thiết bị; tỉ trọng nhóm ngành luôn tính trên mọi nhóm (giống FE mock).
/// </summary>
public sealed class VisitReportService(
    IGenericRepository<DemoVisitStat> visitStats,
    IGenericRepository<DemoEntity> demos,
    IGenericRepository<Industry> industries) : IVisitReportService
{
    private const int TopDemosMax = 10;

    public async Task<VisitReport> GetVisitReportAsync(VisitReportQuery query, CancellationToken ct = default)
    {
        // Validator đã bắt buộc có from, to và from ≤ to.
        var from = query.From!.Value;
        var to = query.To!.Value;

        var demoRows = await demos.QueryNoTracking()
            .Select(d => new { d.Id, d.Name, d.Slug, d.IndustryId })
            .ToDictionaryAsync(d => d.Id, ct);
        var industryRows = await industries.QueryNoTracking().ToListAsync(ct);

        var inRange = (await visitStats.QueryNoTracking()
                .Where(s => s.Date >= from && s.Date <= to)
                .ToListAsync(ct))
            .Where(s => demoRows.ContainsKey(s.DemoId))
            .ToList();
        var filtered = query.IndustryId is { } industryId
            ? inRange.Where(s => demoRows[s.DemoId].IndustryId == industryId).ToList()
            : inRange;

        var views = filtered.Sum(s => s.Views);
        var opens = filtered.Sum(s => s.Opens);

        var byDate = filtered
            .GroupBy(s => s.Date)
            .ToDictionary(g => g.Key, g => (Views: g.Sum(s => s.Views), Opens: g.Sum(s => s.Opens)));
        var daily = new List<VisitDailyRow>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            var (dayViews, dayOpens) = byDate.GetValueOrDefault(date);
            daily.Add(new VisitDailyRow { Date = date, Views = dayViews, Opens = dayOpens, OpenRate = VisitMetrics.OpenRate(dayOpens, dayViews) });
        }

        var topDemos = filtered
            .GroupBy(s => s.DemoId)
            .Select(g => new { DemoId = g.Key, Views = g.Sum(s => s.Views), Opens = g.Sum(s => s.Opens) })
            .OrderByDescending(r => r.Views)
            .ThenByDescending(r => r.Opens)
            .Take(TopDemosMax)
            .Select(r => new VisitTopDemoRow
            {
                DemoId = r.DemoId,
                Name = demoRows[r.DemoId].Name,
                Slug = demoRows[r.DemoId].Slug,
                Views = r.Views,
                Opens = r.Opens,
                OpenRate = VisitMetrics.OpenRate(r.Opens, r.Views)
            })
            .ToList();

        var allViews = inRange.Sum(s => s.Views);
        var byIndustry = industryRows
            .Select(industry =>
            {
                var rows = inRange.Where(s => demoRows[s.DemoId].IndustryId == industry.Id).ToList();
                var industryViews = rows.Sum(s => s.Views);
                return new VisitIndustryRow
                {
                    IndustryId = industry.Id,
                    Name = industry.Name,
                    Color = industry.Color,
                    Views = industryViews,
                    Opens = rows.Sum(s => s.Opens),
                    Share = VisitMetrics.Share(industryViews, allViews)
                };
            })
            .Where(r => r.Views > 0 || r.Opens > 0)
            .OrderByDescending(r => r.Views)
            .ToList();

        var mobile = filtered.Sum(s => s.MobileViews);
        var desktop = filtered.Sum(s => s.DesktopViews);

        return new VisitReport
        {
            From = from,
            To = to,
            Totals = new VisitTotals { Views = views, Opens = opens, OpenRate = VisitMetrics.OpenRate(opens, views) },
            Daily = daily,
            TopDemos = topDemos,
            ByIndustry = byIndustry,
            ByDevice =
            [
                new VisitDeviceRow { Device = VisitDevice.Mobile, Views = mobile, Share = VisitMetrics.Share(mobile, mobile + desktop) },
                new VisitDeviceRow { Device = VisitDevice.Desktop, Views = desktop, Share = VisitMetrics.Share(desktop, mobile + desktop) }
            ]
        };
    }
}
