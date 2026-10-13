using Domain.Common;
using Domain.Entities.Cms.Demos;
using Domain.Enums.Cms.Demos;

namespace UnitTests.Cms;

/// <summary>Quy tắc thuần trên entity Demo: điều kiện hiển thị (BR-01, BR-02), trạng thái (BR-11), nổi bật (BR-04),
/// slug cũ (BR-06), ảnh chụp (BR-07), xóa (BR-12).</summary>
public class DemoEntityTests
{
    private static readonly DateTime Now = new(2026, 10, 13, 2, 0, 0, DateTimeKind.Utc);

    private static DemoContent Content(
        string slug = "pos-quan-cafe",
        string? shortDescription = "Bán hàng tại quầy nhanh cho quán cafe, trà sữa: chọn size, topping, in bill, chốt ca.",
        int features = 3,
        string? demoUrl = "http://localhost:3102",
        bool requiresLogin = true,
        int accounts = 1) => new()
    {
        Number = 2,
        Name = "POS Quán Cafe",
        Slug = slug,
        IndustryId = Guid.NewGuid(),
        ShortDescription = shortDescription,
        Features = Enumerable.Range(1, features).Select(i => $"Tính năng {i}").ToList(),
        DemoUrl = demoUrl,
        RequiresLogin = requiresLogin,
        Accounts = Enumerable.Range(1, accounts).Select(i => new DemoAccountData($"user{i}", "Thu ngân", null)).ToList()
    };

    /// <summary>Demo ở trạng thái <paramref name="status"/>, đủ điều kiện hiển thị, có 1 ảnh.</summary>
    private static Demo NewDemo(
        DemoDevStatus status = DemoDevStatus.DemoDuoc,
        bool visible = true,
        bool featured = false,
        DateTime? firstPublishedAt = null,
        int screenshots = 1,
        DemoContent? content = null)
    {
        var demo = Demo.Create("fnb-pos-cafe", content ?? Content(), "quanly", Now);
        for (var i = 1; i <= screenshots; i++)
            demo.AddScreenshot($"/seed/demos/pos-quan-cafe/{i}.webp", null, 1600, 1000, 0);
        demo.ApplySeedState(status, visible, featured, 20, firstPublishedAt, []);
        return demo;
    }

    [Fact]
    public void Create_StartsAsNewHiddenWithSortOrderAndHistory()
    {
        var demo = Demo.Create("fnb-man-hinh-bep", Content() with { Number = 19, Slug = "man-hinh-bep-kds" }, "quanly", Now);

        Assert.Equal(DemoDevStatus.MoiTao, demo.DevStatus);
        Assert.False(demo.IsVisible);
        Assert.Equal(190, demo.SortOrder);
        Assert.Equal("19-fnb-man-hinh-bep", demo.Folder);
        var history = Assert.Single(demo.StatusHistories);
        Assert.Null(history.FromStatus);
        Assert.Equal(DemoDevStatus.MoiTao, history.ToStatus);
        Assert.Equal("quanly", history.ChangedByName);
    }

    // ───────────────────────── BR-01, BR-02 ─────────────────────────

    [Fact]
    public void VisibilityMissing_NewDemo_OnlyAsksToMoveForward()
    {
        var demo = NewDemo(DemoDevStatus.MoiTao, visible: false, screenshots: 0, content: Content(shortDescription: null, features: 0));

        Assert.Equal([DemoRules.NewCannotShowMessage], demo.GetVisibilityMissing());
    }

    [Fact]
    public void VisibilityMissing_InProgress_NeedsOnlyShortDescriptionAndThreeFeatures()
    {
        var demo = NewDemo(DemoDevStatus.DangLam, visible: false, screenshots: 0, content: Content(demoUrl: null, accounts: 0));
        Assert.Empty(demo.GetVisibilityMissing());

        var missing = NewDemo(DemoDevStatus.DangLam, visible: false, screenshots: 0, content: Content(shortDescription: null, features: 2));
        Assert.Equal([DemoRules.MissingShortDescription, DemoRules.MissingFeatures], missing.GetVisibilityMissing());
    }

    [Fact]
    public void VisibilityMissing_Runnable_NeedsScreenshotUrlAndAccount()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, visible: false, screenshots: 0, content: Content(demoUrl: "localhost:3102", accounts: 0));

        Assert.Equal(
            [DemoRules.MissingScreenshot, DemoRules.MissingDemoUrl, DemoRules.MissingAccount],
            demo.GetVisibilityMissing());
    }

    [Fact]
    public void VisibilityMissing_NoLoginRequired_DoesNotNeedAccount()
    {
        var demo = NewDemo(DemoDevStatus.HoanThien, visible: false, content: Content(requiresLogin: false, accounts: 0));

        Assert.Empty(demo.GetVisibilityMissing());
    }

    [Fact]
    public void SetVisibility_NewDemo_IsRejected()
    {
        var demo = NewDemo(DemoDevStatus.MoiTao, visible: false);

        var error = Assert.Throws<DomainException>(() => demo.SetVisibility(true, Now));

        Assert.Equal(DemoRules.NewCannotShowMessage, error.Message);
        Assert.False(demo.IsVisible);
    }

    [Fact]
    public void SetVisibility_MissingCondition_ListsMissingItems()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, visible: false, screenshots: 0);

        var error = Assert.Throws<DomainException>(() => demo.SetVisibility(true, Now));

        Assert.Equal(DemoRules.NotEligibleMessage, error.Message);
        Assert.Equal([DemoRules.MissingScreenshot], (IReadOnlyList<string>)error.Extensions["missing"]!);
    }

    [Fact]
    public void SetVisibility_FirstTimePublic_RecordsFirstPublishedAt_HideClearsFeatured()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, visible: false);

        demo.SetVisibility(true, Now);
        Assert.True(demo.IsPublic);
        Assert.Equal(Now, demo.FirstPublishedAt);

        demo.SetFeatured(true, 0);
        demo.SetVisibility(false, Now.AddDays(1));
        Assert.False(demo.IsVisible);
        Assert.False(demo.IsFeatured);
        Assert.Equal(Now, demo.FirstPublishedAt);
    }

    [Fact]
    public void Update_VisibleDemoLosingCondition_IsRejected()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, visible: true, firstPublishedAt: Now);

        var error = Assert.Throws<DomainException>(() => demo.Update(Content(features: 2), Now));

        Assert.Equal(DemoRules.VisibleLockedMessage, error.Message);
        Assert.Equal([DemoRules.MissingFeatures], (IReadOnlyList<string>)error.Extensions["missing"]!);
    }

    // ───────────────────────── BR-11 ─────────────────────────

    [Fact]
    public void ChangeStatus_ForwardCanJumpWithoutReason()
    {
        var demo = NewDemo(DemoDevStatus.MoiTao, visible: false);

        Assert.True(demo.ChangeStatus(DemoDevStatus.DemoDuoc, null, "quanly", Now));

        Assert.Equal(DemoDevStatus.DemoDuoc, demo.DevStatus);
        var last = demo.StatusHistories.Last();
        Assert.Equal(DemoDevStatus.MoiTao, last.FromStatus);
        Assert.Equal(DemoDevStatus.DemoDuoc, last.ToStatus);
        Assert.Null(demo.FirstPublishedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Ngắn quá")]
    public void ChangeStatus_BackwardWithoutValidReason_IsRejected(string? reason)
    {
        var demo = NewDemo(DemoDevStatus.HoanThien);

        var error = Assert.Throws<DomainException>(() => demo.ChangeStatus(DemoDevStatus.DemoDuoc, reason, "quanly", Now));

        Assert.Equal(DemoRules.ReasonMessage, error.Message);
        Assert.Equal(DemoDevStatus.HoanThien, demo.DevStatus);
    }

    [Fact]
    public void ChangeStatus_BackToInProgress_ClearsFeaturedAndBecomesComingSoon()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, featured: true, firstPublishedAt: Now);

        demo.ChangeStatus(DemoDevStatus.DangLam, "Đang sửa lỗi phiếu nhập", "quanly", Now);

        Assert.False(demo.IsFeatured);
        Assert.True(demo.IsVisible);
        Assert.True(demo.IsListed);
        Assert.True(demo.IsComingSoon);
        Assert.Equal("Đang sửa lỗi phiếu nhập", demo.StatusHistories.Last().Reason);
    }

    [Fact]
    public void ChangeStatus_BackToNew_HidesAndClearsFeatured()
    {
        var demo = NewDemo(DemoDevStatus.HoanThien, featured: true, firstPublishedAt: Now);

        demo.ChangeStatus(DemoDevStatus.MoiTao, "Làm lại từ đầu theo yêu cầu mới", "quanly", Now);

        Assert.False(demo.IsVisible);
        Assert.False(demo.IsFeatured);
    }

    [Fact]
    public void ChangeStatus_VisibleInProgressToRunnableWithoutScreenshot_IsRejected()
    {
        var demo = NewDemo(DemoDevStatus.DangLam, visible: true, screenshots: 0);

        var error = Assert.Throws<DomainException>(() => demo.ChangeStatus(DemoDevStatus.DemoDuoc, null, "quanly", Now));

        Assert.Equal(DemoRules.NotEligibleMessage, error.Message);
        Assert.Equal([DemoRules.MissingScreenshot], (IReadOnlyList<string>)error.Extensions["missing"]!);
    }

    [Fact]
    public void ChangeStatus_VisibleInProgressBecomesPublic_RecordsFirstPublishedAt()
    {
        var demo = NewDemo(DemoDevStatus.DangLam, visible: true);

        demo.ChangeStatus(DemoDevStatus.DemoDuoc, null, "quanly", Now);

        Assert.True(demo.IsPublic);
        Assert.Equal(Now, demo.FirstPublishedAt);
    }

    [Fact]
    public void ChangeStatus_SameStatus_DoesNothing()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc);
        var historyCount = demo.StatusHistories.Count;

        Assert.False(demo.ChangeStatus(DemoDevStatus.DemoDuoc, null, "quanly", Now));
        Assert.Equal(historyCount, demo.StatusHistories.Count);
    }

    // ───────────────────────── BR-04 ─────────────────────────

    [Fact]
    public void SetFeatured_SixAlreadyFeatured_IsRejected()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc);

        var error = Assert.Throws<DomainException>(() => demo.SetFeatured(true, 6));
        Assert.Equal(DemoRules.FeaturedMaxMessage, error.Message);

        demo.SetFeatured(true, 5);
        Assert.True(demo.IsFeatured);
    }

    [Theory]
    [InlineData(DemoDevStatus.DangLam, true)]
    [InlineData(DemoDevStatus.DemoDuoc, false)]
    public void SetFeatured_NotPublic_IsRejected(DemoDevStatus status, bool visible)
    {
        var demo = NewDemo(status, visible);

        var error = Assert.Throws<DomainException>(() => demo.SetFeatured(true, 0));

        Assert.Equal(DemoRules.FeaturedNotPublicMessage, error.Message);
    }

    // ───────────────────────── BR-06 ─────────────────────────

    [Fact]
    public void ChangeSlug_EverPublished_KeepsOldSlug_RevertRemovesIt()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, firstPublishedAt: Now);

        demo.Update(Content(slug: "pos-cafe-moi"), Now);
        Assert.Equal("pos-cafe-moi", demo.Slug);
        Assert.Equal(["pos-quan-cafe"], demo.SlugHistories.Select(h => h.Slug));

        demo.Update(Content(slug: "pos-quan-cafe"), Now);
        Assert.Equal(["pos-cafe-moi"], demo.SlugHistories.Select(h => h.Slug));
    }

    [Fact]
    public void ChangeSlug_NeverPublished_DoesNotKeepOldSlug()
    {
        var demo = NewDemo(DemoDevStatus.DangLam, visible: false);

        demo.Update(Content(slug: "pos-cafe-moi"), Now);

        Assert.Empty(demo.SlugHistories);
    }

    // ───────────────────────── BR-07 ─────────────────────────

    [Fact]
    public void Screenshots_FirstIsCover_RemovingCoverPromotesNext_LastOfPublicCannotBeRemoved()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, screenshots: 4, firstPublishedAt: Now);
        var ordered = demo.OrderedScreenshots;
        Assert.True(ordered[0].IsCover);
        Assert.Equal([1, 2, 3, 4], ordered.Select(s => s.SortOrder));

        demo.RemoveScreenshot(ordered[0].Id);
        Assert.Equal(ordered[1].Id, demo.Cover!.Id);
        Assert.Single(demo.Screenshots, s => s.IsCover);

        demo.RemoveScreenshot(ordered[2].Id);
        demo.RemoveScreenshot(ordered[3].Id);

        var error = Assert.Throws<DomainException>(() => demo.RemoveScreenshot(ordered[1].Id));
        Assert.Equal(DemoRules.LastScreenshotMessage, error.Message);
        Assert.Single(demo.Screenshots);
    }

    [Fact]
    public void Screenshots_AtMostEight()
    {
        var demo = NewDemo(DemoDevStatus.DemoDuoc, screenshots: 8);

        Assert.False(demo.HasRoomForScreenshot);
        var error = Assert.Throws<DomainException>(() => demo.AddScreenshot("/uploads/x.png", null, 1600, 1000, 1));
        Assert.Equal(DemoRules.ScreenshotCountMessage, error.Message);
    }

    // ───────────────────────── BR-12, BR-18 ─────────────────────────

    [Fact]
    public void EnsureCanBeDeleted_EverPublished_IsRejected()
    {
        NewDemo(DemoDevStatus.HoanThien, visible: false).EnsureCanBeDeleted();

        var error = Assert.Throws<DomainException>(() => NewDemo(DemoDevStatus.HoanThien, visible: false, firstPublishedAt: Now).EnsureCanBeDeleted());
        Assert.Equal(DemoRules.EverPublishedMessage, error.Message);
    }

    [Fact]
    public void SortOrderAt_RenumbersByTens_CappedAt999()
    {
        Assert.Equal([10, 20, 30], Enumerable.Range(0, 3).Select(DemoRules.SortOrderAt));
        Assert.Equal(999, DemoRules.SortOrderAt(150));
    }

    [Theory]
    [InlineData("pos-quan-cafe", true)]
    [InlineData("ab", false)]
    [InlineData("-pos", false)]
    [InlineData("pos-", false)]
    [InlineData("POS-cafe", false)]
    [InlineData("pos_cafe", false)]
    public void IsValidSlug_FollowsBr05(string slug, bool expected) =>
        Assert.Equal(expected, DemoRules.IsValidSlug(slug));
}
