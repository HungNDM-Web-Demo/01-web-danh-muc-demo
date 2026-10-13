namespace Infrastructure.Extensions;

/// <summary>
/// Mẫu tìm kiếm cho <c>EF.Functions.Like</c>. Dùng LIKE thay cho <c>Contains</c> để tìm không phân biệt hoa thường
/// trên cả SQL Server lẫn SQLite (SQLite chỉ không phân biệt với chữ không dấu).
/// </summary>
/// <example>
/// <code>
/// var pattern = LikePattern.Contains(term);
/// query = query.Where(x => EF.Functions.Like(x.Name, pattern, LikePattern.EscapeCharacter));
/// </code>
/// </example>
public static class LikePattern
{
    public const string EscapeCharacter = "\\";

    /// <summary>Mẫu "chứa chuỗi", đã thoát các ký tự đặc biệt của LIKE.</summary>
    public static string Contains(string term) => $"%{Escape(term)}%";

    public static string Escape(string term) =>
        term.Replace(EscapeCharacter, EscapeCharacter + EscapeCharacter, StringComparison.Ordinal)
            .Replace("%", EscapeCharacter + "%", StringComparison.Ordinal)
            .Replace("_", EscapeCharacter + "_", StringComparison.Ordinal)
            .Replace("[", EscapeCharacter + "[", StringComparison.Ordinal);
}
