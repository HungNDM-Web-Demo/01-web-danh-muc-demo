using System.Globalization;

namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Thứ tự trên danh mục công khai (BR-04): (1) demo công khai trước demo Sắp ra mắt; (2) trong mỗi phần, demo nổi bật
/// trước; (3) thứ tự tăng dần; (4) tên từ A đến Z (so sánh theo tiếng Việt, không phân biệt hoa thường).
/// </summary>
public sealed class DemoCatalogOrder : IComparer<Demo>
{
    private static readonly StringComparer NameComparer =
        StringComparer.Create(CultureInfo.GetCultureInfo("vi-VN"), CompareOptions.IgnoreCase);

    public static DemoCatalogOrder Instance { get; } = new();

    /// <summary>Sắp xếp danh sách demo theo BR-04.</summary>
    public static IReadOnlyList<Demo> Sort(IEnumerable<Demo> demos) => demos.Order(Instance).ToList();

    public int Compare(Demo? x, Demo? y)
    {
        if (ReferenceEquals(x, y))
            return 0;
        if (x is null)
            return -1;
        if (y is null)
            return 1;

        if (x.IsComingSoon != y.IsComingSoon)
            return x.IsComingSoon ? 1 : -1;
        if (x.IsFeaturedOnCatalog != y.IsFeaturedOnCatalog)
            return x.IsFeaturedOnCatalog ? -1 : 1;
        if (x.SortOrder != y.SortOrder)
            return x.SortOrder.CompareTo(y.SortOrder);

        return NameComparer.Compare(x.Name, y.Name);
    }

    /// <summary>Thứ tự bảng quản trị: thứ tự tăng dần, rồi tên.</summary>
    public static int CompareAdmin(Demo x, Demo y)
    {
        var bySort = x.SortOrder.CompareTo(y.SortOrder);
        return bySort != 0 ? bySort : NameComparer.Compare(x.Name, y.Name);
    }
}
