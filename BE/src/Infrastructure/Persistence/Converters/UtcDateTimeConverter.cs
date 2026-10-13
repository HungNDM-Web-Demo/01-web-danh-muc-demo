using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Infrastructure.Persistence.Converters;

/// <summary>Ghi DB dạng UTC; đọc ra gắn Kind = Utc (SQL Server, SQLite trả về Kind = Unspecified).</summary>
public sealed class UtcDateTimeConverter()
    : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : v,
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
