using Domain.Base;
using Domain.Common;

namespace Domain.Entities.Cms.Industries;

/// <summary>Nhóm ngành dùng để lọc demo trên danh mục (<c>Cms_Industries</c>, FR-25, BR-13).</summary>
public class Industry : BaseEntity, ICreationTracked, IModificationTracked
{
    public const int CodeMin = 1;
    public const int CodeMax = 99;
    public const int NameMaxLength = 60;
    public const int SlugMaxLength = 40;
    public const int IconMaxLength = 40;
    public const int ColorMaxLength = 20;
    public const int DescriptionMaxLength = 300;

    private Industry()
    {
    }

    /// <summary>Mã nhóm theo DANH-SACH-Y-TUONG (1 F&amp;B … 11 Ngành khác).</summary>
    public short Code { get; private set; }

    /// <summary>Tên trên nút lọc.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Slug dùng trong tham số <c>?nganh=</c>, vd <c>fnb</c>.</summary>
    public string Slug { get; private set; } = string.Empty;

    /// <summary>Tên icon lucide, vd <c>UtensilsCrossed</c>.</summary>
    public string? Icon { get; private set; }

    /// <summary>Màu nhãn và ảnh mặc định, dạng <c>#RRGGBB</c>.</summary>
    public string Color { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    /// <summary>Thứ tự nút trên danh mục.</summary>
    public int SortOrder { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static Industry Create(int code, string name, string slug, string? icon, string color, string? description, int sortOrder)
    {
        var industry = new Industry { SortOrder = sortOrder };
        industry.Update(code, name, slug, icon, color, description);
        return industry;
    }

    public void Update(int code, string name, string slug, string? icon, string color, string? description)
    {
        if (code is < CodeMin or > CodeMax)
            throw new DomainException($"Mã nhóm là số nguyên từ {CodeMin} đến {CodeMax}");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Nhập tên nhóm ngành");
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainException("Nhập slug nhóm ngành");
        if (string.IsNullOrWhiteSpace(color))
            throw new DomainException("Nhập màu nhãn");

        Code = (short)code;
        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        Icon = TrimToNull(icon);
        Color = color.Trim().ToUpperInvariant();
        Description = TrimToNull(description);
    }

    public void SetSortOrder(int sortOrder) => SortOrder = sortOrder;

    /// <summary>BR-13: không xóa nhóm còn demo.</summary>
    public static void EnsureCanBeDeleted(int demoCount)
    {
        if (demoCount > 0)
            throw new DomainException($"Nhóm đang có {demoCount} demo", new Dictionary<string, object?> { ["demoCount"] = demoCount });
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
