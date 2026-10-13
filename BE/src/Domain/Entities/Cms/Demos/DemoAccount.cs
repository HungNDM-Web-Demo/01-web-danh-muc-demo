using Domain.Base;

namespace Domain.Entities.Cms.Demos;

/// <summary>Tài khoản đăng nhập sẵn của một demo (<c>Cms_DemoAccounts</c>, FR-19, BR-16), vd <c>thungan</c>.</summary>
public class DemoAccount : BaseEntity, ICreationTracked, IModificationTracked
{
    private DemoAccount()
    {
    }

    internal DemoAccount(Guid demoId, DemoAccountData data, int sortOrder)
    {
        DemoId = demoId;
        Apply(data, sortOrder);
    }

    public Guid DemoId { get; private set; }

    /// <summary>Tên đăng nhập theo BR-SYS-01, không trùng trong cùng một demo.</summary>
    public string Username { get; private set; } = string.Empty;

    /// <summary>Tên vai trò hiển thị, vd "Thu ngân".</summary>
    public string RoleName { get; private set; } = string.Empty;

    /// <summary>Dùng để xem gì.</summary>
    public string? Purpose { get; private set; }

    public int SortOrder { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    internal void Apply(DemoAccountData data, int sortOrder)
    {
        Username = data.Username.Trim();
        RoleName = data.RoleName.Trim();
        Purpose = string.IsNullOrWhiteSpace(data.Purpose) ? null : data.Purpose.Trim();
        SortOrder = sortOrder;
    }
}

/// <summary>Dữ liệu một tài khoản demo khi thêm, sửa demo.</summary>
public sealed record DemoAccountData(string Username, string RoleName, string? Purpose);
