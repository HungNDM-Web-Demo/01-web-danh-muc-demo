using Application.Common.Exceptions;
using Application.DTOs.Catalog;
using Application.DTOs.Demos;
using Application.DTOs.Industries;
using Application.Interfaces.Services.Catalog;
using Application.Interfaces.Services.Demos;
using Application.Interfaces.Services.Industries;
using Domain.Common;
using Domain.Entities.Cms.Demos;
using Domain.Enums.Cms.Demos;
using FluentValidation;
using UnitTests.TestSupport;

namespace UnitTests.Cms;

/// <summary>
/// Kịch bản quản lý demo qua service thật trên dữ liệu mẫu, theo 05-KICH-BAN-KIEM-THU (TC-15, TC-22, TC-23, TC-25,
/// TC-26, TC-31, TC-33, TC-34, TC-37, TC-38, TC-40).
/// </summary>
public sealed class DemoManagementTests : IAsyncLifetime
{
    private CmsTestHost _host = null!;

    public async Task InitializeAsync()
    {
        _host = await CmsTestHost.StartAsync();
        await _host.SignInAsync("admin");
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    private Task<IReadOnlyList<DemoListItem>> ListAsync() =>
        _host.CallAsync<IDemoManagementService, IReadOnlyList<DemoListItem>>(s => s.GetListAsync());

    private async Task<DemoDetail> DetailAsync(string slug)
    {
        var item = (await ListAsync()).Single(d => d.Slug == slug);
        return await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.GetByIdAsync(item.Id));
    }

    private Task<IReadOnlyList<PublicDemoCard>> PublicDemosAsync() =>
        _host.CallAsync<ICatalogService, IReadOnlyList<PublicDemoCard>>(s => s.GetDemosAsync());

    private static T ToRequest<T>(DemoDetail d)
        where T : SaveDemoRequest, new() => new()
    {
        Number = d.Number,
        ProjectCode = d.ProjectCode,
        Name = d.Name,
        Slug = d.Slug,
        IndustryId = d.IndustryId,
        IdeaCode = d.IdeaCode,
        TargetCustomers = d.TargetCustomers,
        ProblemSolved = d.ProblemSolved,
        ProductType = d.ProductType,
        Devices = d.Devices,
        ShortDescription = d.ShortDescription,
        Description = d.Description,
        Features = d.Features,
        Keywords = d.Keywords,
        DemoUrl = d.DemoUrl,
        SwaggerUrl = d.Internal?.SwaggerUrl,
        RepoUrl = d.Internal?.RepoUrl,
        OwnerName = d.Internal?.OwnerName,
        RequiresLogin = d.RequiresLogin,
        DemoPassword = d.Internal?.DemoPassword,
        InternalNotes = d.Internal?.InternalNotes,
        DemoScript = d.Internal?.DemoScript,
        Accounts = d.Accounts,
        Faqs = d.Internal?.Faqs ?? []
    };

    private static SaveDemoRequest With(DemoDetail d, Func<SaveDemoRequest, SaveDemoRequest> change) => change(ToRequest<SaveDemoRequest>(d));

    [Fact]
    public async Task Create_Tc22_NewDemoIsHiddenAndCounted()
    {
        var fnb = (await DetailAsync("pos-quan-cafe")).IndustryId;
        var next = await _host.CallAsync<IDemoManagementService, NextNumberResult>(s => s.GetNextNumberAsync());
        Assert.Equal(19, next.Number);

        var created = await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.CreateAsync(new CreateDemoRequest
        {
            Number = next.Number,
            ProjectCode = "fnb-man-hinh-bep",
            Name = "Màn hình Bếp KDS",
            Slug = "man-hinh-bep-kds",
            IndustryId = fnb,
            IdeaCode = "1.4",
            ShortDescription = "Màn hình bếp nhận món theo thời gian thực, báo món trễ, giúp bếp ra món đúng thứ tự gọi.",
            Features = ["Nhận món tức thì", "Báo món trễ", "Gộp món cùng loại", "Đánh dấu món xong"],
            DemoUrl = "http://localhost:3119"
        }));

        Assert.Equal(("19-fnb-man-hinh-bep", DemoDevStatus.MoiTao, false), (created.Folder, created.DevStatus, created.IsVisible));
        var summary = await _host.CallAsync<IDemoManagementService, DemoSummary>(s => s.GetSummaryAsync());
        Assert.Equal((19, 3), (summary.Total, summary.MoiTao));
        Assert.Equal(13, (await PublicDemosAsync()).Count);

        var history = await _host.CallAsync<IDemoManagementService, IReadOnlyList<StatusHistoryItem>>(s => s.GetStatusHistoryAsync(created.Id));
        Assert.Equal("admin", Assert.Single(history).ChangedByName);

        // TC-26: demo chưa từng công khai xóa được; demo đã từng công khai thì không.
        await _host.CallAsync<IDemoManagementService>(s => s.DeleteAsync(created.Id));
        Assert.Equal(18, (await ListAsync()).Count);
        var pos = await DetailAsync("pos-quan-cafe");
        var error = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IDemoManagementService>(s => s.DeleteAsync(pos.Id)));
        Assert.Equal(DemoRules.EverPublishedMessage, error.Message);
    }

    [Fact]
    public async Task Create_Tc23_DuplicateProjectCodeNumberSlug_IsConflictOnField()
    {
        var pos = await DetailAsync("pos-quan-cafe");

        // Trùng cả ba: báo trường đầu tiên theo thứ tự trên form (số thứ tự).
        var all = await Assert.ThrowsAsync<ConflictException>(() =>
            _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.CreateAsync(ToRequest<CreateDemoRequest>(pos))));
        Assert.Equal(("number", "Số thứ tự 02 đã được dùng"), (all.Field, all.Message));

        // TC-23: chỉ trùng mã dự án.
        var request = ToRequest<CreateDemoRequest>(pos);
        var codeOnly = new CreateDemoRequest
        {
            Number = 19, ProjectCode = request.ProjectCode, Name = "Màn hình Bếp KDS", Slug = "man-hinh-bep-kds",
            IndustryId = request.IndustryId
        };
        var error = await Assert.ThrowsAsync<ConflictException>(() =>
            _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.CreateAsync(codeOnly)));
        Assert.Equal(("projectCode", "Mã dự án đã tồn tại"), (error.Field, error.Message));
    }

    [Fact]
    public async Task Update_Tc25_VisibleDemoLosingCondition_IsRejectedAndUnchanged()
    {
        var restaurant = await DetailAsync("quan-ly-nha-hang");

        var fewerFeatures = With(restaurant, r => r.WithFeatures(restaurant.Features.Take(2).ToList()));
        var error = await Assert.ThrowsAsync<DomainException>(() =>
            _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.UpdateAsync(restaurant.Id, fewerFeatures)));
        Assert.Equal(DemoRules.VisibleLockedMessage, error.Message);

        var noAccounts = With(restaurant, r => r.WithAccounts([]));
        error = await Assert.ThrowsAsync<DomainException>(() =>
            _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.UpdateAsync(restaurant.Id, noAccounts)));
        Assert.Equal(DemoRules.VisibleLockedMessage, error.Message);
        Assert.Equal([DemoRules.MissingAccount], (IReadOnlyList<string>)error.Extensions["missing"]!);

        var after = await DetailAsync("quan-ly-nha-hang");
        Assert.Equal(restaurant.Features, after.Features);
        Assert.Equal(restaurant.Accounts.Count, after.Accounts.Count);
    }

    [Fact]
    public async Task Update_Tc15_RenamePublishedSlug_RedirectsOldSlug_OldSlugNotReusable()
    {
        var warehouse = await DetailAsync("quan-ly-kho");
        var renamed = await _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.UpdateAsync(warehouse.Id, With(warehouse, r => r.WithSlug("quan-ly-kho-xuat-nhap-ton"))));
        Assert.Equal(["quan-ly-kho"], renamed.OldSlugs);

        var lookup = await _host.CallAsync<ICatalogService, PublicDemoLookup>(s => s.GetDemoAsync("quan-ly-kho"));
        Assert.Null(lookup.Demo);
        Assert.Equal("quan-ly-kho-xuat-nhap-ton", lookup.RedirectSlug);

        var rental = await DetailAsync("quan-ly-nha-tro");
        var error = await Assert.ThrowsAsync<ConflictException>(() =>
            _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.UpdateAsync(rental.Id, With(rental, r => r.WithSlug("quan-ly-kho")))));
        Assert.Equal(("slug", "Slug đã được dùng cho demo khác"), (error.Field, error.Message));

        // Trang xem trước nội bộ nhận cả slug cũ.
        var preview = await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.GetBySlugAsync("quan-ly-kho"));
        Assert.Equal(warehouse.Id, preview.Id);
    }

    [Fact]
    public async Task ChangeStatus_Tc31_Tc33_Tc34()
    {
        // TC-31: Phòng khám đang hiển thị, 0 ảnh, lên Demo được bị từ chối.
        var clinic = await DetailAsync("quan-ly-phong-kham");
        var error = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.ChangeStatusAsync(clinic.Id, new ChangeStatusRequest { Status = DemoDevStatus.DemoDuoc })));
        Assert.Equal(DemoRules.NotEligibleMessage, error.Message);
        Assert.Equal([DemoRules.MissingScreenshot], (IReadOnlyList<string>)error.Extensions["missing"]!);
        Assert.Equal(DemoDevStatus.DangLam, (await DetailAsync("quan-ly-phong-kham")).DevStatus);

        // TC-33: lùi bậc thiếu lý do báo tại ô reason; có lý do thì lưu, vẫn nổi bật.
        var shop = await DetailAsync("website-ban-hang");
        var reasonError = await Assert.ThrowsAsync<ValidationException>(() => _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.ChangeStatusAsync(shop.Id, new ChangeStatusRequest { Status = DemoDevStatus.DemoDuoc })));
        Assert.Equal("reason", Assert.Single(reasonError.Errors).PropertyName);
        var downgraded = await _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.ChangeStatusAsync(shop.Id, new ChangeStatusRequest { Status = DemoDevStatus.DemoDuoc, Reason = "BE đang nâng cấp phiên bản .NET" }));
        Assert.Equal((DemoDevStatus.DemoDuoc, true), (downgraded.DevStatus, downgraded.IsFeatured));
        var history = await _host.CallAsync<IDemoManagementService, IReadOnlyList<StatusHistoryItem>>(s => s.GetStatusHistoryAsync(shop.Id));
        Assert.Equal((DemoDevStatus.HoanThien, DemoDevStatus.DemoDuoc, "admin"), (history[0].FromStatus, history[0].ToStatus, history[0].ChangedByName));

        // TC-34: Quản lý Kho lùi về Đang làm: đứng đầu phần Sắp ra mắt, nút Bán lẻ vẫn 3.
        var warehouse = await DetailAsync("quan-ly-kho");
        await _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.ChangeStatusAsync(warehouse.Id, new ChangeStatusRequest { Status = DemoDevStatus.DangLam, Reason = "Đang sửa lỗi phiếu nhập" }));
        var cards = await PublicDemosAsync();
        Assert.Equal(["Quản lý Kho", "Quản lý Phòng khám", "Quản lý Trung tâm Ngoại ngữ"], cards.TakeLast(3).Select(c => c.Name));
        var industries = await _host.CallAsync<ICatalogService, IReadOnlyList<PublicIndustry>>(s => s.GetIndustriesAsync());
        Assert.Equal(3, industries.Single(i => i.Slug == "ban-le").Count);
    }

    [Fact]
    public async Task Featured_Tc37_MaxSixAndOnlyPublic()
    {
        var sport = await DetailAsync("cho-thue-san-the-thao");
        await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.SetFeaturedAsync(sport.Id, new SetFeaturedRequest { IsFeatured = true }));
        Assert.Equal(6, (await _host.CallAsync<IDemoManagementService, DemoSummary>(s => s.GetSummaryAsync())).Featured);

        var restaurant = await DetailAsync("quan-ly-nha-hang");
        var max = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.SetFeaturedAsync(restaurant.Id, new SetFeaturedRequest { IsFeatured = true })));
        Assert.Equal(DemoRules.FeaturedMaxMessage, max.Message);

        var language = await DetailAsync("quan-ly-trung-tam-ngoai-ngu");
        var notPublic = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.SetFeaturedAsync(language.Id, new SetFeaturedRequest { IsFeatured = true })));
        Assert.Equal(DemoRules.FeaturedNotPublicMessage, notPublic.Message);
    }

    [Fact]
    public async Task Reorder_Tc38_RenumbersByTens_FeaturedStillFirst()
    {
        var list = await ListAsync();
        var website = list.Single(d => d.Slug == "website-cong-ty");
        var ids = new[] { website.Id }.Concat(list.Where(d => d.Id != website.Id).Select(d => d.Id)).ToList();

        await _host.CallAsync<IDemoManagementService>(s => s.ReorderAsync(new ReorderDemosRequest { Ids = ids }));

        var after = await ListAsync();
        Assert.Equal(["website-cong-ty", "danh-muc-demo", "pos-quan-cafe"], after.Take(3).Select(d => d.Slug));
        Assert.Equal(Enumerable.Range(1, 18).Select(i => i * 10), after.Select(d => d.SortOrder));

        var cards = await PublicDemosAsync();
        Assert.Equal(["CRM Quản lý Khách hàng", "Website Công ty", "Quản lý Nhà hàng"], cards.Skip(4).Take(3).Select(c => c.Name));

        var incomplete = await Assert.ThrowsAsync<ValidationException>(() =>
            _host.CallAsync<IDemoManagementService>(s => s.ReorderAsync(new ReorderDemosRequest { Ids = ids.Skip(1).ToList() })));
        Assert.Equal("ids", Assert.Single(incomplete.Errors).PropertyName);
    }

    [Fact]
    public async Task Visibility_Tc35_Tc36()
    {
        var landing = await DetailAsync("landing-page-ban-hang");
        var error = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IDemoManagementService, DemoDetail>(s =>
            s.SetVisibilityAsync(landing.Id, new SetVisibilityRequest { IsVisible = true })));
        Assert.Equal(DemoRules.NewCannotShowMessage, error.Message);

        var rental = await DetailAsync("quan-ly-nha-tro");
        await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.SetVisibilityAsync(rental.Id, new SetVisibilityRequest { IsVisible = false }));
        Assert.Equal(12, (await PublicDemosAsync()).Count);
        var industries = await _host.CallAsync<ICatalogService, IReadOnlyList<PublicIndustry>>(s => s.GetIndustriesAsync());
        Assert.DoesNotContain(industries, i => i.Slug == "bat-dong-san");

        await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.SetVisibilityAsync(rental.Id, new SetVisibilityRequest { IsVisible = true }));
        Assert.Equal(13, (await PublicDemosAsync()).Count);
    }

    [Fact]
    public async Task DeleteIndustry_Tc40()
    {
        var industries = await _host.CallAsync<IIndustryService, IReadOnlyList<IndustryDto>>(s => s.GetListAsync());

        var fnb = industries.Single(i => i.Slug == "fnb");
        var error = await Assert.ThrowsAsync<DomainException>(() => _host.CallAsync<IIndustryService>(s => s.DeleteAsync(fnb.Id)));
        Assert.Equal("Nhóm đang có 3 demo", error.Message);

        var transport = industries.Single(i => i.Slug == "van-tai");
        await _host.CallAsync<IIndustryService>(s => s.DeleteAsync(transport.Id));
        Assert.Equal(10, (await _host.CallAsync<IIndustryService, IReadOnlyList<IndustryDto>>(s => s.GetListAsync())).Count);
    }

    [Fact]
    public async Task SaveIndustry_DuplicateCodeOrSlug_IsConflictOnField()
    {
        var industries = await _host.CallAsync<IIndustryService, IReadOnlyList<IndustryDto>>(s => s.GetListAsync());
        var fnb = industries.Single(i => i.Slug == "fnb");

        var code = await Assert.ThrowsAsync<ConflictException>(() => _host.CallAsync<IIndustryService, IndustryDto>(s =>
            s.CreateAsync(new SaveIndustryRequest { Code = fnb.Code, Name = "Ẩm thực", Slug = "am-thuc", Color = "#EA580C" })));
        Assert.Equal(("code", "Mã nhóm 1 đã được dùng"), (code.Field, code.Message));

        var slug = await Assert.ThrowsAsync<ConflictException>(() => _host.CallAsync<IIndustryService, IndustryDto>(s =>
            s.CreateAsync(new SaveIndustryRequest { Code = 12, Name = "Ẩm thực", Slug = "fnb", Color = "#EA580C" })));
        Assert.Equal(("slug", "Slug đã được dùng cho nhóm khác"), (slug.Field, slug.Message));

        // Sửa chính nhóm đó giữ nguyên mã, slug thì không tính là trùng.
        var renamed = await _host.CallAsync<IIndustryService, IndustryDto>(s => s.UpdateAsync(fnb.Id, new SaveIndustryRequest
        {
            Code = fnb.Code, Name = "Nhà hàng, cafe", Slug = fnb.Slug, Icon = fnb.Icon, Color = fnb.Color, Description = fnb.Description
        }));
        Assert.Equal(("Nhà hàng, cafe", 3), (renamed.Name, renamed.DemoCount));
    }
}

/// <summary>Sao chép request với một trường đổi (SaveDemoRequest là class init-only).</summary>
internal static class SaveDemoRequestCopy
{
    public static SaveDemoRequest WithFeatures(this SaveDemoRequest r, IReadOnlyList<string> features) => Copy(r, features: features);

    public static SaveDemoRequest WithAccounts(this SaveDemoRequest r, IReadOnlyList<DemoAccountItem> accounts) => Copy(r, accounts: accounts);

    public static SaveDemoRequest WithSlug(this SaveDemoRequest r, string slug) => Copy(r, slug: slug);

    private static SaveDemoRequest Copy(
        SaveDemoRequest r,
        IReadOnlyList<string>? features = null,
        IReadOnlyList<DemoAccountItem>? accounts = null,
        string? slug = null) => new()
    {
        Number = r.Number,
        ProjectCode = r.ProjectCode,
        Name = r.Name,
        Slug = slug ?? r.Slug,
        IndustryId = r.IndustryId,
        IdeaCode = r.IdeaCode,
        TargetCustomers = r.TargetCustomers,
        ProblemSolved = r.ProblemSolved,
        ProductType = r.ProductType,
        Devices = r.Devices,
        ShortDescription = r.ShortDescription,
        Description = r.Description,
        Features = features ?? r.Features,
        Keywords = r.Keywords,
        DemoUrl = r.DemoUrl,
        SwaggerUrl = r.SwaggerUrl,
        RepoUrl = r.RepoUrl,
        OwnerName = r.OwnerName,
        RequiresLogin = r.RequiresLogin,
        DemoPassword = r.DemoPassword,
        InternalNotes = r.InternalNotes,
        DemoScript = r.DemoScript,
        Accounts = accounts ?? r.Accounts,
        Faqs = r.Faqs
    };
}
