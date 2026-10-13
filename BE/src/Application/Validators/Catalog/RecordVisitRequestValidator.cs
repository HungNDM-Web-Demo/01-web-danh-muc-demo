using Application.DTOs.Catalog;
using Application.Validators.Common;
using Domain.Entities.Cms.DemoVisits;
using FluentValidation;

namespace Application.Validators.Catalog;

/// <summary>Ghi lượt xem, lượt mở (BR-14): mã trình duyệt 16–64 ký tự, loại và thiết bị hợp lệ.</summary>
public sealed class RecordVisitRequestValidator : AppValidator<RecordVisitRequest>
{
    public RecordVisitRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum().WithMessage("Loại lượt truy cập không hợp lệ");
        RuleFor(x => x.Device).IsInEnum().WithMessage("Thiết bị không hợp lệ");
        RuleFor(x => x.VisitorId)
            .Must(v => (v?.Trim().Length ?? 0) is >= DemoVisit.VisitorIdMinLength and <= DemoVisit.VisitorIdMaxLength)
            .WithMessage($"Mã trình duyệt dài {DemoVisit.VisitorIdMinLength}–{DemoVisit.VisitorIdMaxLength} ký tự");
    }
}
