using API.Base;
using API.Filters;
using Application.Constants;
using Application.DTOs.Industries;
using Application.Interfaces.Services.Industries;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Industries;

/// <summary>Nhóm ngành (UC-09, FR-25, FR-26), 07-DANH-SACH-API §4. Danh sách trả mảng, không phân trang.</summary>
[Route("api/industries")]
public sealed class IndustriesController(IIndustryService industryService) : BaseApiController
{
    /// <summary>Mọi nhóm theo thứ tự, kèm số demo và số demo đang hiển thị.</summary>
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Industries.View)]
    [ProducesResponseType<IReadOnlyList<IndustryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<IndustryDto>>> GetAll(CancellationToken ct) =>
        Ok(await industryService.GetListAsync(ct));

    /// <summary>Chi tiết một nhóm ngành.</summary>
    [HttpGet("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Industries.View)]
    [ProducesResponseType<IndustryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IndustryDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await industryService.GetByIdAsync(id, ct));

    /// <summary>Thêm nhóm ngành; mã và slug không trùng (BR-13), trùng trả 409.</summary>
    [HttpPost]
    [AuthorizePermission(ProjectPermissions.Industries.Create)]
    [ProducesResponseType<IndustryDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<IndustryDto>> Create(SaveIndustryRequest request, CancellationToken ct)
    {
        var industry = await industryService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = industry.Id }, industry);
    }

    /// <summary>Sửa nhóm ngành.</summary>
    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Industries.Update)]
    [ProducesResponseType<IndustryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<IndustryDto>> Update(Guid id, SaveIndustryRequest request, CancellationToken ct) =>
        Ok(await industryService.UpdateAsync(id, request, ct));

    /// <summary>Xóa nhóm ngành không còn demo; còn demo trả 400 "Nhóm đang có N demo" (BR-13).</summary>
    [HttpDelete("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Industries.Delete)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await industryService.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Lưu thứ tự nhóm ngành: <c>ids</c> gồm toàn bộ nhóm theo thứ tự mới.</summary>
    [HttpPut("order")]
    [AuthorizePermission(ProjectPermissions.Industries.Update)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reorder(ReorderIndustriesRequest request, CancellationToken ct)
    {
        await industryService.ReorderAsync(request, ct);
        return NoContent();
    }
}
