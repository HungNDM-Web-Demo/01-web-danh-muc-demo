using Application;
using Application.DTOs.Auth;
using Application.Interfaces.Services.Auth;
using Domain.Common;
using Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using UnitTests.TestSupport;

namespace UnitTests.Auth;

/// <summary>
/// BR-SYS-03 qua AuthService thật (DI của Infrastructure, SQLite trong bộ nhớ, đồng hồ giả):
/// sai 5 lần liên tiếp thì tạm khóa đăng nhập 5 phút, kể cả nhập đúng mật khẩu.
/// Sai thông tin: UnauthorizedAccessException (401); tạm khóa: DomainException (400).
/// </summary>
public sealed class LoginLockoutTests : IAsyncLifetime
{
    private const string DemoPassword = "Demo@123";

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 13, 2, 0, 0, TimeSpan.Zero));
    private readonly string _connectionString = $"Data Source=lockout-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private SqliteConnection _keepAlive = null!;
    private ServiceProvider _services = null!;

    public async Task InitializeAsync()
    {
        // Giữ một kết nối mở để DB SQLite trong bộ nhớ tồn tại suốt bài test.
        _keepAlive = new SqliteConnection(_connectionString);
        await _keepAlive.OpenAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "Sqlite",
                ["Database:ConnectionString"] = _connectionString,
                ["Jwt:Key"] = new string('k', 48),
                ["Jwt:Issuer"] = "unit-test",
                ["Jwt:Audience"] = "unit-test",
                ["Demo:Enabled"] = "false",
                ["Demo:Password"] = DemoPassword
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<TimeProvider>(_time);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment());
        services.AddApplication();
        services.AddInfrastructure(configuration);
        _services = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });

        await _services.InitializeDatabaseAsync();
    }

    public async Task DisposeAsync()
    {
        await _services.DisposeAsync();
        await _keepAlive.DisposeAsync();
    }

    [Fact]
    public async Task FiveWrongPasswords_LockLoginForFiveMinutes()
    {
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => LoginAsync("nhanvien", "SaiMatKhau1"));
            Assert.Equal("Tên đăng nhập hoặc mật khẩu không đúng", error.Message);
        }

        var fifth = await Assert.ThrowsAsync<DomainException>(() => LoginAsync("nhanvien", "SaiMatKhau1"));
        Assert.Equal("Tài khoản tạm khóa đăng nhập, thử lại sau 5 phút", fifth.Message);

        // Đang tạm khóa: mật khẩu đúng vẫn bị từ chối.
        _time.Advance(TimeSpan.FromMinutes(4));
        var whileLocked = await Assert.ThrowsAsync<DomainException>(() => LoginAsync("nhanvien", DemoPassword));
        Assert.Equal("Tài khoản tạm khóa đăng nhập, thử lại sau 1 phút", whileLocked.Message);

        // Hết 5 phút: đăng nhập lại được.
        _time.Advance(TimeSpan.FromMinutes(1));
        var response = await LoginAsync("nhanvien", DemoPassword);
        Assert.Equal("nhanvien", response.User.Username);
        Assert.Equal(["STAFF"], response.User.Roles);
        Assert.Equal(["Nhân viên"], response.User.RoleNames);
    }

    [Fact]
    public async Task SuccessfulLogin_ResetsFailedAttempts()
    {
        for (var attempt = 1; attempt <= 4; attempt++)
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => LoginAsync("quanly", "SaiMatKhau1"));

        await LoginAsync("quanly", DemoPassword);

        // Đã đếm lại từ đầu: thêm 4 lần sai nữa vẫn chưa bị khóa.
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => LoginAsync("quanly", "SaiMatKhau1"));
            Assert.Equal("Tên đăng nhập hoặc mật khẩu không đúng", error.Message);
        }
    }

    [Fact]
    public async Task UnknownUsername_ReturnsGenericMessage()
    {
        var error = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => LoginAsync("khongton.tai", DemoPassword));

        Assert.Equal("Tên đăng nhập hoặc mật khẩu không đúng", error.Message);
    }

    private async Task<AuthResponse> LoginAsync(string username, string password)
    {
        await using var scope = _services.CreateAsyncScope();
        var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
        return await auth.LoginAsync(new LoginRequest { Username = username, Password = password });
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "UnitTests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
