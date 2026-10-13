using Domain.Entities.Cms.DemoVisits;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.BackgroundJobs;

/// <summary>
/// Dọn sự kiện truy cập thô <c>Cms_DemoVisits</c> cũ hơn 2 ngày (06-THIET-KE-CSDL). Bảng này chỉ dùng chống tính trùng
/// 30 phút (BR-14); số liệu báo cáo nằm ở <c>Cms_DemoVisitStats</c> nên không mất. Chạy lúc khởi động rồi mỗi 6 giờ.
/// </summary>
public sealed class DemoVisitCleanupJob(
    IServiceScopeFactory scopeFactory,
    TimeProvider timeProvider,
    ILogger<DemoVisitCleanupJob> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await CleanupAsync(stoppingToken);
                await Task.Delay(Interval, timeProvider, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Ứng dụng đang dừng.
        }
    }

    /// <summary>Xóa sự kiện cũ hơn <see cref="DemoVisit.RetentionPeriod"/>; trả số dòng đã xóa.</summary>
    public async Task<int> CleanupAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var threshold = timeProvider.GetUtcNow().UtcDateTime - DemoVisit.RetentionPeriod;
            var deleted = await db.Set<DemoVisit>().Where(v => v.OccurredAt < threshold).ExecuteDeleteAsync(ct);
            if (deleted > 0)
                logger.LogInformation("Đã dọn {Count} lượt truy cập thô cũ hơn 2 ngày.", deleted);
            return deleted;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Dọn lượt truy cập thô thất bại.");
            return 0;
        }
    }
}
