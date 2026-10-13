using Application.DTOs.Reports;

namespace Application.Interfaces.Services.Reports;

/// <summary>Thống kê lượt xem, lượt mở demo (UC-10, FR-28), chỉ đọc bảng tổng hợp ngày.</summary>
public interface IVisitReportService
{
    Task<VisitReport> GetVisitReportAsync(VisitReportQuery query, CancellationToken ct = default);
}
