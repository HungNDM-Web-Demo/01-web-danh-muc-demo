using Application.DTOs.Reports;
using Application.Validators.Common;
using FluentValidation;

namespace Application.Validators.Reports;

/// <summary>Khoảng ngày của báo cáo lượt xem: bắt buộc, từ ngày không sau đến ngày, tối đa 366 ngày (07-DANH-SACH-API §5).</summary>
public sealed class VisitReportQueryValidator : AppValidator<VisitReportQuery>
{
    public const int MaxDays = 366;

    public VisitReportQueryValidator()
    {
        RuleFor(x => x.From)
            .NotNull().WithMessage("Chọn khoảng ngày hợp lệ")
            .Must((query, from) => query.To is null || from <= query.To).WithMessage("Ngày bắt đầu phải trước ngày kết thúc")
            .Must((query, from) => query.To is null || query.To.Value.DayNumber - from!.Value.DayNumber + 1 <= MaxDays)
            .WithMessage($"Khoảng ngày tối đa {MaxDays} ngày");

        RuleFor(x => x.To).NotNull().WithMessage("Chọn khoảng ngày hợp lệ");
    }
}
