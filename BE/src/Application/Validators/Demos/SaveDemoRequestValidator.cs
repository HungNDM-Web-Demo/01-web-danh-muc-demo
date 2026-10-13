using System.Text.RegularExpressions;
using Application.DTOs.Demos;
using Application.Validators.Common;
using Domain.Entities.Cms.Demos;
using FluentValidation;

namespace Application.Validators.Demos;

/// <summary>
/// Kiểm tra định dạng, độ dài khi thêm, sửa demo (BR-05, BR-08, BR-09, BR-16, UC-05 E2, E3). Thông báo giống FE
/// <c>features/demos/mock/demo.mock.ts</c>. Trùng số thứ tự, mã dự án, slug và nhóm ngành tồn tại kiểm tra ở service.
/// </summary>
public sealed partial class SaveDemoRequestValidator : AppValidator<SaveDemoRequest>
{
    public const string UrlMessage = "Link phải bắt đầu bằng http:// hoặc https://";
    public const string SlugMessage = "Slug 3–60 ký tự, gồm chữ thường không dấu, số, dấu -, không bắt đầu hoặc kết thúc bằng -";
    public const string UsernameMessage = "Tên đăng nhập 3–50 ký tự, gồm chữ thường không dấu, số, dấu . hoặc _";

    public SaveDemoRequestValidator()
    {
        RuleFor(x => x.Number)
            .InclusiveBetween(DemoRules.NumberMin, DemoRules.NumberMax)
            .WithMessage($"Số thứ tự là số nguyên từ {DemoRules.NumberMin} đến {DemoRules.NumberMax}");

        RuleFor(x => x.Name)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên demo")
            .Must(v => v.Trim().Length <= DemoRules.NameMaxLength).WithMessage($"Tên tối đa {DemoRules.NameMaxLength} ký tự");

        RuleFor(x => x.Slug)
            .Must(v => DemoRules.IsValidSlug(v?.Trim())).WithMessage(SlugMessage);

        RuleFor(x => x.IndustryId)
            .NotEmpty().WithMessage("Chọn nhóm ngành");

        RuleFor(x => x.ShortDescription)
            .Must(v => string.IsNullOrWhiteSpace(v)
                || v.Trim().Length is >= DemoRules.ShortDescriptionMinLength and <= DemoRules.ShortDescriptionMaxLength)
            .WithMessage(x =>
                $"Mô tả ngắn cần dài {DemoRules.ShortDescriptionMinLength}–{DemoRules.ShortDescriptionMaxLength} ký tự (hiện có {x.ShortDescription?.Trim().Length ?? 0})");

        RuleFor(x => x.Features)
            .Must(v => (v ?? []).Count <= DemoRules.FeaturesMax).WithMessage($"Tối đa {DemoRules.FeaturesMax} tính năng nổi bật")
            .Must(v => (v ?? []).All(f => !string.IsNullOrWhiteSpace(f))).WithMessage("Tính năng không được để trống")
            .Must(v => (v ?? []).All(f => f.Trim().Length <= DemoRules.FeatureMaxLength))
            .WithMessage($"Mỗi tính năng tối đa {DemoRules.FeatureMaxLength} ký tự");

        RuleFor(x => x.Keywords)
            .Must(v => (v ?? []).Count <= DemoRules.KeywordsMax).WithMessage($"Tối đa {DemoRules.KeywordsMax} từ khóa")
            .Must(v => (v ?? []).All(k => (k?.Trim().Length ?? 0) <= DemoRules.KeywordMaxLength))
            .WithMessage($"Mỗi từ khóa tối đa {DemoRules.KeywordMaxLength} ký tự");

        RuleFor(x => x.DemoUrl).Must(BeOptionalHttpUrl).WithMessage(UrlMessage);
        RuleFor(x => x.SwaggerUrl).Must(BeOptionalHttpUrl).WithMessage(UrlMessage);
        RuleFor(x => x.RepoUrl).Must(BeOptionalHttpUrl).WithMessage(UrlMessage);

        RuleFor(x => x.IdeaCode).MaxTrimmed(DemoRules.IdeaCodeMaxLength, "Mã ý tưởng");
        RuleFor(x => x.TargetCustomers).MaxTrimmed(DemoRules.TargetCustomersMaxLength, "Đối tượng khách hàng");
        RuleFor(x => x.ProblemSolved).MaxTrimmed(DemoRules.ProblemSolvedMaxLength, "Vấn đề giải quyết");
        RuleFor(x => x.ProductType).MaxTrimmed(DemoRules.ProductTypeMaxLength, "Loại sản phẩm");
        RuleFor(x => x.Devices).MaxTrimmed(DemoRules.DevicesMaxLength, "Thiết bị");
        RuleFor(x => x.OwnerName).MaxTrimmed(DemoRules.OwnerNameMaxLength, "Người phụ trách");
        RuleFor(x => x.DemoPassword).MaxTrimmed(DemoRules.DemoPasswordMaxLength, "Mật khẩu demo");
        RuleFor(x => x.InternalNotes).MaxTrimmed(DemoRules.InternalNotesMaxLength, "Ghi chú nội bộ");

        RuleFor(x => x.Accounts)
            .Must(v => (v ?? []).Count <= DemoRules.AccountsMax)
            .WithMessage($"Mỗi demo tối đa {DemoRules.AccountsMax} tài khoản demo");

        RuleForEach(x => x.Accounts).ChildRules(account =>
        {
            account.RuleFor(a => a.Username)
                .Must(v => v is not null && UsernameRegex().IsMatch(v.Trim())).WithMessage(UsernameMessage);
            account.RuleFor(a => a.RoleName)
                .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên vai trò")
                .Must(v => v.Trim().Length <= DemoRules.AccountRoleNameMaxLength)
                .WithMessage($"Tên vai trò tối đa {DemoRules.AccountRoleNameMaxLength} ký tự");
            account.RuleFor(a => a.Purpose).MaxTrimmed(DemoRules.AccountPurposeMaxLength, "Mục đích");
        });

        // BR-16: tên đăng nhập không trùng trong cùng một demo, báo ở dòng bị trùng.
        RuleForEach(x => x.Accounts).Custom((account, context) =>
        {
            var username = account.Username?.Trim();
            if (username is null || !UsernameRegex().IsMatch(username))
                return;

            if (IsDuplicateUsername(context.InstanceToValidate.Accounts ?? [], account))
                context.AddFailure(nameof(DemoAccountItem.Username), "Tên đăng nhập bị trùng trong demo này");
        });

        RuleForEach(x => x.Faqs).ChildRules(faq =>
        {
            faq.RuleFor(f => f.Question)
                .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập câu hỏi")
                .Must(v => v.Trim().Length <= DemoRules.FaqQuestionMaxLength)
                .WithMessage($"Câu hỏi tối đa {DemoRules.FaqQuestionMaxLength} ký tự");
            faq.RuleFor(f => f.Answer)
                .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập câu trả lời gợi ý")
                .Must(v => v.Trim().Length <= DemoRules.FaqAnswerMaxLength)
                .WithMessage($"Câu trả lời tối đa {DemoRules.FaqAnswerMaxLength} ký tự");
        });
    }

    private static bool BeOptionalHttpUrl(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || (value.Trim().Length <= DemoRules.UrlMaxLength && DemoRules.IsValidHttpUrl(value));

    /// <summary>Tài khoản đứng sau một tài khoản khác cùng tên đăng nhập thì bị coi là trùng.</summary>
    private static bool IsDuplicateUsername(IReadOnlyList<DemoAccountItem> accounts, DemoAccountItem account)
    {
        var username = account.Username?.Trim();
        if (string.IsNullOrEmpty(username))
            return false;

        for (var i = 0; i < accounts.Count; i++)
        {
            if (ReferenceEquals(accounts[i], account))
                return false;
            if (string.Equals(accounts[i].Username?.Trim(), username, StringComparison.Ordinal))
                return true;
        }

        return false;
    }

    /// <summary>BR-SYS-01: 3–50 ký tự, chữ thường không dấu, số, dấu . _.</summary>
    [GeneratedRegex("^[a-z0-9._]{3,50}$")]
    private static partial Regex UsernameRegex();
}

/// <summary>Thêm demo: kiểm tra chung như sửa, cộng thêm mã dự án (BR-09).</summary>
public sealed class CreateDemoRequestValidator : AppValidator<CreateDemoRequest>
{
    public CreateDemoRequestValidator()
    {
        Include(new SaveDemoRequestValidator());

        RuleFor(x => x.ProjectCode)
            .Must(v => DemoRules.IsValidProjectCode(v?.Trim()))
            .WithMessage("Mã dự án 3–40 ký tự, gồm chữ thường không dấu, số, dấu -");
    }
}

internal static class DemoValidationExtensions
{
    /// <summary>Không bắt buộc; có nhập thì sau khi bỏ khoảng trắng hai đầu không quá <paramref name="max"/> ký tự.</summary>
    public static IRuleBuilderOptions<T, string?> MaxTrimmed<T>(this IRuleBuilder<T, string?> rule, int max, string label) =>
        rule.Must(v => v is null || v.Trim().Length <= max).WithMessage($"{label} tối đa {max} ký tự");
}
