using Application.Common.Exceptions;
using Application.DTOs.Catalog;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Catalog;
using Application.Interfaces.Services.Reports;
using Domain.Entities.Cms.DemoVisits;
using Domain.Enums.Cms.DemoVisits;
using Infrastructure.BackgroundJobs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using UnitTests.TestSupport;

namespace UnitTests.Cms;

/// <summary>BR-14 chống tính trùng lượt xem, lượt mở (TC-42, TC-43) và báo cáo đọc bảng tổng hợp ngày (BR-15).</summary>
public sealed class VisitRecordingTests : IAsyncLifetime
{
    private const string VisitorId = "visitor-0123456789abcdef";
    private static readonly VisitSource Guest = new(false, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    private CmsTestHost _host = null!;

    public async Task InitializeAsync() => _host = await CmsTestHost.StartAsync();

    public async Task DisposeAsync() => await _host.DisposeAsync();

    private Task<bool> RecordAsync(VisitType type, VisitSource? source = null, string slug = "pos-quan-cafe", string visitorId = VisitorId) =>
        _host.CallAsync<ICatalogService, bool>(async s => (await s.RecordVisitAsync(
            slug,
            new RecordVisitRequest { Type = type, VisitorId = visitorId, Device = VisitDevice.Mobile },
            source ?? Guest)).Counted);

    private async Task<VisitDailyRow> TodayAsync()
    {
        var today = new DateOnly(2026, 10, 13);
        var report = await _host.CallAsync<IVisitReportService, VisitReport>(s =>
            s.GetVisitReportAsync(new VisitReportQuery { From = today, To = today }));
        return Assert.Single(report.Daily);
    }

    [Fact]
    public async Task Tc42_SameBrowserWithin30Minutes_CountsOncePerType()
    {
        var before = await TodayAsync();

        Assert.True(await RecordAsync(VisitType.View));
        _host.Time.Advance(TimeSpan.FromMinutes(2));
        Assert.False(await RecordAsync(VisitType.View));
        _host.Time.Advance(TimeSpan.FromMinutes(2));
        Assert.False(await RecordAsync(VisitType.View));
        Assert.True(await RecordAsync(VisitType.Open));
        Assert.False(await RecordAsync(VisitType.Open));

        var after = await TodayAsync();
        Assert.Equal(before.Views + 1, after.Views);
        Assert.Equal(before.Opens + 1, after.Opens);
        Assert.Equal(VisitMetrics.OpenRate(after.Opens, after.Views), after.OpenRate);

        // Hết 30 phút thì tính lượt mới; trình duyệt khác tính riêng.
        _host.Time.Advance(TimeSpan.FromMinutes(31));
        Assert.True(await RecordAsync(VisitType.View));
        Assert.True(await RecordAsync(VisitType.View, visitorId: "visitor-another-browser-01"));
    }

    [Fact]
    public async Task Tc43_SignedInUserAndBots_AreNotCounted()
    {
        var before = await TodayAsync();

        Assert.False(await RecordAsync(VisitType.View, new VisitSource(true, Guest.UserAgent)));
        Assert.False(await RecordAsync(VisitType.Open, new VisitSource(true, Guest.UserAgent)));
        Assert.False(await RecordAsync(VisitType.View, new VisitSource(false, "facebookexternalhit/1.1")));

        var after = await TodayAsync();
        Assert.Equal((before.Views, before.Opens), (after.Views, after.Opens));
    }

    [Fact]
    public async Task HiddenDemo_IsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => RecordAsync(VisitType.View, slug: "hrm-cham-cong-tinh-luong"));
    }

    [Fact]
    public async Task Report_SeedHasNinetyDaysAndTopTen()
    {
        var to = new DateOnly(2026, 10, 13);
        var report = await _host.CallAsync<IVisitReportService, VisitReport>(s =>
            s.GetVisitReportAsync(new VisitReportQuery { From = to.AddDays(-89), To = to }));

        Assert.Equal(90, report.Daily.Count);
        Assert.Equal(10, report.TopDemos.Count);
        Assert.True(report.Totals.Views > 0);
        Assert.Equal(VisitMetrics.OpenRate(report.Totals.Opens, report.Totals.Views), report.Totals.OpenRate);
        Assert.Equal(report.Totals.Views, report.ByDevice.Sum(d => d.Views));
        Assert.InRange(report.ByIndustry.Sum(i => i.Share), 99.8, 100.2);
    }

    [Fact]
    public async Task CleanupJob_RemovesRawVisitsOlderThanTwoDays()
    {
        Assert.True(await RecordAsync(VisitType.View));
        var job = await _host.RunAsync(sp => Task.FromResult(sp.GetServices<IHostedService>().OfType<DemoVisitCleanupJob>().Single()));

        Assert.Equal(0, await job.CleanupAsync(CancellationToken.None));
        _host.Time.Advance(TimeSpan.FromDays(2) + TimeSpan.FromMinutes(1));
        Assert.Equal(1, await job.CleanupAsync(CancellationToken.None));
    }
}
