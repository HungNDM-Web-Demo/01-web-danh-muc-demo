namespace Infrastructure.Options;

public enum DatabaseProvider
{
    /// <summary>SQL Server, tạo bảng bằng migration trong Infrastructure/Migrations.</summary>
    SqlServer,

    /// <summary>SQLite cho demo mang đi, tạo bảng bằng EnsureCreated (không dùng migration).</summary>
    Sqlite
}
