using System.Text.RegularExpressions;
using Domain.Enums.Cms.Demos;

namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Giới hạn, định dạng và thông báo nghiệp vụ của demo (02-SRS §4). Thông báo giữ đúng chữ của 07-DANH-SACH-API và
/// FE <c>features/demos/lib/demo-rules.ts</c> để hai chế độ mock và api báo giống nhau.
/// </summary>
public static partial class DemoRules
{
    // ───── BR-04, BR-08, BR-09, BR-16, BR-18 ─────
    public const int NumberMin = 1;
    public const int NumberMax = 99;
    public const int ProjectCodeMinLength = 3;
    public const int ProjectCodeMaxLength = 40;
    public const int NameMaxLength = 60;
    public const int SlugMinLength = 3;
    public const int SlugMaxLength = 60;
    public const int IdeaCodeMaxLength = 10;
    public const int TargetCustomersMaxLength = 300;
    public const int ProblemSolvedMaxLength = 1000;
    public const int ProductTypeMaxLength = 150;
    public const int DevicesMaxLength = 150;
    public const int ShortDescriptionMinLength = 50;
    public const int ShortDescriptionMaxLength = 160;
    public const int FeaturesMax = 6;
    public const int FeaturesMinToShow = 3;
    public const int FeatureMaxLength = 80;
    public const int KeywordsMax = 10;
    public const int KeywordMaxLength = 40;
    public const int UrlMaxLength = 300;
    public const int OwnerNameMaxLength = 100;
    public const int DemoPasswordMaxLength = 100;
    public const int InternalNotesMaxLength = 2000;
    public const int AccountsMax = 6;
    public const int AccountUsernameMaxLength = 50;
    public const int AccountRoleNameMaxLength = 60;
    public const int AccountPurposeMaxLength = 200;
    public const int FaqQuestionMaxLength = 300;
    public const int FaqAnswerMaxLength = 1000;
    public const int FeaturedMax = 6;
    public const int SortOrderMin = 1;
    public const int SortOrderMax = 999;
    public const int SortOrderStep = 10;

    // ───── BR-07 ─────
    public const int ScreenshotsMax = 8;
    public const long ScreenshotMaxBytes = 2 * 1024 * 1024;
    public const int ScreenshotMinWidth = 1280;
    public const int CaptionMaxLength = 125;
    public const int ScreenshotUrlMaxLength = 500;

    // ───── BR-11 ─────
    public const int ReasonMinLength = 10;
    public const int ReasonMaxLength = 500;
    public const int ChangedByNameMaxLength = 150;

    // ───── Thông báo lỗi nghiệp vụ (07-DANH-SACH-API §3) ─────
    public const string NotEligibleMessage = "Demo chưa đủ điều kiện hiển thị";
    public const string VisibleLockedMessage = "Demo đang hiển thị, cần tắt hiển thị trước";
    public const string LastScreenshotMessage = "Demo đang công khai cần ít nhất 1 ảnh chụp";
    public const string FeaturedMaxMessage = "Tối đa 6 demo nổi bật, hãy bỏ bớt một demo";
    public const string FeaturedNotPublicMessage = "Chỉ demo công khai mới được đánh dấu nổi bật";
    public const string NewCannotShowMessage = "Chuyển sang Đang làm trở lên trước";
    public const string EverPublishedMessage = "Demo đã từng công khai, chỉ tắt hiển thị được";
    public const string ReasonMessage = "Lùi bậc trạng thái cần lý do 10–500 ký tự";

    // ───── Mục còn thiếu để hiển thị (BR-02), mảng "missing" của API ─────
    public const string MissingShortDescription = "Cần mô tả ngắn";
    public const string MissingFeatures = "Cần ít nhất 3 tính năng nổi bật";
    public const string MissingScreenshot = "Cần ít nhất 1 ảnh chụp màn hình";
    public const string MissingDemoUrl = "Cần link demo hợp lệ";
    public const string MissingAccount = "Cần ít nhất 1 tài khoản demo";

    // ───── Lý do từ chối ảnh, đúng chữ TC-28, TC-29 (BR-07) ─────
    public const string ScreenshotTypeMessage = "Chỉ nhận JPG, PNG, WebP";
    public const string ScreenshotSizeMessage = "Ảnh vượt 2 MB";
    public const string ScreenshotWidthMessage = "Ảnh cần rộng tối thiểu 1280 px";
    public const string ScreenshotCountMessage = "Mỗi demo tối đa 8 ảnh";

    /// <summary>Trạng thái khách mở được demo: Demo được, Hoàn thiện.</summary>
    public static bool IsRunnable(DemoDevStatus status) => status is DemoDevStatus.DemoDuoc or DemoDevStatus.HoanThien;

    /// <summary>BR-11: lùi bậc khi trạng thái mới đứng trước trạng thái cũ.</summary>
    public static bool IsBackward(DemoDevStatus from, DemoDevStatus to) => to < from;

    /// <summary>BR-11: lý do lùi bậc dài 10–500 ký tự (sau khi bỏ khoảng trắng hai đầu).</summary>
    public static bool IsValidReason(string? reason)
    {
        var length = reason?.Trim().Length ?? 0;
        return length is >= ReasonMinLength and <= ReasonMaxLength;
    }

    /// <summary>BR-05: 3–60 ký tự, chữ thường không dấu, số, "-", không bắt đầu hoặc kết thúc bằng "-".</summary>
    public static bool IsValidSlug(string? slug) => slug is not null && SlugRegex().IsMatch(slug);

    /// <summary>BR-09: 3–40 ký tự, chữ thường không dấu, số, "-".</summary>
    public static bool IsValidProjectCode(string? code) => code is not null && ProjectCodeRegex().IsMatch(code);

    /// <summary>UC-05 E3: link phải là địa chỉ http:// hoặc https:// đầy đủ, không có khoảng trắng.</summary>
    public static bool IsValidHttpUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var text = value.Trim();
        return HttpUrlRegex().IsMatch(text)
            && Uri.TryCreate(text, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            && !string.IsNullOrEmpty(uri.Host);
    }

    /// <summary>BR-09: thư mục = <c>{số thứ tự 2 chữ số}-{mã dự án}</c>, vd <c>02-fnb-pos-cafe</c>.</summary>
    public static string Folder(int number, string projectCode) => $"{number:00}-{projectCode}";

    /// <summary>BR-18: vị trí thứ <paramref name="index"/> (từ 0) có thứ tự 10, 20, 30…, không vượt 999.</summary>
    public static int SortOrderAt(int index) => Math.Min((index + 1) * SortOrderStep, SortOrderMax);

    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$")]
    private static partial Regex SlugRegex();

    [GeneratedRegex("^[a-z0-9-]{3,40}$")]
    private static partial Regex ProjectCodeRegex();

    [GeneratedRegex(@"^https?://\S+$", RegexOptions.IgnoreCase)]
    private static partial Regex HttpUrlRegex();
}
