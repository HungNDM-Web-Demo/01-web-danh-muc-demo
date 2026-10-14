using System.Text.Json;
using Application.DTOs.Catalog;
using Application.DTOs.Demos;
using Application.Interfaces.Services.Catalog;
using Application.Interfaces.Services.Demos;
using Application.Interfaces.Services.Industries;
using Application.Common.Exceptions;
using Infrastructure.Persistence.Seeders;
using UnitTests.TestSupport;

namespace UnitTests.Cms;

/// <summary>
/// Dữ liệu mẫu demo-data.json nạp qua DemoDataSeeder thật rồi đọc qua service: khớp dữ liệu test của
/// 05-KICH-BAN-KIEM-THU §1 (TC-01, TC-02, TC-10, TC-14, TC-16).
/// </summary>
public sealed class CatalogSeedTests : IAsyncLifetime
{
    private CmsTestHost _host = null!;

    public async Task InitializeAsync() => _host = await CmsTestHost.StartAsync();

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Fact]
    public async Task PublicDemos_Tc01_ThirteenCardsInBr04Order()
    {
        var cards = await _host.CallAsync<ICatalogService, IReadOnlyList<PublicDemoCard>>(s => s.GetDemosAsync());

        Assert.Equal(
            [
                "POS Quán Cafe", "Menu QR Gọi món", "Website Bán hàng", "Quản lý Spa Salon", "CRM Quản lý Khách hàng",
                "Quản lý Nhà hàng", "POS Cửa hàng Bán lẻ", "Quản lý Kho", "Cho thuê Sân thể thao", "Quản lý Nhà trọ",
                "Website Công ty", "Quản lý Phòng khám", "Quản lý Trung tâm Ngoại ngữ"
            ],
            cards.Select(c => c.Name));
        Assert.Equal(5, cards.Count(c => c.IsFeatured));
        Assert.All(cards.TakeLast(2), c =>
        {
            Assert.True(c.IsComingSoon);
            Assert.Null(c.DemoUrl);
        });
        Assert.All(cards.Take(11), c => Assert.False(string.IsNullOrEmpty(c.DemoUrl)));
        Assert.Equal("/seed/demos/pos-quan-cafe/1.webp", cards[0].CoverUrl);
    }

    [Fact]
    public async Task PublicIndustries_Tc02_OnlyGroupsWithVisibleDemos()
    {
        var industries = await _host.CallAsync<ICatalogService, IReadOnlyList<PublicIndustry>>(s => s.GetIndustriesAsync());

        Assert.Equal(
            ["F&B 3", "Bán lẻ 3", "Dịch vụ 3", "Giáo dục 1", "Doanh nghiệp 1", "Bất động sản 1", "Website 1"],
            industries.Select(i => $"{i.Name} {i.Count}"));
    }

    [Fact]
    public async Task PublicDetail_Tc10_HasNoInternalFields()
    {
        var lookup = await _host.CallAsync<ICatalogService, PublicDemoLookup>(s => s.GetDemoAsync("pos-quan-cafe"));

        var demo = lookup.Demo!;
        Assert.Equal("POS Quán Cafe", demo.Name);
        Assert.Equal("F&B", demo.Industry.Name);
        Assert.Equal(5, demo.Screenshots.Count);
        Assert.Equal(["admin", "quanly", "thungan"], demo.Accounts.Select(a => a.Username));
        Assert.Equal("https://02-fnb-pos-cafe.vercel.app", demo.DemoUrl);
        Assert.Equal(["Menu QR Gọi món", "Quản lý Nhà hàng"], demo.Related.Select(r => r.Name));

        var json = JsonSerializer.Serialize(lookup, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        foreach (var forbidden in new[] { "demoPassword", "internalNotes", "demoScript", "faqs", "swaggerUrl", "repoUrl", "ownerName", CmsTestHost.DemoPassword, "7102" })
            Assert.DoesNotContain(forbidden, json, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("hrm-cham-cong-tinh-luong")]
    [InlineData("khong-co")]
    [InlineData("landing-page-ban-hang")]
    public async Task PublicDetail_Tc14_HiddenOrUnknown_IsNotFound(string slug)
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _host.CallAsync<ICatalogService, PublicDemoLookup>(s => s.GetDemoAsync(slug)));
    }

    [Fact]
    public async Task PublicDetail_ComingSoon_HasNoDemoUrl()
    {
        var lookup = await _host.CallAsync<ICatalogService, PublicDemoLookup>(s => s.GetDemoAsync("quan-ly-phong-kham"));

        Assert.True(lookup.Demo!.IsComingSoon);
        Assert.Null(lookup.Demo.DemoUrl);
        Assert.Null(lookup.Demo.CoverUrl);
    }

    [Fact]
    public async Task Summary_Tc16_MatchesSeed()
    {
        var summary = await _host.CallAsync<IDemoManagementService, DemoSummary>(s => s.GetSummaryAsync());

        Assert.Equal(
            new DemoSummary { Total = 18, HoanThien = 5, DemoDuoc = 7, DangLam = 4, MoiTao = 2, Visible = 13, Featured = 5, FeaturedMax = 6 },
            summary);
    }

    [Fact]
    public async Task AdminList_SortedBySortOrder_InternalOnlyWithPermission()
    {
        await _host.SignInAsync("admin");
        var withInternal = await _host.CallAsync<IDemoManagementService, IReadOnlyList<DemoListItem>>(s => s.GetListAsync());
        Assert.Equal(Enumerable.Range(1, 18).Select(n => n * 10), withInternal.Select(d => d.SortOrder));
        Assert.Equal("02-fnb-pos-cafe", withInternal[1].Folder);

        var pos = withInternal[1];
        var detail = await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.GetByIdAsync(pos.Id));
        Assert.NotNull(detail.Internal);
        Assert.Equal("https://localhost:7102/swagger", detail.Internal!.SwaggerUrl);
        Assert.Equal(CmsTestHost.DemoPassword, detail.Internal.DemoPassword);
        Assert.Equal(3, detail.Internal.Faqs.Count);

        await _host.SignInAsync(null);
        var withoutInternal = await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.GetByIdAsync(pos.Id));
        Assert.Null(withoutInternal.Internal);
    }

    [Fact]
    public async Task OwnerName_ReadFromSeedWhenPresent()
    {
        var seed = SeedJson.Read<DemoSeedFile>(DemoDataSeeder.SeedFileName);
        await _host.SignInAsync("admin");
        var list = await _host.CallAsync<IDemoManagementService, IReadOnlyList<DemoListItem>>(s => s.GetListAsync());

        foreach (var item in seed.Demos!)
        {
            var expected = string.IsNullOrWhiteSpace(item.OwnerName) ? null : item.OwnerName.Trim();
            Assert.Equal(expected, list.Single(d => d.Slug == item.Slug).OwnerName);
        }
    }

    [Fact]
    public async Task Industries_CountDemos()
    {
        var industries = await _host.CallAsync<IIndustryService, IReadOnlyList<Application.DTOs.Industries.IndustryDto>>(s => s.GetListAsync());

        Assert.Equal(11, industries.Count);
        var fnb = industries[0];
        Assert.Equal(("fnb", 3, 3), (fnb.Slug, fnb.DemoCount, fnb.VisibleDemoCount));
        var business = industries.Single(i => i.Slug == "doanh-nghiep");
        Assert.Equal((3, 1), (business.DemoCount, business.VisibleDemoCount));
    }
}
