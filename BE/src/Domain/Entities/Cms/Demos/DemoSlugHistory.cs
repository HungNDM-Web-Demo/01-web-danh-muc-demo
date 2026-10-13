using Domain.Base;

namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Slug cũ của demo đã từng công khai (<c>Cms_DemoSlugHistories</c>, BR-06): mở slug cũ thì chuyển hướng 301 tới slug mới;
/// slug cũ không được dùng lại cho demo khác.
/// </summary>
public class DemoSlugHistory : BaseEntity, ICreationTracked, IModificationTracked
{
    private DemoSlugHistory()
    {
    }

    internal DemoSlugHistory(Guid demoId, string slug, DateTime changedAt)
    {
        DemoId = demoId;
        Slug = slug;
        ChangedAt = changedAt;
    }

    public Guid DemoId { get; private set; }
    public string Slug { get; private set; } = string.Empty;
    public DateTime ChangedAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
