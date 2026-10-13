using Domain.Base;
using Domain.Enums.Cms.DemoVisits;

namespace Domain.Entities.Cms.DemoVisits;

/// <summary>
/// Lượt xem, lượt mở demo tổng hợp theo ngày giờ Việt Nam (<c>Cms_DemoVisitStats</c>, FR-27, FR-28).
/// Mỗi sự kiện được tính cộng thẳng vào dòng của ngày đó.
/// </summary>
public class DemoVisitStat : BaseEntity, ICreationTracked, IModificationTracked, IAuditLogExempt
{
    private DemoVisitStat()
    {
    }

    public Guid DemoId { get; private set; }

    /// <summary>Ngày theo giờ Việt Nam.</summary>
    public DateOnly Date { get; private set; }

    public int Views { get; private set; }
    public int Opens { get; private set; }
    public int MobileViews { get; private set; }
    public int DesktopViews { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public static DemoVisitStat Create(Guid demoId, DateOnly date) => new() { DemoId = demoId, Date = date };

    /// <summary>Dòng tổng hợp có sẵn số liệu, dùng khi nạp dữ liệu mẫu.</summary>
    public static DemoVisitStat Create(Guid demoId, DateOnly date, int views, int opens, int mobileViews, int desktopViews) =>
        new()
        {
            DemoId = demoId,
            Date = date,
            Views = Math.Max(0, views),
            Opens = Math.Max(0, opens),
            MobileViews = Math.Max(0, mobileViews),
            DesktopViews = Math.Max(0, desktopViews)
        };

    /// <summary>Cộng một sự kiện đã được tính (không trùng).</summary>
    public void Add(VisitType type, VisitDevice device)
    {
        if (type == VisitType.Open)
        {
            Opens++;
            return;
        }

        Views++;
        if (device == VisitDevice.Mobile)
            MobileViews++;
        else
            DesktopViews++;
    }
}
