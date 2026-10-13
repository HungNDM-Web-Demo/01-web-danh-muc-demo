import { formatDate } from '@/lib/format'
import type { VisitReport } from '../types/report.types'

/** Ô tiêu đề cột (màu nền trong file Excel, không phải giao diện web) */
const header = (value: string) => ({
  value,
  fontWeight: 'bold' as const,
  backgroundColor: '#E2E8F0',
})
const rateCell = (value?: number | null) =>
  value === null || value === undefined
    ? { value: '—', align: 'right' as const }
    : { value: value / 100, format: '0.0%' }

/**
 * Xuất thống kê đang xem ra file Excel (FR-29): tổng, theo ngày, top demo, nhóm ngành, thiết bị.
 * Chạy hoàn toàn trên trình duyệt (write-excel-file, giấy phép MIT), nạp lười khi bấm nút.
 */
export async function exportVisitReport(report: VisitReport, industryName: string | null) {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  const range = `${formatDate(report.from)} – ${formatDate(report.to)}`

  const sheets = [
    {
      sheet: 'Tổng quan',
      columns: [{ width: 28 }, { width: 22 }],
      data: [
        [header('Thống kê lượt xem demo'), null],
        ['Khoảng ngày', range],
        ['Nhóm ngành', industryName ?? 'Tất cả'],
        ['Lượt xem', report.totals.views],
        ['Lượt mở demo', report.totals.opens],
        ['Tỉ lệ mở demo', rateCell(report.totals.openRate)],
      ],
    },
    {
      sheet: 'Theo ngày',
      columns: [{ width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }],
      stickyRowsCount: 1,
      data: [
        [header('Ngày'), header('Lượt xem'), header('Lượt mở demo'), header('Tỉ lệ mở')],
        ...report.daily.map((d) => [formatDate(d.date), d.views, d.opens, rateCell(d.openRate)]),
      ],
    },
    {
      sheet: 'Top demo',
      columns: [{ width: 6 }, { width: 34 }, { width: 12 }, { width: 14 }, { width: 12 }],
      stickyRowsCount: 1,
      data: [
        [
          header('#'),
          header('Demo'),
          header('Lượt xem'),
          header('Lượt mở demo'),
          header('Tỉ lệ mở'),
        ],
        ...report.topDemos.map((d, i) => [i + 1, d.name, d.views, d.opens, rateCell(d.openRate)]),
      ],
    },
    {
      sheet: 'Nhóm ngành',
      columns: [{ width: 22 }, { width: 12 }, { width: 14 }, { width: 12 }],
      stickyRowsCount: 1,
      data: [
        [header('Nhóm ngành'), header('Lượt xem'), header('Lượt mở demo'), header('Tỉ trọng')],
        ...report.byIndustry.map((d) => [
          d.name,
          d.views,
          d.opens,
          { value: d.share / 100, format: '0.0%' },
        ]),
      ],
    },
    {
      sheet: 'Thiết bị',
      columns: [{ width: 16 }, { width: 12 }, { width: 12 }],
      stickyRowsCount: 1,
      data: [
        [header('Thiết bị'), header('Lượt xem'), header('Tỉ trọng')],
        ...report.byDevice.map((d) => [
          d.device === 'Mobile' ? 'Điện thoại' : 'Máy tính',
          d.views,
          { value: d.share / 100, format: '0.0%' },
        ]),
      ],
    },
  ]

  const blob = await writeXlsxFile(sheets as Parameters<typeof writeXlsxFile>[0]).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `thong-ke-luot-xem_${report.from}_${report.to}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
