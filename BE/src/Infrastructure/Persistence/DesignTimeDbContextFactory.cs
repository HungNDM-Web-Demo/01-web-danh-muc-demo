using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Infrastructure.Persistence;

/// <summary>
/// Tạo AppDbContext cho lệnh <c>dotnet ef</c> (BE-CAU-TRUC-THU-MUC §5). Đọc <c>CONNECTION_STRING</c> từ src/API/.env.
/// Migration chỉ dành cho SQL Server; khi .env đang dùng SQLite hoặc chưa có .env thì dùng chuỗi kết nối mặc định
/// (lệnh <c>migrations add</c> không cần kết nối DB, <c>database update</c> thì cần).
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string DefaultConnectionString =
        "Server=localhost;Database=WebDemo_WebDanhMucDemo;Trusted_Connection=True;TrustServerCertificate=True";

    public AppDbContext CreateDbContext(string[] args)
    {
        LoadEnvFile();

        var provider = Environment.GetEnvironmentVariable("DB_PROVIDER");
        var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
        var isSqlServer = string.IsNullOrWhiteSpace(provider) || provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase);
        if (!isSqlServer || string.IsNullOrWhiteSpace(connectionString))
            connectionString = DefaultConnectionString;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static void LoadEnvFile()
    {
        var current = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(current, "src", "API", ".env"),
            Path.Combine(current, "..", "API", ".env"),
            Path.Combine(current, ".env")
        };

        var envFile = candidates.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
        if (envFile is not null)
            DotNetEnv.Env.NoClobber().Load(envFile);
    }
}
