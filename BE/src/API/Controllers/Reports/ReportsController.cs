using API.Base;
using API.Filters;
using Application.Constants;
using Application.DTOs.Reports;
using Application.Interfaces.Services.Reports;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Reports;

/// <summary>Thống kê lượt xem (UC-10, FR-28), 07-DANH-SACH-API §5.</summary>
[Route("api/reports")]
public sealed class ReportsController(IVisitReportService reportService) : BaseApiController
{
    /// <summary>Lượt xem, lượt mở theo khoảng ngày (giờ Việt Nam), top 10 demo, theo nhóm ngành, theo thiết bị.</summary>
    /// <remarks>
    /// <c>from</c>, <c>to</c> dạng <c>yyyy-MM-dd</c>, khoảng tối đa 366 ngày; <c>industryId</c> lọc theo nhóm ngành.
    /// Tỉ lệ mở theo BR-15 (null khi chưa có lượt xem). Xuất Excel làm ở FE từ dữ liệu này.
    /// </remarks>
    [HttpGet("visits")]
    [AuthorizePermission(ProjectPermissions.Reports.View)]
    [ProducesResponseType<VisitReport>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VisitReport>> GetVisits([FromQuery] VisitReportQuery query, CancellationToken ct) =>
        Ok(await reportService.GetVisitReportAsync(query, ct));
}
