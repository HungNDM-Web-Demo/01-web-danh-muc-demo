using Infrastructure.Options;
using Infrastructure.Persistence.Seeders;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Persistence;

/// <summary>
/// Chuẩn bị DB lúc khởi động: SQL Server chạy migration, SQLite tạo bảng bằng EnsureCreated;
/// sau đó đồng bộ dữ liệu nền (SystemSeeder); nếu <c>DEMO_MODE=true</c> và chưa có dữ liệu nghiệp vụ thì nạp dữ liệu mẫu.
/// </summary>
public sealed class DatabaseInitializer(
    AppDbContext db,
    SystemSeeder systemSeeder,
    IDemoDataSeeder demoDataSeeder,
    IOptions<DatabaseOptions> databaseOptions,
    IOptions<DemoOptions> demoOptions,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        var database = databaseOptions.Value;
        if (database.Provider == DatabaseProvider.Sqlite)
        {
            EnsureSqliteDirectory(database.ConnectionString);
            await db.Database.EnsureCreatedAsync(ct);
        }
        else
        {
            await db.Database.MigrateAsync(ct);
        }

        logger.LogInformation("CSDL sẵn sàng ({Provider}).", database.Provider);

        await systemSeeder.SeedAsync(ct);

        if (demoOptions.Value.Enabled && !await demoDataSeeder.HasDataAsync(ct))
        {
            db.SuppressAuditLog = true;
            try
            {
                await demoDataSeeder.SeedAsync(ct);
            }
            finally
            {
                db.SuppressAuditLog = false;
            }

            logger.LogInformation("DB chưa có dữ liệu nghiệp vụ, đã chạy {Seeder}.", demoDataSeeder.GetType().Name);
        }
    }

    private static void EnsureSqliteDirectory(string connectionString)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.DataSource) || builder.DataSource == ":memory:" || builder.Mode == SqliteOpenMode.Memory)
            return;

        var directory = Path.GetDirectoryName(Path.GetFullPath(builder.DataSource));
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);
    }
}
