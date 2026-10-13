namespace Application.Constants;

/// <summary>
/// Mã quyền nghiệp vụ của Danh mục Demo (02-SRS §7, 07-DANH-SACH-API §1). Tách khỏi <see cref="Permissions"/> (quyền nền)
/// để không sửa file nền. Mỗi mã phải có trong FE/src/mock/seed/project.json và FE src/config/permissions.ts;
/// test <c>ProjectPermissionConstantsTests</c> kiểm tra việc này.
/// </summary>
public static class ProjectPermissions
{
    public static class Demos
    {
        /// <summary>Xem trang Quản lý demo, mọi trạng thái (chỉ xem).</summary>
        public const string View = "demos.view";

        /// <summary>Xem thông tin nội bộ, xem trước demo chưa công khai (BR-10).</summary>
        public const string ViewInternal = "demos.view-internal";

        public const string Create = "demos.create";

        /// <summary>Sửa demo, ảnh chụp, tài khoản demo, ghi chú nội bộ.</summary>
        public const string Update = "demos.update";

        /// <summary>Đổi trạng thái, bật/tắt hiển thị, nổi bật, sắp xếp.</summary>
        public const string Publish = "demos.publish";

        /// <summary>Xóa demo chưa từng công khai (BR-12).</summary>
        public const string Delete = "demos.delete";

        /// <summary>Sao chép gửi khách, sao chép link danh mục (FE).</summary>
        public const string Share = "demos.share";
    }

    public static class Industries
    {
        public const string View = "industries.view";
        public const string Create = "industries.create";
        public const string Update = "industries.update";
        public const string Delete = "industries.delete";
    }

    public static class Reports
    {
        /// <summary>Xem thống kê lượt xem.</summary>
        public const string View = "reports.view";
    }
}
