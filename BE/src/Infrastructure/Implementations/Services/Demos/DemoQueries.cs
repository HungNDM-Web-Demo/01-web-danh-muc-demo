using Application.Constants;
using Application.Interfaces.Services.Common;
using Application.Interfaces.Services.Roles;
using Domain.Enums.Cms.Demos;
using Microsoft.EntityFrameworkCore;
using DemoEntity = Domain.Entities.Cms.Demos.Demo;

namespace Infrastructure.Implementations.Services.Demos;

/// <summary>Truy vấn và kiểm tra dùng chung cho các service demo.</summary>
internal static class DemoQueries
{
    public const string NotFoundMessage = "Không tìm thấy demo";

    /// <summary>
    /// Nạp đủ ảnh chụp, tài khoản, câu hỏi, slug cũ: các quy tắc hiển thị (BR-02) đếm ảnh, tài khoản trên entity
    /// nên luôn nạp trước khi gọi method của <see cref="DemoEntity"/>.
    /// </summary>
    public static IQueryable<DemoEntity> WithDetails(this IQueryable<DemoEntity> query) =>
        query
            .Include(d => d.Screenshots)
            .Include(d => d.Accounts)
            .Include(d => d.Faqs)
            .Include(d => d.SlugHistories)
            .AsSplitQuery();

    /// <summary>Demo xuất hiện trên danh mục: bật Hiển thị và không phải Mới tạo (BR-01).</summary>
    public static IQueryable<DemoEntity> WhereListed(this IQueryable<DemoEntity> query) =>
        query.Where(d => d.IsVisible && d.DevStatus != DemoDevStatus.MoiTao);

    /// <summary>Người gọi có quyền xem thông tin nội bộ không (BR-10). Quyền đọc từ DB, đã lưu tạm trong request.</summary>
    public static async Task<bool> CanViewInternalAsync(
        ICurrentUserService currentUser,
        IPermissionService permissionService,
        CancellationToken ct)
    {
        return currentUser.UserId is { } userId
            && await permissionService.HasPermissionAsync(userId, ProjectPermissions.Demos.ViewInternal, ct);
    }

    /// <summary>Slug chuẩn hóa để so khớp: bỏ khoảng trắng hai đầu, viết thường.</summary>
    public static string NormalizeSlug(string? slug) => slug?.Trim().ToLowerInvariant() ?? string.Empty;
}
