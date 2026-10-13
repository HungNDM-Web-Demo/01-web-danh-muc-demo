using Application.Common.Time;
using Domain.Entities.Cms.Demos;
using Domain.Entities.Cms.DemoVisits;
using Domain.Entities.Cms.Industries;
using Infrastructure.Implementations.Services.Demos;
using Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Persistence.Seeders;

/// <summary>
/// Dữ liệu nghiệp vụ mẫu của Danh mục Demo (bảng <c>Cms_*</c>), đọc từ <c>FE/src/mock/seed/demo-data.json</c>
/// (nguồn duy nhất, FE mock nạp cùng file). Kết quả khớp dữ liệu test ở <c>docs/05-KICH-BAN-KIEM-THU.md</c> §1.
/// </summary>
/// <remarks>
/// Quy ước suy ra trường seed chưa ghi, giống FE <c>features/demos/mock/demo.data.ts</c>:
/// <list type="bullet">
/// <item>Thứ tự = số thứ tự × 10 (TC-38).</item>
/// <item>Link demo <c>http://localhost:31NN</c>, Swagger <c>https://localhost:71NN/swagger</c>,
/// repo <c>https://github.com/HungNDM-Web-Demo/{thư mục}</c>; mật khẩu demo = <c>DEMO_PASSWORD</c> khi cần đăng nhập.</item>
/// <item>Ảnh: <c>/seed/demos/{slug}/{file}</c> (FE phục vụ), thiếu kích thước thì coi 1600×1000, dung lượng 0.</item>
/// <item>Ngày: tạo <c>createdDaysAgo</c> lúc 09:00, cập nhật <c>updatedDaysAgo</c> lúc 16:30, công khai đầu tiên lúc 10:00,
/// lịch sử trạng thái lúc (9 + vị trí mod 8):15, lượt xem theo <c>dayOffset</c>; tất cả giờ Việt Nam.</item>
/// </list>
/// </remarks>
public sealed class DemoDataSeeder(
    AppDbContext db,
    TimeProvider timeProvider,
    IOptions<DemoOptions> demoOptions,
    IOptions<FileStorageOptions> fileStorageOptions,
    ILogger<DemoDataSeeder> logger) : IDemoDataSeeder
{
    public const string SeedFileName = "demo-data.json";

    private const int DefaultWidth = 1600;
    private const int DefaultHeight = 1000;

    /// <summary>Người đổi trạng thái trong lịch sử mẫu (tài khoản demo Quản lý).</summary>
    private const string SeedChangedBy = "admin";

    public async Task<bool> HasDataAsync(CancellationToken ct = default) =>
        await db.Set<Industry>().AnyAsync(ct) || await db.Set<Demo>().AnyAsync(ct);

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var seed = SeedJson.Read<DemoSeedFile>(SeedFileName, timeProvider);

        var industries = SeedIndustries(seed.Industries ?? []);
        var demos = SeedDemos(seed.Demos ?? [], industries);
        SeedVisitStats(seed.VisitStats ?? [], demos);

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "Đã nạp dữ liệu mẫu: {Industries} nhóm ngành, {Demos} demo, {Stats} dòng thống kê.",
            industries.Count, demos.Count, seed.VisitStats?.Count ?? 0);
    }

    public async Task ClearAsync(CancellationToken ct = default)
    {
        // Bảng con trước, bảng cha sau. ExecuteDelete xóa cứng, không qua interceptor.
        await db.Set<DemoVisitStat>().ExecuteDeleteAsync(ct);
        await db.Set<DemoVisit>().ExecuteDeleteAsync(ct);
        await db.Set<DemoStatusHistory>().ExecuteDeleteAsync(ct);
        await db.Set<DemoSlugHistory>().ExecuteDeleteAsync(ct);
        await db.Set<DemoFaq>().ExecuteDeleteAsync(ct);
        await db.Set<DemoAccount>().ExecuteDeleteAsync(ct);
        await db.Set<DemoScreenshot>().ExecuteDeleteAsync(ct);
        await db.Set<Demo>().ExecuteDeleteAsync(ct);
        await db.Set<Industry>().ExecuteDeleteAsync(ct);

        DeleteUploadedScreenshots();
    }

    private Dictionary<string, Industry> SeedIndustries(List<IndustrySeed> items)
    {
        var createdAt = SeedDates.DaysAgo(timeProvider, 150, new TimeSpan(8, 0, 0));
        var result = new Dictionary<string, Industry>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var industry = Industry.Create(item.Code, item.Name, item.Slug, item.Icon, item.Color, item.Description, item.SortOrder ?? i + 1);
            db.Add(industry);
            SetTimestamps(industry, createdAt, createdAt);
            result[industry.Slug] = industry;
        }

        return result;
    }

    private Dictionary<string, Demo> SeedDemos(List<DemoSeed> items, Dictionary<string, Industry> industries)
    {
        var result = new Dictionary<string, Demo>(StringComparer.OrdinalIgnoreCase);
        var fallbackIndustry = industries.Values.OrderBy(i => i.SortOrder).LastOrDefault();
        foreach (var item in items)
        {
            var industry = industries.GetValueOrDefault(item.Industry) ?? fallbackIndustry
                ?? throw new InvalidOperationException($"Demo '{item.Slug}' trỏ tới nhóm ngành '{item.Industry}' không có trong file seed.");
            var createdAt = SeedDates.DaysAgo(timeProvider, item.CreatedDaysAgo ?? 60, new TimeSpan(9, 0, 0));
            var updatedAt = SeedDates.DaysAgo(timeProvider, item.UpdatedDaysAgo ?? 1, new TimeSpan(16, 30, 0));

            var demo = Demo.Create(item.ProjectCode, ToContent(item, industry), SeedChangedBy, createdAt);
            AddScreenshots(demo, item);
            demo.ApplySeedState(
                item.DevStatus,
                item.IsVisible ?? false,
                item.IsFeatured ?? false,
                item.SortOrder ?? item.Number * DemoRules.SortOrderStep,
                item.FirstPublishedDaysAgo is { } published
                    ? SeedDates.DaysAgo(timeProvider, published, new TimeSpan(10, 0, 0))
                    : null,
                (item.StatusHistory ?? []).Select((h, index) => (
                    h.From,
                    h.To,
                    h.Reason,
                    string.IsNullOrWhiteSpace(h.By) ? SeedChangedBy : h.By,
                    SeedDates.DaysAgo(timeProvider, h.DaysAgo, new TimeSpan(9 + index % 8, 15, 0)))));

            db.Add(demo);
            SetTimestamps(demo, createdAt, updatedAt);
            result[demo.Slug] = demo;
        }

        return result;
    }

    private DemoContent ToContent(DemoSeed item, Industry industry)
    {
        var folder = DemoRules.Folder(item.Number, item.ProjectCode);
        var requiresLogin = item.RequiresLogin ?? true;
        return new DemoContent
        {
            Number = item.Number,
            Name = item.Name,
            Slug = item.Slug,
            IndustryId = industry.Id,
            IdeaCode = item.IdeaCode,
            TargetCustomers = item.TargetCustomers,
            ProblemSolved = item.ProblemSolved,
            ProductType = item.ProductType,
            Devices = item.Devices,
            ShortDescription = item.ShortDescription,
            Description = item.Description,
            Features = item.Features ?? [],
            Keywords = item.Keywords ?? [],
            DemoUrl = item.DemoUrl ?? $"http://localhost:31{item.Number:00}",
            SwaggerUrl = item.SwaggerUrl ?? $"https://localhost:71{item.Number:00}/swagger",
            RepoUrl = item.RepoUrl ?? $"https://github.com/HungNDM-Web-Demo/{folder}",
            OwnerName = item.OwnerName,
            RequiresLogin = requiresLogin,
            DemoPassword = item.DemoPassword ?? (requiresLogin ? demoOptions.Value.Password : null),
            InternalNotes = item.InternalNotes,
            DemoScript = item.DemoScript,
            Accounts = (item.Accounts ?? []).Select(a => new DemoAccountData(a.Username, a.RoleName, a.Purpose)).ToList(),
            Faqs = (item.Faqs ?? []).Select(f => new DemoFaqData(f.Question, f.Answer)).ToList()
        };
    }

    /// <summary>BR-07: ảnh đánh dấu isCover làm đại diện; không có thì ảnh đầu tiên.</summary>
    private static void AddScreenshots(Demo demo, DemoSeed item)
    {
        foreach (var shot in item.Screenshots ?? [])
        {
            demo.AddScreenshot(
                $"/seed/demos/{item.Slug}/{shot.File}",
                shot.Caption,
                shot.Width ?? DefaultWidth,
                shot.Height ?? DefaultHeight,
                shot.SizeBytes ?? 0,
                makeCover: shot.IsCover == true);
        }
    }

    private void SeedVisitStats(List<VisitStatSeed> items, Dictionary<string, Demo> demos)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(timeProvider.GetUtcNow(), VietnamTime.Zone).DateTime);
        foreach (var item in items)
        {
            if (!demos.TryGetValue(item.Demo, out var demo))
                continue;

            db.Add(DemoVisitStat.Create(demo.Id, today.AddDays(item.DayOffset), item.Views, item.Opens, item.MobileViews, item.DesktopViews));
        }
    }

    /// <summary>Gán sẵn ngày tạo, ngày sửa lùi ngày; interceptor giữ nguyên giá trị đã gán khi thêm mới.</summary>
    private void SetTimestamps<TEntity>(TEntity entity, DateTime createdAt, DateTime updatedAt)
        where TEntity : Domain.Base.BaseEntity
    {
        var entry = db.Entry(entity);
        entry.Property(e => e.CreatedAt).CurrentValue = createdAt;
        entry.Property(e => e.UpdatedAt).CurrentValue = updatedAt;
    }

    /// <summary>Xóa ảnh demo đã tải lên (<c>wwwroot/uploads/demos</c>); ảnh mẫu <c>/seed/...</c> nằm ở FE nên không đụng tới.</summary>
    private void DeleteUploadedScreenshots()
    {
        var folder = Path.Combine(fileStorageOptions.Value.RootPath, DemoScreenshotService.UploadFolder);
        try
        {
            if (Directory.Exists(folder))
                Directory.Delete(folder, recursive: true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Không xóa được thư mục ảnh tải lên {Folder}.", folder);
        }
    }
}
