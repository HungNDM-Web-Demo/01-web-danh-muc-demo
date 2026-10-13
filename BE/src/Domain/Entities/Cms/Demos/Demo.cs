using Domain.Base;
using Domain.Common;
using Domain.Entities.Cms.Industries;
using Domain.Enums.Cms.Demos;

namespace Domain.Entities.Cms.Demos;

/// <summary>
/// Một sản phẩm mẫu trong danh mục (<c>Cms_Demos</c>). Gốc của ảnh chụp, tài khoản demo, câu hỏi thường gặp,
/// slug cũ và lịch sử trạng thái: mọi thay đổi đi qua method của lớp này để giữ BR-01, BR-02, BR-04, BR-06, BR-07,
/// BR-11, BR-12.
/// </summary>
public class Demo : BaseEntity, ICreationTracked, IModificationTracked
{
    private readonly List<DemoScreenshot> _screenshots = [];
    private readonly List<DemoAccount> _accounts = [];
    private readonly List<DemoFaq> _faqs = [];
    private readonly List<DemoSlugHistory> _slugHistories = [];
    private readonly List<DemoStatusHistory> _statusHistories = [];

    private Demo()
    {
    }

    /// <summary>Số thứ tự 2 chữ số, không trùng (BR-09).</summary>
    public short Number { get; private set; }

    /// <summary>Mã dự án, không đổi sau khi tạo (BR-09).</summary>
    public string ProjectCode { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    /// <summary>BR-05; không trùng slug hiện tại và slug cũ của demo khác (BR-06).</summary>
    public string Slug { get; private set; } = string.Empty;

    public Guid IndustryId { get; private set; }
    public Industry Industry { get; private set; } = null!;

    /// <summary>Mã ý tưởng gốc, vd <c>1.1</c>.</summary>
    public string? IdeaCode { get; private set; }

    public string? TargetCustomers { get; private set; }
    public string? ProblemSolved { get; private set; }
    public string? ProductType { get; private set; }
    public string? Devices { get; private set; }
    public string? ShortDescription { get; private set; }
    public string? Description { get; private set; }

    /// <summary>Tính năng nổi bật, tối đa 6 (lưu JSON ở cột <c>FeaturesJson</c>).</summary>
    public IReadOnlyList<string> Features { get; private set; } = [];

    /// <summary>Từ khóa tìm kiếm, tối đa 10 (lưu JSON ở cột <c>KeywordsJson</c>).</summary>
    public IReadOnlyList<string> Keywords { get; private set; } = [];

    public string? DemoUrl { get; private set; }

    /// <summary>Nội bộ (BR-10).</summary>
    public string? SwaggerUrl { get; private set; }

    /// <summary>Nội bộ (BR-10).</summary>
    public string? RepoUrl { get; private set; }

    /// <summary>Người phụ trách, nội bộ (BR-10).</summary>
    public string? OwnerName { get; private set; }

    /// <summary>BR-16: tắt thì không cần tài khoản demo (vd landing page).</summary>
    public bool RequiresLogin { get; private set; } = true;

    /// <summary>Nội bộ (BR-10).</summary>
    public string? DemoPassword { get; private set; }

    /// <summary>Nội bộ (BR-10).</summary>
    public string? InternalNotes { get; private set; }

    /// <summary>Kịch bản tóm tắt, nội bộ (BR-10).</summary>
    public string? DemoScript { get; private set; }

    public DemoDevStatus DevStatus { get; private set; } = DemoDevStatus.MoiTao;
    public bool IsVisible { get; private set; }
    public bool IsFeatured { get; private set; }

    /// <summary>Thứ tự 1–999 (BR-18).</summary>
    public int SortOrder { get; private set; }

    /// <summary>Lần đầu vừa hiển thị vừa ở Demo được/Hoàn thiện. Còn trống thì xóa được (BR-12).</summary>
    public DateTime? FirstPublishedAt { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    public IReadOnlyCollection<DemoScreenshot> Screenshots => _screenshots;
    public IReadOnlyCollection<DemoAccount> Accounts => _accounts;
    public IReadOnlyCollection<DemoFaq> Faqs => _faqs;
    public IReadOnlyCollection<DemoSlugHistory> SlugHistories => _slugHistories;
    public IReadOnlyCollection<DemoStatusHistory> StatusHistories => _statusHistories;

    /// <summary>Thư mục trong kho, vd <c>02-fnb-pos-cafe</c> (BR-09). Không lưu DB.</summary>
    public string Folder => DemoRules.Folder(Number, ProjectCode);

    /// <summary>Công khai: bật Hiển thị và ở Demo được hoặc Hoàn thiện; khách mở được demo.</summary>
    public bool IsPublic => IsVisible && DemoRules.IsRunnable(DevStatus);

    /// <summary>Xuất hiện trên danh mục: bật Hiển thị và không phải Mới tạo (BR-01).</summary>
    public bool IsListed => IsVisible && DevStatus != DemoDevStatus.MoiTao;

    /// <summary>Thẻ "Sắp ra mắt": trạng thái Đang làm, không có nút Xem demo.</summary>
    public bool IsComingSoon => DevStatus == DemoDevStatus.DangLam;

    /// <summary>Nổi bật trên danh mục: chỉ tính khi đang công khai (BR-04).</summary>
    public bool IsFeaturedOnCatalog => IsFeatured && IsPublic;

    public bool EverPublished => FirstPublishedAt.HasValue;

    /// <summary>Ảnh chụp theo thứ tự hiển thị.</summary>
    public IReadOnlyList<DemoScreenshot> OrderedScreenshots => _screenshots.OrderBy(s => s.SortOrder).ToList();

    /// <summary>BR-07: ảnh đại diện; chưa chọn thì lấy ảnh đầu tiên; chưa có ảnh thì null.</summary>
    public DemoScreenshot? Cover
    {
        get
        {
            var ordered = OrderedScreenshots;
            return ordered.FirstOrDefault(s => s.IsCover) ?? ordered.FirstOrDefault();
        }
    }

    /// <summary>
    /// Thêm demo (UC-05): trạng thái Mới tạo, ẩn, thứ tự = số thứ tự × 10; ghi dòng lịch sử đầu tiên.
    /// </summary>
    public static Demo Create(string projectCode, DemoContent content, string changedByName, DateTime now)
    {
        var code = projectCode?.Trim() ?? string.Empty;
        if (!DemoRules.IsValidProjectCode(code))
            throw new DomainException("Mã dự án 3–40 ký tự, gồm chữ thường không dấu, số, dấu -");

        var demo = new Demo { ProjectCode = code };
        demo.ApplyContent(content, now);
        demo.SortOrder = Math.Clamp(demo.Number * DemoRules.SortOrderStep, DemoRules.SortOrderMin, DemoRules.SortOrderMax);
        demo._statusHistories.Add(new DemoStatusHistory(demo.Id, null, DemoDevStatus.MoiTao, null, changedByName, now));
        return demo;
    }

    /// <summary>
    /// Sửa thông tin, tài khoản, câu hỏi, nội bộ (UC-05). Cần nạp sẵn ảnh chụp, tài khoản, câu hỏi, slug cũ.
    /// BR-02: demo đang hiển thị mà sửa làm mất điều kiện thì từ chối (không lưu vì ném lỗi trước SaveChanges).
    /// </summary>
    public void Update(DemoContent content, DateTime now)
    {
        ApplyContent(content, now);
        EnsureStillShowable();
    }

    /// <summary>Mục còn thiếu để demo được hiển thị ở trạng thái hiện tại (BR-01, BR-02). Rỗng là đủ điều kiện.</summary>
    public IReadOnlyList<string> GetVisibilityMissing()
    {
        if (DevStatus == DemoDevStatus.MoiTao)
            return [DemoRules.NewCannotShowMessage];

        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(ShortDescription))
            missing.Add(DemoRules.MissingShortDescription);
        if (Features.Count(f => !string.IsNullOrWhiteSpace(f)) < DemoRules.FeaturesMinToShow)
            missing.Add(DemoRules.MissingFeatures);

        if (DemoRules.IsRunnable(DevStatus))
        {
            if (_screenshots.Count == 0)
                missing.Add(DemoRules.MissingScreenshot);
            if (!DemoRules.IsValidHttpUrl(DemoUrl))
                missing.Add(DemoRules.MissingDemoUrl);
            if (RequiresLogin && _accounts.Count == 0)
                missing.Add(DemoRules.MissingAccount);
        }

        return missing;
    }

    /// <summary>
    /// Đổi trạng thái phát triển (BR-11). Tiến lên được nhảy bậc, không cần lý do; lùi bậc cần lý do 10–500 ký tự.
    /// Lùi về Đang làm: bỏ nổi bật. Lùi về Mới tạo: tắt Hiển thị, bỏ nổi bật. Demo đang hiển thị phải đủ điều kiện
    /// BR-02 ở trạng thái mới. Lần đầu vừa hiển thị vừa chạy được thì ghi ngày công khai đầu tiên.
    /// </summary>
    /// <returns>false khi trạng thái không đổi.</returns>
    public bool ChangeStatus(DemoDevStatus to, string? reason, string changedByName, DateTime now)
    {
        if (!Enum.IsDefined(to))
            throw new DomainException("Trạng thái không hợp lệ");
        if (to == DevStatus)
            return false;

        var from = DevStatus;
        if (DemoRules.IsBackward(from, to) && !DemoRules.IsValidReason(reason))
            throw new DomainException(DemoRules.ReasonMessage);

        DevStatus = to;
        if (to is DemoDevStatus.DangLam or DemoDevStatus.MoiTao)
            IsFeatured = false;
        if (to == DemoDevStatus.MoiTao)
            IsVisible = false;

        if (IsVisible)
        {
            var missing = GetVisibilityMissing();
            if (missing.Count > 0)
                throw NotEligible(missing);
        }

        MarkFirstPublished(now);
        _statusHistories.Add(new DemoStatusHistory(Id, from, to, reason, TrimChangedBy(changedByName), now));
        return true;
    }

    /// <summary>Bật/tắt hiển thị (BR-01, BR-02). Bật cần đủ điều kiện; tắt thì bỏ nổi bật.</summary>
    public void SetVisibility(bool isVisible, DateTime now)
    {
        if (!isVisible)
        {
            IsVisible = false;
            IsFeatured = false;
            return;
        }

        if (DevStatus == DemoDevStatus.MoiTao)
        {
            throw new DomainException(
                DemoRules.NewCannotShowMessage,
                new Dictionary<string, object?> { ["missing"] = new[] { DemoRules.NewCannotShowMessage } });
        }

        var missing = GetVisibilityMissing();
        if (missing.Count > 0)
            throw NotEligible(missing);

        IsVisible = true;
        MarkFirstPublished(now);
    }

    /// <summary>
    /// Đánh dấu, bỏ đánh dấu nổi bật (BR-04): chỉ demo công khai, tối đa 6 demo.
    /// </summary>
    /// <param name="otherFeaturedCount">Số demo khác đang nổi bật.</param>
    public void SetFeatured(bool isFeatured, int otherFeaturedCount)
    {
        if (isFeatured)
        {
            if (!IsPublic)
                throw new DomainException(DemoRules.FeaturedNotPublicMessage);
            if (otherFeaturedCount >= DemoRules.FeaturedMax)
                throw new DomainException(DemoRules.FeaturedMaxMessage);
        }

        IsFeatured = isFeatured;
    }

    /// <summary>BR-18: thứ tự là số nguyên 1–999.</summary>
    public void SetSortOrder(int sortOrder) =>
        SortOrder = Math.Clamp(sortOrder, DemoRules.SortOrderMin, DemoRules.SortOrderMax);

    /// <summary>BR-12: chỉ xóa được demo chưa từng công khai.</summary>
    public void EnsureCanBeDeleted()
    {
        if (EverPublished)
            throw new DomainException(DemoRules.EverPublishedMessage);
    }

    // ───────────────────────── Ảnh chụp (BR-07) ─────────────────────────

    /// <summary>Còn chỗ cho thêm ảnh (tối đa 8).</summary>
    public bool HasRoomForScreenshot => _screenshots.Count < DemoRules.ScreenshotsMax;

    /// <summary>
    /// Thêm ảnh vào cuối thư viện. Chưa có ảnh đại diện thì ảnh này làm đại diện; <paramref name="makeCover"/> để chọn
    /// làm đại diện ngay. Kiểm tra định dạng, dung lượng, chiều rộng làm ở bước nhận file.
    /// </summary>
    public DemoScreenshot AddScreenshot(string url, string? caption, int width, int height, long sizeBytes, bool makeCover = false)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new DomainException("Thiếu đường dẫn ảnh");
        if (!HasRoomForScreenshot)
            throw new DomainException(DemoRules.ScreenshotCountMessage);

        var hasCover = _screenshots.Any(s => s.IsCover);
        var sortOrder = (_screenshots.Count == 0 ? 0 : _screenshots.Max(s => s.SortOrder)) + 1;
        var screenshot = new DemoScreenshot(Id, url.Trim(), caption, width, height, sizeBytes, sortOrder, isCover: makeCover || !hasCover);
        if (makeCover)
        {
            foreach (var other in _screenshots)
                other.SetCover(false);
        }

        _screenshots.Add(screenshot);
        NormalizeScreenshots();
        return screenshot;
    }

    /// <summary>
    /// Sửa chú thích, thứ tự, ảnh đại diện của toàn bộ thư viện. Danh sách phải gồm đủ mọi ảnh và đúng 1 ảnh đại diện.
    /// </summary>
    public void UpdateScreenshots(IReadOnlyList<ScreenshotChange> changes)
    {
        if (changes.Count != _screenshots.Count || _screenshots.Any(s => changes.All(c => c.Id != s.Id)))
            throw new DomainException("Danh sách ảnh đã thay đổi, tải lại trang rồi thử lại");
        if (changes.Count > 0 && changes.Count(c => c.IsCover) != 1)
            throw new DomainException("Chọn đúng 1 ảnh đại diện");

        foreach (var screenshot in _screenshots)
        {
            var change = changes.First(c => c.Id == screenshot.Id);
            screenshot.SetCaption(change.Caption);
            screenshot.SetSortOrder(change.SortOrder);
            screenshot.SetCover(change.IsCover);
        }

        NormalizeScreenshots();
    }

    /// <summary>
    /// Xóa ảnh. Xóa ảnh đại diện thì ảnh kế tiếp thành đại diện. Không xóa ảnh cuối của demo đang công khai (BR-02).
    /// </summary>
    /// <returns>Ảnh đã gỡ (để xóa file), null khi không có ảnh này.</returns>
    public DemoScreenshot? RemoveScreenshot(Guid screenshotId)
    {
        var screenshot = _screenshots.FirstOrDefault(s => s.Id == screenshotId);
        if (screenshot is null)
            return null;

        if (IsPublic && _screenshots.Count <= 1)
            throw new DomainException(DemoRules.LastScreenshotMessage);

        var ordered = OrderedScreenshots.ToList();
        var index = ordered.IndexOf(screenshot);
        ordered.RemoveAt(index);
        if (screenshot.IsCover && ordered.Count > 0)
        {
            var nextCover = ordered[Math.Min(index, ordered.Count - 1)];
            foreach (var other in ordered)
                other.SetCover(other == nextCover);
        }

        _screenshots.Remove(screenshot);
        NormalizeScreenshots();
        EnsureStillShowable();
        return screenshot;
    }

    // ───────────────────────── Dữ liệu mẫu ─────────────────────────

    /// <summary>
    /// Chỉ dùng khi nạp dữ liệu mẫu: đặt trạng thái giả định của file seed và thay lịch sử trạng thái bằng lịch sử mẫu.
    /// </summary>
    public void ApplySeedState(
        DemoDevStatus status,
        bool isVisible,
        bool isFeatured,
        int sortOrder,
        DateTime? firstPublishedAt,
        IEnumerable<(DemoDevStatus? From, DemoDevStatus To, string? Reason, string ChangedByName, DateTime ChangedAt)> history)
    {
        DevStatus = status;
        IsVisible = isVisible;
        IsFeatured = isFeatured;
        SetSortOrder(sortOrder);
        FirstPublishedAt = firstPublishedAt;

        _statusHistories.Clear();
        foreach (var item in history)
            _statusHistories.Add(new DemoStatusHistory(Id, item.From, item.To, item.Reason, TrimChangedBy(item.ChangedByName), item.ChangedAt));
    }

    // ───────────────────────── Nội bộ ─────────────────────────

    private void ApplyContent(DemoContent content, DateTime now)
    {
        ArgumentNullException.ThrowIfNull(content);

        if (content.Number is < DemoRules.NumberMin or > DemoRules.NumberMax)
            throw new DomainException($"Số thứ tự là số nguyên từ {DemoRules.NumberMin} đến {DemoRules.NumberMax}");
        if (string.IsNullOrWhiteSpace(content.Name))
            throw new DomainException("Nhập tên demo");

        var accounts = content.Accounts ?? [];
        if (accounts.Count > DemoRules.AccountsMax)
            throw new DomainException($"Mỗi demo tối đa {DemoRules.AccountsMax} tài khoản demo");
        if (accounts.Select(a => a.Username.Trim()).Distinct(StringComparer.Ordinal).Count() != accounts.Count)
            throw new DomainException("Tên đăng nhập bị trùng trong demo này");

        var features = CleanList(content.Features);
        if (features.Count > DemoRules.FeaturesMax)
            throw new DomainException($"Tối đa {DemoRules.FeaturesMax} tính năng nổi bật");

        Number = (short)content.Number;
        Name = content.Name.Trim();
        ChangeSlug(content.Slug, now);
        IndustryId = content.IndustryId;
        IdeaCode = TrimToNull(content.IdeaCode);
        TargetCustomers = TrimToNull(content.TargetCustomers);
        ProblemSolved = TrimToNull(content.ProblemSolved);
        ProductType = TrimToNull(content.ProductType);
        Devices = TrimToNull(content.Devices);
        ShortDescription = TrimToNull(content.ShortDescription);
        Description = TrimToNull(content.Description);
        Features = features;
        Keywords = CleanList(content.Keywords).Distinct(StringComparer.Ordinal).ToList();
        DemoUrl = TrimToNull(content.DemoUrl);
        SwaggerUrl = TrimToNull(content.SwaggerUrl);
        RepoUrl = TrimToNull(content.RepoUrl);
        OwnerName = TrimToNull(content.OwnerName);
        RequiresLogin = content.RequiresLogin;
        DemoPassword = TrimToNull(content.DemoPassword);
        InternalNotes = TrimToNull(content.InternalNotes);
        DemoScript = TrimToNull(content.DemoScript);
        SyncAccounts(accounts);
        SyncFaqs(content.Faqs ?? []);
    }

    /// <summary>
    /// BR-06: đổi slug của demo đã từng công khai thì lưu slug cũ để chuyển hướng; quay lại slug cũ của chính demo này
    /// thì gỡ slug đó khỏi danh sách slug cũ.
    /// </summary>
    private void ChangeSlug(string slug, DateTime now)
    {
        var next = slug?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!DemoRules.IsValidSlug(next))
            throw new DomainException("Slug 3–60 ký tự, gồm chữ thường không dấu, số, dấu -, không bắt đầu hoặc kết thúc bằng -");
        if (next == Slug)
            return;

        _slugHistories.RemoveAll(h => h.Slug == next);
        if (EverPublished && Slug.Length > 0 && _slugHistories.All(h => h.Slug != Slug))
            _slugHistories.Add(new DemoSlugHistory(Id, Slug, now));

        Slug = next;
    }

    /// <summary>Cập nhật tại chỗ theo vị trí để chỉ dòng thay đổi mới bị ghi (nhật ký gọn).</summary>
    private void SyncAccounts(IReadOnlyList<DemoAccountData> items)
    {
        var current = _accounts.OrderBy(a => a.SortOrder).ToList();
        for (var i = 0; i < items.Count; i++)
        {
            if (i < current.Count)
                current[i].Apply(items[i], i + 1);
            else
                _accounts.Add(new DemoAccount(Id, items[i], i + 1));
        }

        foreach (var extra in current.Skip(items.Count))
            _accounts.Remove(extra);
    }

    private void SyncFaqs(IReadOnlyList<DemoFaqData> items)
    {
        var current = _faqs.OrderBy(f => f.SortOrder).ToList();
        for (var i = 0; i < items.Count; i++)
        {
            if (i < current.Count)
                current[i].Apply(items[i], i + 1);
            else
                _faqs.Add(new DemoFaq(Id, items[i], i + 1));
        }

        foreach (var extra in current.Skip(items.Count))
            _faqs.Remove(extra);
    }

    /// <summary>Đánh lại thứ tự ảnh 1, 2, 3… và giữ đúng 1 ảnh đại diện khi có ảnh (BR-07).</summary>
    private void NormalizeScreenshots()
    {
        var ordered = OrderedScreenshots;
        var cover = ordered.FirstOrDefault(s => s.IsCover) ?? ordered.FirstOrDefault();
        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].SetSortOrder(i + 1);
            ordered[i].SetCover(ordered[i] == cover);
        }
    }

    private void MarkFirstPublished(DateTime now)
    {
        if (IsPublic && FirstPublishedAt is null)
            FirstPublishedAt = now;
    }

    /// <summary>BR-02: demo đang hiển thị không được rơi vào trạng thái thiếu điều kiện.</summary>
    private void EnsureStillShowable()
    {
        if (!IsVisible)
            return;

        var missing = GetVisibilityMissing();
        if (missing.Count > 0)
        {
            throw new DomainException(
                DemoRules.VisibleLockedMessage,
                new Dictionary<string, object?> { ["missing"] = missing });
        }
    }

    private static DomainException NotEligible(IReadOnlyList<string> missing) =>
        new(DemoRules.NotEligibleMessage, new Dictionary<string, object?> { ["missing"] = missing });

    private static List<string> CleanList(IReadOnlyList<string>? items) =>
        (items ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();

    private static string TrimChangedBy(string name)
    {
        var text = string.IsNullOrWhiteSpace(name) ? "hệ thống" : name.Trim();
        return text.Length > DemoRules.ChangedByNameMaxLength ? text[..DemoRules.ChangedByNameMaxLength] : text;
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>Chú thích, thứ tự, ảnh đại diện mới của một ảnh chụp.</summary>
public sealed record ScreenshotChange(Guid Id, string? Caption, int SortOrder, bool IsCover);
