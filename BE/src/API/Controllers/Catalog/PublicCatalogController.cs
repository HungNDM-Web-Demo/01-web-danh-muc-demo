using API.Base;
using Application.DTOs.Catalog;
using Application.Interfaces.Services.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Catalog;

/// <summary>
/// API công khai của danh mục (UC-01, UC-02, FR-27), không cần đăng nhập. Chỉ trả trường được phép công khai (BR-10).
/// </summary>
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicCatalogController(ICatalogService catalogService) : BaseApiController
{
    /// <summary>Nhóm ngành có ít nhất 1 demo hiển thị, kèm số demo gồm cả Sắp ra mắt (BR-13).</summary>
    [HttpGet("industries")]
    [ProducesResponseType<IReadOnlyList<PublicIndustry>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PublicIndustry>>> GetIndustries(CancellationToken ct) =>
        Ok(await catalogService.GetIndustriesAsync(ct));

    /// <summary>Demo hiển thị, đúng thứ tự BR-04. Lọc và tìm kiếm làm ở FE (BR-03).</summary>
    [HttpGet("demos")]
    [ProducesResponseType<IReadOnlyList<PublicDemoCard>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PublicDemoCard>>> GetDemos(CancellationToken ct) =>
        Ok(await catalogService.GetDemosAsync(ct));

    /// <summary>Chi tiết demo hiển thị; slug cũ trả <c>redirectSlug</c> để FE chuyển hướng 301 (BR-06).</summary>
    /// <remarks>Slug không tồn tại hoặc demo không hiển thị trả 404.</remarks>
    [HttpGet("demos/{slug}")]
    [ProducesResponseType<PublicDemoLookup>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicDemoLookup>> GetDemo(string slug, CancellationToken ct) =>
        Ok(await catalogService.GetDemoAsync(slug, ct));

    /// <summary>Ghi lượt xem chi tiết hoặc lượt mở demo (BR-14).</summary>
    /// <remarks>
    /// Cùng trình duyệt, cùng demo, cùng loại trong 30 phút chỉ tính 1 lượt. Bỏ qua (trả <c>counted: false</c>) khi có
    /// header <c>Authorization</c> (người đang đăng nhập) hoặc user agent là bot.
    /// </remarks>
    [HttpPost("demos/{slug}/visits")]
    [ProducesResponseType<RecordVisitResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecordVisitResult>> RecordVisit(string slug, RecordVisitRequest request, CancellationToken ct)
    {
        var source = new VisitSource(Request.Headers.ContainsKey("Authorization"), Request.Headers.UserAgent.ToString());
        return Ok(await catalogService.RecordVisitAsync(slug, request, source, ct));
    }
}
