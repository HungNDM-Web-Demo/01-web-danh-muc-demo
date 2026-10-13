namespace Domain.Enums.Cms.Demos;

/// <summary>
/// Trạng thái phát triển của demo (BR-11), lưu dạng số trong <c>Cms_Demos.DevStatus</c>.
/// Thứ tự giá trị chính là thứ tự bậc: Mới tạo → Đang làm → Demo được → Hoàn thiện.
/// </summary>
public enum DemoDevStatus
{
    /// <summary>Mới tạo: chưa bật hiển thị được.</summary>
    MoiTao = 0,

    /// <summary>Đang làm: hiển thị được dạng "Sắp ra mắt".</summary>
    DangLam = 1,

    /// <summary>Demo được: chạy được bằng dữ liệu mẫu.</summary>
    DemoDuoc = 2,

    /// <summary>Hoàn thiện: chạy được cả FE và BE thật.</summary>
    HoanThien = 3
}
