using Domain.Entities.Cms.DemoVisits;
using Domain.Enums.Cms.DemoVisits;

namespace UnitTests.Cms;

/// <summary>BR-15: tỉ lệ mở; BR-14: nhận diện bot; cộng dồn số liệu ngày.</summary>
public class VisitMetricsTests
{
    [Theory]
    [InlineData(137, 412, 33.3)]
    [InlineData(1, 3, 33.3)]
    [InlineData(2, 3, 66.7)]
    [InlineData(1, 8, 12.5)]
    [InlineData(3, 3, 100.0)]
    [InlineData(0, 10, 0.0)]
    public void OpenRate_RoundsToOneDecimal(int opens, int views, double expected) =>
        Assert.Equal(expected, VisitMetrics.OpenRate(opens, views));

    [Fact]
    public void OpenRate_NoViews_IsNull() => Assert.Null(VisitMetrics.OpenRate(5, 0));

    [Fact]
    public void Share_ZeroTotal_IsZero() => Assert.Equal(0, VisitMetrics.Share(0, 0));

    [Theory]
    [InlineData("Mozilla/5.0 (compatible; Googlebot/2.1)", true)]
    [InlineData("facebookexternalhit/1.1", true)]
    [InlineData("Some Crawler", true)]
    [InlineData("Baiduspider", true)]
    [InlineData("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", false)]
    [InlineData(null, false)]
    public void IsBot_MatchesBr14(string? userAgent, bool expected) =>
        Assert.Equal(expected, VisitMetrics.IsBot(userAgent));

    [Fact]
    public void Stat_Add_CountsViewsByDeviceAndOpens()
    {
        var stat = DemoVisitStat.Create(Guid.NewGuid(), new DateOnly(2026, 10, 13));

        stat.Add(VisitType.View, VisitDevice.Mobile);
        stat.Add(VisitType.View, VisitDevice.Desktop);
        stat.Add(VisitType.Open, VisitDevice.Mobile);

        Assert.Equal(2, stat.Views);
        Assert.Equal(1, stat.Opens);
        Assert.Equal(1, stat.MobileViews);
        Assert.Equal(1, stat.DesktopViews);
    }
}
