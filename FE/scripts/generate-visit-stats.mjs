// Sinh số liệu lượt xem, lượt mở demo theo ngày cho src/mock/seed/demo-data.json (mục visitStats).
// Xác định: dùng bộ sinh số ngẫu nhiên có hạt giống cố định, chạy lại cho đúng kết quả cũ.
// Chạy: node scripts/generate-visit-stats.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'mock', 'seed', 'demo-data.json')
const data = JSON.parse(readFileSync(file, 'utf8'))

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Lượt xem trung bình một ngày làm việc, theo mức độ khách quan tâm
const baseViews = {
  'pos-quan-cafe': 18, 'quan-ly-nha-hang': 9, 'menu-qr-goi-mon': 14, 'website-ban-hang': 16,
  'pos-cua-hang-ban-le': 8, 'quan-ly-kho': 7, 'quan-ly-spa-salon': 13, 'quan-ly-phong-kham': 4,
  'cho-thue-san-the-thao': 9, 'quan-ly-trung-tam-ngoai-ngu': 3, 'crm-quan-ly-khach-hang': 15,
  'quan-ly-nha-tro': 10, 'website-cong-ty': 8,
}
// Hệ số theo vị trí ngày trong chu kỳ 7 ngày (đọc dữ liệu luôn ra cùng mẫu, không phụ thuộc thứ thật)
const weekPattern = [1.0, 1.15, 1.2, 1.15, 1.0, 0.7, 0.55]
const DAYS = 90
const rand = mulberry32(20261013)
const stats = []

for (const demo of data.demos) {
  if (!demo.isVisible) continue
  const base = baseViews[demo.slug] ?? 5
  const comingSoon = demo.devStatus === 'DangLam'
  // Khách bắt đầu thấy demo từ ngày công khai đầu tiên, demo Sắp ra mắt từ ngày chuyển Đang làm
  const since = comingSoon
    ? demo.statusHistory.find((h) => h.to === 'DangLam')?.daysAgo ?? 30
    : demo.firstPublishedDaysAgo ?? 30
  const openRate = comingSoon ? 0 : 0.28 + rand() * 0.14
  const mobileShare = 0.55 + rand() * 0.15
  for (let offset = -(Math.min(since, DAYS) - 1); offset <= 0; offset++) {
    const progress = (offset + DAYS) / DAYS
    const trend = 0.85 + 0.3 * progress
    const week = weekPattern[(((offset % 7) + 7) % 7)]
    const noise = 0.7 + rand() * 0.6
    const todayFactor = offset === 0 ? 0.45 : 1
    const views = Math.max(0, Math.round(base * trend * week * noise * todayFactor))
    const opens = Math.min(views, Math.round(views * openRate * (0.85 + rand() * 0.3)))
    const mobileViews = Math.round(views * mobileShare)
    stats.push({ demo: demo.slug, dayOffset: offset, views, opens, mobileViews, desktopViews: views - mobileViews })
  }
}

data.visitStats = stats
writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
const total = stats.reduce((a, s) => ({ views: a.views + s.views, opens: a.opens + s.opens }), { views: 0, opens: 0 })
console.log(`Đã sinh ${stats.length} dòng visitStats: ${total.views} lượt xem, ${total.opens} lượt mở`)
