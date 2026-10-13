using Domain.Base;
using Domain.Enums.Cms.Demos;

namespace Domain.Entities.Cms.Demos;

/// <summary>Một lần đổi trạng thái phát triển (<c>Cms_DemoStatusHistories</c>, FR-21, BR-11).</summary>
public class DemoStatusHistory : BaseEntity, ICreationTracked, IModificationTracked
{
    private DemoStatusHistory()
    {
    }

    internal DemoStatusHistory(Guid demoId, DemoDevStatus? fromStatus, DemoDevStatus toStatus, string? reason, string changedByName, DateTime changedAt)
    {
        DemoId = demoId;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        ChangedByName = changedByName;
        ChangedAt = changedAt;
    }

    public Guid DemoId { get; private set; }

    /// <summary>null khi tạo mới.</summary>
    public DemoDevStatus? FromStatus { get; private set; }

    public DemoDevStatus ToStatus { get; private set; }

    /// <summary>Bắt buộc 10–500 ký tự khi lùi bậc.</summary>
    public string? Reason { get; private set; }

    /// <summary>Tên đăng nhập người đổi.</summary>
    public string ChangedByName { get; private set; } = string.Empty;

    public DateTime ChangedAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
