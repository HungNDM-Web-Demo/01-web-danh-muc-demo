using Application.DTOs.Demos;
using Application.Validators.Common;
using Domain.Entities.Cms.Demos;
using FluentValidation;

namespace Application.Validators.Demos;

/// <summary>BR-11: trạng thái hợp lệ; lý do (nếu có) tối đa 500 ký tự. Lùi bậc cần lý do kiểm tra ở service vì cần trạng thái hiện tại.</summary>
public sealed class ChangeStatusRequestValidator : AppValidator<ChangeStatusRequest>
{
    public ChangeStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum().WithMessage("Trạng thái không hợp lệ");
        RuleFor(x => x.Reason)
            .Must(v => v is null || v.Trim().Length <= DemoRules.ReasonMaxLength)
            .WithMessage(DemoRules.ReasonMessage);
    }
}

/// <summary>Sửa chú thích ảnh: tối đa 125 ký tự (BR-07).</summary>
public sealed class UpdateScreenshotsRequestValidator : AppValidator<UpdateScreenshotsRequest>
{
    public UpdateScreenshotsRequestValidator()
    {
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Id).NotEmpty().WithMessage("Ảnh không hợp lệ");
            item.RuleFor(i => i.Caption)
                .Must(v => v is null || v.Trim().Length <= DemoRules.CaptionMaxLength)
                .WithMessage($"Chú thích tối đa {DemoRules.CaptionMaxLength} ký tự");
        });
    }
}
