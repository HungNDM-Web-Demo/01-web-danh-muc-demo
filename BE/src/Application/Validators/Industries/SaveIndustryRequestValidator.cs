using System.Text.RegularExpressions;
using Application.DTOs.Industries;
using Application.Validators.Common;
using Domain.Entities.Cms.Industries;
using FluentValidation;

namespace Application.Validators.Industries;

/// <summary>
/// Thêm, sửa nhóm ngành (FR-25, BR-13). Thông báo giống FE <c>features/industries/mock/industry.mock.ts</c>.
/// Trùng mã, slug kiểm tra ở service.
/// </summary>
public sealed partial class SaveIndustryRequestValidator : AppValidator<SaveIndustryRequest>
{
    public const string SlugMessage = "Slug 1–40 ký tự, gồm chữ thường không dấu, số, dấu -, không bắt đầu hoặc kết thúc bằng -";
    public const string ColorMessage = "Màu dạng #RRGGBB, vd #EA580C";

    public SaveIndustryRequestValidator()
    {
        RuleFor(x => x.Code)
            .InclusiveBetween(Industry.CodeMin, Industry.CodeMax)
            .WithMessage($"Mã nhóm là số nguyên từ {Industry.CodeMin} đến {Industry.CodeMax}");

        RuleFor(x => x.Name)
            .Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Nhập tên nhóm ngành")
            .Must(v => v.Trim().Length <= Industry.NameMaxLength).WithMessage($"Tên nhóm tối đa {Industry.NameMaxLength} ký tự");

        RuleFor(x => x.Slug)
            .Must(v => v is not null && SlugRegex().IsMatch(v.Trim())).WithMessage(SlugMessage);

        RuleFor(x => x.Color)
            .Must(v => v is not null && ColorRegex().IsMatch(v.Trim())).WithMessage(ColorMessage);

        RuleFor(x => x.Description)
            .Must(v => v is null || v.Trim().Length <= Industry.DescriptionMaxLength)
            .WithMessage($"Mô tả tối đa {Industry.DescriptionMaxLength} ký tự");

        RuleFor(x => x.Icon)
            .Must(v => v is null || v.Trim().Length <= Industry.IconMaxLength)
            .WithMessage($"Tên biểu tượng tối đa {Industry.IconMaxLength} ký tự");
    }

    /// <summary>Slug nhóm ngành: chữ thường không dấu, số, "-", vd fnb, ban-le (02-SRS §5.3).</summary>
    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$")]
    private static partial Regex SlugRegex();

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex ColorRegex();
}
