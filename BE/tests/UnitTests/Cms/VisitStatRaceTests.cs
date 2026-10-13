using System.Linq.Expressions;
using Application.DTOs.Catalog;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Catalog;
using Domain.Entities.Cms.DemoVisits;
using Domain.Enums.Cms.DemoVisits;
using Infrastructure.Implementations.Repositories;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UnitTests.TestSupport;

namespace UnitTests.Cms;

/// <summary>
/// Hai lượt đầu tiên trong ngày của cùng demo đến cùng lúc: request đến sau vướng unique (DemoId, Date) khi thêm dòng
/// tổng hợp, phải cộng vào dòng request kia vừa tạo thay vì báo lỗi hay mất lượt.
/// </summary>
public sealed class VisitStatRaceTests : IAsyncLifetime
{
    private const int CompetingViews = 5;

    private CmsTestHost _host = null!;

    public async Task InitializeAsync() =>
        _host = await CmsTestHost.StartAsync(services =>
            services.AddScoped<IGenericRepository<DemoVisitStat>, RacingStatRepository>());

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Fact]
    public async Task FirstVisitsOfDay_ArriveTogether_AreBothCounted()
    {
        // Sang ngày mai (giờ Việt Nam): dữ liệu mẫu chưa có dòng tổng hợp.
        _host.Time.Advance(TimeSpan.FromDays(1));
        var tomorrow = new DateOnly(2026, 10, 14);

        var result = await _host.CallAsync<ICatalogService, RecordVisitResult>(s => s.RecordVisitAsync(
            "pos-quan-cafe",
            new RecordVisitRequest { Type = VisitType.View, VisitorId = "visitor-race-0123456789", Device = VisitDevice.Desktop },
            new VisitSource(false, "Mozilla/5.0")));

        Assert.True(result.Counted);
        var stat = await _host.RunAsync(sp => sp.GetRequiredService<AppDbContext>().Set<DemoVisitStat>()
            .AsNoTracking()
            .SingleAsync(s => s.Date == tomorrow));
        Assert.Equal((CompetingViews + 1, CompetingViews + 1, 0), (stat.Views, stat.DesktopViews, stat.MobileViews));

        var visits = await _host.RunAsync(sp => sp.GetRequiredService<AppDbContext>().Set<DemoVisit>().AsNoTracking().CountAsync());
        Assert.Equal(1, visits);
    }

    /// <summary>
    /// Repository giả: ngay trước khi service thêm dòng tổng hợp mới, một "request khác" (scope riêng) thêm trước dòng
    /// cùng (DemoId, Date). Các thao tác còn lại chuyển cho repository thật.
    /// </summary>
    private sealed class RacingStatRepository(AppDbContext context, IServiceScopeFactory scopeFactory) : IGenericRepository<DemoVisitStat>
    {
        private readonly GenericRepository<DemoVisitStat> _inner = new(context);
        private bool _raced;

        public async Task AddAsync(DemoVisitStat entity, CancellationToken ct = default)
        {
            if (!_raced)
            {
                _raced = true;
                await using var scope = scopeFactory.CreateAsyncScope();
                var other = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                other.Add(DemoVisitStat.Create(entity.DemoId, entity.Date, CompetingViews, 0, 0, CompetingViews));
                await other.SaveChangesAsync(ct);
            }

            await _inner.AddAsync(entity, ct);
        }

        public IQueryable<DemoVisitStat> Query() => _inner.Query();
        public IQueryable<DemoVisitStat> QueryNoTracking() => _inner.QueryNoTracking();
        public Task<DemoVisitStat?> GetByIdAsync(Guid id, CancellationToken ct = default) => _inner.GetByIdAsync(id, ct);
        public Task<bool> AnyAsync(Expression<Func<DemoVisitStat, bool>> predicate, CancellationToken ct = default) => _inner.AnyAsync(predicate, ct);
        public Task AddRangeAsync(IEnumerable<DemoVisitStat> entities, CancellationToken ct = default) => _inner.AddRangeAsync(entities, ct);
        public void Update(DemoVisitStat entity) => _inner.Update(entity);
        public void Delete(DemoVisitStat entity) => _inner.Delete(entity);
        public void DeleteRange(IEnumerable<DemoVisitStat> entities) => _inner.DeleteRange(entities);
    }
}
