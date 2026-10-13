using Application;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Common;
using Domain.Entities.System.Users;
using Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace UnitTests.TestSupport;

/// <summary>
/// DI thật của Application + Infrastructure trên SQLite trong bộ nhớ, <c>DEMO_MODE=true</c> nên dữ liệu mẫu
/// <c>demo-data.json</c> được nạp như khi chạy thật. Đồng hồ giả: 09:00 ngày 13/10/2026 giờ Việt Nam.
/// Người dùng hiện tại đổi được qua <see cref="SignInAsync"/>.
/// </summary>
public sealed class CmsTestHost : IAsyncDisposable
{
    public const string DemoPassword = "Demo@123";

    private readonly SqliteConnection _keepAlive;
    private readonly ServiceProvider _services;

    private CmsTestHost(SqliteConnection keepAlive, ServiceProvider services, FakeTimeProvider time, TestCurrentUser currentUser)
    {
        _keepAlive = keepAlive;
        _services = services;
        Time = time;
        CurrentUser = currentUser;
    }

    public FakeTimeProvider Time { get; }

    public TestCurrentUser CurrentUser { get; }

    /// <param name="configureServices">Đăng ký thêm (sau DI thật), vd thay một repository để giả lập tình huống đặc biệt.</param>
    public static async Task<CmsTestHost> StartAsync(Action<IServiceCollection>? configureServices = null)
    {
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 13, 2, 0, 0, TimeSpan.Zero));
        var connectionString = $"Data Source=cms-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";

        // Giữ một kết nối mở để DB SQLite trong bộ nhớ tồn tại suốt bài test.
        var keepAlive = new SqliteConnection(connectionString);
        await keepAlive.OpenAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "Sqlite",
                ["Database:ConnectionString"] = connectionString,
                ["Jwt:Key"] = new string('k', 48),
                ["Jwt:Issuer"] = "unit-test",
                ["Jwt:Audience"] = "unit-test",
                ["Demo:Enabled"] = "true",
                ["Demo:Password"] = DemoPassword
            })
            .Build();

        var currentUser = new TestCurrentUser();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<TimeProvider>(time);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment());

        // Đăng ký trước AddInfrastructure: bản quét tự động dùng TryAdd nên giữ bản giả này.
        services.AddSingleton<ICurrentUserService>(currentUser);
        services.AddApplication();
        services.AddInfrastructure(configuration);
        configureServices?.Invoke(services);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });

        await provider.InitializeDatabaseAsync();
        return new CmsTestHost(keepAlive, provider, time, currentUser);
    }

    /// <summary>Chạy <paramref name="action"/> trong một scope mới (như một request).</summary>
    public async Task<T> RunAsync<T>(Func<IServiceProvider, Task<T>> action)
    {
        await using var scope = _services.CreateAsyncScope();
        return await action(scope.ServiceProvider);
    }

    public async Task RunAsync(Func<IServiceProvider, Task> action)
    {
        await using var scope = _services.CreateAsyncScope();
        await action(scope.ServiceProvider);
    }

    /// <summary>Lấy service trong scope mới rồi gọi.</summary>
    public Task<T> CallAsync<TService, T>(Func<TService, Task<T>> action)
        where TService : notnull =>
        RunAsync(sp => action(sp.GetRequiredService<TService>()));

    public Task CallAsync<TService>(Func<TService, Task> action)
        where TService : notnull =>
        RunAsync(sp => action(sp.GetRequiredService<TService>()));

    /// <summary>Đặt người dùng hiện tại là tài khoản demo <paramref name="username"/>; null là khách.</summary>
    public async Task SignInAsync(string? username)
    {
        if (username is null)
        {
            CurrentUser.Set(null, null);
            return;
        }

        var userId = await RunAsync(sp => sp.GetRequiredService<IGenericRepository<User>>()
            .QueryNoTracking()
            .Where(u => u.Username == username)
            .Select(u => u.Id)
            .SingleAsync());
        CurrentUser.Set(userId, username);
    }

    public async ValueTask DisposeAsync()
    {
        await _services.DisposeAsync();
        await _keepAlive.DisposeAsync();
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "UnitTests";
        public string ContentRootPath { get; set; } = Path.Combine(AppContext.BaseDirectory, "cms-test-root");
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

/// <summary>Người dùng hiện tại giả, đổi được giữa các bước test.</summary>
public sealed class TestCurrentUser : ICurrentUserService
{
    public Guid? UserId { get; private set; }
    public string? Username { get; private set; }
    public Guid? SessionId => null;
    public bool IsAuthenticated => UserId.HasValue;
    public string? IpAddress => "127.0.0.1";

    public void Set(Guid? userId, string? username)
    {
        UserId = userId;
        Username = username;
    }
}
