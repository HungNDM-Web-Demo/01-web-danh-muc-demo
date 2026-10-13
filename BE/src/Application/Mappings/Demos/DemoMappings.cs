using Application.DTOs.Demos;
using Domain.Entities.Cms.Demos;

namespace Application.Mappings.Demos;

/// <summary>Ánh xạ viết tay cho quản lý demo (07-DANH-SACH-API §3).</summary>
public static class DemoMappings
{
    /// <summary>
    /// Dòng bảng quản trị. Cần <c>Include(Industry)</c> và <c>Include(Screenshots)</c>.
    /// <paramref name="withInternal"/>: người gọi có <c>demos.view-internal</c> thì mới có người phụ trách (BR-10).
    /// </summary>
    public static DemoListItem ToListItem(this Demo demo, bool withInternal) => new()
    {
        Id = demo.Id,
        Number = demo.Number,
        Folder = demo.Folder,
        ProjectCode = demo.ProjectCode,
        Name = demo.Name,
        Slug = demo.Slug,
        Industry = new DemoListIndustry
        {
            Id = demo.IndustryId,
            Slug = demo.Industry?.Slug ?? string.Empty,
            Name = demo.Industry?.Name ?? "Chưa phân nhóm",
            Color = demo.Industry?.Color ?? "#475569"
        },
        DevStatus = demo.DevStatus,
        IsVisible = demo.IsVisible,
        IsFeatured = demo.IsFeatured,
        SortOrder = demo.SortOrder,
        CoverUrl = demo.Cover?.Url,
        ScreenshotCount = demo.Screenshots.Count,
        OwnerName = withInternal ? demo.OwnerName : null,
        EverPublished = demo.EverPublished,
        UpdatedAt = demo.UpdatedAt ?? demo.CreatedAt
    };

    /// <summary>
    /// Chi tiết quản trị. Cần nạp ảnh chụp, tài khoản, câu hỏi, slug cũ. Phần <c>internal</c> chỉ có khi
    /// <paramref name="withInternal"/> (BR-10).
    /// </summary>
    public static DemoDetail ToDetail(this Demo demo, bool withInternal)
    {
        var missing = demo.GetVisibilityMissing();
        return new DemoDetail
        {
            Id = demo.Id,
            Number = demo.Number,
            ProjectCode = demo.ProjectCode,
            Folder = demo.Folder,
            Name = demo.Name,
            Slug = demo.Slug,
            OldSlugs = demo.SlugHistories.OrderBy(h => h.ChangedAt).Select(h => h.Slug).ToList(),
            IndustryId = demo.IndustryId,
            IdeaCode = demo.IdeaCode,
            TargetCustomers = demo.TargetCustomers,
            ProblemSolved = demo.ProblemSolved,
            ProductType = demo.ProductType,
            Devices = demo.Devices,
            ShortDescription = demo.ShortDescription,
            Description = demo.Description,
            Features = demo.Features.ToList(),
            Keywords = demo.Keywords.ToList(),
            DemoUrl = demo.DemoUrl,
            RequiresLogin = demo.RequiresLogin,
            Accounts = demo.Accounts.OrderBy(a => a.SortOrder).Select(a => a.ToItem()).ToList(),
            Screenshots = demo.OrderedScreenshots.Select(s => s.ToDto()).ToList(),
            DevStatus = demo.DevStatus,
            IsVisible = demo.IsVisible,
            IsFeatured = demo.IsFeatured,
            SortOrder = demo.SortOrder,
            FirstPublishedAt = demo.FirstPublishedAt,
            UpdatedAt = demo.UpdatedAt ?? demo.CreatedAt,
            VisibilityCheck = new VisibilityCheck { CanShow = missing.Count == 0, Missing = missing },
            Internal = withInternal
                ? new DemoInternalInfo
                {
                    SwaggerUrl = demo.SwaggerUrl,
                    RepoUrl = demo.RepoUrl,
                    OwnerName = demo.OwnerName,
                    DemoPassword = demo.DemoPassword,
                    InternalNotes = demo.InternalNotes,
                    DemoScript = demo.DemoScript,
                    Faqs = demo.Faqs.OrderBy(f => f.SortOrder).Select(f => new DemoFaqItem { Question = f.Question, Answer = f.Answer }).ToList()
                }
                : null
        };
    }

    public static DemoScreenshotDto ToDto(this DemoScreenshot screenshot) => new()
    {
        Id = screenshot.Id,
        Url = screenshot.Url,
        Caption = screenshot.Caption,
        Width = screenshot.Width,
        Height = screenshot.Height,
        SizeBytes = screenshot.SizeBytes,
        SortOrder = screenshot.SortOrder,
        IsCover = screenshot.IsCover
    };

    public static DemoAccountItem ToItem(this DemoAccount account) => new()
    {
        Username = account.Username,
        RoleName = account.RoleName,
        Purpose = account.Purpose
    };

    public static StatusHistoryItem ToItem(this DemoStatusHistory history) => new()
    {
        FromStatus = history.FromStatus,
        ToStatus = history.ToStatus,
        Reason = history.Reason,
        ChangedByName = history.ChangedByName,
        ChangedAt = history.ChangedAt
    };

    /// <summary>Dữ liệu form thêm, sửa demo sang dữ liệu nghiệp vụ; danh sách null coi là rỗng.</summary>
    public static DemoContent ToContent(this SaveDemoRequest request) => new()
    {
        Number = request.Number,
        Name = request.Name ?? string.Empty,
        Slug = request.Slug ?? string.Empty,
        IndustryId = request.IndustryId,
        IdeaCode = request.IdeaCode,
        TargetCustomers = request.TargetCustomers,
        ProblemSolved = request.ProblemSolved,
        ProductType = request.ProductType,
        Devices = request.Devices,
        ShortDescription = request.ShortDescription,
        Description = request.Description,
        Features = request.Features ?? [],
        Keywords = request.Keywords ?? [],
        DemoUrl = request.DemoUrl,
        SwaggerUrl = request.SwaggerUrl,
        RepoUrl = request.RepoUrl,
        OwnerName = request.OwnerName,
        RequiresLogin = request.RequiresLogin,
        DemoPassword = request.DemoPassword,
        InternalNotes = request.InternalNotes,
        DemoScript = request.DemoScript,
        Accounts = (request.Accounts ?? [])
            .Select(a => new DemoAccountData(a.Username ?? string.Empty, a.RoleName ?? string.Empty, a.Purpose))
            .ToList(),
        Faqs = (request.Faqs ?? [])
            .Select(f => new DemoFaqData(f.Question ?? string.Empty, f.Answer ?? string.Empty))
            .ToList()
    };
}
