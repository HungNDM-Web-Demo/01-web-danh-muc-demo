using Domain.Base;
using Domain.Enums.Cms.DemoVisits;

namespace Domain.Entities.Cms.DemoVisits;

/// <summary>
/// Sự kiện xem chi tiết hoặc mở demo của khách, dạng thô (<c>Cms_DemoVisits</c>). Chỉ dùng chống tính trùng 30 phút
/// (BR-14); job dọn bản ghi cũ hơn 2 ngày. Báo cáo đọc <see cref="DemoVisitStat"/>.
/// </summary>
public class DemoVisit : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    public const int VisitorIdMinLength = 16;
    public const int VisitorIdMaxLength = 64;
    public const int ReferrerMaxLength = 300;

    /// <summary>BR-14: cùng trình duyệt, cùng demo, cùng loại trong 30 phút chỉ tính 1 lượt.</summary>
    public static readonly TimeSpan DedupeWindow = TimeSpan.FromMinutes(30);

    /// <summary>Thời gian giữ sự kiện thô trước khi dọn.</summary>
    public static readonly TimeSpan RetentionPeriod = TimeSpan.FromDays(2);

    private DemoVisit()
    {
    }

    public Guid DemoId { get; private set; }
    public VisitType Type { get; private set; }

    /// <summary>Mã ngẫu nhiên lưu trên trình duyệt, không chứa thông tin cá nhân.</summary>
    public string VisitorId { get; private set; } = string.Empty;

    public VisitDevice Device { get; private set; }
    public string? Referrer { get; private set; }
    public DateTime OccurredAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static DemoVisit Create(Guid demoId, VisitType type, string visitorId, VisitDevice device, string? referrer, DateTime occurredAt)
    {
        var text = referrer?.Trim();
        return new DemoVisit
        {
            DemoId = demoId,
            Type = type,
            VisitorId = visitorId.Trim(),
            Device = device,
            Referrer = string.IsNullOrEmpty(text) ? null : text.Length > ReferrerMaxLength ? text[..ReferrerMaxLength] : text,
            OccurredAt = occurredAt
        };
    }
}
