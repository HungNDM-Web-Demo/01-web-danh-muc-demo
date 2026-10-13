namespace Domain.Entities.Cms.DemoVisits;

/// <summary>Chỉ số thống kê lượt xem (BR-15, 02-SRS §6).</summary>
public static class VisitMetrics
{
    /// <summary>
    /// BR-15: tỉ lệ mở demo = lượt mở ÷ lượt xem × 100%, làm tròn 1 chữ số thập phân (nửa làm tròn lên);
    /// lượt xem bằng 0 thì null (FE hiển thị "—").
    /// </summary>
    public static double? OpenRate(long opens, long views) => views <= 0 ? null : Percent(opens, views);

    /// <summary>Tỉ trọng phần trăm, làm tròn 1 chữ số; tổng bằng 0 thì 0.</summary>
    public static double Share(long part, long total) => total <= 0 ? 0 : Percent(part, total);

    private static double Percent(long part, long total) =>
        (double)(Math.Round(part * 1000m / total, MidpointRounding.AwayFromZero) / 10m);

    /// <summary>BR-14: user agent của bot không được tính lượt.</summary>
    public static bool IsBot(string? userAgent) =>
        !string.IsNullOrEmpty(userAgent)
        && (userAgent.Contains("bot", StringComparison.OrdinalIgnoreCase)
            || userAgent.Contains("crawler", StringComparison.OrdinalIgnoreCase)
            || userAgent.Contains("spider", StringComparison.OrdinalIgnoreCase)
            || userAgent.Contains("facebookexternalhit", StringComparison.OrdinalIgnoreCase));
}
