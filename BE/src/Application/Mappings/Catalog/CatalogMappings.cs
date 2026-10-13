using Application.DTOs.Catalog;
using Domain.Entities.Cms.Demos;
using Domain.Entities.Cms.Industries;

namespace Application.Mappings.Catalog;

/// <summary>
/// Ánh xạ sang DTO công khai (07-DANH-SACH-API §2). Chỉ chép trường công khai; không bao giờ chép mật khẩu demo,
/// ghi chú nội bộ, kịch bản, câu hỏi thường gặp, Swagger, repo, người phụ trách (BR-10).
/// </summary>
public static class CatalogMappings
{
    public static PublicIndustry ToPublicIndustry(this Industry industry, int count) => new()
    {
        Slug = industry.Slug,
        Name = industry.Name,
        Icon = industry.Icon,
        Color = industry.Color,
        SortOrder = industry.SortOrder,
        Count = count
    };

    /// <summary>Thẻ danh mục. Cần <c>Include(Industry)</c> và <c>Include(Screenshots)</c>.</summary>
    public static PublicDemoCard ToPublicCard(this Demo demo) => new()
    {
        Slug = demo.Slug,
        Name = demo.Name,
        Industry = demo.Industry.ToPublicDemoIndustry(),
        ShortDescription = demo.ShortDescription,
        CoverUrl = demo.Cover?.Url,
        DevStatus = demo.DevStatus,
        IsComingSoon = demo.IsComingSoon,
        DemoUrl = demo.IsComingSoon ? null : demo.DemoUrl,
        IsFeatured = demo.IsFeaturedOnCatalog,
        SortOrder = demo.SortOrder,
        Features = demo.Features.ToList(),
        Keywords = demo.Keywords.ToList()
    };

    /// <summary>Trang chi tiết công khai. Cần thêm <c>Include(Accounts)</c>.</summary>
    public static PublicDemoDetail ToPublicDetail(this Demo demo, IReadOnlyList<PublicDemoCard> related) => new(demo.ToPublicCard())
    {
        TargetCustomers = demo.TargetCustomers,
        ProblemSolved = demo.ProblemSolved,
        Description = demo.Description,
        ProductType = demo.ProductType,
        Devices = demo.Devices,
        RequiresLogin = demo.RequiresLogin,
        Accounts = demo.RequiresLogin
            ? demo.Accounts.OrderBy(a => a.SortOrder)
                .Select(a => new PublicDemoAccount { Username = a.Username, RoleName = a.RoleName, Purpose = a.Purpose })
                .ToList()
            : [],
        Screenshots = demo.OrderedScreenshots
            .Select(s => new PublicScreenshot { Url = s.Url, Caption = s.Caption, Width = s.Width, Height = s.Height, IsCover = s.IsCover })
            .ToList(),
        Related = related,
        UpdatedAt = demo.UpdatedAt ?? demo.CreatedAt
    };

    private static PublicDemoIndustry ToPublicDemoIndustry(this Industry industry) => new()
    {
        Slug = industry.Slug,
        Name = industry.Name,
        Color = industry.Color,
        Icon = industry.Icon
    };
}
