using API.Base;
using API.Filters;
using Application.Constants;
using Application.DTOs.Demos;
using Application.Interfaces.Services.Demos;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Demos;

/// <summary>Quản lý demo (UC-03, UC-05, UC-06, UC-07, UC-08), 07-DANH-SACH-API §3.</summary>
[Route("api/demos")]
public sealed class DemosController(
    IDemoManagementService demoService,
    IDemoScreenshotService screenshotService) : BaseApiController
{
    /// <summary>Danh sách quản trị theo thứ tự <c>sortOrder</c> (lọc, tìm ở FE).</summary>
    /// <remarks>Người phụ trách chỉ có khi người gọi có quyền <c>demos.view-internal</c>.</remarks>
    [HttpGet]
    [AuthorizePermission(ProjectPermissions.Demos.View)]
    [ProducesResponseType<IReadOnlyList<DemoListItem>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DemoListItem>>> GetAll(CancellationToken ct) =>
        Ok(await demoService.GetListAsync(ct));

    /// <summary>Thẻ tổng hợp: số demo theo trạng thái, số đang hiển thị, số nổi bật trên 6.</summary>
    [HttpGet("summary")]
    [AuthorizePermission(ProjectPermissions.Demos.View)]
    [ProducesResponseType<DemoSummary>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DemoSummary>> GetSummary(CancellationToken ct) =>
        Ok(await demoService.GetSummaryAsync(ct));

    /// <summary>Số thứ tự gợi ý khi thêm demo: số lớn nhất hiện có cộng 1 (BR-09).</summary>
    [HttpGet("next-number")]
    [AuthorizePermission(ProjectPermissions.Demos.Create)]
    [ProducesResponseType<NextNumberResult>(StatusCodes.Status200OK)]
    public async Task<ActionResult<NextNumberResult>> GetNextNumber(CancellationToken ct) =>
        Ok(await demoService.GetNextNumberAsync(ct));

    /// <summary>Chi tiết quản trị.</summary>
    /// <remarks>Phần <c>internal</c> chỉ có khi người gọi có quyền <c>demos.view-internal</c> (BR-10).</remarks>
    [HttpGet("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Demos.View)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> GetById(Guid id, CancellationToken ct) =>
        Ok(await demoService.GetByIdAsync(id, ct));

    /// <summary>Chi tiết theo slug cho khung nội bộ và xem trước demo chưa công khai (FR-12, FR-13); nhận cả slug cũ.</summary>
    [HttpGet("by-slug/{slug}")]
    [AuthorizePermission(ProjectPermissions.Demos.ViewInternal)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> GetBySlug(string slug, CancellationToken ct) =>
        Ok(await demoService.GetBySlugAsync(slug, ct));

    /// <summary>Thêm demo: trạng thái Mới tạo, ẩn.</summary>
    /// <remarks>Trùng số thứ tự, mã dự án, slug (kể cả slug cũ) trả 409 với <c>errors.number|projectCode|slug</c>.</remarks>
    [HttpPost]
    [AuthorizePermission(ProjectPermissions.Demos.Create)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DemoDetail>> Create(CreateDemoRequest request, CancellationToken ct)
    {
        var demo = await demoService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = demo.Id }, demo);
    }

    /// <summary>Sửa thông tin, tài khoản demo, câu hỏi, nội bộ (BR-02, BR-05, BR-06, BR-08).</summary>
    /// <remarks>
    /// Mã dự án không đổi (bỏ qua giá trị gửi lên). Demo đang hiển thị mà sửa làm mất điều kiện thì trả 400
    /// "Demo đang hiển thị, cần tắt hiển thị trước" kèm <c>missing</c>. Đổi slug của demo đã từng công khai thì slug cũ
    /// được lưu để chuyển hướng. Trùng số thứ tự, slug (kể cả slug cũ) trả 409.
    /// </remarks>
    [HttpPut("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Demos.Update)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> Update(Guid id, SaveDemoRequest request, CancellationToken ct) =>
        Ok(await demoService.UpdateAsync(id, request, ct));

    /// <summary>Xóa demo chưa từng công khai (BR-12).</summary>
    [HttpDelete("{id:guid}")]
    [AuthorizePermission(ProjectPermissions.Demos.Delete)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await demoService.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Đổi trạng thái phát triển (BR-11, BR-02). Trả <c>DemoDetail</c> (200) theo hợp đồng dự án, không 204.</summary>
    /// <remarks>Lùi bậc cần <c>reason</c> 10–500 ký tự (lỗi tại <c>errors.reason</c>).</remarks>
    [HttpPatch("{id:guid}/status")]
    [AuthorizePermission(ProjectPermissions.Demos.Publish)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> ChangeStatus(Guid id, ChangeStatusRequest request, CancellationToken ct) =>
        Ok(await demoService.ChangeStatusAsync(id, request, ct));

    /// <summary>Bật/tắt hiển thị (BR-01, BR-02); thiếu điều kiện trả 400 kèm <c>missing</c>.</summary>
    [HttpPatch("{id:guid}/visibility")]
    [AuthorizePermission(ProjectPermissions.Demos.Publish)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> SetVisibility(Guid id, SetVisibilityRequest request, CancellationToken ct) =>
        Ok(await demoService.SetVisibilityAsync(id, request, ct));

    /// <summary>Đánh dấu, bỏ đánh dấu nổi bật (BR-04: tối đa 6, chỉ demo công khai).</summary>
    [HttpPatch("{id:guid}/featured")]
    [AuthorizePermission(ProjectPermissions.Demos.Publish)]
    [ProducesResponseType<DemoDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DemoDetail>> SetFeatured(Guid id, SetFeaturedRequest request, CancellationToken ct) =>
        Ok(await demoService.SetFeaturedAsync(id, request, ct));

    /// <summary>Lưu thứ tự kéo thả: <c>ids</c> gồm toàn bộ demo theo thứ tự mới, đánh lại 10, 20, 30… (BR-18).</summary>
    [HttpPut("order")]
    [AuthorizePermission(ProjectPermissions.Demos.Publish)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reorder(ReorderDemosRequest request, CancellationToken ct)
    {
        await demoService.ReorderAsync(request, ct);
        return NoContent();
    }

    /// <summary>Lịch sử đổi trạng thái, mới nhất trước.</summary>
    [HttpGet("{id:guid}/status-history")]
    [AuthorizePermission(ProjectPermissions.Demos.View)]
    [ProducesResponseType<IReadOnlyList<StatusHistoryItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<StatusHistoryItem>>> GetStatusHistory(Guid id, CancellationToken ct) =>
        Ok(await demoService.GetStatusHistoryAsync(id, ct));

    /// <summary>Tải ảnh chụp màn hình (multipart, trường <c>files</c>, nhiều file).</summary>
    /// <remarks>
    /// JPG, PNG, WebP (nhận diện theo nội dung); tối đa 2 MB; rộng tối thiểu 1280 px; tối đa 8 ảnh mỗi demo (BR-07).
    /// Ảnh hợp lệ vẫn được nhận; ảnh lỗi nằm trong <c>rejected</c> kèm lý do.
    /// </remarks>
    [HttpPost("{id:guid}/screenshots")]
    [AuthorizePermission(ProjectPermissions.Demos.Update)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ScreenshotUploadLimits.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ScreenshotUploadLimits.MaxRequestBytes)]
    [ProducesResponseType<UploadScreenshotsResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UploadScreenshotsResult>> UploadScreenshots(Guid id, List<IFormFile> files, CancellationToken ct)
    {
        var uploads = new List<ScreenshotUpload>();
        try
        {
            foreach (var file in files)
                uploads.Add(new ScreenshotUpload(file.FileName, file.Length, file.OpenReadStream()));

            return Ok(await screenshotService.UploadAsync(id, uploads, ct));
        }
        finally
        {
            foreach (var upload in uploads)
                await upload.Content.DisposeAsync();
        }
    }

    /// <summary>Sửa chú thích, thứ tự, ảnh đại diện; <c>items</c> gồm đủ mọi ảnh của demo.</summary>
    [HttpPut("{id:guid}/screenshots")]
    [AuthorizePermission(ProjectPermissions.Demos.Update)]
    [ProducesResponseType<IReadOnlyList<DemoScreenshotDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<DemoScreenshotDto>>> UpdateScreenshots(Guid id, UpdateScreenshotsRequest request, CancellationToken ct) =>
        Ok(await screenshotService.UpdateAsync(id, request, ct));

    /// <summary>Xóa ảnh; xóa ảnh đại diện thì ảnh kế tiếp thành đại diện.</summary>
    /// <remarks>Ảnh cuối của demo đang công khai không xóa được: "Demo đang công khai cần ít nhất 1 ảnh chụp" (BR-02).</remarks>
    [HttpDelete("{id:guid}/screenshots/{screenshotId:guid}")]
    [AuthorizePermission(ProjectPermissions.Demos.Update)]
    [ProducesResponseType<IReadOnlyList<DemoScreenshotDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<DemoScreenshotDto>>> DeleteScreenshot(Guid id, Guid screenshotId, CancellationToken ct) =>
        Ok(await screenshotService.DeleteAsync(id, screenshotId, ct));
}
