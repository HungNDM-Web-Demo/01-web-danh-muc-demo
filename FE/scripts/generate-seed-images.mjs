// Sinh bộ ảnh chụp màn hình mẫu (giao diện mô phỏng) cho các demo trong src/mock/seed/demo-data.json.
// Mỗi ảnh dựng bằng SVG 1600×1000 theo `layout` (khung ứng dụng, menu đúng nghiệp vụ, dữ liệu tiếng Việt),
// màu chủ đạo là màu nhóm ngành; chuyển WebP ≤150 KB (NFR-02) vào public/seed/demos/{slug}/{file},
// rồi ghi width, height, sizeBytes cho từng ảnh trong demo-data.json (không đổi trường khác).
// Ảnh không khai báo `layout` là ảnh chụp thật (đặt sẵn trong thư mục): bỏ qua, chỉ dùng làm ảnh thu nhỏ.
// Xác định: không dùng ngẫu nhiên tự do (bộ sinh số có hạt giống cố định), chạy lại cho cùng kết quả.
//
// Chạy:      pnpm seed:images
// Tùy chọn:  --only <chuỗi>       chỉ vẽ ảnh có khóa "slug/file" chứa chuỗi (không ghi JSON)
//            --preview <thư mục>  xuất thêm PNG để xem nhanh
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = join(ROOT, 'src', 'mock', 'seed', 'demo-data.json')
const OUT_DIR = join(ROOT, 'public', 'seed', 'demos')
const W = 1600
const H = 1000
const MAX_BYTES = 150 * 1000

const args = process.argv.slice(2)
const argVal = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const ONLY = argVal('--only')
const PREVIEW = argVal('--preview')

// ============================================================ Đo chữ (cắt chữ dài, không tràn)
// Đọc độ rộng ký tự từ file font Segoe UI của Windows; máy không có font thì dùng độ rộng ước lượng.
const FONT = "'Segoe UI', Arial, sans-serif"
const FONT_DIR = join(process.env.WINDIR || 'C:\\Windows', 'Fonts')

function parseFont(file) {
  try {
    const b = readFileSync(file)
    const num = b.readUInt16BE(4)
    const tb = {}
    for (let i = 0; i < num; i++) {
      const o = 12 + i * 16
      tb[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8)
    }
    const upem = b.readUInt16BE(tb.head + 18)
    const nHM = b.readUInt16BE(tb.hhea + 34)
    const cm = tb.cmap
    const n = b.readUInt16BE(cm + 2)
    let sub = -1
    for (let i = 0; i < n; i++) {
      const pid = b.readUInt16BE(cm + 4 + i * 8)
      const eid = b.readUInt16BE(cm + 6 + i * 8)
      const off = b.readUInt32BE(cm + 8 + i * 8)
      if (pid === 3 && eid === 1 && b.readUInt16BE(cm + off) === 4) sub = cm + off
    }
    if (sub < 0) return null
    const segX2 = b.readUInt16BE(sub + 6)
    const ends = sub + 14
    const starts = ends + segX2 + 2
    const deltas = starts + segX2
    const ranges = deltas + segX2
    const cache = new Map()
    return (cp) => {
      if (cp > 0xffff) return null
      if (cache.has(cp)) return cache.get(cp)
      let gid = 0
      for (let i = 0; i < segX2 / 2; i++) {
        if (cp > b.readUInt16BE(ends + i * 2)) continue
        const start = b.readUInt16BE(starts + i * 2)
        if (cp >= start) {
          const delta = b.readUInt16BE(deltas + i * 2)
          const ro = b.readUInt16BE(ranges + i * 2)
          if (ro === 0) gid = (cp + delta) & 0xffff
          else {
            const g = b.readUInt16BE(ranges + i * 2 + ro + (cp - start) * 2)
            gid = g ? (g + delta) & 0xffff : 0
          }
        }
        break
      }
      const w = gid ? b.readUInt16BE(tb.hmtx + 4 * Math.min(gid, nHM - 1)) / upem : null
      cache.set(cp, w)
      return w
    }
  } catch {
    return null
  }
}
const loadMetrics = (files) => files.map((f) => parseFont(join(FONT_DIR, f))).find(Boolean) ?? null
const METRICS = {
  400: loadMetrics(['segoeui.ttf', 'arial.ttf']),
  600: loadMetrics(['seguisb.ttf', 'segoeuib.ttf', 'arialbd.ttf']),
  700: loadMetrics(['segoeuib.ttf', 'arialbd.ttf']),
}
function charWidth(cp, weight) {
  const m = METRICS[weight >= 700 ? 700 : weight >= 600 ? 600 : 400]
  const v = m ? m(cp) : null
  if (v != null) return v
  const ch = String.fromCodePoint(cp)
  if (ch === ' ') return 0.27
  if ("iljI.,:;'|!()[]".includes(ch)) return 0.28
  if (/[A-ZĐ0-9]/.test(ch)) return weight >= 600 ? 0.66 : 0.62
  return weight >= 600 ? 0.58 : 0.54
}
function tw(s, size = 16, weight = 400) {
  let w = 0
  for (const ch of String(s).normalize('NFC').replace(/\s+/g, ' '))
    w += charWidth(ch.codePointAt(0), weight)
  return w * size * 1.01
}
function fit(s, maxW, size = 16, weight = 400) {
  s = String(s)
  if (tw(s, size, weight) <= maxW) return s
  const chars = Array.from(s)
  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tw(chars.slice(0, mid).join('').trimEnd() + '…', size, weight) <= maxW) lo = mid
    else hi = mid - 1
  }
  return chars.slice(0, lo).join('').trimEnd() + '…'
}
function wrap(s, maxW, size = 16, weight = 400, maxLines = 99) {
  const words = String(s).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const wd of words) {
    const t = cur ? `${cur} ${wd}` : wd
    if (tw(t, size, weight) <= maxW || !cur) cur = t
    else {
      lines.push(cur)
      cur = wd
    }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines)
    keep[maxLines - 1] = fit(lines.slice(maxLines - 1).join(' '), maxW, size, weight)
    return keep
  }
  return lines.map((l) => fit(l, maxW, size, weight))
}

// ============================================================ Tiện ích
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const r2 = (n) => Math.round(n * 100) / 100
function attrs(o) {
  let out = ''
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === false) continue
    out += ` ${k}="${typeof v === 'number' ? r2(v) : esc(v)}"`
  }
  return out
}
const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16))
const rgbToHex = (c) =>
  '#' +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase()
const mix = (a, b, t) => {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t))
}
const tint = (c, t) => mix(c, '#FFFFFF', t)
const shade = (c, t) => mix(c, '#000000', t)
const sum = (a) => a.reduce((x, y) => x + y, 0)
const range = (n) => Array.from({ length: n }, (_, i) => i)

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s) {
  let h = 2166136261
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const num = (n) => {
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n < 0 ? `−${s}` : s
}
const vnd = (n) => `${num(n)} ₫`
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',')
// Rút gọn tiền cho trục biểu đồ: 12,5 tr · 1,2 tỷ
function vndShort(n) {
  if (n >= 1e9) return `${dec(n / 1e9, n % 1e9 === 0 ? 0 : 1)} tỷ`
  if (n >= 1e6) return `${dec(n / 1e6, n % 1e6 === 0 ? 0 : 1)} tr`
  if (n >= 1e3) return `${num(n / 1e3)}k`
  return String(n)
}
// Ngày cố định để ảnh luôn giống nhau: hôm nay = 13/10/2026 (Thứ Ba)
const TODAY = Date.UTC(2026, 9, 13)
function dateAgo(days) {
  const d = new Date(TODAY - days * 86400000)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

// ============================================================ Màu
const C = {
  bg: '#F5F6F8',
  border: '#E4E7EC',
  line: '#EEF0F3',
  text: '#101828',
  text2: '#475467',
  text3: '#98A2B3',
  body: '#344054',
  muted: '#F2F4F7',
  soft: '#F9FAFB',
  cta: '#C2410C',
}
const TONES = {
  success: { bg: '#DCFAE6', fg: '#067647', dot: '#17B26A' },
  warning: { bg: '#FEF0C7', fg: '#B54708', dot: '#F79009' },
  danger: { bg: '#FEE4E2', fg: '#B42318', dot: '#F04438' },
  info: { bg: '#D1E9FF', fg: '#175CD3', dot: '#2E90FA' },
  neutral: { bg: '#F2F4F7', fg: '#344054', dot: '#98A2B3' },
  violet: { bg: '#EBE9FE', fg: '#5925DC', dot: '#7A5AF8' },
  teal: { bg: '#CCFBEF', fg: '#107569', dot: '#15B79E' },
}
const AV_COLORS = [
  '#0BA5EC',
  '#7A5AF8',
  '#F79009',
  '#12B76A',
  '#EE46BC',
  '#6172F3',
  '#15B79E',
  '#EF6820',
  '#875BF7',
]

// Trạng thái vẽ của ảnh hiện tại: màu chủ đạo, defs phát sinh (gradient, clipPath)
let P = '#2563EB'
let defs = []
let uid = 0
const newId = (p) => `${p}${++uid}`
function tone(name) {
  if (name === 'primary') return { bg: tint(P, 0.88), fg: shade(P, 0.28), dot: P }
  return TONES[name] ?? TONES.neutral
}
const PD = () => shade(P, 0.18) // màu chủ đạo đậm cho chữ

// ============================================================ Biểu tượng (nét kiểu lucide, lưới 24)
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  coffee:
    '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  cupSoda:
    '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>',
  cake: '<path d="M16 13H3"/><path d="M16 17H3"/><path d="m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6"/><circle cx="9" cy="7" r="2"/>',
  soup: '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>',
  utensils:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  salad:
    '<path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"/><path d="m13 12 4-4"/><path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"/>',
  beer: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>',
  fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  chart:
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  userPlus:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  settings:
    '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  package:
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
  warehouse:
    '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect x="6" y="10" width="12" height="12"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  clipboard:
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  clipboardList:
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  calendarCheck:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  receipt:
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  building:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  store:
    '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  star: '<path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  qr: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  shirt:
    '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  external:
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  mapPin:
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  layers:
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  printer:
    '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  bot: '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  rotateCw: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  transfer:
    '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  importIc: '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
  exportIc: '<path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/>',
  chefHat:
    '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  percent:
    '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  kanban:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
  news: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect x="10" y="6" width="8" height="4" rx="1"/>',
  briefcase:
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  wrench:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  target:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  maximize:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
  sort: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  timer: '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  monitor:
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  sofa: '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M4 18v2"/><path d="M20 18v2"/><path d="M12 4v9"/>',
  paint:
    '<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/>',
  ruler:
    '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  pickaxe:
    '<path d="M14 13 3 22"/><path d="M8 6.5a12 12 0 0 1 14 3.5"/><path d="M5.5 4a12 12 0 0 1 3.5 14"/>',
}

// ============================================================ Hình cơ bản
function rect(x, y, w, h, o = {}) {
  return `<rect${attrs({ x, y, width: Math.max(0, w), height: Math.max(0, h), rx: o.r, fill: o.fill ?? 'none', 'fill-opacity': o.fo, stroke: o.stroke, 'stroke-width': o.sw, 'stroke-dasharray': o.dash, opacity: o.op, filter: o.sh ? `url(#${o.sh})` : undefined })}/>`
}
function circle(cx, cy, r, o = {}) {
  return `<circle${attrs({ cx, cy, r, fill: o.fill ?? 'none', 'fill-opacity': o.fo, stroke: o.stroke, 'stroke-width': o.sw, 'stroke-dasharray': o.dash, opacity: o.op, filter: o.sh ? `url(#${o.sh})` : undefined })}/>`
}
function line(x1, y1, x2, y2, o = {}) {
  return `<line${attrs({ x1, y1, x2, y2, stroke: o.stroke ?? C.border, 'stroke-width': o.sw ?? 1, 'stroke-dasharray': o.dash, 'stroke-linecap': o.cap, opacity: o.op })}/>`
}
function path(d, o = {}) {
  return `<path${attrs({ d, fill: o.fill ?? 'none', 'fill-opacity': o.fo, stroke: o.stroke, 'stroke-width': o.sw, 'stroke-linecap': o.cap ?? 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': o.dash, opacity: o.op, filter: o.sh ? `url(#${o.sh})` : undefined })}/>`
}
function text(x, y, s, o = {}) {
  const size = o.size ?? 16
  const weight = o.weight ?? 400
  let str = String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
  if (o.maxW) str = fit(str, o.maxW, size, weight)
  return `<text${attrs({ x, y, 'font-size': size, 'font-weight': weight, fill: o.fill ?? C.text, 'text-anchor': o.anchor, opacity: o.op, 'letter-spacing': o.ls, 'text-decoration': o.deco })}>${esc(str)}</text>`
}
function lines(x, y, arr, o = {}) {
  const lh = o.lh ?? (o.size ?? 16) * 1.5
  return arr.map((l, i) => text(x, y + i * lh, l, o)).join('')
}
function para(x, y, s, maxW, o = {}) {
  return lines(x, y, wrap(s, maxW, o.size ?? 16, o.weight ?? 400, o.maxLines ?? 99), o)
}
function icon(name, x, y, size = 20, color = C.text2, o = {}) {
  const body = ICONS[name]
  if (!body) throw new Error(`Thiếu icon ${name}`)
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(size / 24)})" fill="${o.fill ?? 'none'}" stroke="${color}" stroke-width="${o.sw ?? 2}" stroke-linecap="round" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}>${body}</g>`
}
function grad(stops, o = {}) {
  const id = newId('g')
  const st = stops
    .map(
      ([off, col, op]) =>
        `<stop offset="${off}" stop-color="${col}"${op != null ? ` stop-opacity="${op}"` : ''}/>`
    )
    .join('')
  defs.push(
    `<linearGradient id="${id}" x1="${o.x1 ?? 0}" y1="${o.y1 ?? 0}" x2="${o.x2 ?? 1}" y2="${o.y2 ?? 1}">${st}</linearGradient>`
  )
  return `url(#${id})`
}
function roundPath(x, y, w, h, rt, rb = rt) {
  return `M${x + rt},${y}H${x + w - rt}Q${x + w},${y} ${x + w},${y + rt}V${y + h - rb}Q${x + w},${y + h} ${x + w - rb},${y + h}H${x + rb}Q${x},${y + h} ${x},${y + h - rb}V${y + rt}Q${x},${y} ${x + rt},${y}Z`
}
function clip(x, y, w, h, rt = 0, rb = rt) {
  const id = newId('c')
  defs.push(`<clipPath id="${id}"><path d="${roundPath(x, y, w, h, rt, rb)}"/></clipPath>`)
  return id
}
const clipped = (id, body) => `<g clip-path="url(#${id})">${body}</g>`

// ============================================================ Thành phần giao diện
function avatar(cx, cy, r, name, o = {}) {
  const col = o.color ?? AV_COLORS[hashStr(name) % AV_COLORS.length]
  const p = String(name).trim().split(/\s+/)
  const ini = ((p.length > 1 ? p[p.length - 2][0] : '') + p[p.length - 1][0]).toUpperCase()
  return (
    circle(cx, cy, r, {
      fill: tint(col, 0.78),
      stroke: o.ring ? '#fff' : undefined,
      sw: o.ring ? 2 : undefined,
    }) +
    text(cx, cy + r * 0.3, ini, {
      size: r * 0.82,
      weight: 600,
      fill: shade(col, 0.35),
      anchor: 'middle',
    })
  )
}
function logoMark(x, y, size, ic) {
  return (
    rect(x, y, size, size, { r: size * 0.28, fill: P }) +
    icon(ic, x + size * 0.22, y + size * 0.22, size * 0.56, '#fff', { sw: 2.2 })
  )
}
function card(x, y, w, h, o = {}) {
  let s = rect(x, y, w, h, {
    r: o.r ?? 16,
    fill: o.fill ?? '#fff',
    stroke: o.stroke ?? C.border,
    sh: o.flat ? undefined : 'sh',
  })
  if (o.title)
    s += text(x + 24, y + 38, o.title, {
      size: o.titleSize ?? 18,
      weight: 700,
      maxW: w - 48 - (o.link ? tw(o.link, 14, 600) + 16 : 0),
    })
  if (o.sub) s += text(x + 24, y + 62, o.sub, { size: 14, fill: C.text3, maxW: w - 48 })
  if (o.link)
    s += text(x + w - 24, y + 37, o.link, { size: 14, weight: 600, fill: PD(), anchor: 'end' })
  return s
}
const badgeW = (label, o = {}) =>
  tw(label, o.size ?? 13.5, 600) + 2 * (o.padX ?? 11) + (o.dot ? 13 : 0) + (o.icon ? 18 : 0)
function badge(x, y, label, tn = 'neutral', o = {}) {
  const t = typeof tn === 'string' ? tone(tn) : tn
  const size = o.size ?? 13.5
  const h = o.h ?? 26
  const w = badgeW(label, o)
  if (o.anchor === 'end') x -= w
  let s = rect(x, y, w, h, { r: h / 2, fill: o.solid ? t.dot : t.bg })
  let tx = x + (o.padX ?? 11)
  if (o.dot) {
    s += circle(tx + 3.5, y + h / 2, 3.5, { fill: o.solid ? '#fff' : t.dot })
    tx += 13
  }
  if (o.icon) {
    s += icon(o.icon, tx, y + h / 2 - 7.5, 15, o.solid ? '#fff' : t.fg, { sw: 2.4 })
    tx += 18
  }
  return (
    s +
    text(tx, y + h / 2 + size * 0.36, label, { size, weight: 600, fill: o.solid ? '#fff' : t.fg })
  )
}
const BTN = {
  primary: () => ({ fill: P, fg: '#fff' }),
  cta: () => ({ fill: C.cta, fg: '#fff' }),
  dark: () => ({ fill: '#101828', fg: '#fff' }),
  outline: () => ({ fill: '#fff', fg: C.body, stroke: '#D0D5DD' }),
  soft: () => ({ fill: tint(P, 0.88), fg: shade(P, 0.25) }),
  ghost: () => ({ fill: 'none', fg: C.text2 }),
  danger: () => ({ fill: '#fff', fg: '#B42318', stroke: '#FDA29B' }),
  success: () => ({ fill: '#079455', fg: '#fff' }),
  white: () => ({ fill: '#fff', fg: '#101828' }),
  glass: () => ({ fill: 'none', fg: '#fff', stroke: 'rgba(255,255,255,0.7)' }),
}
const btnW = (label, o = {}) =>
  o.w ?? tw(label, o.size ?? 15, 600) + 2 * (o.padX ?? 16) + (o.icon ? (o.size ?? 15) + 9 : 0)
function button(x, y, label, o = {}) {
  const v = BTN[o.variant ?? 'primary']()
  const h = o.h ?? 40
  const size = o.size ?? 15
  const w = btnW(label, o)
  if (o.anchor === 'end') x -= w
  let s = rect(x, y, w, h, {
    r: o.r ?? 10,
    fill: v.fill,
    stroke: v.stroke,
    sw: v.stroke ? 1 : undefined,
    sh: o.shadow ? 'sh' : undefined,
  })
  const isz = size + 3
  const cw = (label ? tw(label, size, 600) : 0) + (o.icon ? isz + (label ? 8 : 0) : 0)
  let cx = x + (w - cw) / 2
  if (o.icon) {
    s += icon(o.icon, cx, y + (h - isz) / 2, isz, v.fg, { sw: 2.2 })
    cx += isz + 8
  }
  if (label) s += text(cx, y + h / 2 + size * 0.35, label, { size, weight: 600, fill: v.fg })
  return s
}
// Hàng nút căn phải: trả về svg, nút cuối cùng nằm sát mép phải
function buttonsRight(xr, y, list, gap = 12) {
  let s = ''
  let x = xr
  for (const b of [...list].reverse()) {
    const w = btnW(b.label, b)
    s += button(x - w, y, b.label, b)
    x -= w + gap
  }
  return s
}
function iconBtn(x, y, ic, o = {}) {
  const sz = o.size ?? 40
  return (
    rect(x, y, sz, sz, { r: o.r ?? 10, fill: o.fill ?? '#fff', stroke: o.stroke ?? '#D0D5DD' }) +
    icon(ic, x + (sz - 20) / 2, y + (sz - 20) / 2, 20, o.color ?? C.text2)
  )
}
function input(x, y, w, o = {}) {
  const h = o.h ?? 44
  let s = rect(x, y, w, h, {
    r: o.r ?? 10,
    fill: o.disabled ? C.soft : (o.fill ?? '#fff'),
    stroke: o.error ? '#FDA29B' : o.focus ? P : '#D0D5DD',
    sw: o.focus || o.error ? 1.6 : 1,
  })
  if (o.focus) s = rect(x - 3, y - 3, w + 6, h + 6, { r: (o.r ?? 10) + 3, fill: tint(P, 0.85) }) + s
  let tx = x + 14
  const size = o.size ?? 15.5
  if (o.icon) {
    s += icon(o.icon, x + 13, y + h / 2 - 10, 20, C.text3)
    tx += 28
  }
  let right = x + w - 14
  if (o.select) {
    s += icon('chevronDown', x + w - 32, y + h / 2 - 9, 18, C.text3)
    right -= 24
  }
  if (o.suffix) {
    s += text(right, y + h / 2 + size * 0.35, o.suffix, {
      size: size - 1,
      fill: C.text3,
      anchor: 'end',
    })
    right -= tw(o.suffix, size - 1) + 10
  }
  if (o.kbd) {
    const kw = tw(o.kbd, 12, 600) + 14
    s +=
      rect(right - kw, y + h / 2 - 11, kw, 22, { r: 6, fill: '#fff', stroke: C.border }) +
      text(right - kw / 2, y + h / 2 + 4.5, o.kbd, {
        size: 12,
        weight: 600,
        fill: C.text3,
        anchor: 'middle',
      })
    right -= kw + 8
  }
  const val = o.value ?? o.placeholder ?? ''
  const isPh = o.value == null
  const align = o.align === 'right'
  s += text(align ? right : tx, y + h / 2 + size * 0.35, val, {
    size,
    weight: o.weight ?? 400,
    fill: isPh ? C.text3 : (o.color ?? C.text),
    maxW: right - tx,
    anchor: align ? 'end' : undefined,
  })
  if (o.caret) {
    const cx = isPh ? tx - 2 : tx + tw(val, size, o.weight ?? 400) + 2
    s += line(cx, y + 12, cx, y + h - 12, { stroke: P, sw: 1.6 })
  }
  return s
}
// Ô nhập có nhãn: cao 74 (nhãn 20 + ô 44 + khoảng 10)
function field(x, y, w, label, o = {}) {
  let s = text(x, y + 14, label, { size: 14, weight: 600, fill: C.body })
  if (o.req)
    s += text(x + tw(label, 14, 600) + 4, y + 14, '*', { size: 14, weight: 600, fill: '#F04438' })
  s += input(x, y + 22, w, o)
  if (o.hint)
    s += text(x, y + 22 + (o.h ?? 44) + 20, o.hint, {
      size: 13,
      fill: o.error ? '#B42318' : C.text3,
    })
  return s
}
function textarea(x, y, w, h, value, o = {}) {
  let s = rect(x, y, w, h, { r: 10, fill: '#fff', stroke: '#D0D5DD' })
  s += para(x + 14, y + 27, value, w - 28, {
    size: o.size ?? 15.5,
    lh: 23,
    fill: value ? C.text : C.text3,
    maxLines: Math.floor((h - 12) / 23),
  })
  return s
}
function toggle(x, y, on, o = {}) {
  const w = o.w ?? 40
  const h = o.h ?? 22
  return (
    rect(x, y, w, h, { r: h / 2, fill: on ? P : '#D0D5DD' }) +
    circle(on ? x + w - h / 2 : x + h / 2, y + h / 2, h / 2 - 3, { fill: '#fff' })
  )
}
function checkbox(x, y, on, size = 18) {
  if (on)
    return (
      rect(x, y, size, size, { r: 5, fill: P }) +
      icon('check', x + 2, y + 2, size - 4, '#fff', { sw: 3.2 })
    )
  return rect(x, y, size, size, { r: 5, fill: '#fff', stroke: '#D0D5DD', sw: 1.4 })
}
function radio(cx, cy, on, r = 9) {
  return (
    circle(cx, cy, r, {
      fill: on ? tint(P, 0.9) : '#fff',
      stroke: on ? P : '#D0D5DD',
      sw: on ? 1.8 : 1.4,
    }) + (on ? circle(cx, cy, r * 0.45, { fill: P }) : '')
  )
}
function stepper(x, y, qty, o = {}) {
  const h = o.h ?? 36
  const w = o.w ?? 108
  return (
    rect(x, y, w, h, { r: 10, fill: '#fff', stroke: '#D0D5DD' }) +
    icon('minus', x + 9, y + h / 2 - 9, 18, C.text2) +
    text(x + w / 2, y + h / 2 + 5.6, qty, { size: 16, weight: 700, anchor: 'middle' }) +
    icon('plus', x + w - 27, y + h / 2 - 9, 18, P)
  )
}
const chipW = (label, o = {}) =>
  tw(label, o.size ?? 14.5, 600) +
  2 * (o.padX ?? 16) +
  (o.dot ? 16 : 0) +
  (o.count != null ? tw(String(o.count), 13, 600) + 18 : 0)
function chip(x, y, label, o = {}) {
  const h = o.h ?? 38
  const w = chipW(label, o)
  const col = o.color ?? P
  const on = o.active
  let s = rect(x, y, w, h, { r: h / 2, fill: on ? col : '#fff', stroke: on ? col : '#D0D5DD' })
  let tx = x + (o.padX ?? 16)
  if (o.dot) {
    s += circle(tx + 4, y + h / 2, 4.5, { fill: on ? '#fff' : col })
    tx += 16
  }
  s += text(tx, y + h / 2 + 5.2, label, {
    size: o.size ?? 14.5,
    weight: 600,
    fill: on ? '#fff' : C.body,
  })
  if (o.count != null) {
    tx += tw(label, o.size ?? 14.5, 600) + 8
    s += text(tx, y + h / 2 + 4.8, String(o.count), {
      size: 13,
      weight: 600,
      fill: on ? 'rgba(255,255,255,0.8)' : C.text3,
    })
  }
  return s
}
function chips(x, y, list, o = {}) {
  let s = ''
  let cx = x
  for (const c of list) {
    const opt = typeof c === 'string' ? { label: c } : c
    s += chip(cx, y, opt.label, { ...o, ...opt, active: opt.active ?? opt.label === o.active })
    cx += chipW(opt.label, { ...o, ...opt }) + (o.gap ?? 10)
  }
  return s
}
const segW = (items, o = {}) =>
  sum(items.map((t) => tw(t, o.size ?? 14.5, 600) + 2 * (o.padX ?? 16))) + 8
function segmented(x, y, items, active, o = {}) {
  const h = o.h ?? 40
  const size = o.size ?? 14.5
  const w = segW(items, o)
  if (o.anchor === 'end') x -= w
  let s = rect(x, y, w, h, { r: 10, fill: C.muted })
  let cx = x + 4
  items.forEach((t, i) => {
    const iw = tw(t, size, 600) + 2 * (o.padX ?? 16)
    const on = i === active
    if (on) s += rect(cx, y + 4, iw, h - 8, { r: 8, fill: '#fff', sh: 'sh' })
    s += text(cx + iw / 2, y + h / 2 + size * 0.35, t, {
      size,
      weight: 600,
      fill: on ? C.text : C.text2,
      anchor: 'middle',
    })
    cx += iw
  })
  return s
}
// Tab gạch chân. items: [{label, count}]
function tabs(x, y, items, active, o = {}) {
  let s = o.noLine ? '' : line(x, y + 44.5, x + (o.w ?? 0), y + 44.5, { stroke: C.border })
  let cx = x
  items.forEach((it, i) => {
    const t = typeof it === 'string' ? { label: it } : it
    const on = i === active
    s += text(cx, y + 24, t.label, { size: 15, weight: 600, fill: on ? PD() : C.text2 })
    let tw0 = tw(t.label, 15, 600)
    if (t.count != null) {
      const cw = tw(String(t.count), 12.5, 600) + 14
      s +=
        rect(cx + tw0 + 8, y + 9, cw, 22, { r: 11, fill: on ? tint(P, 0.86) : C.muted }) +
        text(cx + tw0 + 8 + cw / 2, y + 24.5, String(t.count), {
          size: 12.5,
          weight: 600,
          fill: on ? PD() : C.text2,
          anchor: 'middle',
        })
      tw0 += cw + 8
    }
    if (on) s += rect(cx, y + 42, tw0, 3, { r: 1.5, fill: P })
    cx += tw0 + 32
  })
  return s
}
function searchBox(x, y, w, h, ph, o = {}) {
  return input(x, y, w, {
    h,
    icon: 'search',
    placeholder: ph,
    fill: o.fill ?? '#fff',
    kbd: o.kbd,
    value: o.value,
    size: o.size ?? 15,
  })
}
function kpi(x, y, w, h, o) {
  let s = card(x, y, w, h)
  s += text(x + 24, y + 38, o.label, { size: 15, weight: 600, fill: C.text2, maxW: w - 100 })
  if (o.icon)
    s +=
      rect(x + w - 64, y + 20, 44, 44, { r: 12, fill: tint(o.color ?? P, 0.88) }) +
      icon(o.icon, x + w - 53, y + 31, 22, o.color ?? P)
  s += text(x + 24, y + 84, o.value, { size: o.valueSize ?? 30, weight: 700, maxW: w - 48 })
  if (o.delta) {
    const up = !String(o.delta).startsWith('−') && !String(o.delta).startsWith('-')
    const good = o.good ?? up
    s += badge(x + 24, y + 100, o.delta, good ? 'success' : 'danger', { h: 24, size: 13, padX: 8 })
    if (o.note)
      s += text(x + 24 + badgeW(o.delta, { size: 13, padX: 8 }) + 10, y + 117, o.note, {
        size: 13.5,
        fill: C.text3,
        maxW: w - 140,
      })
  } else if (o.note) s += text(x + 24, y + 117, o.note, { size: 14, fill: C.text3, maxW: w - 48 })
  return s
}
function statCard(x, y, w, h, o) {
  let s = card(x, y, w, h)
  if (o.dot) s += circle(x + 26, y + 31, 5, { fill: o.dot })
  s += text(x + (o.dot ? 40 : 22), y + 36, o.label, {
    size: 14,
    weight: 600,
    fill: C.text2,
    maxW: w - (o.dot ? 56 : 40),
  })
  s += text(x + 22, y + 74, o.value, {
    size: o.size ?? 26,
    weight: 700,
    fill: o.color ?? C.text,
    maxW: w - 44,
  })
  if (o.sub)
    s += text(x + 22 + tw(o.value, o.size ?? 26, 700) + 8, y + 74, o.sub, {
      size: 14,
      fill: C.text3,
    })
  return s
}
function progress(x, y, w, frac, o = {}) {
  const h = o.h ?? 8
  return (
    rect(x, y, w, h, { r: h / 2, fill: o.track ?? C.muted }) +
    rect(x, y, Math.max(h, w * Math.min(1, frac)), h, { r: h / 2, fill: o.color ?? P })
  )
}

// ============================================================ Ảnh minh họa (ô màu thay ảnh chụp sản phẩm)
const PAL = {
  coffee: ['#5B3A29', '#B08968'],
  milktea: ['#9C6B45', '#E3C7A4'],
  matcha: ['#4F772D', '#A7C080'],
  peach: ['#E8590C', '#FFB27A'],
  berry: ['#C2255C', '#FF8FAB'],
  mango: ['#E8A317', '#FFE08A'],
  mint: ['#0F8B8D', '#7FD6C2'],
  choco: ['#3E2723', '#8D6E63'],
  cream: ['#B89B7A', '#EFE3D3'],
  lime: ['#5C940D', '#C0EB75'],
  orange: ['#F08C00', '#FFD43B'],
  sky: ['#1971C2', '#74C0FC'],
  soup: ['#C2410C', '#FDBA74'],
  red: ['#B91C1C', '#FCA5A5'],
  green: ['#2B8A3E', '#8CE99A'],
  grey: ['#495057', '#CED4DA'],
  sand: ['#C9B79C', '#F1E9DC'],
  sage: ['#7D9475', '#D5E0CF'],
  navy: ['#2F3E5C', '#8B9BB8'],
  blush: ['#D99A8F', '#F7DDD6'],
  caramel: ['#8A5A36', '#D9B08C'],
  ink: ['#1F2937', '#6B7280'],
  olive: ['#6B6F3A', '#C5C79A'],
}
function photo(x, y, w, h, pal, ic, o = {}) {
  const [c1, c2] = PAL[pal] ?? pal
  const id = clip(x, y, w, h, o.r ?? 12, o.rb ?? o.r ?? 12)
  let body = rect(x, y, w, h, {
    fill: grad(
      [
        [0, c2],
        [1, c1],
      ],
      { x1: 1, y1: 0, x2: 0, y2: 1 }
    ),
  })
  body += circle(x + w * 0.82, y + h * 0.12, Math.max(w, h) * 0.42, { fill: '#fff', fo: 0.13 })
  body += circle(x + w * 0.1, y + h * 1.05, Math.max(w, h) * 0.35, { fill: c1, fo: 0.25 })
  if (ic) {
    const sz = Math.min(w, h) * (o.iconScale ?? 0.42)
    body += icon(ic, x + (w - sz) / 2, y + (h - sz) / 2, sz, '#fff', { sw: o.sw ?? 1.6, op: 0.92 })
  }
  return clipped(id, body)
}
// Ảnh nội thất mờ kiểu ảnh chụp: nền chuyển màu + vệt sáng mờ + khung cửa sổ và đồ nội thất nhạt
const SCENES = {
  warm: { base: ['#E9DCCB', '#B98E68'], light: '#FFF6E8', dark: '#5E412C', accent: '#7F8F6A' },
  cool: { base: ['#E4E8EC', '#8D9BAA'], light: '#FFFFFF', dark: '#3A4652', accent: '#B9A27F' },
  green: { base: ['#E5E9DF', '#8E9C7E'], light: '#FBFFF5', dark: '#3F4A35', accent: '#C49A6C' },
  dusk: { base: ['#E8D9D1', '#9C7A6D'], light: '#FFF1E6', dark: '#4B3830', accent: '#D7B48F' },
  office: { base: ['#E6EAF0', '#7D8DA3'], light: '#FFFFFF', dark: '#2E3A4B', accent: '#6E8B74' },
  stone: { base: ['#ECE8E2', '#A39A8E'], light: '#FFFFFF', dark: '#4A443D', accent: '#8A9A8C' },
}
function scene(x, y, w, h, kind = 'warm', o = {}) {
  const sc = SCENES[kind]
  const rnd = mulberry32(hashStr(`${kind}${o.seed ?? 0}`))
  const id = clip(x, y, w, h, o.r ?? 16, o.rb ?? o.r ?? 16)
  let b = rect(x, y, w, h, {
    fill: grad(
      [
        [0, sc.base[0]],
        [1, sc.base[1]],
      ],
      { x1: 0.2, y1: 0, x2: 0.8, y2: 1 }
    ),
  })
  const sw = Math.max(2, w * 0.006)
  let inner = ''
  // cửa sổ: một khung lớn hoặc hai khung đứng
  const twoWin = rnd() < 0.5
  const wx = x + w * (0.1 + rnd() * 0.3)
  const ww = w * (twoWin ? 0.2 : 0.36)
  for (let k = 0; k < (twoWin ? 2 : 1); k++) {
    const kx = wx + k * (ww + w * 0.06)
    inner += rect(kx, y + h * 0.06, ww, h * 0.58, { fill: sc.light, fo: 0.55 })
    inner += line(kx + ww / 2, y + h * 0.06, kx + ww / 2, y + h * 0.64, {
      stroke: sc.base[1],
      sw,
      op: 0.35,
    })
    inner += line(kx, y + h * 0.34, kx + ww, y + h * 0.34, { stroke: sc.base[1], sw, op: 0.3 })
  }
  // sàn
  inner += rect(x, y + h * 0.72, w, h * 0.28, { fill: sc.dark, fo: 0.22 })
  if (kind === 'office') {
    // hai dãy bàn làm việc và ghế
    for (let r = 0; r < 2; r++) {
      const dy = y + h * (0.6 + r * 0.16)
      inner += rect(x + w * 0.08, dy, w * 0.62, h * 0.05, {
        r: 3,
        fill: sc.dark,
        fo: 0.5 + r * 0.1,
      })
      for (let c = 0; c < 4; c++)
        inner += rect(x + w * (0.12 + c * 0.15), dy - h * 0.07, w * 0.05, h * 0.07, {
          r: 4,
          fill: sc.dark,
          fo: 0.35,
        })
    }
    inner += rect(x + w * 0.78, y + h * 0.3, w * 0.14, h * 0.42, { r: 4, fill: sc.dark, fo: 0.3 })
  } else {
    const fx = x + w * (0.05 + rnd() * 0.25)
    inner += rect(fx, y + h * 0.56, w * 0.46, h * 0.2, { r: h * 0.04, fill: sc.dark, fo: 0.55 })
    inner += rect(fx + w * 0.02, y + h * 0.5, w * 0.42, h * 0.1, {
      r: h * 0.04,
      fill: sc.dark,
      fo: 0.35,
    })
    inner += rect(fx + w * 0.06, y + h * 0.53, w * 0.08, h * 0.08, {
      r: h * 0.02,
      fill: sc.accent,
      fo: 0.5,
    })
    inner += rect(x + w * 0.62, y + h * 0.62, w * 0.2, h * 0.04, { r: 3, fill: sc.dark, fo: 0.5 })
    inner += rect(x + w * 0.7, y + h * 0.66, w * 0.025, h * 0.1, { fill: sc.dark, fo: 0.45 })
    if (rnd() < 0.6)
      inner +=
        circle(x + w * 0.88, y + h * 0.5, h * 0.1, { fill: sc.accent, fo: 0.65 }) +
        rect(x + w * 0.87, y + h * 0.56, w * 0.025, h * 0.18, { fill: sc.dark, fo: 0.4 })
    else
      inner +=
        rect(x + w * 0.84, y + h * 0.18, w * 0.1, h * 0.54, { r: 3, fill: sc.dark, fo: 0.28 }) +
        rect(x + w * 0.85, y + h * 0.3, w * 0.08, h * 0.02, { fill: sc.light, fo: 0.4 }) +
        rect(x + w * 0.85, y + h * 0.45, w * 0.08, h * 0.02, { fill: sc.light, fo: 0.4 })
    // đèn thả
    if (rnd() < 0.55)
      for (let k = 0; k < 2; k++)
        inner +=
          line(x + w * (0.66 + k * 0.08), y, x + w * (0.66 + k * 0.08), y + h * (0.22 + k * 0.04), {
            stroke: sc.dark,
            sw: 1.5,
            op: 0.4,
          }) +
          circle(x + w * (0.66 + k * 0.08), y + h * (0.25 + k * 0.04), h * 0.035, {
            fill: sc.light,
            fo: 0.85,
          })
  }
  // vệt sáng mờ
  inner += `<g filter="url(#blur)">${circle(wx + ww / 2, y + h * 0.3, w * 0.22, { fill: sc.light, fo: 0.55 })}${circle(x + w * 0.9, y + h * 0.95, w * 0.2, { fill: sc.dark, fo: 0.25 })}</g>`
  b += rnd() < 0.5 ? `<g transform="matrix(-1 0 0 1 ${r2(2 * x + w)} 0)">${inner}</g>` : inner
  if (o.overlay)
    b += rect(x, y, w, h, {
      fill: grad(
        [
          [0, '#101828', 0.62],
          [0.65, '#101828', 0.12],
          [1, '#101828', 0],
        ],
        { x1: 0, y1: 0, x2: 1, y2: 0 }
      ),
    })
  return clipped(id, b)
}
// Ảnh mặc định của demo chưa có ảnh (BR-07): gradient màu nhóm, icon mờ góc phải, tên trắng góc trái dưới
const INDUSTRY_ICON = {
  fnb: 'utensils',
  'ban-le': 'bag',
  'dich-vu': 'calendarCheck',
  'giao-duc': 'news',
  'doanh-nghiep': 'building',
  'bat-dong-san': 'home',
  'van-tai': 'truck',
  website: 'globe',
  'app-di-dong': 'smartphone',
  ai: 'bot',
  'nganh-khac': 'layers',
}
function defaultCover(x, y, w, h, demo, color, o = {}) {
  const id = clip(x, y, w, h, o.r ?? 0, o.rb ?? o.r ?? 0)
  let b = rect(x, y, w, h, {
    fill: grad(
      [
        [0, color],
        [1, tint(color, 0.7)],
      ],
      { x1: 0, y1: 1, x2: 1, y2: 0 }
    ),
  })
  const sz = h * 0.7
  b += icon(INDUSTRY_ICON[demo.industry] ?? 'layers', x + w - sz * 0.85, y + h * 0.08, sz, '#fff', {
    sw: 1.4,
    op: 0.25,
  })
  if (o.title !== false && h > 60)
    b += para(
      x + w * 0.06,
      y + h - h * 0.12 - (wrap(demo.name, w * 0.8, h * 0.11, 700, 2).length - 1) * h * 0.13,
      demo.name,
      w * 0.8,
      { size: h * 0.11, weight: 700, fill: '#fff', lh: h * 0.13, maxLines: 2 }
    )
  return clipped(id, b)
}
// Mã QR giả lập (đủ 3 ô định vị, dữ liệu sinh từ hạt giống)
function qr(x, y, size, seed, o = {}) {
  const n = 25
  const m = size / n
  const rnd = mulberry32(seed)
  const grid = range(n).map(() => range(n).map(() => 0))
  const reserved = range(n).map(() => range(n).map(() => false))
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r
        const cc = c0 + c
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue
        reserved[rr][cc] = true
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3))
        grid[rr][cc] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2 ? 1 : 0
      }
  }
  finder(0, 0)
  finder(0, n - 7)
  finder(n - 7, 0)
  for (let r = n - 9; r < n - 4; r++)
    for (let c = n - 9; c < n - 4; c++) {
      reserved[r][c] = true
      const ring = Math.max(Math.abs(r - (n - 7)), Math.abs(c - (n - 7)))
      grid[r][c] = ring === 1 ? 0 : 1
    }
  for (let i = 8; i < n - 8; i++) {
    grid[6][i] = grid[i][6] = i % 2 === 0 ? 1 : 0
    reserved[6][i] = reserved[i][6] = true
  }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (!reserved[r][c]) grid[r][c] = rnd() < 0.5 ? 1 : 0
  let s =
    o.bg === false
      ? ''
      : rect(x - m * 2, y - m * 2, size + m * 4, size + m * 4, { r: o.r ?? 8, fill: '#fff' })
  const fg = o.fg ?? '#101828'
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!grid[r][c]) {
        c++
        continue
      }
      const st = c
      while (c < n && grid[r][c]) c++
      s += `<rect x="${r2(x + st * m)}" y="${r2(y + r * m)}" width="${r2((c - st) * m + 0.3)}" height="${r2(m + 0.3)}" fill="${fg}"/>`
    }
  }
  return s
}

// ============================================================ Bảng
// cols: [{label, w (px nếu >1, tỉ lệ nếu ≤1), align}], ô: chuỗi | {t, sub, badge, tone, avatar, fn, ...}
function table(x, y, w, cols, rows, o = {}) {
  const hh = o.headH ?? 46
  const rh = o.rowH ?? 58
  const pad = o.pad ?? 16
  const fixed = sum(cols.map((c) => (c.w >= 20 ? c.w : 0)))
  const flex = sum(cols.map((c) => (c.w >= 20 ? 0 : (c.w ?? 1))))
  let cx = x
  const xs = cols.map((c) => {
    const cw = c.w >= 20 ? c.w : ((w - fixed) * (c.w ?? 1)) / flex
    const r = { x: cx, w: cw }
    cx += cw
    return r
  })
  let s = ''
  if (o.headBg !== false) s += rect(x, y, w, hh, { fill: C.soft })
  s += line(x, y + hh - 0.5, x + w, y + hh - 0.5, { stroke: C.border })
  if (o.headTop) s += line(x, y + 0.5, x + w, y + 0.5, { stroke: C.border })
  cols.forEach((c, i) => {
    if (c.fnHead) {
      s += c.fnHead(xs[i].x, y, xs[i].w, hh)
      return
    }
    const a = c.align
    const tx =
      a === 'right'
        ? xs[i].x + xs[i].w - pad
        : a === 'center'
          ? xs[i].x + xs[i].w / 2
          : xs[i].x + pad
    s += text(tx, y + hh / 2 + 4.8, c.label, {
      size: 13.5,
      weight: 600,
      fill: C.text2,
      anchor: a === 'right' ? 'end' : a === 'center' ? 'middle' : undefined,
      maxW: xs[i].w - 2 * pad + 4,
    })
  })
  rows.forEach((row, ri) => {
    const ry = y + hh + ri * rh
    const cells = Array.isArray(row) ? row : row.cells
    if (!Array.isArray(row) && row.bg) s += rect(x, ry, w, rh, { fill: row.bg })
    if (!Array.isArray(row) && row.bar) s += rect(x, ry, 3, rh, { fill: row.bar })
    cells.forEach((c, ci) => {
      if (ci < cols.length) s += cell(c, xs[ci].x, ry, xs[ci].w, rh, cols[ci].align, pad)
    })
    if (ri < rows.length - 1 || o.lastLine)
      s += line(x, ry + rh - 0.5, x + w, ry + rh - 0.5, { stroke: C.line })
  })
  return s
}
function cell(c, x, y, w, h, align, pad) {
  if (c == null || c === '') return ''
  if (typeof c === 'string' || typeof c === 'number') c = { t: String(c) }
  if (c.fn) return c.fn(x, y, w, h)
  let s = ''
  let tx = x + pad
  if (c.badge) {
    const bo = { dot: c.dot, icon: c.icon, size: 13, padX: 10 }
    const bw = badgeW(c.badge, bo)
    const bx = align === 'right' ? x + w - pad - bw : align === 'center' ? x + (w - bw) / 2 : tx
    return badge(bx, y + h / 2 - 13, c.badge, c.tone ?? 'neutral', bo)
  }
  if (c.avatar) {
    s += avatar(tx + 16, y + h / 2, 16, c.avatar)
    tx += 44
  }
  if (c.iconBox) {
    s +=
      rect(tx, y + h / 2 - 18, 36, 36, { r: 10, fill: tint(c.iconColor ?? P, 0.88) }) +
      icon(c.iconBox, tx + 8, y + h / 2 - 10, 20, c.iconColor ?? P)
    tx += 48
  }
  if (c.thumb) {
    s += c.thumb(tx, y + h / 2 - (c.thumbH ?? 40) / 2)
    tx += (c.thumbW ?? 64) + 14
  }
  const size = c.size ?? 15
  const anchor = align === 'right' ? 'end' : align === 'center' ? 'middle' : undefined
  const ax = align === 'right' ? x + w - pad : align === 'center' ? x + w / 2 : tx
  const maxW = align === 'center' ? w - 2 * pad : x + w - pad - tx
  if (c.sub) {
    s += text(ax, y + h / 2 - 3, c.t, {
      size,
      weight: c.weight ?? 600,
      fill: c.fill ?? C.text,
      anchor,
      maxW,
    })
    s += text(ax, y + h / 2 + 17, c.sub, { size: 13, fill: c.subFill ?? C.text3, anchor, maxW })
  } else
    s += text(ax, y + h / 2 + size * 0.35, c.t, {
      size,
      weight: c.weight ?? 400,
      fill: c.fill ?? C.body,
      anchor,
      maxW,
    })
  return s
}
function pager(x, y, w, info, pages = ['1', '2', '3', '…', '12']) {
  let s = text(x, y + 22, info, { size: 14, fill: C.text2 })
  let px = x + w
  const list = ['›', ...[...pages].reverse(), '‹']
  for (const p of list) {
    const bw = 34
    px -= bw
    const on = p === pages[0]
    s += rect(px, y, bw, 34, {
      r: 8,
      fill: on ? tint(P, 0.88) : '#fff',
      stroke: on ? 'none' : C.border,
    })
    s += text(px + bw / 2, y + 22, p, {
      size: 14,
      weight: 600,
      fill: on ? PD() : C.text2,
      anchor: 'middle',
    })
    px -= 6
  }
  return s
}

// ============================================================ Biểu đồ
function niceTop(max, ticks) {
  const raw = max / ticks
  const e = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / e
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * e * ticks
}
function chartFrame(x, y, w, h, o) {
  const ticks = o.ticks ?? 4
  const top = o.max ?? niceTop(o.dataMax, ticks)
  const fmt = o.fmt ?? ((v) => num(v))
  const padL = Math.max(...range(ticks + 1).map((i) => tw(fmt((top * i) / ticks), 13))) + 14
  const px = x + padL
  const pw = w - padL
  const ph = h - 30
  let s = ''
  for (let i = 0; i <= ticks; i++) {
    const gy = y + ph - (ph * i) / ticks
    s += line(px, gy, px + pw, gy, {
      stroke: i === 0 ? C.border : C.line,
      dash: i === 0 ? undefined : '4 4',
    })
    s += text(px - 12, gy + 4.5, fmt((top * i) / ticks), { size: 13, fill: C.text3, anchor: 'end' })
  }
  return { s, px, pw, py: y, ph, top, yOf: (v) => y + ph - (v / top) * ph }
}
function barTop(x, y, w, h, r) {
  r = Math.min(r, w / 2, h)
  if (h <= 0) return ''
  return `M${r2(x)},${r2(y + h)}V${r2(y + r)}Q${r2(x)},${r2(y)} ${r2(x + r)},${r2(y)}H${r2(x + w - r)}Q${r2(x + w)},${r2(y)} ${r2(x + w)},${r2(y + r)}V${r2(y + h)}Z`
}
function barChart(x, y, w, h, o) {
  const series = o.series
  const n = o.labels.length
  const f = chartFrame(x, y, w, h, { ...o, dataMax: Math.max(...series.flatMap((s) => s.values)) })
  let s = o.noAxis ? '' : f.s
  const gw = f.pw / n
  const k = series.length
  const bw = o.barW ?? Math.min(o.maxBar ?? 34, (gw * (1 - (o.gap ?? 0.38)) - (k - 1) * 4) / k)
  for (let i = 0; i < n; i++) {
    const gx = f.px + gw * i + (gw - (bw * k + (k - 1) * 4)) / 2
    series.forEach((se, j) => {
      const v = se.values[i]
      const bh = (v / f.top) * f.ph
      const col = typeof se.color === 'function' ? se.color(i, v) : se.color
      s += `<path d="${barTop(gx + j * (bw + 4), f.py + f.ph - bh, bw, bh, o.radius ?? 5)}" fill="${col}"/>`
      if (o.valueLabels && j === k - 1)
        s += text(
          gx + j * (bw + 4) + bw / 2,
          f.py + f.ph - bh - 8,
          o.valueFmt ? o.valueFmt(v) : num(v),
          { size: 13, weight: 600, fill: C.text2, anchor: 'middle' }
        )
    })
    if (!o.noAxis && i % (o.labelEvery ?? 1) === 0)
      s += text(f.px + gw * i + gw / 2, f.py + f.ph + 22, o.labels[i], {
        size: 13,
        fill: C.text3,
        anchor: 'middle',
      })
  }
  return s
}
function smoothPath(pts) {
  const n = pts.length
  const dx = []
  const m = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  const t = new Array(n)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const q = a * a + b * b
    if (q > 9) {
      const k = 3 / Math.sqrt(q)
      t[i] = k * a * m[i]
      t[i + 1] = k * b * m[i]
    }
  }
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]
    d += ` C${r2(pts[i][0] + h / 3)},${r2(pts[i][1] + (t[i] * h) / 3)} ${r2(pts[i + 1][0] - h / 3)},${r2(pts[i + 1][1] - (t[i + 1] * h) / 3)} ${r2(pts[i + 1][0])},${r2(pts[i + 1][1])}`
  }
  return d
}
function lineChart(x, y, w, h, o) {
  const n = o.labels.length
  const f = chartFrame(x, y, w, h, {
    ...o,
    dataMax: Math.max(...o.series.flatMap((s) => s.values)),
  })
  let s = f.s
  const xOf = (i) => f.px + 8 + ((f.pw - 16) * i) / (n - 1)
  for (const se of o.series) {
    const pts = se.values.map((v, i) => [xOf(i), f.yOf(v)])
    const d = smoothPath(pts)
    if (se.area)
      s += path(
        `${d} L${r2(pts[n - 1][0])},${r2(f.py + f.ph)} L${r2(pts[0][0])},${r2(f.py + f.ph)}Z`,
        {
          fill: grad(
            [
              [0, se.color, 0.22],
              [1, se.color, 0],
            ],
            { x1: 0, y1: 0, x2: 0, y2: 1 }
          ),
        }
      )
    s += path(d, { stroke: se.color, sw: se.width ?? 2.6, dash: se.dash })
    if (se.lastDot) {
      const [lx, ly] = pts[n - 1]
      s += circle(lx, ly, 6, { fill: '#fff', stroke: se.color, sw: 3 })
    }
  }
  for (let i = 0; i < n; i++)
    if (i % (o.labelEvery ?? 1) === 0)
      s += text(xOf(i), f.py + f.ph + 22, o.labels[i], {
        size: 13,
        fill: C.text3,
        anchor: 'middle',
      })
  return s
}
function legend(x, y, items, o = {}) {
  let s = ''
  let cx = x
  if (o.anchor === 'end') cx -= sum(items.map(([l]) => tw(l, 14, 500) + 34))
  for (const [label, col, dash] of items) {
    s += dash
      ? line(cx, y - 4.5, cx + 14, y - 4.5, { stroke: col, sw: 3, dash: '4 3' })
      : rect(cx, y - 10, 12, 12, { r: 3.5, fill: col })
    s += text(cx + 20, y + 1, label, { size: 14, fill: C.text2 })
    cx += tw(label, 14, 500) + 34
  }
  return s
}
function donut(cx, cy, r, sw, segs, o = {}) {
  const total = sum(segs.map((s) => s.value))
  const L = 2 * Math.PI * r
  let s = circle(cx, cy, r, { stroke: C.muted, sw })
  let acc = 0
  const gap = o.gap ?? 3
  for (const sg of segs) {
    const len = (sg.value / total) * L
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${sw}" stroke-dasharray="${r2(Math.max(0, len - gap))} ${r2(L)}" stroke-dashoffset="${r2(-acc)}" transform="rotate(-90 ${cx} ${cy})"/>`
    acc += len
  }
  if (o.center)
    s += text(cx, cy + 4, o.center, { size: o.centerSize ?? 30, weight: 700, anchor: 'middle' })
  if (o.sub) s += text(cx, cy + 28, o.sub, { size: 14, fill: C.text3, anchor: 'middle' })
  return s
}
// Danh sách thanh ngang: nhãn + giá trị trên một dòng, thanh bên dưới
function hbars(x, y, w, items, o = {}) {
  const max = o.max ?? Math.max(...items.map((i) => i.value))
  const rh = o.rowH ?? 52
  let s = ''
  items.forEach((it, i) => {
    const ry = y + i * rh
    s += text(x, ry + 16, it.label, {
      size: 15,
      weight: 500,
      fill: C.body,
      maxW: w - tw(it.display ?? String(it.value), 15, 600) - 24,
    })
    s += text(x + w, ry + 16, it.display ?? String(it.value), {
      size: 15,
      weight: 600,
      anchor: 'end',
    })
    s += progress(x, ry + 28, w, it.value / max, { color: it.color ?? P, h: 8 })
  })
  return s
}

// ============================================================ Khung màn hình
const BASE_DEFS = `<filter id="sh" x="-5%" y="-5%" width="110%" height="125%"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#101828" flood-opacity="0.07"/></filter><filter id="sh2" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#101828" flood-opacity="0.16"/></filter><filter id="sh3" x="-25%" y="-10%" width="150%" height="130%"><feDropShadow dx="0" dy="34" stdDeviation="34" flood-color="#101828" flood-opacity="0.28"/></filter><filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="36"/></filter>`
const svgDoc = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}"><defs>${BASE_DEFS}${defs.join('')}</defs>${body}</svg>`

const TOP = 64
const SB = 248
const CX = SB + 32
const CW = W - CX - 32
const BODY_Y = 184
const BODY_B = H - 28
const RAIL = 92

function topBar(ctx, o = {}) {
  let s = rect(0, 0, W, TOP, { fill: '#fff' }) + line(0, TOP - 0.5, W, TOP - 0.5)
  s += logoMark(24, 14, 36, ctx.icon)
  const name = o.appName ?? ctx.demo.name
  s += text(72, 39, name, { size: 18, weight: 700 })
  let x = 72 + tw(name, 18, 700) + 20
  s += line(x, 22, x, 42)
  x += 20
  const org = o.org ?? ctx.org
  s += icon(ctx.orgIcon ?? 'store', x, 22, 20, C.text3)
  s += text(x + 28, 38, org, { size: 15, weight: 600, fill: C.text2 })
  s += icon('chevronDown', x + 34 + tw(org, 15, 600), 24, 16, C.text3)
  const [uName, uRole] = o.user ?? ctx.user
  const textW = Math.max(tw(uName, 15, 600), tw(uRole, 13))
  const tx = W - 24 - 16 - 12 - textW
  const ax = tx - 12 - 18
  s += avatar(ax, 32, 18, uName)
  s += text(tx, 29, uName, { size: 15, weight: 600 })
  s += text(tx, 47, uRole, { size: 13, fill: C.text3 })
  s += icon('chevronDown', W - 24 - 16, 24, 16, C.text3)
  const bx = ax - 18 - 24 - 22
  s +=
    icon('bell', bx, 21, 22, C.text2) +
    circle(bx + 18, 23, 4.5, { fill: '#F04438', stroke: '#fff', sw: 2 })
  if (o.extra) s += o.extra(bx - 28)
  else if (o.search !== false)
    s += searchBox(bx - 28 - 360, 12, 360, 40, ctx.search ?? 'Tìm kiếm nhanh…', {
      fill: C.soft,
      kbd: 'Ctrl K',
    })
  return s
}
function sideBar(ctx, active) {
  let s = rect(0, TOP, SB, H - TOP, { fill: '#fff' }) + line(SB - 0.5, TOP, SB - 0.5, H)
  let y = TOP + 20
  for (const m of ctx.menu) {
    if (m.section) {
      s += text(28, y + 24, m.section, { size: 12, weight: 600, fill: C.text3, ls: 0.6 })
      y += 36
      continue
    }
    const on = m.label === active
    if (on) s += rect(12, y, SB - 24, 44, { r: 10, fill: tint(P, 0.9) })
    s += icon(m.icon, 26, y + 12, 20, on ? P : '#667085')
    s += text(58, y + 27.5, m.label, {
      size: 15.5,
      weight: on ? 600 : 400,
      fill: on ? shade(P, 0.25) : C.body,
      maxW: SB - 84 - (m.badge ? 30 : 0),
    })
    if (m.badge) {
      const bw = tw(String(m.badge), 12.5, 600) + 14
      s +=
        rect(SB - 24 - bw - 6, y + 12, bw, 20, { r: 10, fill: on ? P : tint(P, 0.86) }) +
        text(SB - 24 - 6 - bw / 2, y + 26.5, String(m.badge), {
          size: 12.5,
          weight: 600,
          fill: on ? '#fff' : shade(P, 0.25),
          anchor: 'middle',
        })
    }
    y += 48
  }
  const by = H - 24 - 44
  s += line(24, by - 14, SB - 24, by - 14, { stroke: C.line })
  s +=
    icon('settings', 26, by + 12, 20, '#667085') +
    text(58, by + 27.5, 'Cài đặt', { size: 15.5, fill: C.body })
  return s
}
function pageHeader(title, subtitle, actions = [], o = {}) {
  let s = ''
  let tx = CX
  if (o.back) {
    s += iconBtn(CX, 98, 'arrowLeft', { size: 40 })
    tx += 56
  }
  s += text(tx, 124, title, { size: 28, weight: 700 })
  if (o.badge)
    s += badge(tx + tw(title, 28, 700) + 14, 104, o.badge[0], o.badge[1], { dot: true, h: 28 })
  if (subtitle) s += text(tx, 154, subtitle, { size: 15, fill: C.text2, maxW: 860 })
  if (actions.length) s += buttonsRight(CX + CW, 100, actions)
  return s
}
function appShell(ctx, o, body) {
  return (
    rect(0, 0, W, H, { fill: C.bg }) +
    sideBar(ctx, o.active) +
    topBar(ctx, o) +
    (o.title ? pageHeader(o.title, o.subtitle, o.actions, o) : '') +
    body
  )
}
function railBar(ctx, active) {
  let s = rect(0, TOP, RAIL, H - TOP, { fill: '#fff' }) + line(RAIL - 0.5, TOP, RAIL - 0.5, H)
  let y = TOP + 16
  for (const [ic, label] of ctx.rail) {
    const on = label === active
    if (on) s += rect(10, y, RAIL - 20, 70, { r: 12, fill: tint(P, 0.9) })
    s += icon(ic, RAIL / 2 - 12, y + 12, 24, on ? P : '#667085')
    s += text(RAIL / 2, y + 56, label, {
      size: 12.5,
      weight: on ? 600 : 500,
      fill: on ? shade(P, 0.25) : C.text2,
      anchor: 'middle',
      maxW: RAIL - 12,
    })
    y += 78
  }
  s +=
    icon('settings', RAIL / 2 - 12, H - 70, 24, '#667085') +
    text(RAIL / 2, H - 30, 'Cài đặt', { size: 12.5, fill: C.text2, anchor: 'middle' })
  return s
}
function shiftInfo(shift, clock) {
  return (xr) => {
    const cw2 = tw(clock, 15, 600)
    let s =
      icon('clock', xr - cw2 - 26, 23, 18, C.text3) +
      text(xr, 38, clock, { size: 15, weight: 600, fill: C.text2, anchor: 'end' })
    const x2 = xr - cw2 - 26 - 22
    const w = tw(shift, 14, 600) + 42
    s +=
      rect(x2 - w, 15, w, 34, { r: 17, fill: TONES.success.bg }) +
      circle(x2 - w + 17, 32, 4.5, { fill: TONES.success.dot }) +
      text(x2 - w + 29, 37, shift, { size: 14, weight: 600, fill: TONES.success.fg })
    return s
  }
}
function posShell(ctx, o, body) {
  let s = rect(0, 0, W, H, { fill: C.bg })
  if (o.rail !== false) s += railBar(ctx, o.active)
  s += topBar(ctx, {
    ...o,
    extra:
      o.extra ??
      shiftInfo(
        o.shift ?? ctx.shift ?? 'Ca sáng · 06:00 – 14:00',
        o.clock ?? '09:42 · Thứ Ba, 13/10/2026'
      ),
  })
  return s + body
}
function browser(url, body) {
  let s = rect(0, 0, W, H, { fill: '#fff' })
  s += body
  s += rect(0, 0, W, 56, { fill: '#EDEFF2' }) + line(0, 55.5, W, 55.5, { stroke: '#D9DCE1' })
  s +=
    circle(28, 28, 6.5, { fill: '#FF5F57' }) +
    circle(50, 28, 6.5, { fill: '#FEBC2E' }) +
    circle(72, 28, 6.5, { fill: '#28C840' })
  s +=
    icon('chevronLeft', 104, 18, 20, '#98A2B3') +
    icon('chevronRight', 132, 18, 20, '#C5CAD2') +
    icon('rotateCw', 164, 19, 18, '#98A2B3')
  s += rect(420, 11, 760, 34, { r: 17, fill: '#fff', stroke: '#D9DCE1' })
  s += icon('lock', 440, 20, 15, '#667085') + text(464, 33, url, { size: 14, fill: C.body })
  return s
}
const SITE_Y = 56
function phoneScene(screen, floats = []) {
  let s = rect(0, 0, W, H, {
    fill: grad(
      [
        [0, tint(P, 0.95)],
        [1, tint(P, 0.8)],
      ],
      { x1: 0, y1: 0, x2: 1, y2: 1 }
    ),
  })
  s +=
    circle(230, 170, 280, { fill: P, fo: 0.05 }) +
    circle(1400, 880, 360, { fill: P, fo: 0.07 }) +
    circle(1320, 150, 140, { fill: '#fff', fo: 0.4 }) +
    circle(320, 900, 120, { fill: '#fff', fo: 0.35 })
  for (let gx = 0; gx < 7; gx++)
    for (let gy = 0; gy < 5; gy++)
      s += circle(1180 + gx * 22, 300 + gy * 22, 2.2, { fill: P, fo: 0.18 })
  const pw = 440
  const ph = 904
  const px = (W - pw) / 2
  const py = 48
  s += rect(px, py, pw, ph, { r: 66, fill: '#1D2939', sh: 'sh3' })
  s += rect(px + 4, py + 4, pw - 8, ph - 8, { r: 62, fill: '#0C111D' })
  s +=
    rect(px - 3, py + 180, 4, 64, { r: 2, fill: '#344054' }) +
    rect(px - 3, py + 260, 4, 64, { r: 2, fill: '#344054' }) +
    rect(px + pw - 1, py + 220, 4, 96, { r: 2, fill: '#344054' })
  const sx = px + 14
  const sy = py + 14
  const sw = pw - 28
  const sh = ph - 28
  const cid = clip(sx, sy, sw, sh, 52)
  s += clipped(
    cid,
    rect(sx, sy, sw, sh, { fill: '#fff' }) +
      screen(sx, sy + 54, sw, sh - 54) +
      statusBar(sx, sy, sw)
  )
  s += rect(px + pw / 2 - 62, sy + 12, 124, 36, { r: 18, fill: '#0C111D' })
  s += rect(px + pw / 2 - 70, sy + sh - 14, 140, 5, { r: 2.5, fill: '#101828', op: 0.85 })
  for (const f of floats) s += floatCard(f)
  return s
}
function statusBar(x, y, w) {
  let s =
    rect(x, y, w, 54, { fill: '#fff' }) + text(x + 44, y + 36, '9:41', { size: 16, weight: 600 })
  const rx = x + w - 40
  for (let i = 0; i < 4; i++)
    s += rect(rx - 62 + i * 5.5, y + 32 - (i + 1) * 3, 3.5, (i + 1) * 3, { r: 1, fill: '#101828' })
  s +=
    path(`M${rx - 34},${y + 25} q8,-7 16,0 M${rx - 31},${y + 28.5} q5,-4 10,0`, {
      stroke: '#101828',
      sw: 2,
    }) + circle(rx - 26, y + 31.5, 1.6, { fill: '#101828' })
  s +=
    rect(rx - 12, y + 22, 24, 12, { r: 3.5, stroke: '#101828', sw: 1.4, op: 0.5 }) +
    rect(rx - 10, y + 24, 17, 8, { r: 2, fill: '#101828' }) +
    rect(rx + 13, y + 26, 2, 4, { r: 1, fill: '#101828', op: 0.5 })
  return s
}
function floatCard(f) {
  const w = f.w ?? 300
  const h = f.sub ? 84 : 64
  let s = rect(f.x, f.y, w, h, { r: 18, fill: '#fff', sh: 'sh2' })
  const t = tone(f.tone ?? 'primary')
  s +=
    rect(f.x + 16, f.y + (h - 48) / 2, 48, 48, { r: 14, fill: t.bg }) +
    icon(f.icon, f.x + 28, f.y + (h - 24) / 2, 24, t.dot === P ? P : t.fg)
  s += text(f.x + 78, f.y + (f.sub ? 36 : 39), f.title, { size: 16, weight: 700, maxW: w - 94 })
  if (f.sub) s += text(f.x + 78, f.y + 60, f.sub, { size: 14, fill: C.text2, maxW: w - 94 })
  return s
}
// Màn trong điện thoại: thanh tiêu đề ứng dụng
function phoneHeader(x, y, w, title, sub, o = {}) {
  let s =
    rect(x, y, w, 64, { fill: '#fff' }) + line(x, y + 63.5, x + w, y + 63.5, { stroke: C.line })
  let tx = x + 20
  if (o.back) {
    s += icon('arrowLeft', x + 18, y + 20, 24, C.text)
    tx += 36
  }
  s += text(tx, y + (sub ? 28 : 38), title, { size: 18, weight: 700, maxW: w - 100 })
  if (sub) s += text(tx, y + 50, sub, { size: 13.5, fill: C.text2 })
  if (o.right) s += o.right
  return s
}

// ============================================================ Kanban, lịch
function kanbanCol(x, y, w, h, o, cards) {
  let s = rect(x, y, w, h, { r: 16, fill: '#EEF0F3' })
  s += circle(x + 22, y + 28, 5, { fill: o.color })
  s += text(x + 36, y + 33.5, o.title, { size: 16, weight: 700, maxW: w - 110 })
  const cw = tw(String(o.count), 13, 600) + 16
  s +=
    rect(x + 42 + tw(o.title, 16, 700), y + 17, cw, 22, { r: 11, fill: '#fff' }) +
    text(x + 42 + tw(o.title, 16, 700) + cw / 2, y + 32.5, String(o.count), {
      size: 13,
      weight: 600,
      fill: C.text2,
      anchor: 'middle',
    })
  if (o.sub)
    s += text(x + w - 16, y + 33.5, o.sub, {
      size: 13.5,
      weight: 600,
      fill: C.text2,
      anchor: 'end',
    })
  let cy = y + 52
  const cid = clip(x, y, w, h, 16)
  let inner = ''
  for (const c of cards) {
    const ch = c(x + 10, cy, w - 20)
    inner += ch.s
    cy += ch.h + 10
  }
  return s + clipped(cid, inner)
}
// Lưới lịch theo cột (nhân viên/sân/ngày) và giờ
function timeGrid(x, y, w, h, o) {
  const headH = o.headH ?? 64
  const labelW = o.labelW ?? 64
  const n = o.cols.length
  const cw = (w - labelW) / n
  const hours = o.end - o.start
  const hh = (h - headH) / hours
  const yOf = (t) => y + headH + (t - o.start) * hh
  let s = card(x, y, w, h)
  const cid = clip(x, y, w, h, 16)
  let b = ''
  if (o.band)
    b += rect(x + labelW, yOf(o.band[0]), w - labelW, (o.band[1] - o.band[0]) * hh, {
      fill: tint(P, 0.95),
    })
  o.cols.forEach((c, i) => {
    const cx = x + labelW + i * cw
    if (c.highlight) b += rect(cx, y, cw, h, { fill: tint(P, 0.95) })
    if (i > 0) b += line(cx, y, cx, y + h, { stroke: C.line })
    if (c.avatar) {
      b += avatar(cx + 30, y + headH / 2, 17, c.title)
      b += text(cx + 56, y + headH / 2 - 2, c.title, { size: 15, weight: 600, maxW: cw - 64 })
      if (c.sub)
        b += text(cx + 56, y + headH / 2 + 17, c.sub, { size: 13, fill: C.text3, maxW: cw - 64 })
    } else {
      b += text(cx + cw / 2, y + (c.sub ? 28 : 38), c.title, {
        size: 15,
        weight: 600,
        anchor: 'middle',
        fill: c.highlight ? PD() : C.text,
        maxW: cw - 12,
      })
      if (c.sub)
        b += text(cx + cw / 2, y + 50, c.sub, {
          size: 13,
          fill: c.highlight ? PD() : C.text3,
          anchor: 'middle',
          maxW: cw - 12,
        })
    }
  })
  b += line(x, y + headH - 0.5, x + w, y + headH - 0.5, { stroke: C.border })
  for (let t = o.start; t <= o.end; t++) {
    const gy = yOf(t)
    if (t > o.start && t < o.end) b += line(x + labelW, gy, x + w, gy, { stroke: C.line })
    if (t < o.end)
      b += text(
        x + labelW - 12,
        gy + (t === o.start ? 18 : 5),
        `${String(t).padStart(2, '0')}:00`,
        { size: 13, fill: C.text3, anchor: 'end' }
      )
    if (o.half && t < o.end)
      b += line(x + labelW, gy + hh / 2, x + w, gy + hh / 2, {
        stroke: C.line,
        dash: '3 4',
        op: 0.7,
      })
  }
  for (const e of o.events) {
    const ex = x + labelW + e.col * cw + 5
    const ey = yOf(e.from) + 3
    const eh = (e.to - e.from) * hh - 6
    const ew = cw - 10
    const t = tone(e.tone ?? 'primary')
    if (e.striped) {
      b += rect(ex, ey, ew, eh, { r: 8, fill: '#F2F4F7' })
      for (let k = -eh; k < ew; k += 12)
        b += line(
          Math.max(ex, ex + k),
          ey + Math.max(0, -k),
          Math.min(ex + ew, ex + k + eh),
          ey + Math.min(eh, ew - k),
          { stroke: '#E4E7EC', sw: 4 }
        )
      b += text(ex + 12, ey + 22, e.title, {
        size: 13.5,
        weight: 600,
        fill: C.text2,
        maxW: ew - 20,
      })
      continue
    }
    b += rect(ex, ey, ew, eh, {
      r: 8,
      fill: e.solid ? t.dot : t.bg,
      stroke: e.dashed ? t.dot : undefined,
      dash: e.dashed ? '5 4' : undefined,
      sw: e.dashed ? 1.4 : undefined,
    })
    if (!e.solid) b += rect(ex, ey, 4, eh, { r: 2, fill: t.dot })
    const fg = e.solid ? '#fff' : t.fg
    const maxW = ew - 22
    b += text(ex + 13, ey + 21, e.title, { size: 14, weight: 700, fill: fg, maxW })
    if (eh > 44 && e.sub)
      b += text(ex + 13, ey + 40, e.sub, {
        size: 13,
        fill: e.solid ? 'rgba(255,255,255,0.88)' : C.body,
        maxW,
      })
    if (eh > 64 && e.sub2)
      b += text(ex + 13, ey + 58, e.sub2, {
        size: 12.5,
        fill: e.solid ? 'rgba(255,255,255,0.8)' : C.text2,
        maxW,
      })
  }
  if (o.now != null) {
    const ny = yOf(o.now)
    const nx = o.nowCol != null ? x + labelW + o.nowCol * cw : x + labelW
    b +=
      line(nx, ny, o.nowCol != null ? nx + cw : x + w, ny, { stroke: '#F04438', sw: 1.6 }) +
      circle(nx, ny, 5, { fill: '#F04438' })
  }
  return s + clipped(cid, b)
}

// ============================================================ Bối cảnh từng demo (doanh nghiệp mẫu, người dùng, menu)
const M = (...items) =>
  items.map((it) => (Array.isArray(it) ? { icon: it[0], label: it[1], badge: it[2] } : it))
const DEMO_CTX = {
  'danh-muc-demo': {
    icon: 'grid',
    org: 'PUM',
    orgIcon: 'building',
    user: ['Trần Thị Mai', 'Quản lý'],
    search: 'Tìm demo, nhóm ngành…',
    menu: M(
      ['grid', 'Quản lý demo'],
      ['tag', 'Nhóm ngành'],
      ['chart', 'Thống kê'],
      ['external', 'Xem trang công khai'],
      { section: 'HỆ THỐNG' },
      ['users', 'Tài khoản'],
      ['shield', 'Vai trò']
    ),
  },
  'pos-quan-cafe': {
    icon: 'coffee',
    org: 'Mộc Cafe · CN Lê Lợi',
    user: ['Phạm Thu Hà', 'Thu ngân'],
    manager: ['Đỗ Minh Tuấn', 'Quản lý quán'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['cart', 'Bán hàng'],
      ['receipt', 'Hóa đơn'],
      ['coffee', 'Thực đơn'],
      ['clock', 'Ca làm'],
      ['tag', 'Khuyến mãi'],
      ['chart', 'Báo cáo'],
      ['users', 'Khách hàng']
    ),
    rail: [
      ['cart', 'Bán hàng'],
      ['receipt', 'Hóa đơn'],
      ['clock', 'Ca làm'],
      ['coffee', 'Thực đơn'],
      ['chart', 'Báo cáo'],
    ],
  },
  'quan-ly-nha-hang': {
    icon: 'utensils',
    org: 'Nhà hàng Sen Việt',
    user: ['Lê Văn Hùng', 'Phục vụ'],
    rail: [
      ['grid', 'Sơ đồ bàn'],
      ['utensils', 'Gọi món'],
      ['chefHat', 'Bếp'],
      ['calendar', 'Đặt bàn'],
      ['receipt', 'Hóa đơn'],
      ['chart', 'Báo cáo'],
    ],
  },
  'menu-qr-goi-mon': {
    icon: 'qr',
    org: 'Quán Bếp Nhà',
    user: ['Nguyễn Thảo Vy', 'Nhân viên'],
    manager: ['Trịnh Quốc Bảo', 'Quản lý'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['inbox', 'Nhận đơn', 4],
      ['utensils', 'Thực đơn'],
      ['qr', 'Bàn và mã QR'],
      ['receipt', 'Lịch sử đơn'],
      ['chart', 'Báo cáo']
    ),
  },
  'website-ban-hang': {
    icon: 'bag',
    org: 'Mây Store',
    user: ['Hoàng Mai Anh', 'Nhân viên'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['receipt', 'Đơn hàng', 12],
      ['shirt', 'Sản phẩm'],
      ['users', 'Khách hàng'],
      ['percent', 'Mã giảm giá'],
      ['truck', 'Phí giao hàng'],
      ['chart', 'Báo cáo'],
      { section: 'CỬA HÀNG' },
      ['external', 'Xem website']
    ),
  },
  'pos-cua-hang-ban-le': {
    icon: 'scan',
    org: 'Mini Mart Hòa Bình',
    user: ['Nguyễn Văn Tâm', 'Thu ngân'],
    manager: ['Lý Thanh Hòa', 'Chủ cửa hàng'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['scan', 'Bán hàng'],
      ['receipt', 'Hóa đơn'],
      ['undo', 'Đổi trả'],
      ['package', 'Hàng hóa'],
      ['warehouse', 'Tồn kho'],
      ['importIc', 'Nhập hàng'],
      ['clock', 'Ca làm'],
      ['chart', 'Báo cáo']
    ),
    rail: [
      ['scan', 'Bán hàng'],
      ['receipt', 'Hóa đơn'],
      ['undo', 'Đổi trả'],
      ['clock', 'Ca làm'],
      ['search', 'Tra giá'],
    ],
  },
  'quan-ly-kho': {
    icon: 'warehouse',
    org: 'Phân phối Phương Nam',
    orgIcon: 'building',
    user: ['Phan Thị Ngọc', 'Quản lý kho'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['package', 'Hàng hóa'],
      ['importIc', 'Phiếu nhập'],
      ['exportIc', 'Phiếu xuất'],
      ['transfer', 'Chuyển kho'],
      ['clipboard', 'Chờ duyệt', 4],
      ['warehouse', 'Tồn kho'],
      ['clipboardList', 'Kiểm kê'],
      ['chart', 'Báo cáo'],
      { section: 'DANH MỤC' },
      ['truck', 'Nhà cung cấp'],
      ['building', 'Kho']
    ),
  },
  'quan-ly-spa-salon': {
    icon: 'sparkles',
    org: 'Lotus Spa & Beauty',
    user: ['Đặng Thu Hằng', 'Lễ tân'],
    manager: ['Võ Ngọc Diệp', 'Chủ tiệm'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['calendar', 'Lịch hẹn', 6],
      ['users', 'Khách hàng'],
      ['sparkles', 'Dịch vụ'],
      ['gift', 'Gói liệu trình'],
      ['user', 'Nhân viên'],
      ['wallet', 'Hoa hồng'],
      ['chart', 'Báo cáo']
    ),
  },
  'cho-thue-san-the-thao': {
    icon: 'target',
    org: 'Sân thể thao Phú An',
    user: ['Trương Minh Đức', 'Nhân viên'],
    manager: ['Lâm Quốc Thịnh', 'Chủ sân'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['calendar', 'Lịch sân'],
      ['clipboardList', 'Lượt đặt', 3],
      ['repeat', 'Đặt cố định'],
      ['grid', 'Sân'],
      ['tag', 'Bảng giá'],
      ['cupSoda', 'Bán kèm'],
      ['chart', 'Báo cáo']
    ),
  },
  'crm-quan-ly-khach-hang': {
    icon: 'target',
    org: 'Đại Phát Solutions',
    orgIcon: 'building',
    user: ['Trần Quốc Hùng', 'Nhân viên kinh doanh'],
    manager: ['Nguyễn Hải Yến', 'Trưởng phòng kinh doanh'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['userPlus', 'Lead', 8],
      ['building', 'Khách hàng'],
      ['kanban', 'Cơ hội'],
      ['calendar', 'Lịch chăm sóc'],
      ['file', 'Báo giá'],
      ['chart', 'Báo cáo']
    ),
  },
  'hrm-cham-cong-tinh-luong': {
    icon: 'users',
    org: 'Thương mại Hoàng Gia',
    orgIcon: 'building',
    user: ['Mai Thị Thanh', 'Nhân sự'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['users', 'Nhân viên'],
      ['building', 'Phòng ban'],
      ['clock', 'Ca làm'],
      ['calendarCheck', 'Chấm công'],
      ['calendar', 'Nghỉ phép', 5],
      ['clipboardList', 'Bảng công'],
      ['wallet', 'Bảng lương'],
      ['file', 'Phiếu lương'],
      ['chart', 'Báo cáo']
    ),
  },
  'quan-ly-nha-tro': {
    icon: 'home',
    org: 'Nhà trọ An Bình',
    user: ['Huỳnh Văn Phát', 'Chủ nhà'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['building', 'Tòa nhà và phòng'],
      ['users', 'Người thuê'],
      ['file', 'Hợp đồng'],
      ['zap', 'Chốt điện nước'],
      ['receipt', 'Hóa đơn'],
      ['wallet', 'Thu tiền, công nợ'],
      ['wrench', 'Sự cố', 2],
      ['chart', 'Báo cáo']
    ),
  },
  'website-cong-ty': {
    icon: 'sofa',
    org: 'Nội thất An Gia',
    orgIcon: 'building',
    user: ['Lương Bảo Ngọc', 'Biên tập viên'],
    menu: M(
      ['dashboard', 'Tổng quan'],
      ['image', 'Banner, trang'],
      ['briefcase', 'Dịch vụ'],
      ['building', 'Dự án'],
      ['news', 'Bài viết'],
      ['users', 'Tuyển dụng'],
      ['inbox', 'Liên hệ', 5],
      ['chart', 'Báo cáo'],
      { section: 'WEBSITE' },
      ['external', 'Xem website']
    ),
  },
}
const SCREENS = {}

// ============================================================ Màn hình dùng chung cho POS
const PANEL_X = 1072
function menuTile(x, y, w, h, imgH, it) {
  let s = card(x, y, w, h, { r: 14, stroke: it.selected ? P : C.border })
  s += photo(x + 8, y + 8, w - 16, imgH - 8, it.pal, it.icon, { r: 10 })
  const nl = wrap(it.name, w - 32, 16, 600, 2)
  s += lines(x + 16, y + imgH + 28, nl, { size: 16, weight: 600, lh: 21 })
  s += text(x + 16, y + h - 18, vnd(it.price), { size: 16, weight: 700, fill: PD() })
  if (it.note)
    s += text(x + w - 16, y + h - 18, it.note, { size: 13, fill: C.text3, anchor: 'end' })
  if (it.qty)
    s +=
      circle(x + w - 26, y + 26, 15, { fill: P, stroke: '#fff', sw: 2.5 }) +
      text(x + w - 26, y + 31.5, String(it.qty), {
        size: 15,
        weight: 700,
        fill: '#fff',
        anchor: 'middle',
      })
  if (it.out)
    s +=
      rect(x, y, w, h, { r: 14, fill: '#fff', fo: 0.55 }) +
      badge(x + (w - badgeW('Tạm hết', {})) / 2, y + imgH / 2 - 9, 'Tạm hết', 'neutral', {
        solid: false,
      })
  return s
}
function posMenu(ctx, o) {
  const x0 = RAIL + 24
  const y0 = TOP + 20
  const gridW = PANEL_X - 24 - x0
  let s = searchBox(x0, y0, 260, 44, o.search ?? 'Tìm món (F2)')
  s += chips(x0 + 276, y0 + 3, o.cats, { active: o.activeCat, h: 38 })
  const cols = o.cols ?? 4
  const gap = 16
  const tW = (gridW - gap * (cols - 1)) / cols
  const imgH = 132
  const tH = imgH + 96
  o.items.forEach((it, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    s += menuTile(x0 + c * (tW + gap), y0 + 64 + r * (tH + gap), tW, tH, imgH, it)
  })
  s +=
    rect(PANEL_X, TOP, W - PANEL_X, H - TOP, { fill: '#fff' }) +
    line(PANEL_X + 0.5, TOP, PANEL_X + 0.5, H)
  s += o.panel(PANEL_X, TOP, W - PANEL_X, H - TOP)
  return s
}
// Một dòng món trong đơn; trả về {s, h}
function orderLine(x, y, w, it) {
  let s = text(x, y + 22, it.name, { size: 16, weight: 600, maxW: w - 130 })
  s += text(x + w, y + 22, vnd(it.qty * it.price), { size: 16, weight: 700, anchor: 'end' })
  let h = 32
  if (it.opts) {
    const ol = wrap(it.opts, w - 40, 14, 400, 2)
    s += lines(x, y + h + 14, ol, { size: 14, fill: C.text2, lh: 20 })
    h += ol.length * 20 + 4
  }
  if (it.status) {
    s += badge(x, y + h + 4, it.status[0], it.status[1], { dot: true, h: 24, size: 12.5, padX: 9 })
    s += text(x + w, y + h + 21, `${it.qty} × ${num(it.price)}`, {
      size: 14,
      fill: C.text3,
      anchor: 'end',
    })
    h += 34
  } else {
    s += stepper(x, y + h + 4, it.qty, { h: 34, w: 104 })
    s += text(x + 118, y + h + 26, `× ${vnd(it.price)}`, { size: 14, fill: C.text3 })
    if (it.note)
      s += text(x + w, y + h + 26, it.note, { size: 13.5, fill: '#B54708', anchor: 'end' })
    h += 44
  }
  return { s, h: h + 14 }
}
function orderPanel(x, y, w, h, o) {
  const pad = 24
  const ix = x + pad
  const iw = w - 2 * pad
  let s = text(ix, y + 34, o.label, { size: 13.5, weight: 600, fill: C.text3 })
  s += text(ix, y + 62, o.title, { size: 22, weight: 700 })
  if (o.headRight) s += o.headRight(x + w - pad, y + 24)
  let cy = y + 84
  if (o.customer) {
    s += rect(ix, cy, iw, 48, { r: 12, fill: C.soft, stroke: C.line })
    s +=
      icon('user', ix + 14, cy + 14, 20, C.text2) +
      text(ix + 44, cy + 30, o.customer, { size: 15, weight: 600, fill: C.body })
    s += text(ix + iw - 14, cy + 30, o.customerAction ?? '+ Thêm khách', {
      size: 14,
      weight: 600,
      fill: PD(),
      anchor: 'end',
    })
    cy += 64
  }
  for (const sec of o.sections) {
    if (sec.title) {
      s += text(ix, cy + 18, sec.title, { size: 13, weight: 600, fill: C.text3, ls: 0.4 })
      cy += 30
    }
    sec.items.forEach((it) => {
      const r = orderLine(ix, cy, iw, it)
      s += r.s
      cy += r.h
      s += line(ix, cy - 7, ix + iw, cy - 7, { stroke: C.line })
    })
  }
  // tổng
  const fy = y + h - (o.footH ?? 250)
  s += rect(x, fy, w, h - (fy - y), { fill: C.soft }) + line(x, fy, x + w, fy, { stroke: C.border })
  let ty = fy + 34
  for (const [label, val, tn] of o.summary) {
    s +=
      text(ix, ty, label, { size: 15, fill: C.text2 }) +
      text(ix + iw, ty, val, {
        size: 15,
        weight: 600,
        fill: tn ? tone(tn).fg : C.body,
        anchor: 'end',
      })
    ty += 30
  }
  ty += 6
  s +=
    text(ix, ty + 6, o.total[0], { size: 17, weight: 700 }) +
    text(ix + iw, ty + 8, o.total[1], { size: 26, weight: 700, fill: PD(), anchor: 'end' })
  s += o.buttons(ix, y + h - 24 - 60, iw)
  return s
}

// ============================================================ 02 · POS Quán Cafe
const CAFE_ITEMS = [
  { name: 'Cà phê sữa đá', price: 29000, pal: 'coffee', icon: 'coffee', note: 'S · M · L', qty: 1 },
  { name: 'Bạc xỉu', price: 32000, pal: 'milktea', icon: 'coffee', note: 'M · L', qty: 1 },
  { name: 'Americano', price: 35000, pal: 'choco', icon: 'coffee', note: 'M · L' },
  { name: 'Cold brew cam sả', price: 45000, pal: 'orange', icon: 'cupSoda', note: 'M · L' },
  {
    name: 'Trà sữa trân châu đường đen',
    price: 42000,
    pal: 'caramel',
    icon: 'cupSoda',
    note: 'M · L',
    qty: 2,
    selected: true,
  },
  { name: 'Trà sữa ô long nướng', price: 45000, pal: 'milktea', icon: 'cupSoda', note: 'M · L' },
  { name: 'Trà đào cam sả', price: 42000, pal: 'peach', icon: 'cupSoda', note: 'M · L' },
  { name: 'Trà vải hoa hồng', price: 45000, pal: 'berry', icon: 'cupSoda', note: 'M · L' },
  { name: 'Matcha đá xay', price: 55000, pal: 'matcha', icon: 'cupSoda', note: 'L' },
  { name: 'Cookie đá xay', price: 55000, pal: 'choco', icon: 'cupSoda', note: 'L' },
  { name: 'Bánh tiramisu', price: 39000, pal: 'cream', icon: 'cake', qty: 1 },
  { name: 'Croissant bơ', price: 32000, pal: 'mango', icon: 'cake', out: true },
  { name: 'Sinh tố bơ', price: 49000, pal: 'lime', icon: 'cupSoda' },
  { name: 'Nước ép cam', price: 39000, pal: 'orange', icon: 'cupSoda' },
  { name: 'Trà chanh giã tay', price: 25000, pal: 'mango', icon: 'cupSoda' },
  { name: 'Latte nóng', price: 39000, pal: 'coffee', icon: 'coffee' },
]
const CAFE_ORDER = [
  {
    name: 'Trà sữa trân châu đường đen',
    opts: 'Size L · Trân châu đen · 70% đường · Ít đá',
    qty: 2,
    price: 52000,
  },
  { name: 'Cà phê sữa đá', opts: 'Size M · 50% đường', qty: 1, price: 29000 },
  { name: 'Bạc xỉu', opts: 'Size L · Thêm 1 shot espresso', qty: 1, price: 42000 },
  { name: 'Bánh tiramisu', qty: 1, price: 39000, note: 'Lấy sau' },
]
function cafePos(ctx) {
  return posShell(
    ctx,
    { active: 'Bán hàng' },
    posMenu(ctx, {
      cats: ['Tất cả', 'Cà phê', 'Trà sữa', 'Trà trái cây', 'Đá xay', 'Bánh ngọt'],
      activeCat: 'Tất cả',
      items: CAFE_ITEMS,
      panel: (x, y, w, h) =>
        orderPanel(x, y, w, h, {
          label: 'ĐƠN HIỆN TẠI',
          title: '#A-0142',
          headRight: (xr, yy) =>
            segmented(xr, yy + 4, ['Tại quán', 'Mang đi'], 0, { anchor: 'end', h: 38, size: 14 }),
          customer: 'Khách lẻ',
          sections: [{ items: CAFE_ORDER }],
          summary: [
            ['Tạm tính (5 món)', vnd(214000)],
            ['Giờ vàng 14h–16h (−10%)', vnd(-21400), 'success'],
          ],
          total: ['Khách cần trả', vnd(192600)],
          buttons: (bx, by, bw) =>
            button(bx, by, 'Lưu tạm', { variant: 'outline', h: 60, w: 120, size: 16 }) +
            button(bx + 132, by, 'Thanh toán · 192.600 ₫', {
              h: 60,
              w: bw - 132,
              size: 17,
              icon: 'wallet',
            }),
        }),
    })
  )
}
SCREENS['pos-quan-cafe/1.webp'] = cafePos
SCREENS['pos-quan-cafe/2.webp'] = (ctx) => {
  let s = cafePos(ctx) + rect(0, 0, W, H, { fill: '#101828', fo: 0.5 })
  const mw = 780
  const mx = (W - mw) / 2
  const my = 92
  const mh = 820
  s += rect(mx, my, mw, mh, { r: 22, fill: '#fff', sh: 'sh3' })
  const ix = mx + 32
  const iw = mw - 64
  s += photo(ix, my + 32, 104, 104, 'caramel', 'cupSoda', { r: 16 })
  s += text(ix + 128, my + 66, 'Trà sữa trân châu đường đen', { size: 23, weight: 700 })
  s += text(ix + 128, my + 94, 'Sữa tươi, đường đen Okinawa, trân châu nấu mới mỗi 4 giờ', {
    size: 15,
    fill: C.text2,
    maxW: iw - 180,
  })
  s += text(ix + 128, my + 124, 'Giá từ 42.000 ₫', { size: 15, weight: 600, fill: PD() })
  s += iconBtn(mx + mw - 32 - 40, my + 28, 'x', { stroke: 'none', fill: C.muted })
  s += line(mx, my + 160, mx + mw, my + 160, { stroke: C.line })
  let y = my + 190
  const secTitle = (t, req) =>
    text(ix, y, t, { size: 17, weight: 700 }) +
    text(ix + tw(t, 17, 700) + 10, y, req, { size: 13.5, fill: C.text3 })
  s += secTitle('Size', 'Bắt buộc · chọn 1')
  y += 16
  const sizes = [
    ['S · Nhỏ', '42.000 ₫'],
    ['M · Vừa', '+5.000 ₫'],
    ['L · Lớn', '+10.000 ₫'],
  ]
  const sw = (iw - 24) / 3
  sizes.forEach(([a, b], i) => {
    const on = i === 2
    const sx = ix + i * (sw + 12)
    s += rect(sx, y, sw, 64, {
      r: 12,
      fill: on ? tint(P, 0.92) : '#fff',
      stroke: on ? P : '#D0D5DD',
      sw: on ? 2 : 1,
    })
    s +=
      text(sx + 18, y + 28, a, { size: 16, weight: 700, fill: on ? PD() : C.text }) +
      text(sx + 18, y + 50, b, { size: 14, fill: C.text2 })
    s += radio(sx + sw - 26, y + 32, on, 10)
  })
  y += 104
  s += secTitle('Topping', 'Tối đa 3')
  y += 14
  const tops = [
    ['Trân châu đen', '+6.000 ₫', true],
    ['Pudding trứng', '+8.000 ₫', true],
    ['Thạch cà phê', '+6.000 ₫'],
    ['Kem cheese', '+10.000 ₫'],
    ['Trân châu trắng', '+8.000 ₫'],
    ['Thạch dừa', '+6.000 ₫'],
  ]
  const tw2 = (iw - 16) / 2
  tops.forEach(([a, b, on], i) => {
    const tx = ix + (i % 2) * (tw2 + 16)
    const ty = y + Math.floor(i / 2) * 52
    s += rect(tx, ty, tw2, 44, {
      r: 10,
      fill: on ? tint(P, 0.94) : '#fff',
      stroke: on ? tint(P, 0.5) : C.border,
    })
    s +=
      checkbox(tx + 14, ty + 13, on) +
      text(tx + 44, ty + 28, a, { size: 15, weight: on ? 600 : 400 }) +
      text(tx + tw2 - 14, ty + 28, b, { size: 14.5, fill: C.text2, anchor: 'end' })
  })
  y += 3 * 52 + 38
  s += secTitle('Mức đường', '')
  s += chips(ix + 150, y - 27, ['0%', '30%', '50%', '70%', '100%'], { active: '70%', h: 38 })
  y += 54
  s += secTitle('Mức đá', '')
  s += chips(ix + 150, y - 27, ['Không đá', 'Ít đá', 'Bình thường', 'Đá riêng'], {
    active: 'Ít đá',
    h: 38,
  })
  y += 34
  s += field(ix, y, iw, 'Ghi chú cho quầy pha chế', {
    value: 'Ít ngọt hơn một chút, không lấy ống hút',
  })
  s += line(mx, my + mh - 100, mx + mw, my + mh - 100, { stroke: C.line })
  s +=
    text(ix, my + mh - 58, 'Số lượng', { size: 15, weight: 600, fill: C.text2 }) +
    stepper(ix + 84, my + mh - 78, 2, { h: 44, w: 124 })
  s += button(mx + mw - 32 - 380, my + mh - 80, 'Thêm vào đơn · 132.000 ₫', {
    h: 52,
    w: 380,
    size: 17,
  })
  return s
}
SCREENS['pos-quan-cafe/3.webp'] = (ctx) => {
  let s = ''
  const x0 = RAIL + 32
  const y0 = TOP + 28
  s +=
    iconBtn(x0, y0, 'arrowLeft') +
    text(x0 + 56, y0 + 28, 'Thanh toán đơn #A-0142', { size: 26, weight: 700 })
  s += badge(x0 + 56 + tw('Thanh toán đơn #A-0142', 26, 700) + 14, y0 + 7, 'Tại quán', 'primary', {
    h: 28,
  })
  // tóm tắt đơn
  const lx = x0
  const ly = y0 + 64
  const lw = 470
  const lh = H - ly - 28
  s += card(lx, ly, lw, lh, { title: 'Đơn hàng', link: '5 món' })
  let cy = ly + 70
  for (const it of CAFE_ORDER) {
    s += text(lx + 24, cy + 18, `${it.qty}×`, { size: 15, weight: 700, fill: PD() })
    s +=
      text(lx + 60, cy + 18, it.name, { size: 15.5, weight: 600, maxW: lw - 200 }) +
      text(lx + lw - 24, cy + 18, vnd(it.qty * it.price), {
        size: 15.5,
        weight: 600,
        anchor: 'end',
      })
    if (it.opts) s += text(lx + 60, cy + 40, it.opts, { size: 13.5, fill: C.text2, maxW: lw - 90 })
    cy += it.opts ? 68 : 46
  }
  cy += 6
  s += line(lx + 24, cy, lx + lw - 24, cy, { stroke: C.border, dash: '5 5' })
  const rowsSum = [
    ['Tạm tính', vnd(214000)],
    ['Giờ vàng 14h–16h (−10%)', vnd(-21400)],
    ['Voucher', 'Không áp dụng'],
  ]
  rowsSum.forEach(([a, b], i) => {
    s +=
      text(lx + 24, cy + 34 + i * 30, a, { size: 15, fill: C.text2 }) +
      text(lx + lw - 24, cy + 34 + i * 30, b, {
        size: 15,
        weight: 600,
        anchor: 'end',
        fill: i === 1 ? TONES.success.fg : C.body,
      })
  })
  const vy = cy + 140
  s += text(lx + 24, vy, 'Mã voucher', { size: 14, weight: 600, fill: C.body })
  s +=
    input(lx + 24, vy + 10, lw - 48 - 112, {
      placeholder: 'Nhập mã, ví dụ MOC20',
      h: 44,
      icon: 'tag',
    }) + button(lx + lw - 24 - 100, vy + 10, 'Áp dụng', { variant: 'soft', h: 44, w: 100 })
  s += rect(lx + 24, vy + 76, lw - 48, 64, { r: 12, fill: C.soft, stroke: C.line })
  s +=
    avatar(lx + 52, vy + 108, 16, 'Phạm Thu Hà') +
    text(lx + 78, vy + 103, 'Thu ngân Phạm Thu Hà', { size: 14.5, weight: 600 }) +
    text(lx + 78, vy + 123, 'Ca sáng · bắt đầu 06:00', { size: 13, fill: C.text3 })
  s += rect(lx + 16, ly + lh - 96, lw - 32, 80, { r: 14, fill: tint(P, 0.92) })
  s +=
    text(lx + 36, ly + lh - 50, 'Khách cần trả', { size: 17, weight: 700, fill: shade(P, 0.3) }) +
    text(lx + lw - 36, ly + lh - 46, vnd(192600), {
      size: 30,
      weight: 700,
      fill: PD(),
      anchor: 'end',
    })
  // hình thức thanh toán
  const rx = lx + lw + 24
  const rw = W - 32 - rx
  s += text(rx, ly + 22, 'Chọn hình thức thanh toán', { size: 18, weight: 700 })
  const pw = (rw - 20) / 2
  const py = ly + 44
  const ph = lh - 44 - 96
  // tiền mặt
  s += card(rx, py, pw, ph)
  s +=
    radio(rx + 34, py + 36, false, 11) +
    icon('cash', rx + 58, py + 24, 24, C.text2) +
    text(rx + 92, py + 43, 'Tiền mặt', { size: 18, weight: 700 })
  s += field(rx + 24, py + 76, pw - 48, 'Khách đưa', {
    value: '200.000',
    suffix: '₫',
    h: 56,
    size: 22,
    weight: 700,
  })
  s += text(rx + 24, py + 196, 'Gợi ý mệnh giá', { size: 14, weight: 600, fill: C.text2 })
  const notes = ['192.600', '200.000', '250.000', '500.000']
  const nw = (pw - 48 - 12) / 2
  notes.forEach((n, i) => {
    const nx = rx + 24 + (i % 2) * (nw + 12)
    const ny = py + 212 + Math.floor(i / 2) * 60
    const on = i === 1
    s +=
      rect(nx, ny, nw, 48, {
        r: 12,
        fill: on ? tint(P, 0.92) : '#fff',
        stroke: on ? P : '#D0D5DD',
        sw: on ? 1.6 : 1,
      }) +
      text(nx + nw / 2, ny + 30, n, {
        size: 17,
        weight: 700,
        fill: on ? PD() : C.text,
        anchor: 'middle',
      })
  })
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '000', '0', '⌫']
  const kw0 = (pw - 48 - 16) / 3
  const kTop = py + 340
  const kh = (py + ph - 116 - kTop - 3 * 8) / 4
  keys.forEach((k0, i) => {
    const kx = rx + 24 + (i % 3) * (kw0 + 8)
    const ky = kTop + Math.floor(i / 3) * (kh + 8)
    s += rect(kx, ky, kw0, kh, { r: 10, fill: C.soft, stroke: C.line })
    s +=
      k0 === '⌫'
        ? icon('arrowLeft', kx + kw0 / 2 - 11, ky + kh / 2 - 11, 22, C.text2)
        : text(kx + kw0 / 2, ky + kh / 2 + 7, k0, {
            size: 20,
            weight: 600,
            fill: C.body,
            anchor: 'middle',
          })
  })
  s += rect(rx + 24, py + ph - 100, pw - 48, 76, { r: 14, fill: TONES.success.bg })
  s +=
    text(rx + 44, py + ph - 55, 'Tiền thối lại', {
      size: 16,
      weight: 600,
      fill: TONES.success.fg,
    }) +
    text(rx + pw - 44, py + ph - 52, vnd(7400), {
      size: 26,
      weight: 700,
      fill: TONES.success.fg,
      anchor: 'end',
    })
  // chuyển khoản QR
  const qx = rx + pw + 20
  s += rect(qx, py, pw, ph, { r: 16, fill: '#fff', stroke: P, sw: 2, sh: 'sh' })
  s +=
    radio(qx + 34, py + 36, true, 11) +
    icon('qr', qx + 58, py + 24, 24, P) +
    text(qx + 92, py + 43, 'Chuyển khoản QR', { size: 18, weight: 700 })
  s += badge(qx + pw - 24, py + 24, 'Đang chờ', 'warning', { anchor: 'end', dot: true })
  const qs = 250
  s += rect(qx + (pw - qs) / 2 - 18, py + 80, qs + 36, qs + 36, {
    r: 16,
    fill: '#fff',
    stroke: C.border,
  })
  s += qr(qx + (pw - qs) / 2, py + 98, qs, 1420)
  s +=
    rect(qx + pw / 2 - 26, py + 98 + qs / 2 - 26, 52, 52, { r: 12, fill: '#fff' }) +
    logoMark(qx + pw / 2 - 20, py + 98 + qs / 2 - 20, 40, 'coffee')
  s += text(qx + pw / 2, py + 402, vnd(192600), {
    size: 26,
    weight: 700,
    fill: PD(),
    anchor: 'middle',
  })
  const kv = [
    ['Ngân hàng', 'Vietcombank'],
    ['Số tài khoản', '0071 0012 3456 7'],
    ['Chủ tài khoản', 'MOC CAFE LE LOI'],
    ['Nội dung', 'A0142'],
  ]
  kv.forEach(([a, b], i) => {
    s +=
      text(qx + 32, py + 446 + i * 32, a, { size: 14.5, fill: C.text2 }) +
      text(qx + pw - 32, py + 446 + i * 32, b, { size: 15, weight: 600, anchor: 'end' })
  })
  s += rect(qx + 24, py + ph - 100, pw - 48, 76, { r: 14, fill: TONES.info.bg })
  s +=
    icon('info', qx + 44, py + ph - 74, 22, TONES.info.fg) +
    text(qx + 78, py + ph - 66, 'Tự xác nhận khi tiền về tài khoản', {
      size: 15,
      weight: 600,
      fill: TONES.info.fg,
      maxW: pw - 120,
    }) +
    text(qx + 78, py + ph - 44, 'Số tiền đã gắn sẵn trong mã QR', {
      size: 13.5,
      fill: TONES.info.fg,
      maxW: pw - 120,
    })
  // chân
  const fy = H - 28 - 64
  s +=
    checkbox(rx, fy + 23, true) +
    text(rx + 30, fy + 38, 'In bill khổ 80 mm sau khi thanh toán', { size: 15.5, fill: C.body })
  s += button(W - 32, fy, 'Hoàn tất thanh toán', {
    anchor: 'end',
    h: 64,
    w: 360,
    size: 18,
    icon: 'check',
    variant: 'primary',
  })
  return posShell(ctx, { active: 'Bán hàng' }, s)
}
SCREENS['pos-quan-cafe/4.webp'] = (ctx) => {
  let s = ''
  const x0 = RAIL + 32
  const y0 = TOP + 28
  s +=
    text(x0, y0 + 28, 'Chốt ca', { size: 28, weight: 700 }) +
    badge(x0 + tw('Chốt ca', 28, 700) + 14, y0 + 8, 'Đang mở', 'success', { dot: true, h: 28 })
  s += text(x0, y0 + 58, 'Ca sáng · Thứ Ba, 13/10/2026 · 06:00 – 14:00 · Thu ngân Phạm Thu Hà', {
    size: 15,
    fill: C.text2,
  })
  s += buttonsRight(W - 32, y0 + 6, [
    { label: 'In phiếu chốt ca', variant: 'outline', icon: 'printer' },
    { label: 'Xác nhận chốt ca', icon: 'check' },
  ])
  const ly = y0 + 92
  const lw = 640
  const lh = H - 28 - ly
  s += card(x0, ly, lw, lh, {
    title: 'Đếm tiền mặt trong két',
    sub: 'Nhập số tờ theo từng mệnh giá',
  })
  const den = [
    [500000, 4],
    [200000, 6],
    [100000, 9],
    [50000, 7],
    [20000, 12],
    [10000, 15],
    [5000, 8],
    [2000, 10],
    [1000, 6],
  ]
  const rows = den.map(([d, n]) => [
    { t: vnd(d), weight: 600, fill: C.text },
    {
      fn: (x, y) =>
        input(x + 16, y + 8, 120, { h: 40, value: String(n), align: 'right', weight: 600 }),
    },
    { t: vnd(d * n), weight: 600, fill: C.text },
  ])
  s += table(
    x0,
    ly + 84,
    lw,
    [
      { label: 'Mệnh giá', w: 0.9 },
      { label: 'Số tờ', w: 170 },
      { label: 'Thành tiền', w: 1, align: 'right' },
    ],
    rows,
    { rowH: 56, headTop: true }
  )
  const tot = sum(den.map(([d, n]) => d * n))
  s +=
    rect(x0 + 1, ly + lh - 64, lw - 2, 63, { fill: C.soft }) +
    line(x0, ly + lh - 64, x0 + lw, ly + lh - 64)
  s +=
    text(x0 + 24, ly + lh - 26, 'Tổng tiền mặt thực đếm', { size: 16, weight: 700 }) +
    text(x0 + lw - 24, ly + lh - 24, vnd(tot), { size: 22, weight: 700, anchor: 'end' })
  const rx = x0 + lw + 24
  const rw = W - 32 - rx
  s += card(rx, ly, rw, 470, { title: 'Đối soát tiền mặt' })
  const recon = [
    ['Tiền đầu ca', vnd(1000000)],
    ['Thu tiền mặt trong ca (86 hóa đơn)', `+${vnd(4126000)}`],
    ['Chi trong ca · mua đá viên', vnd(-200000)],
  ]
  let ry = ly + 84
  recon.forEach(([a, b]) => {
    s +=
      text(rx + 24, ry, a, { size: 15.5, fill: C.text2 }) +
      text(rx + rw - 24, ry, b, { size: 16, weight: 600, anchor: 'end' })
    ry += 40
  })
  s += line(rx + 24, ry - 16, rx + rw - 24, ry - 16, { stroke: C.border, dash: '5 5' })
  s +=
    text(rx + 24, ry + 12, 'Tiền mặt phải có', { size: 16, weight: 700 }) +
    text(rx + rw - 24, ry + 12, vnd(4926000), { size: 18, weight: 700, anchor: 'end' })
  s +=
    text(rx + 24, ry + 52, 'Tiền mặt thực đếm', { size: 16, weight: 700 }) +
    text(rx + rw - 24, ry + 52, vnd(tot), { size: 18, weight: 700, anchor: 'end' })
  s += rect(rx + 24, ry + 80, rw - 48, 92, { r: 14, fill: TONES.danger.bg })
  s +=
    icon('alert', rx + 44, ry + 98, 22, TONES.danger.fg) +
    text(rx + 76, ry + 116, 'Chênh lệch', { size: 16, weight: 700, fill: TONES.danger.fg })
  s += text(rx + 76, ry + 144, 'Ca bị gắn cờ lệch tiền, cần ghi lý do', {
    size: 14,
    fill: TONES.danger.fg,
  })
  s += text(rx + rw - 44, ry + 132, vnd(-20000), {
    size: 28,
    weight: 700,
    fill: TONES.danger.fg,
    anchor: 'end',
  })
  s +=
    text(rx + 24, ry + 214, 'Chuyển khoản QR (không tính vào két)', { size: 15, fill: C.text2 }) +
    text(rx + rw - 24, ry + 214, vnd(3240000), { size: 15.5, weight: 600, anchor: 'end' })
  const ny = ly + 494
  s += card(rx, ny, rw, H - 28 - ny, { title: 'Lý do chênh lệch' })
  s += textarea(
    rx + 24,
    ny + 60,
    rw - 48,
    92,
    'Thối nhầm cho khách bàn 3 lúc 11:20, đã báo quản lý ca để đối chiếu camera.'
  )
  s += text(rx + 24, ny + 182, 'Người nhận bàn giao', { size: 14, weight: 600, fill: C.body })
  s += input(rx + 24, ny + 194, rw - 48, {
    value: 'Nguyễn Quốc Bảo · Ca chiều',
    select: true,
    h: 42,
  })
  return posShell(ctx, { active: 'Ca làm' }, s)
}
SCREENS['pos-quan-cafe/5.webp'] = (ctx) => {
  let s = ''
  const kw = (CW - 3 * 20) / 4
  const k = [
    {
      label: 'Doanh thu hôm nay',
      value: vnd(8426000),
      delta: '+12,4%',
      note: 'so với hôm qua',
      icon: 'wallet',
    },
    { label: 'Số hóa đơn', value: '214', delta: '+8,1%', note: 'so với hôm qua', icon: 'receipt' },
    {
      label: 'Trung bình mỗi đơn',
      value: vnd(39400),
      delta: '+3,9%',
      note: 'so với hôm qua',
      icon: 'trend',
    },
    { label: 'Món bán ra', value: '386', delta: '−2,0%', note: 'so với hôm qua', icon: 'coffee' },
  ]
  k.forEach((o, i) => (s += kpi(CX + i * (kw + 20), BODY_Y, kw, 132, o)))
  const cy = BODY_Y + 152
  const cw1 = 820
  s += card(CX, cy, cw1, 360, { title: 'Doanh thu theo giờ', sub: 'Cao điểm 7–9 giờ và 14–16 giờ' })
  s += legend(CX + cw1 - 24, cy + 40, [['Doanh thu', P]], { anchor: 'end' })
  const hrs = range(16).map((i) => `${i + 6}h`)
  const vals = [
    180, 920, 1150, 740, 420, 380, 460, 520, 860, 940, 610, 380, 290, 330, 126, 120,
  ].map((v) => v * 1000)
  s += barChart(CX + 24, cy + 90, cw1 - 48, 250, {
    labels: hrs,
    series: [{ values: vals, color: (i) => ([1, 2, 8, 9].includes(i) ? P : tint(P, 0.55)) }],
    fmt: vndShort,
    maxBar: 30,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, 360, { title: 'Món bán chạy', link: 'Xem tất cả' })
  const top = [
    ['Trà sữa trân châu đường đen', 64, 'caramel'],
    ['Cà phê sữa đá', 58, 'coffee'],
    ['Bạc xỉu', 41, 'milktea'],
    ['Trà đào cam sả', 37, 'peach'],
    ['Matcha đá xay', 22, 'matcha'],
  ]
  top.forEach(([n, q, pal], i) => {
    const yy = cy + 68 + i * 56
    s += photo(rx + 24, yy, 40, 40, pal, 'cupSoda', { r: 10, sw: 2.2 })
    s += text(rx + 78, yy + 17, n, { size: 15, weight: 600, maxW: rw - 170 })
    s += progress(rx + 78, yy + 28, rw - 190, q / 64, { h: 6 })
    s += text(rx + rw - 24, yy + 26, `${q} ly`, { size: 15, weight: 700, anchor: 'end' })
  })
  const by = cy + 380
  const bh = BODY_B - by
  s += card(CX, by, 400, bh, { title: 'Hình thức thanh toán' })
  s += donut(
    CX + 110,
    by + 140,
    62,
    22,
    [
      { value: 58, color: P },
      { value: 42, color: tint(P, 0.55) },
    ],
    { center: '58%', centerSize: 22, sub: '' }
  )
  s +=
    rect(CX + 210, by + 104, 12, 12, { r: 3.5, fill: P }) +
    text(CX + 230, by + 115, 'Tiền mặt', { size: 15, fill: C.text2 }) +
    text(CX + 230, by + 138, vnd(4886000), { size: 15, weight: 700 })
  s +=
    rect(CX + 210, by + 160, 12, 12, { r: 3.5, fill: tint(P, 0.55) }) +
    text(CX + 230, by + 171, 'Chuyển khoản QR', { size: 15, fill: C.text2 }) +
    text(CX + 230, by + 194, vnd(3540000), { size: 15, weight: 700 })
  const tx = CX + 420
  const tw3 = CW - 420
  s += card(tx, by, tw3, bh, { title: 'Ca làm hôm nay', link: 'Lịch sử ca' })
  s += table(
    tx,
    by + 58,
    tw3,
    [
      { label: 'Ca', w: 1.1 },
      { label: 'Thu ngân', w: 1.4 },
      { label: 'Doanh thu', w: 1, align: 'right' },
      { label: 'Đối soát', w: 1.1, align: 'right' },
    ],
    [
      [
        { t: 'Ca sáng', sub: '06:00 – 14:00' },
        { avatar: 'Phạm Thu Hà', t: 'Phạm Thu Hà' },
        { t: vnd(4862000), weight: 600, fill: C.text },
        { badge: 'Lệch −20.000 ₫', tone: 'danger' },
      ],
      [
        { t: 'Ca chiều', sub: '14:00 – 22:00' },
        { avatar: 'Nguyễn Quốc Bảo', t: 'Nguyễn Quốc Bảo' },
        { t: vnd(3564000), weight: 600, fill: C.text },
        { badge: 'Đang mở', tone: 'info', dot: true },
      ],
    ],
    { headTop: true, rowH: 64 }
  )
  return appShell(
    ctx,
    {
      active: 'Tổng quan',
      user: ctx.manager,
      title: 'Tổng quan trong ngày',
      subtitle: 'Thứ Ba, 13/10/2026 · cập nhật lúc 21:30',
      actions: [
        { label: 'Hôm nay', variant: 'outline', icon: 'calendar' },
        { label: 'Xuất báo cáo', variant: 'outline', icon: 'download' },
      ],
    },
    s
  )
}

// ============================================================ 03 · Quản lý Nhà hàng
function tableStyle(st) {
  if (st === 'busy')
    return { fill: tint(P, 0.9), stroke: P, fg: shade(P, 0.3), chair: tint(P, 0.68) }
  if (st === 'res')
    return {
      fill: TONES.info.bg,
      stroke: TONES.info.dot,
      fg: TONES.info.fg,
      chair: tint(TONES.info.dot, 0.6),
    }
  if (st === 'bill')
    return {
      fill: TONES.violet.bg,
      stroke: TONES.violet.dot,
      fg: TONES.violet.fg,
      chair: tint(TONES.violet.dot, 0.6),
    }
  return { fill: '#fff', stroke: '#D0D5DD', fg: C.text2, chair: '#E4E7EC' }
}
function diningTable(cx, cy, t) {
  const st = tableStyle(t.status)
  let s = ''
  let tw0
  let th0
  if (t.shape === 'round') {
    const r = 64
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2
      s += `<rect x="${r2(cx + Math.cos(a) * (r + 12) - 20)}" y="${r2(cy + Math.sin(a) * (r + 12) - 7)}" width="40" height="14" rx="7" fill="${st.chair}" transform="rotate(${r2((a * 180) / Math.PI + 90)} ${r2(cx + Math.cos(a) * (r + 12))} ${r2(cy + Math.sin(a) * (r + 12))})"/>`
    }
    if (t.selected) s += circle(cx, cy, r + 8, { stroke: P, sw: 3, dash: '6 5' })
    s += circle(cx, cy, r, { fill: st.fill, stroke: st.stroke, sw: 2 })
  } else {
    tw0 = t.shape === 'long' ? 260 : 124
    th0 = t.shape === 'long' ? 112 : 112
    const x = cx - tw0 / 2
    const y = cy - th0 / 2
    const seatsX = t.shape === 'long' ? [0.2, 0.5, 0.8] : [0.5]
    for (const f of seatsX) {
      s +=
        rect(x + tw0 * f - 22, y - 20, 44, 13, { r: 6.5, fill: st.chair }) +
        rect(x + tw0 * f - 22, y + th0 + 7, 44, 13, { r: 6.5, fill: st.chair })
    }
    s +=
      rect(x - 20, cy - 22, 13, 44, { r: 6.5, fill: st.chair }) +
      rect(x + tw0 + 7, cy - 22, 13, 44, { r: 6.5, fill: st.chair })
    if (t.selected)
      s += rect(x - 9, y - 9, tw0 + 18, th0 + 18, { r: 20, stroke: P, sw: 3, dash: '6 5' })
    s += rect(x, y, tw0, th0, { r: 14, fill: st.fill, stroke: st.stroke, sw: 2 })
  }
  s += text(cx, cy - (t.l3 ? 14 : 4), t.name, {
    size: 18,
    weight: 700,
    fill: t.status === 'free' ? C.text : st.fg,
    anchor: 'middle',
  })
  if (t.l2)
    s += text(cx, cy + (t.l3 ? 10 : 20), t.l2, {
      size: 13.5,
      weight: 500,
      fill: t.status === 'free' ? C.text3 : st.fg,
      anchor: 'middle',
    })
  if (t.l3) s += text(cx, cy + 32, t.l3, { size: 14, weight: 700, fill: st.fg, anchor: 'middle' })
  return s
}
SCREENS['quan-ly-nha-hang/1.webp'] = (ctx) => {
  const x0 = RAIL + 24
  const y0 = TOP + 20
  let s = segmented(x0, y0, ['Tầng 1 · 12 bàn', 'Tầng 2 · 10 bàn', 'Sân vườn · 8 bàn'], 0, {
    h: 44,
    size: 15,
  })
  const leg = [
    ['Đang phục vụ 6', P],
    ['Trống 3', '#98A2B3'],
    ['Đặt trước 2', TONES.info.dot],
    ['Chờ thanh toán 1', TONES.violet.dot],
  ]
  let lx = 1156
  for (const [l, c] of [...leg].reverse()) {
    lx -= tw(l, 14.5, 600) + 22
    s +=
      circle(lx, y0 + 22, 6, { fill: c }) +
      text(lx + 12, y0 + 27, l, { size: 14.5, weight: 600, fill: C.body })
    lx -= 22
  }
  const fx = x0
  const fy = y0 + 64
  const fw = 1156 - x0
  const fh = H - 24 - fy
  s += card(fx, fy, fw, fh)
  const cid = clip(fx, fy, fw, fh, 16)
  let dots = ''
  for (let gx = fx + 20; gx < fx + fw; gx += 28)
    for (let gy = fy + 20; gy < fy + fh; gy += 28)
      dots += `<circle cx="${gx}" cy="${gy}" r="1.3" fill="#E4E7EC"/>`
  s += clipped(cid, dots)
  const zone = (x, y, w, h, label) =>
    rect(x, y, w, h, { r: 18, stroke: '#D0D5DD', dash: '7 6', fill: '#fff', fo: 0.6 }) +
    rect(x + 18, y - 13, tw(label, 13.5, 600) + 20, 26, { r: 13, fill: '#fff', stroke: C.border }) +
    text(x + 28, y + 4.5, label, { size: 13.5, weight: 600, fill: C.text2 })
  s += zone(fx + 24, fy + 34, fw - 48, 236, 'Khu cửa sổ')
  s += zone(fx + 24, fy + 300, fw - 48, 236, 'Khu giữa')
  s += zone(fx + 24, fy + 566, 470, fh - 590, 'Gần quầy')
  s += zone(fx + 514, fy + 566, fw - 538, fh - 590, 'Phòng VIP')
  const r1 = fy + 152
  const xs = [fx + 140, fx + 340, fx + 540, fx + 740, fx + 920]
  s += diningTable(xs[0], r1, {
    name: 'Bàn 01',
    status: 'busy',
    l2: '4 khách · 52 phút',
    l3: vnd(1240000),
  })
  s += diningTable(xs[1], r1, { name: 'Bàn 02', status: 'free', l2: 'Trống' })
  s += diningTable(xs[2], r1, {
    name: 'Bàn 03',
    status: 'busy',
    l2: '2 khách · 18 phút',
    l3: vnd(386000),
  })
  s += diningTable(xs[3], r1, {
    name: 'Bàn 04',
    status: 'res',
    l2: 'Đặt 18:30',
    l3: 'Anh Tuấn · 4',
  })
  s += diningTable(xs[4], r1, {
    name: 'Bàn 05',
    status: 'busy',
    l2: '4 khách · 35 phút',
    l3: vnd(693000),
    selected: true,
  })
  const r2y = fy + 418
  s += diningTable(fx + 150, r2y, {
    shape: 'round',
    name: 'Bàn 06',
    status: 'bill',
    l2: 'Chờ thanh toán',
    l3: vnd(1092000),
  })
  s += diningTable(fx + 360, r2y, { shape: 'round', name: 'Bàn 07', status: 'free', l2: 'Trống' })
  s += diningTable(fx + 570, r2y, {
    shape: 'round',
    name: 'Bàn 08',
    status: 'busy',
    l2: '5 khách · 41 phút',
    l3: vnd(1568000),
  })
  s += diningTable(fx + 830, r2y, {
    shape: 'long',
    name: 'Bàn 09',
    status: 'res',
    l2: 'Đặt 19:00',
    l3: 'Chị Lan · 8 người',
  })
  const r3 = fy + 566 + (fh - 590) / 2
  s += diningTable(fx + 140, r3, { name: 'Bàn 10', status: 'free', l2: 'Trống' })
  s += diningTable(fx + 360, r3, {
    name: 'Bàn 11',
    status: 'busy',
    l2: '3 khách · 9 phút',
    l3: vnd(245000),
  })
  s += diningTable(fx + 514 + (fw - 538) / 2, r3, {
    shape: 'long',
    name: 'VIP 1',
    status: 'busy',
    l2: '8 khách · 1 giờ 05 phút',
    l3: vnd(3480000),
  })
  // bảng chi tiết bàn đang chọn
  const px = 1176
  const pw = W - 24 - px
  s += card(px, y0, pw, H - 24 - y0)
  s +=
    text(px + 24, y0 + 44, 'Bàn 05', { size: 24, weight: 700 }) +
    badge(px + pw - 24, y0 + 22, 'Đang phục vụ', 'primary', { anchor: 'end', dot: true })
  s += text(px + 24, y0 + 70, 'Tầng 1 · Khu cửa sổ', { size: 14.5, fill: C.text2 })
  const info = [
    ['Số khách', '4 người'],
    ['Giờ vào', '11:42 · 35 phút'],
    ['Phục vụ', 'Lê Văn Hùng'],
  ]
  info.forEach(
    ([a, b], i) =>
      (s +=
        text(px + 24, y0 + 112 + i * 30, a, { size: 15, fill: C.text2 }) +
        text(px + pw - 24, y0 + 112 + i * 30, b, { size: 15, weight: 600, anchor: 'end' }))
  )
  s += line(px + 24, y0 + 194, px + pw - 24, y0 + 194, { stroke: C.line })
  s += text(px + 24, y0 + 226, 'MÓN ĐÃ GỌI', { size: 13, weight: 600, fill: C.text3, ls: 0.4 })
  const items = [
    ['Gỏi cuốn tôm thịt', 2, 130000, 'Đã ra', 'success'],
    ['Lẩu thái hải sản', 1, 389000, 'Đang làm', 'warning'],
    ['Cơm chiên cá mặn', 1, 95000, 'Chờ bếp', 'neutral'],
    ['Rau muống xào tỏi', 1, 59000, 'Đã ra', 'success'],
    ['Trà đá', 4, 20000, 'Đã ra', 'success'],
  ]
  items.forEach(([n, q, p, st, tn], i) => {
    const yy = y0 + 246 + i * 62
    s +=
      text(px + 24, yy + 22, `${q}× ${n}`, { size: 15.5, weight: 600, maxW: pw - 150 }) +
      text(px + pw - 24, yy + 22, num(p), { size: 15, weight: 600, anchor: 'end' })
    s += badge(px + 24, yy + 32, st, tn, { dot: true, h: 22, size: 12, padX: 8 })
  })
  const ty = y0 + 246 + 5 * 62 + 10
  s += line(px + 24, ty, px + pw - 24, ty, { stroke: C.border, dash: '5 5' })
  s +=
    text(px + 24, ty + 40, 'Tạm tính', { size: 17, weight: 700 }) +
    text(px + pw - 24, ty + 42, vnd(693000), { size: 24, weight: 700, fill: PD(), anchor: 'end' })
  const by = H - 24 - 24 - 52 - 12 - 48 - 12 - 48
  const bw = (pw - 48 - 12) / 2
  s +=
    button(px + 24, by, 'Chuyển bàn', { variant: 'outline', w: bw, h: 48, icon: 'transfer' }) +
    button(px + 36 + bw, by, 'Gộp bàn', { variant: 'outline', w: bw, h: 48, icon: 'layers' })
  s +=
    button(px + 24, by + 60, 'Tách hóa đơn', {
      variant: 'outline',
      w: bw,
      h: 48,
      icon: 'receipt',
    }) +
    button(px + 36 + bw, by + 60, 'Thanh toán', { variant: 'soft', w: bw, h: 48, icon: 'wallet' })
  s += button(px + 24, by + 120, 'Gọi thêm món', { w: pw - 48, h: 52, icon: 'plus', size: 16 })
  return posShell(
    ctx,
    { active: 'Sơ đồ bàn', shift: 'Ca trưa · 10:00 – 15:00', clock: '12:17 · Thứ Ba, 13/10/2026' },
    s
  )
}
SCREENS['quan-ly-nha-hang/2.webp'] = (ctx) => {
  const items = [
    { name: 'Gỏi cuốn tôm thịt', price: 65000, pal: 'green', icon: 'salad' },
    { name: 'Chả giò hải sản', price: 85000, pal: 'mango', icon: 'utensils' },
    { name: 'Gỏi ngó sen tôm thịt', price: 120000, pal: 'lime', icon: 'salad' },
    { name: 'Lẩu thái hải sản', price: 389000, pal: 'soup', icon: 'soup' },
    { name: 'Lẩu gà lá é', price: 349000, pal: 'sage', icon: 'soup' },
    { name: 'Cá kho tộ', price: 145000, pal: 'choco', icon: 'fish' },
    { name: 'Cơm chiên cá mặn', price: 95000, pal: 'orange', icon: 'utensils' },
    { name: 'Bò lúc lắc khoai tây', price: 189000, pal: 'red', icon: 'utensils' },
    { name: 'Tôm sú rang me', price: 245000, pal: 'peach', icon: 'fish', qty: 1, selected: true },
    { name: 'Mực nướng sa tế', price: 165000, pal: 'soup', icon: 'fish' },
    { name: 'Rau muống xào tỏi', price: 59000, pal: 'green', icon: 'salad' },
    { name: 'Canh chua cá lóc', price: 129000, pal: 'mango', icon: 'soup' },
    { name: 'Bia lon', price: 22000, pal: 'mango', icon: 'beer', qty: 4 },
    { name: 'Trà đá', price: 5000, pal: 'cream', icon: 'cupSoda' },
    { name: 'Nước cam ép', price: 39000, pal: 'orange', icon: 'cupSoda' },
    { name: 'Cơm trắng', price: 10000, pal: 'sand', icon: 'utensils' },
  ]
  return posShell(
    ctx,
    { active: 'Gọi món', shift: 'Ca trưa · 10:00 – 15:00', clock: '12:19 · Thứ Ba, 13/10/2026' },
    posMenu(ctx, {
      cats: ['Tất cả', 'Khai vị', 'Món chính', 'Lẩu', 'Hải sản', 'Đồ uống'],
      activeCat: 'Tất cả',
      items,
      panel: (x, y, w, h) =>
        orderPanel(x, y, w, h, {
          label: 'TẦNG 1 · KHU CỬA SỔ',
          title: 'Bàn 05',
          headRight: (xr, yy) =>
            badge(xr, yy + 10, '35 phút', 'warning', { anchor: 'end', icon: 'clock', h: 30 }),
          customer: '4 khách · vào lúc 11:42',
          customerAction: 'Sửa',
          sections: [
            {
              title: 'ĐÃ GỬI BẾP',
              items: [
                {
                  name: 'Gỏi cuốn tôm thịt',
                  qty: 2,
                  price: 65000,
                  status: ['Đã ra món', 'success'],
                },
                {
                  name: 'Lẩu thái hải sản',
                  qty: 1,
                  price: 389000,
                  status: ['Bếp đang làm', 'warning'],
                },
                { name: 'Cơm chiên cá mặn', qty: 1, price: 95000, status: ['Chờ bếp', 'neutral'] },
              ],
            },
            {
              title: 'MÓN MỚI',
              items: [
                { name: 'Tôm sú rang me', qty: 1, price: 245000, note: 'Ít cay' },
                { name: 'Bia lon', qty: 4, price: 22000, note: 'Ướp lạnh' },
              ],
            },
          ],
          summary: [
            ['Đã gửi bếp (4 món)', vnd(614000)],
            ['Món mới (5 món)', vnd(333000)],
          ],
          total: ['Tạm tính', vnd(947000)],
          buttons: (bx, by, bw) =>
            button(bx, by, 'In tạm tính', {
              variant: 'outline',
              h: 60,
              w: 150,
              size: 16,
              icon: 'printer',
            }) +
            button(bx + 162, by, 'Gửi bếp · 5 món', { h: 60, w: bw - 162, size: 17, icon: 'send' }),
        }),
    })
  )
}
function kdsTicket(t) {
  return (x, y, w) => {
    const tn = t.wait >= 15 ? 'danger' : t.wait >= 10 ? 'warning' : 'success'
    const tt = TONES[tn]
    const itemsH = sum(t.items.map((i) => (i.note ? 58 : 40)))
    const h = 64 + itemsH + 16 + 56
    let s = rect(x, y, w, h, {
      r: 14,
      fill: '#fff',
      stroke: tn === 'danger' ? tt.dot : C.border,
      sw: tn === 'danger' ? 1.6 : 1,
      sh: 'sh',
    })
    const cid = clip(x, y, w, 60, 14, 0)
    s += clipped(cid, rect(x, y, w, 60, { fill: tt.bg }))
    s += text(x + 18, y + 27, t.table, { size: 17, weight: 700, fill: C.text })
    s += text(x + 18, y + 48, t.meta, { size: 13, fill: C.text2 })
    if (tn === 'danger')
      s += icon('alert', x + w - 18 - tw(`${t.wait} phút`, 20, 700) - 30, y + 18, 22, tt.fg)
    s += text(x + w - 18, y + 38, `${t.wait} phút`, {
      size: 20,
      weight: 700,
      fill: tt.fg,
      anchor: 'end',
    })
    let iy = y + 64
    for (const it of t.items) {
      s += circle(x + 30, iy + 22, 10, {
        stroke: it.done ? TONES.success.dot : '#D0D5DD',
        sw: 1.6,
        fill: it.done ? TONES.success.dot : '#fff',
      })
      if (it.done) s += icon('check', x + 23, iy + 15, 14, '#fff', { sw: 3.4 })
      s += text(x + 52, iy + 28, `${it.q}×`, {
        size: 16,
        weight: 700,
        fill: it.done ? C.text3 : PD(),
      })
      s += text(x + 84, iy + 28, it.n, {
        size: 16,
        weight: 600,
        fill: it.done ? C.text3 : C.text,
        deco: it.done ? 'line-through' : undefined,
        maxW: w - 104,
      })
      if (it.note) s += text(x + 84, iy + 48, it.note, { size: 13.5, weight: 600, fill: '#B54708' })
      iy += it.note ? 58 : 40
    }
    s += line(x + 16, y + h - 64, x + w - 16, y + h - 64, { stroke: C.line })
    const bw = (w - 44) / 2
    s += button(x + 16, y + h - 52, t.started ? 'Báo thiếu món' : 'Bắt đầu làm', {
      variant: 'outline',
      h: 40,
      w: bw,
      size: 14.5,
    })
    s += button(x + 28 + bw, y + h - 52, 'Xong, ra món', {
      variant: 'success',
      h: 40,
      w: bw,
      size: 14.5,
      icon: 'check',
    })
    return { s, h }
  }
}
SCREENS['quan-ly-nha-hang/3.webp'] = (ctx) => {
  const x0 = RAIL + 24
  const y0 = TOP + 20
  let s = segmented(x0, y0, ['Tất cả khu', 'Bếp nóng · 9', 'Bếp nguội · 4', 'Quầy bar · 6'], 0, {
    h: 44,
    size: 15,
  })
  s += badge(W - 24, y0 + 9, '2 phiếu chờ quá 15 phút', 'danger', {
    anchor: 'end',
    icon: 'alert',
    h: 28,
  })
  s += badge(
    W - 24 - badgeW('2 phiếu chờ quá 15 phút', { icon: 'alert' }) - 10,
    y0 + 9,
    '19 món đang chờ',
    'neutral',
    { anchor: 'end', icon: 'clock', h: 28 }
  )
  const cols = [
    {
      title: 'Bếp nóng',
      color: '#F04438',
      count: 9,
      tickets: [
        {
          table: 'Bàn 08 · Tầng 2',
          meta: '#HD-0377 · gọi lúc 11:59 · Hùng',
          wait: 18,
          started: true,
          items: [
            { q: 1, n: 'Lẩu gà lá é', note: 'Thêm nấm, ít lá é' },
            { q: 1, n: 'Bò lúc lắc khoai tây' },
            { q: 1, n: 'Cơm chiên cá mặn', done: true },
          ],
        },
        {
          table: 'Bàn 05 · Tầng 1',
          meta: '#HD-0381 · gọi lúc 12:05 · Hùng',
          wait: 12,
          started: true,
          items: [
            { q: 1, n: 'Lẩu thái hải sản', note: 'Ít cay' },
            { q: 1, n: 'Cơm chiên cá mặn' },
          ],
        },
        {
          table: 'Bàn 11 · Tầng 1',
          meta: '#HD-0385 · gọi lúc 12:14 · Vy',
          wait: 3,
          items: [
            { q: 1, n: 'Tôm sú rang me' },
            { q: 2, n: 'Mực nướng sa tế' },
          ],
        },
      ],
    },
    {
      title: 'Bếp nguội',
      color: '#15B79E',
      count: 4,
      tickets: [
        {
          table: 'Bàn 03 · Tầng 1',
          meta: '#HD-0379 · gọi lúc 12:01 · Vy',
          wait: 16,
          started: true,
          items: [{ q: 2, n: 'Gỏi ngó sen tôm thịt', note: 'Không hành phi' }],
        },
        {
          table: 'VIP 1 · Tầng 1',
          meta: '#HD-0383 · gọi lúc 12:12 · Hùng',
          wait: 5,
          items: [
            { q: 3, n: 'Gỏi cuốn tôm thịt' },
            { q: 1, n: 'Gỏi ngó sen tôm thịt' },
          ],
        },
      ],
    },
    {
      title: 'Quầy bar',
      color: '#2E90FA',
      count: 6,
      tickets: [
        {
          table: 'VIP 1 · Tầng 1',
          meta: '#HD-0383 · gọi lúc 12:06 · Hùng',
          wait: 11,
          started: true,
          items: [
            { q: 8, n: 'Bia lon', note: 'Ướp lạnh, kèm đá', done: true },
            { q: 2, n: 'Nước cam ép' },
          ],
        },
        {
          table: 'Bàn 05 · Tầng 1',
          meta: '#HD-0381 · gọi lúc 12:13 · Hùng',
          wait: 4,
          items: [{ q: 4, n: 'Trà đá' }],
        },
        {
          table: 'Bàn 11 · Tầng 1',
          meta: '#HD-0385 · gọi lúc 12:16 · Vy',
          wait: 1,
          items: [
            { q: 2, n: 'Nước cam ép', note: 'Ít đá' },
            { q: 1, n: 'Trà đá' },
          ],
        },
      ],
    },
  ]
  const cw = (W - 24 - x0 - 2 * 20) / 3
  cols.forEach((c, i) => {
    s += kanbanCol(
      x0 + i * (cw + 20),
      y0 + 64,
      cw,
      H - 24 - y0 - 64,
      { title: c.title, color: c.color, count: c.count, sub: `${c.tickets.length} phiếu` },
      c.tickets.map(kdsTicket)
    )
  })
  return posShell(
    ctx,
    {
      active: 'Bếp',
      appName: 'Màn hình bếp',
      user: ['Ngô Văn Lực', 'Bếp trưởng'],
      shift: 'Ca trưa · 10:00 – 15:00',
      clock: '12:17 · Thứ Ba, 13/10/2026',
    },
    s
  )
}
SCREENS['quan-ly-nha-hang/4.webp'] = (ctx) => {
  const x0 = RAIL + 32
  const y0 = TOP + 28
  let s =
    iconBtn(x0, y0, 'arrowLeft') +
    text(x0 + 56, y0 + 28, 'Tách hóa đơn · Bàn 08', { size: 26, weight: 700 })
  s += badge(x0 + 56 + tw('Tách hóa đơn · Bàn 08', 26, 700) + 14, y0 + 7, 'Tầng 2', 'neutral', {
    h: 28,
  })
  s += button(W - 32, y0, 'Thêm hóa đơn', { anchor: 'end', variant: 'outline', icon: 'plus' })
  s += segmented(
    W - 32 - btnW('Thêm hóa đơn', { icon: 'plus' }) - 16,
    y0,
    ['Tách theo món', 'Chia đều'],
    0,
    { anchor: 'end' }
  )
  const ly = y0 + 64
  const lw = 520
  const lh = H - 28 - ly
  s += card(x0, ly, lw, lh, {
    title: 'Hóa đơn gốc',
    sub: '4 khách · 7 món · gán từng món vào hóa đơn',
  })
  s += text(x0 + lw - 24, ly + 40, vnd(1092000), { size: 18, weight: 700, anchor: 'end' })
  const its = [
    ['Lẩu gà lá é', 1, 349000, 0],
    ['Bò lúc lắc khoai tây', 1, 189000, 0],
    ['Tôm sú rang me', 1, 245000, 1],
    ['Rau muống xào tỏi', 1, 59000, 1],
    ['Cơm trắng', 4, 10000, 2],
    ['Bia lon', 6, 22000, 0],
    ['Nước cam ép', 2, 39000, 1],
  ]
  its.forEach(([n, q, p, b], i) => {
    const yy = ly + 92 + i * 72
    s += line(x0 + 24, yy, x0 + lw - 24, yy, { stroke: C.line })
    s +=
      text(x0 + 24, yy + 32, n, { size: 16, weight: 600, maxW: 240 }) +
      text(x0 + 24, yy + 54, `${q} × ${vnd(p)} = ${vnd(q * p)}`, { size: 13.5, fill: C.text2 })
    if (b === 2)
      s += badge(x0 + lw - 24, yy + 24, 'Chia 2 · 2', 'violet', {
        anchor: 'end',
        icon: 'transfer',
        h: 30,
      })
    else
      s += segmented(x0 + lw - 24, yy + 18, ['HĐ 1', 'HĐ 2'], b, {
        anchor: 'end',
        h: 38,
        size: 14,
        padX: 14,
      })
  })
  s += rect(x0 + 24, ly + lh - 120, lw - 48, 96, { r: 14, fill: TONES.success.bg })
  s +=
    icon('checkCircle', x0 + 44, ly + lh - 100, 22, TONES.success.fg) +
    text(x0 + 76, ly + lh - 82, 'Đã gán đủ 7/7 món', {
      size: 16,
      weight: 700,
      fill: TONES.success.fg,
    })
  s += text(x0 + 76, ly + lh - 58, 'Hóa đơn 1: 4 món · Hóa đơn 2: 4 món (cơm chia đôi)', {
    size: 14,
    fill: TONES.success.fg,
  })
  s += progress(x0 + 76, ly + lh - 46, lw - 148, 1, {
    color: TONES.success.dot,
    track: '#fff',
    h: 6,
  })
  const rx = x0 + lw + 24
  const bw = (W - 32 - rx - 20) / 2
  const bill = (bx, title, who, list, total, paid) => {
    let b = card(bx, ly, bw, lh, { stroke: paid ? C.border : P })
    b +=
      rect(bx + 24, ly + 22, 40, 40, { r: 12, fill: paid ? TONES.success.bg : tint(P, 0.88) }) +
      icon(paid ? 'checkCircle' : 'receipt', bx + 34, ly + 32, 20, paid ? TONES.success.fg : P)
    b +=
      text(bx + 76, ly + 40, title, { size: 19, weight: 700 }) +
      text(bx + 76, ly + 60, who, { size: 13.5, fill: C.text2 })
    b += paid
      ? badge(bx + bw - 24, ly + 28, 'Đã thanh toán', 'success', { anchor: 'end', dot: true })
      : badge(bx + bw - 24, ly + 28, 'Chờ thanh toán', 'warning', { anchor: 'end', dot: true })
    list.forEach(([n, q, p], i) => {
      const yy = ly + 96 + i * 58
      b +=
        text(bx + 24, yy + 22, `${q}×`, { size: 15, weight: 700, fill: PD() }) +
        text(bx + 58, yy + 22, n, { size: 15.5, weight: 500, maxW: bw - 200 }) +
        text(bx + bw - 24, yy + 22, vnd(q * p), { size: 15.5, weight: 600, anchor: 'end' })
      b += line(bx + 24, yy + 44, bx + bw - 24, yy + 44, { stroke: C.line })
    })
    const dz = ly + 96 + list.length * 58 + 14
    b += rect(bx + 24, dz, bw - 48, 84, { r: 12, stroke: '#D0D5DD', dash: '6 5', fill: C.soft })
    b +=
      icon('plus', bx + bw / 2 - 10, dz + 16, 20, C.text3) +
      text(bx + bw / 2, dz + 62, 'Kéo thêm món từ hóa đơn gốc', {
        size: 14,
        fill: C.text3,
        anchor: 'middle',
      })
    const fy = ly + lh - 250
    b +=
      text(bx + 24, fy, 'Tạm tính', { size: 15, fill: C.text2 }) +
      text(bx + bw - 24, fy, vnd(total), { size: 15, weight: 600, anchor: 'end' })
    b +=
      text(bx + 24, fy + 30, 'Phí phục vụ', { size: 15, fill: C.text2 }) +
      text(bx + bw - 24, fy + 30, 'Miễn phí', { size: 15, weight: 600, anchor: 'end' })
    b +=
      text(bx + 24, fy + 74, 'Cần trả', { size: 18, weight: 700 }) +
      text(bx + bw - 24, fy + 76, vnd(total), { size: 26, weight: 700, fill: PD(), anchor: 'end' })
    if (paid) {
      b +=
        rect(bx + 24, fy + 100, bw - 48, 56, { r: 12, fill: C.soft, stroke: C.line }) +
        icon('qr', bx + 40, fy + 116, 22, C.text2) +
        text(bx + 74, fy + 134, 'Chuyển khoản QR · 12:46', { size: 15, weight: 600, fill: C.body })
      b += button(bx + 24, fy + 172, 'In hóa đơn', {
        variant: 'outline',
        w: bw - 48,
        h: 52,
        icon: 'printer',
      })
    } else {
      const mw = (bw - 48 - 12) / 2
      b +=
        rect(bx + 24, fy + 100, mw, 56, { r: 12, fill: tint(P, 0.92), stroke: P, sw: 1.6 }) +
        icon('cash', bx + 40, fy + 116, 22, P) +
        text(bx + 72, fy + 134, 'Tiền mặt', { size: 15, weight: 600, fill: PD() })
      b +=
        rect(bx + 36 + mw, fy + 100, mw, 56, { r: 12, fill: '#fff', stroke: '#D0D5DD' }) +
        icon('qr', bx + 52 + mw, fy + 116, 22, C.text2) +
        text(bx + 84 + mw, fy + 134, 'QR', { size: 15, weight: 600, fill: C.body })
      b += button(bx + 24, fy + 172, `Thanh toán ${title.replace('Hóa đơn ', 'HĐ ')}`, {
        w: bw - 48,
        h: 52,
        icon: 'wallet',
        size: 16,
      })
    }
    return b
  }
  s += bill(
    rx,
    'Hóa đơn 1',
    'Anh Tuấn · 2 khách',
    [
      ['Lẩu gà lá é', 1, 349000],
      ['Bò lúc lắc khoai tây', 1, 189000],
      ['Cơm trắng', 2, 10000],
      ['Bia lon', 6, 22000],
    ],
    690000,
    false
  )
  s += bill(
    rx + bw + 20,
    'Hóa đơn 2',
    'Chị Lan · 2 khách',
    [
      ['Tôm sú rang me', 1, 245000],
      ['Rau muống xào tỏi', 1, 59000],
      ['Cơm trắng', 2, 10000],
      ['Nước cam ép', 2, 39000],
    ],
    402000,
    true
  )
  return posShell(
    ctx,
    {
      active: 'Hóa đơn',
      user: ['Vũ Thị Kim', 'Thu ngân'],
      shift: 'Ca trưa · 10:00 – 15:00',
      clock: '12:48 · Thứ Ba, 13/10/2026',
    },
    s
  )
}

// ============================================================ 04 · Menu QR Gọi món
function phoneMenuItem(x, y, w, it) {
  let s = photo(x, y, 84, 84, it.pal, it.icon, { r: 14 })
  const tx = x + 100
  const tw0 = w - 100
  s += text(tx, y + 20, it.name, {
    size: 16,
    weight: 700,
    maxW: tw0,
    fill: it.out ? C.text3 : C.text,
  })
  s += para(tx, y + 42, it.desc, tw0 - 4, { size: 13, fill: C.text3, lh: 18, maxLines: 2 })
  s += text(tx, y + 82, vnd(it.price), { size: 15.5, weight: 700, fill: it.out ? C.text3 : PD() })
  if (it.out)
    s +=
      rect(x, y, 84, 84, { r: 14, fill: '#fff', fo: 0.55 }) +
      badge(x + w, y + 64, 'Hết món', 'neutral', { anchor: 'end', h: 24, size: 12.5, padX: 9 })
  else if (it.qty) s += stepper(x + w - 104, y + 56, it.qty, { h: 32, w: 104 })
  else
    s +=
      circle(x + w - 16, y + 72, 16, { fill: P }) +
      icon('plus', x + w - 26, y + 62, 20, '#fff', { sw: 2.6 })
  return s
}
SCREENS['menu-qr-goi-mon/1.webp'] = () => {
  const screen = (x, y, w, h) => {
    let s = phoneHeader(x, y, w, 'Quán Bếp Nhà', 'Bàn 12 · Tầng trệt', {
      right: iconBtn(x + w - 60, y + 12, 'search', { stroke: 'none', fill: C.muted }),
    })
    const bx = x + 16
    const bw = w - 32
    s += rect(bx, y + 78, bw, 92, {
      r: 16,
      fill: grad(
        [
          [0, P],
          [1, shade(P, 0.25)],
        ],
        { x1: 0, y1: 0, x2: 1, y2: 1 }
      ),
    })
    s += icon('utensils', bx + bw - 76, y + 92, 64, '#fff', { sw: 1.4, op: 0.22 })
    s +=
      text(bx + 18, y + 112, 'Combo trưa 99.000 ₫', { size: 19, weight: 700, fill: '#fff' }) +
      text(bx + 18, y + 140, 'Cơm, canh, trà đá · 10:30 – 14:00', {
        size: 13.5,
        fill: '#fff',
        op: 0.9,
      })
    s += chips(bx, y + 186, ['Món nổi bật', 'Món chính', 'Lẩu', 'Món nhậu', 'Đồ uống'], {
      active: 'Món nổi bật',
      h: 36,
      size: 14,
      padX: 14,
      gap: 8,
    })
    s += text(bx, y + 254, 'Món nổi bật', { size: 17, weight: 700 })
    const items = [
      {
        name: 'Cơm gà xối mỡ',
        desc: 'Gà ta chiên giòn, cơm chiên tỏi, dưa leo',
        price: 65000,
        pal: 'mango',
        icon: 'utensils',
        qty: 1,
      },
      {
        name: 'Bún bò Huế đặc biệt',
        desc: 'Giò heo, chả cua, bò bắp, rau sống',
        price: 75000,
        pal: 'soup',
        icon: 'soup',
        qty: 1,
      },
      {
        name: 'Mì xào hải sản',
        desc: 'Tôm, mực, cải ngọt, nước sốt dầu hào',
        price: 85000,
        pal: 'peach',
        icon: 'utensils',
      },
      {
        name: 'Gà nướng muối ớt',
        desc: 'Nửa con, kèm rau răm và muối tiêu chanh',
        price: 165000,
        pal: 'red',
        icon: 'utensils',
        out: true,
      },
      {
        name: 'Lẩu cá kèo lá giang',
        desc: 'Cá kèo tươi, lá giang, bún tươi',
        price: 259000,
        pal: 'green',
        icon: 'soup',
      },
    ]
    items.forEach((it, i) => (s += phoneMenuItem(bx, y + 272 + i * 104, bw, it)))
    const fy = y + h - 148
    s += rect(x, fy, w, 148, { fill: '#fff' }) + line(x, fy, x + w, fy, { stroke: C.border })
    const hb = (bw - 10) / 2
    s +=
      button(bx, fy + 12, 'Gọi nhân viên', {
        variant: 'outline',
        w: hb,
        h: 40,
        icon: 'bell',
        size: 14,
      }) +
      button(bx + hb + 10, fy + 12, 'Thanh toán', {
        variant: 'outline',
        w: hb,
        h: 40,
        icon: 'receipt',
        size: 14,
      })
    s += rect(bx, fy + 64, bw, 54, { r: 14, fill: P })
    s +=
      circle(bx + 30, fy + 91, 15, { fill: '#fff', fo: 0.22 }) +
      text(bx + 30, fy + 96.5, '3', { size: 15, weight: 700, fill: '#fff', anchor: 'middle' })
    s +=
      text(bx + 56, fy + 97, 'Xem giỏ món', { size: 16, weight: 600, fill: '#fff' }) +
      text(bx + bw - 18, fy + 97, vnd(215000), {
        size: 17,
        weight: 700,
        fill: '#fff',
        anchor: 'end',
      })
    return s
  }
  return phoneScene(screen, [
    { x: 236, y: 250, icon: 'qr', title: 'Quét mã QR tại bàn', sub: 'Không cần cài ứng dụng' },
    {
      x: 1064,
      y: 610,
      icon: 'bell',
      title: 'Bàn 12 vừa gọi món',
      sub: 'Quán nhận đơn ngay lập tức',
      tone: 'success',
    },
  ])
}
SCREENS['menu-qr-goi-mon/2.webp'] = () => {
  const screen = (x, y, w, h) => {
    let s = phoneHeader(x, y, w, 'Giỏ món', 'Bàn 12 · Tầng trệt', { back: true })
    const bx = x + 16
    const bw = w - 32
    s += rect(bx, y + 78, bw, 56, { r: 14, fill: tint(P, 0.92) })
    ;['Bạn', 'Lê Minh', 'Thu Hà'].forEach(
      (n, i) => (s += avatar(bx + 26 + i * 22, y + 106, 15, n, { ring: true }))
    )
    s +=
      text(bx + 100, y + 101, '3 điện thoại cùng gọi món', {
        size: 14.5,
        weight: 600,
        fill: shade(P, 0.3),
      }) +
      text(bx + 100, y + 120, 'Gom chung một giỏ cho Bàn 12', { size: 13, fill: shade(P, 0.15) })
    const items = [
      {
        name: 'Cơm gà xối mỡ',
        by: 'Bạn thêm',
        price: 65000,
        qty: 1,
        pal: 'mango',
        icon: 'utensils',
      },
      {
        name: 'Bún bò Huế đặc biệt',
        by: 'Lê Minh thêm · Không hành',
        price: 75000,
        qty: 1,
        pal: 'soup',
        icon: 'soup',
      },
      {
        name: 'Trà tắc mật ong',
        by: 'Thu Hà thêm · Ít đá',
        price: 25000,
        qty: 3,
        pal: 'orange',
        icon: 'cupSoda',
      },
    ]
    items.forEach((it, i) => {
      const iy = y + 152 + i * 98
      s += photo(bx, iy, 72, 72, it.pal, it.icon, { r: 12 })
      s +=
        text(bx + 86, iy + 20, it.name, { size: 16, weight: 700, maxW: bw - 90 }) +
        text(bx + 86, iy + 42, it.by, { size: 13, fill: C.text3, maxW: bw - 90 })
      s +=
        text(bx + 86, iy + 70, vnd(it.price * it.qty), { size: 15.5, weight: 700, fill: PD() }) +
        stepper(bx + bw - 100, iy + 46, it.qty, { h: 32, w: 100 })
      s += line(bx, iy + 86, bx + bw, iy + 86, { stroke: C.line })
    })
    const ny = y + 152 + 3 * 98 + 6
    s +=
      text(bx, ny + 14, 'Ghi chú cho bếp', { size: 14, weight: 600, fill: C.body }) +
      textarea(bx, ny + 24, bw, 64, 'Mang cơm ra trước, bún bò ra sau giúp mình')
    s +=
      rect(bx, ny + 104, bw, 48, { r: 12, fill: C.soft, stroke: C.line }) +
      icon('receipt', bx + 14, ny + 118, 20, C.text2) +
      text(bx + 44, ny + 134, 'Món đã gọi trước (2)', { size: 14.5, weight: 600, fill: C.body }) +
      icon('chevronDown', bx + bw - 34, ny + 119, 18, C.text3)
    const fy = y + h - 170
    s += rect(x, fy, w, 170, { fill: '#fff' }) + line(x, fy, x + w, fy, { stroke: C.border })
    s +=
      text(bx, fy + 34, 'Tạm tính (5 món)', { size: 15, fill: C.text2 }) +
      text(bx + bw, fy + 36, vnd(215000), { size: 22, weight: 700, anchor: 'end' })
    s += text(bx, fy + 60, 'Thanh toán tại quầy hoặc khi nhân viên mang hóa đơn', {
      size: 12.5,
      fill: C.text3,
      maxW: bw,
    })
    s += button(bx, fy + 78, 'Gửi đơn cho quán', { w: bw, h: 54, icon: 'send', size: 16.5, r: 14 })
    return s
  }
  return phoneScene(screen, [
    {
      x: 236,
      y: 300,
      icon: 'users',
      title: '3 điện thoại, 1 phiên',
      sub: 'Cả bàn gom chung một giỏ',
    },
    {
      x: 1064,
      y: 560,
      icon: 'checkCircle',
      title: 'Đã gửi đơn · 12:31',
      sub: 'Quán đang chuẩn bị món',
      tone: 'success',
    },
  ])
}
function orderCard(o) {
  return (x, y, w) => {
    const itemsH = o.items.length * 26
    const h = 66 + itemsH + (o.note ? 34 : 0) + 64
    let s = rect(x, y, w, h, {
      r: 14,
      fill: '#fff',
      stroke: o.highlight ? P : C.border,
      sw: o.highlight ? 1.6 : 1,
      sh: 'sh',
    })
    s +=
      text(x + 16, y + 30, o.table, { size: 18, weight: 700 }) +
      text(x + w - 16, y + 30, o.time, {
        size: 13.5,
        fill: o.late ? '#B42318' : C.text3,
        weight: o.late ? 600 : 400,
        anchor: 'end',
      })
    s += text(x + 16, y + 52, o.meta, { size: 13, fill: C.text3, maxW: w - 32 })
    let iy = y + 66
    for (const [q, n] of o.items) {
      s +=
        text(x + 16, iy + 18, `${q}×`, {
          size: 14.5,
          weight: 700,
          fill: o.muted ? C.text3 : PD(),
        }) +
        text(x + 46, iy + 18, n, { size: 14.5, fill: o.muted ? C.text3 : C.body, maxW: w - 62 })
      iy += 26
    }
    if (o.note) {
      s +=
        rect(x + 12, iy + 4, w - 24, 26, { r: 7, fill: TONES.warning.bg }) +
        text(x + 22, iy + 22, o.note, {
          size: 13,
          weight: 600,
          fill: TONES.warning.fg,
          maxW: w - 44,
        })
      iy += 34
    }
    s += line(x + 12, y + h - 56, x + w - 12, y + h - 56, { stroke: C.line })
    if (o.actions) {
      s += text(x + 16, y + h - 22, o.total, { size: 16, weight: 700 })
      s += button(x + w - 12, y + h - 46, o.actions, {
        anchor: 'end',
        h: 36,
        size: 14,
        padX: 14,
        variant: o.actionVariant ?? 'primary',
      })
    } else
      s +=
        text(x + 16, y + h - 22, o.total, {
          size: 15,
          weight: 600,
          fill: o.muted ? C.text3 : C.body,
        }) +
        (o.foot
          ? text(x + w - 16, y + h - 22, o.foot, { size: 13, fill: C.text3, anchor: 'end' })
          : '')
    return { s, h }
  }
}
function requestCard(o) {
  return (x, y, w) => {
    const h = 112
    const t = tone(o.tone)
    let s = rect(x, y, w, h, { r: 14, fill: '#fff', stroke: t.dot, sw: 1.4, sh: 'sh' })
    s +=
      rect(x + 14, y + 16, 40, 40, { r: 12, fill: t.bg }) + icon(o.icon, x + 24, y + 26, 20, t.fg)
    s +=
      text(x + 66, y + 33, o.table, { size: 16.5, weight: 700 }) +
      text(x + w - 14, y + 33, o.time, { size: 13, fill: C.text3, anchor: 'end' })
    s += text(x + 66, y + 53, o.what, { size: 14, weight: 600, fill: t.fg, maxW: w - 80 })
    s +=
      text(x + 14, y + 93, o.note, { size: 13.5, fill: C.text2, maxW: w - 120 }) +
      button(x + w - 12, y + 72, 'Đã xử lý', {
        anchor: 'end',
        variant: 'outline',
        h: 32,
        size: 13.5,
        padX: 12,
      })
    return { s, h }
  }
}
SCREENS['menu-qr-goi-mon/3.webp'] = (ctx) => {
  const cols = [
    {
      title: 'Yêu cầu từ bàn',
      color: TONES.warning.dot,
      cards: [
        requestCard({
          table: 'Bàn 07',
          time: '1 phút',
          what: 'Gọi nhân viên',
          note: 'Xin thêm chén, đũa',
          icon: 'bell',
          tone: 'warning',
        }),
        requestCard({
          table: 'Bàn 03',
          time: '3 phút',
          what: 'Yêu cầu thanh toán',
          note: 'Tạm tính 486.000 ₫',
          icon: 'receipt',
          tone: 'info',
        }),
      ],
    },
    {
      title: 'Đơn mới',
      color: P,
      cards: [
        orderCard({
          table: 'Bàn 12',
          time: 'Vừa xong',
          meta: '3 điện thoại · gửi lúc 12:31',
          items: [
            [1, 'Cơm gà xối mỡ'],
            [1, 'Bún bò Huế đặc biệt'],
            [3, 'Trà tắc mật ong'],
          ],
          note: 'Mang cơm ra trước',
          total: vnd(215000),
          actions: 'Xác nhận',
          highlight: true,
        }),
        orderCard({
          table: 'Bàn 05',
          time: '2 phút',
          meta: '1 điện thoại · gửi lúc 12:29',
          items: [
            [1, 'Lẩu cá kèo lá giang'],
            [4, 'Bia lon'],
          ],
          total: vnd(347000),
          actions: 'Xác nhận',
        }),
        orderCard({
          table: 'Bàn 09',
          time: '4 phút',
          meta: '2 điện thoại · gửi lúc 12:27',
          items: [
            [2, 'Mì xào hải sản'],
            [2, 'Nước sâm'],
          ],
          total: vnd(210000),
          actions: 'Xác nhận',
        }),
      ],
    },
    {
      title: 'Đang chuẩn bị',
      color: TONES.info.dot,
      cards: [
        orderCard({
          table: 'Bàn 02',
          time: '14 phút',
          late: true,
          meta: 'Xác nhận 12:17 · Thảo Vy',
          items: [
            [1, 'Gà nướng muối ớt'],
            [2, 'Cơm chiên dương châu'],
            [2, 'Trà đá'],
          ],
          note: 'Gà chặt nhỏ',
          total: '2/3 món đã ra',
          actions: 'Đã phục vụ',
          actionVariant: 'outline',
        }),
        orderCard({
          table: 'Bàn 14',
          time: '8 phút',
          meta: 'Xác nhận 12:23 · Thảo Vy',
          items: [
            [1, 'Lẩu thái hải sản'],
            [1, 'Rau muống xào tỏi'],
          ],
          total: '0/2 món đã ra',
          actions: 'Đã phục vụ',
          actionVariant: 'outline',
        }),
      ],
    },
    {
      title: 'Đã phục vụ',
      color: TONES.success.dot,
      cards: [
        orderCard({
          table: 'Bàn 06',
          time: '12:20',
          meta: 'Phục vụ bởi Quốc Bảo',
          items: [
            [2, 'Bún bò Huế đặc biệt'],
            [2, 'Trà tắc mật ong'],
          ],
          total: vnd(200000),
          muted: true,
          foot: 'Đủ món',
        }),
        orderCard({
          table: 'Bàn 11',
          time: '12:12',
          meta: 'Phục vụ bởi Thảo Vy',
          items: [
            [1, 'Cơm gà xối mỡ'],
            [1, 'Nước sâm'],
          ],
          total: vnd(85000),
          muted: true,
          foot: 'Đủ món',
        }),
        orderCard({
          table: 'Bàn 01',
          time: '12:05',
          meta: 'Phục vụ bởi Quốc Bảo',
          items: [[3, 'Mì xào hải sản']],
          total: vnd(255000),
          muted: true,
          foot: 'Đủ món',
        }),
      ],
    },
  ]
  const counts = [2, 3, 4, 6]
  const cw = (CW - 3 * 16) / 4
  let s = ''
  cols.forEach(
    (c, i) =>
      (s += kanbanCol(
        CX + i * (cw + 16),
        BODY_Y,
        cw,
        BODY_B - BODY_Y,
        { title: c.title, color: c.color, count: counts[i] },
        c.cards
      ))
  )
  return appShell(
    ctx,
    {
      active: 'Nhận đơn',
      title: 'Nhận đơn',
      badge: ['Trực tiếp', 'success'],
      subtitle: 'Đơn từ khách quét mã QR tại bàn, cập nhật theo thời gian thực',
      actions: [
        { label: 'Báo hết món', variant: 'outline', icon: 'alert' },
        { label: 'Âm báo: Bật', variant: 'outline', icon: 'bell' },
      ],
    },
    s
  )
}
SCREENS['menu-qr-goi-mon/4.webp'] = (ctx) => {
  let s = card(CX, BODY_Y, CW, 96)
  s += text(CX + 24, BODY_Y + 54, 'Mẫu in', { size: 16, weight: 700 })
  const tpls = [
    ['Mẫu 1', 'Tối giản'],
    ['Mẫu 2', 'Có logo quán'],
    ['Mẫu 3', 'Kẹp bàn A6'],
  ]
  tpls.forEach(([a, b], i) => {
    const tx = CX + 110 + i * 232
    const on = i === 1
    s += rect(tx, BODY_Y + 16, 216, 64, {
      r: 12,
      fill: on ? tint(P, 0.93) : '#fff',
      stroke: on ? P : '#D0D5DD',
      sw: on ? 1.8 : 1,
    })
    s +=
      rect(tx + 12, BODY_Y + 26, 34, 44, { r: 6, fill: '#fff', stroke: C.border }) +
      rect(tx + 12, BODY_Y + 26, 34, i === 1 ? 10 : 0, { r: 3, fill: P }) +
      qr(tx + 18, BODY_Y + 40, 22, 7 + i, { bg: false })
    s +=
      text(tx + 58, BODY_Y + 44, a, { size: 15, weight: 700, fill: on ? PD() : C.text }) +
      text(tx + 58, BODY_Y + 64, b, { size: 13.5, fill: C.text2 })
    if (on)
      s +=
        circle(tx + 196, BODY_Y + 32, 9, { fill: P }) +
        icon('check', tx + 190, BODY_Y + 26, 12, '#fff', { sw: 3.4 })
  })
  s += input(CX + CW - 24 - 230 - 190, BODY_Y + 26, 210, {
    value: 'Khu: Tầng trệt',
    select: true,
    h: 44,
  })
  s +=
    checkbox(CX + CW - 24 - 200, BODY_Y + 39, true) +
    text(CX + CW - 24 - 172, BODY_Y + 54, 'Chọn tất cả (10)', {
      size: 15,
      weight: 600,
      fill: C.body,
    })
  const gy = BODY_Y + 116
  const cw = (CW - 4 * 20) / 5
  const ch = (BODY_B - gy - 20) / 2
  for (let i = 0; i < 10; i++) {
    const x = CX + (i % 5) * (cw + 20)
    const y = gy + Math.floor(i / 5) * (ch + 20)
    s += card(x, y, cw, ch, { r: 16 })
    const hid = clip(x, y, cw, 50, 16, 0)
    s += clipped(hid, rect(x, y, cw, 50, { fill: P }))
    s +=
      rect(x + 14, y + 13, 24, 24, { r: 7, fill: '#fff', fo: 0.22 }) +
      icon('utensils', x + 18, y + 17, 16, '#fff')
    s += text(x + 46, y + 31, 'Quán Bếp Nhà', { size: 14.5, weight: 700, fill: '#fff' })
    s +=
      rect(x + cw - 38, y + 13, 24, 24, { r: 6, fill: '#fff' }) +
      icon('check', x + cw - 33, y + 18, 14, P, { sw: 3.4 })
    const qs = Math.min(cw - 70, ch - 160)
    s += qr(x + (cw - qs) / 2, y + 70, qs, 300 + i)
    const label = `BÀN ${String(i + 1).padStart(2, '0')}`
    s += text(x + cw / 2, y + 70 + qs + 44, label, {
      size: 24,
      weight: 700,
      anchor: 'middle',
      ls: 1,
    })
    s += text(x + cw / 2, y + 70 + qs + 68, 'Quét để xem menu, gọi món', {
      size: 13,
      fill: C.text2,
      anchor: 'middle',
      maxW: cw - 20,
    })
    if (i === 3)
      s +=
        rect(x + 10, y + 70 + qs + 52, cw - 20, 24, { fill: '#fff' }) +
        badge(
          x + cw / 2 - badgeW('Mã mới · đổi ngày 12/10', { size: 12.5, padX: 9 }) / 2,
          y + 70 + qs + 52,
          'Mã mới · đổi ngày 12/10',
          'warning',
          { h: 24, size: 12.5, padX: 9 }
        )
  }
  return appShell(
    ctx,
    {
      active: 'Bàn và mã QR',
      user: ctx.manager,
      title: 'Bàn và mã QR',
      subtitle: '20 bàn · mỗi bàn một mã riêng, đổi mã ngay khi bị lộ',
      actions: [
        { label: 'Đổi mã đã chọn', variant: 'outline', icon: 'rotateCw' },
        { label: 'In 10 mã QR', icon: 'printer' },
      ],
    },
    s
  )
}

// ============================================================ 05 · Website Bán hàng
function storeHeader(o = {}) {
  let s = ''
  let y = SITE_Y
  if (o.promo !== false) {
    s +=
      rect(0, y, W, 36, { fill: shade(P, 0.45) }) +
      text(
        W / 2,
        y + 23,
        'Giao nhanh 2 giờ nội thành  ·  Đổi trả trong 7 ngày  ·  Hotline 0909 868 686',
        { size: 13.5, fill: '#fff', anchor: 'middle' }
      )
    y += 36
  }
  s += rect(0, y, W, 76, { fill: '#fff' }) + line(0, y + 75.5, W, y + 75.5)
  s +=
    rect(80, y + 18, 40, 40, { r: 12, fill: P }) +
    icon('bag', 89, y + 27, 22, '#fff', { sw: 2.2 }) +
    text(132, y + 46, 'Mây Store', { size: 23, weight: 700 })
  if (o.steps) {
    let sx = 560
    o.steps.forEach((st, i) => {
      const on = i <= o.step
      s +=
        circle(sx + 14, y + 38, 14, {
          fill: on ? P : '#fff',
          stroke: on ? P : '#D0D5DD',
          sw: 1.5,
        }) +
        text(sx + 14, y + 43, i < o.step ? '✓' : String(i + 1), {
          size: 14,
          weight: 700,
          fill: on ? '#fff' : C.text3,
          anchor: 'middle',
        })
      s += text(sx + 36, y + 43, st, {
        size: 15,
        weight: 600,
        fill: i === o.step ? C.text : on ? C.text2 : C.text3,
      })
      sx += 36 + tw(st, 15, 600) + 20
      if (i < o.steps.length - 1) {
        s += line(sx, y + 38, sx + 60, y + 38, { stroke: i < o.step ? P : C.border, sw: 2 })
        sx += 80
      }
    })
    s +=
      icon('phone', 1290, y + 28, 20, C.text2) +
      text(1318, y + 44, 'Cần hỗ trợ? 0909 868 686', { size: 15, weight: 600, fill: C.body })
    return { s, y: y + 76 }
  }
  const nav = ['Nữ', 'Nam', 'Phụ kiện', 'Bộ sưu tập', 'Sale']
  let nx = 330
  nav.forEach((n, i) => {
    s += text(nx, y + 44, n, {
      size: 16,
      weight: 600,
      fill: i === 4 ? '#D92D20' : i === (o.nav ?? -1) ? PD() : C.body,
    })
    if (i === (o.nav ?? -1)) s += rect(nx, y + 70, tw(n, 16, 600), 3, { r: 1.5, fill: P })
    nx += tw(n, 16, 600) + 38
  })
  s += searchBox(980, y + 16, 330, 44, 'Tìm áo, váy, túi xách…', { fill: C.soft })
  s +=
    icon('user', 1350, y + 26, 24, C.body) +
    icon('heart', 1404, y + 26, 24, C.body) +
    icon('bag', 1458, y + 25, 24, C.body)
  s +=
    circle(1484, y + 26, 10, { fill: P, stroke: '#fff', sw: 2 }) +
    text(1484, y + 30.5, '3', { size: 12, weight: 700, fill: '#fff', anchor: 'middle' })
  return { s, y: y + 76 }
}
const swatchRow = (x, y, cols, r = 8, sel = 0) =>
  cols
    .map(
      (c, i) =>
        (i === sel
          ? circle(x + i * (2 * r + 10) + r, y, r + 3.5, { stroke: C.text, sw: 1.4 })
          : '') +
        circle(x + i * (2 * r + 10) + r, y, r, { fill: c, stroke: 'rgba(16,24,40,0.15)', sw: 1 })
    )
    .join('')
function productCard(x, y, w, ih, p) {
  let s = photo(x, y, w, ih, p.pal, p.icon, { r: 14, iconScale: 0.36, sw: 1.3 })
  if (p.badge) s += badge(x + 14, y + 14, p.badge[0], p.badge[1], { solid: true, h: 26 })
  s +=
    circle(x + w - 30, y + 30, 18, { fill: '#fff', sh: 'sh' }) +
    icon('heart', x + w - 40, y + 20, 20, p.liked ? '#D92D20' : C.text2, {
      fill: p.liked ? '#D92D20' : 'none',
    })
  s += text(x, y + ih + 30, p.name, { size: 16, weight: 600, maxW: w })
  s += text(x, y + ih + 58, vnd(p.price), {
    size: 17,
    weight: 700,
    fill: p.old ? '#D92D20' : C.text,
  })
  if (p.old)
    s += text(x + tw(vnd(p.price), 17, 700) + 10, y + ih + 58, vnd(p.old), {
      size: 14,
      fill: C.text3,
      deco: 'line-through',
    })
  s += swatchRow(x + 2, y + ih + 84, p.colors, 8, -1)
  return s
}
SCREENS['website-ban-hang/1.webp'] = () => {
  const hd = storeHeader({ nav: 0 })
  let s = hd.s
  const hy = hd.y + 24
  const hh = 330
  s += rect(80, hy, 1440, hh, {
    r: 24,
    fill: grad(
      [
        [0, '#F6EFE6'],
        [1, '#EADBC8'],
      ],
      { x1: 0, y1: 0, x2: 1, y2: 1 }
    ),
  })
  s += clipped(
    clip(80, hy, 1440, hh, 24),
    circle(1380, hy + 40, 180, { fill: '#fff', fo: 0.35 }) +
      circle(560, hy + hh + 60, 160, { fill: '#fff', fo: 0.25 })
  )
  s += text(136, hy + 78, 'BỘ SƯU TẬP THU ĐÔNG 2026', {
    size: 14,
    weight: 700,
    fill: PD(),
    ls: 1.6,
  })
  s +=
    text(136, hy + 136, 'Mềm mại cho', { size: 48, weight: 700 }) +
    text(136, hy + 194, 'ngày se lạnh', { size: 48, weight: 700 })
  s += text(136, hy + 236, 'Len, dạ và cotton cao cấp, giảm đến 30% trong tuần này', {
    size: 18,
    fill: C.text2,
  })
  s +=
    button(136, hy + 262, 'Mua ngay', { h: 52, size: 16, padX: 26, icon: 'arrowRight' }) +
    button(
      136 + btnW('Mua ngay', { size: 16, padX: 26, icon: 'arrowRight' }) + 14,
      hy + 262,
      'Xem bộ sưu tập',
      { variant: 'outline', h: 52, size: 16, padX: 22 }
    )
  s += photo(900, hy + 30, 250, hh - 60, 'caramel', 'shirt', { r: 20, iconScale: 0.4, sw: 1.2 })
  s += photo(1170, hy + 30, 310, (hh - 80) / 2, 'sage', 'bag', { r: 20, iconScale: 0.5, sw: 1.2 })
  s += photo(1170, hy + 50 + (hh - 80) / 2, 310, (hh - 80) / 2, 'blush', 'gem', {
    r: 20,
    iconScale: 0.5,
    sw: 1.2,
  })
  s +=
    rect(840, hy + hh - 96, 250, 64, { r: 14, fill: '#fff', sh: 'sh2' }) +
    text(858, hy + hh - 70, 'Áo khoác dạ dáng dài', { size: 14.5, weight: 600 }) +
    text(858, hy + hh - 47, vnd(1290000), { size: 15, weight: 700, fill: PD() })
  ;[0, 1, 2].forEach(
    (i) =>
      (s += rect(760 + i * 22, hy + hh - 22, i === 0 ? 28 : 10, 6, {
        r: 3,
        fill: i === 0 ? P : '#D0D5DD',
      }))
  )
  const sy = hy + hh + 52
  s += text(80, sy, 'Sản phẩm mới', { size: 26, weight: 700 })
  s += chips(330, sy - 28, ['Tất cả', 'Áo', 'Váy đầm', 'Quần', 'Túi xách'], {
    active: 'Tất cả',
    h: 38,
  })
  s += text(1520, sy - 4, 'Xem tất cả', { size: 15, weight: 600, fill: PD(), anchor: 'end' })
  const pw = (1440 - 4 * 24) / 5
  const prods = [
    {
      name: 'Áo len cổ lọ dệt kim',
      price: 459000,
      pal: 'cream',
      icon: 'shirt',
      colors: ['#E8DCC8', '#8A5A36', '#6B7280'],
    },
    {
      name: 'Đầm suông linen tay lỡ',
      price: 589000,
      old: 739000,
      pal: 'sage',
      icon: 'shirt',
      colors: ['#B7C4A8', '#F2EDE4'],
      badge: ['−20%', 'danger'],
    },
    {
      name: 'Áo khoác dạ dáng dài',
      price: 1290000,
      pal: 'caramel',
      icon: 'shirt',
      colors: ['#8A5A36', '#1F2937', '#9CA3AF', '#E8DCC8'],
      badge: ['Mới', 'primary'],
      liked: true,
    },
    {
      name: 'Quần ống rộng tuyết mưa',
      price: 429000,
      pal: 'navy',
      icon: 'shirt',
      colors: ['#2F3E5C', '#1F2937', '#D6C3A5'],
    },
    {
      name: 'Túi tote da mềm',
      price: 690000,
      pal: 'ink',
      icon: 'bag',
      colors: ['#1F2937', '#8A5A36'],
      badge: ['Bán chạy', 'warning'],
    },
  ]
  prods.forEach((p, i) => (s += productCard(80 + i * (pw + 24), sy + 26, pw, 300, p)))
  return browser('maystore.vn', s)
}
SCREENS['website-ban-hang/2.webp'] = () => {
  const hd = storeHeader({ nav: 0 })
  let s = hd.s
  const by = hd.y + 36
  s +=
    text(80, by, 'Trang chủ  /  Nữ  /  Áo khoác  /  ', { size: 14, fill: C.text3 }) +
    text(80 + tw('Trang chủ  /  Nữ  /  Áo khoác  /  ', 14), by, 'Áo khoác dạ dáng dài cổ vest', {
      size: 14,
      weight: 600,
      fill: C.body,
    })
  const gy = by + 24
  const pals = ['caramel', 'ink', 'grey', 'sand']
  pals.forEach((p, i) => {
    s += photo(80, gy + i * 134, 96, 120, p, 'shirt', { r: 12, iconScale: 0.45 })
    if (i === 0) s += rect(80, gy, 96, 120, { r: 12, stroke: P, sw: 2.5 })
  })
  const mh = H - 40 - gy
  s += photo(196, gy, 560, mh, 'caramel', 'shirt', { r: 20, iconScale: 0.34, sw: 1 })
  s +=
    circle(196 + 560 - 34, gy + 34, 20, { fill: '#fff', sh: 'sh' }) +
    icon('maximize', 196 + 560 - 44, gy + 24, 20, C.body)
  s +=
    rect(196 + 560 / 2 - 34, gy + mh - 34, 68, 22, { r: 11, fill: '#101828', fo: 0.55 }) +
    text(196 + 560 / 2, gy + mh - 18.5, '1 / 6', {
      size: 13,
      weight: 600,
      fill: '#fff',
      anchor: 'middle',
    })
  const rx = 810
  const rw = 1520 - rx
  let y = gy + 6
  s +=
    badge(rx, y, 'Mới', 'primary', { h: 26 }) +
    text(rx + 64, y + 18, 'Mã SP: AK-2611', { size: 14, fill: C.text3 })
  y += 68
  s += text(rx, y, 'Áo khoác dạ dáng dài cổ vest', { size: 32, weight: 700 })
  y += 34
  for (let i = 0; i < 5; i++)
    s += icon('star', rx + i * 22, y - 15, 18, '#F79009', { fill: '#F79009', sw: 1 })
  s += text(rx + 120, y, '4,8  ·  126 đánh giá  ·  Đã bán 540', { size: 15, fill: C.text2 })
  y += 58
  s +=
    text(rx, y, vnd(1290000), { size: 32, weight: 700, fill: PD() }) +
    text(rx + tw(vnd(1290000), 32, 700) + 16, y - 2, vnd(1590000), {
      size: 18,
      fill: C.text3,
      deco: 'line-through',
    })
  s += badge(
    rx + tw(vnd(1290000), 32, 700) + 16 + tw(vnd(1590000), 18) + 14,
    y - 22,
    '−19%',
    'danger',
    { h: 26 }
  )
  y += 30
  s += line(rx, y, 1520, y)
  y += 40
  s +=
    text(rx, y, 'Màu sắc:', { size: 16, fill: C.text2 }) +
    text(rx + 78, y, 'Nâu caramel', { size: 16, weight: 700 })
  y += 36
  s += swatchRow(rx + 4, y, ['#8A5A36', '#1F2937', '#9CA3AF', '#E8DCC8'], 18, 0)
  y += 60
  s +=
    text(rx, y, 'Kích cỡ:', { size: 16, fill: C.text2 }) +
    text(rx + 70, y, 'M', { size: 16, weight: 700 }) +
    text(1520, y, 'Hướng dẫn chọn size', { size: 15, weight: 600, fill: PD(), anchor: 'end' })
  y += 18
  ;['S', 'M', 'L', 'XL'].forEach((z, i) => {
    const zx = rx + i * 86
    const on = z === 'M'
    const dis = z === 'XL'
    s += rect(zx, y, 74, 50, {
      r: 12,
      fill: on ? tint(P, 0.92) : dis ? C.soft : '#fff',
      stroke: on ? P : '#D0D5DD',
      sw: on ? 2 : 1,
    })
    s += text(zx + 37, y + 31, z, {
      size: 16,
      weight: 700,
      fill: on ? PD() : dis ? C.text3 : C.text,
      anchor: 'middle',
    })
    if (dis) s += line(zx + 8, y + 42, zx + 66, y + 8, { stroke: '#D0D5DD', sw: 1.4 })
  })
  y += 84
  s +=
    icon('checkCircle', rx, y - 16, 20, TONES.success.dot) +
    text(rx + 28, y, 'Còn 8 sản phẩm màu Nâu caramel, size M', {
      size: 15,
      weight: 600,
      fill: TONES.success.fg,
    })
  y += 28
  s +=
    stepper(rx, y, 1, { h: 56, w: 140 }) +
    button(rx + 156, y, 'Thêm vào giỏ', { h: 56, w: rw - 156 - 72, icon: 'cart', size: 17 }) +
    iconBtn(1520 - 56, y, 'heart', { size: 56, r: 12 })
  y += 72
  s += button(rx, y, 'Mua ngay', { variant: 'dark', h: 56, w: rw, size: 17 })
  y += 80
  const info = [
    ['truck', 'Phí giao hàng theo khu vực, từ 20.000 ₫ · nội thành giao trong 2 giờ'],
    ['undo', 'Đổi trả miễn phí trong 7 ngày nếu còn tem mác'],
    ['shield', 'Thanh toán khi nhận hàng (COD) hoặc chuyển khoản'],
  ]
  s += rect(rx, y, rw, 150, { r: 16, fill: C.soft, stroke: C.line })
  info.forEach(
    ([ic, t], i) =>
      (s +=
        icon(ic, rx + 20, y + 24 + i * 40, 22, PD()) +
        text(rx + 56, y + 41 + i * 40, t, { size: 15, fill: C.body, maxW: rw - 80 }))
  )
  return browser('maystore.vn/ao-khoac-da-dang-dai-co-vest', s)
}
SCREENS['website-ban-hang/3.webp'] = () => {
  const hd = storeHeader({
    promo: false,
    steps: ['Giỏ hàng', 'Thông tin giao hàng', 'Hoàn tất'],
    step: 1,
  })
  let s = rect(0, hd.y, W, H - hd.y, { fill: C.bg }) + hd.s
  const y0 = hd.y + 54
  s += text(80, y0, 'Thông tin đặt hàng', { size: 28, weight: 700 })
  const ly = y0 + 26
  const lw = 860
  s += card(80, ly, lw, 420, { title: 'Thông tin nhận hàng' })
  const fw = (lw - 48 - 24) / 2
  s += field(104, ly + 62, fw, 'Họ và tên', { value: 'Nguyễn Thị Thu Trang', req: true })
  s += field(104 + fw + 24, ly + 62, fw, 'Số điện thoại', { value: '0908 123 456', req: true })
  s += field(104, ly + 146, fw, 'Tỉnh/Thành phố', {
    value: 'TP. Hồ Chí Minh',
    select: true,
    req: true,
  })
  s += field(104 + fw + 24, ly + 146, fw, 'Phường/Xã', {
    value: 'Phường Xuân Hòa',
    select: true,
    req: true,
  })
  s += field(104, ly + 230, lw - 48, 'Địa chỉ cụ thể', { value: '12 Trần Quốc Thảo', req: true })
  s += field(104, ly + 314, lw - 48, 'Ghi chú cho shop', {
    value: 'Giao giờ hành chính, gọi trước khi giao giúp mình',
    focus: true,
    caret: true,
  })
  const py = ly + 444
  s += card(80, py, lw, 196, { title: 'Phương thức thanh toán' })
  const pw = (lw - 48 - 20) / 2
  const pay = [
    ['cash', 'Thanh toán khi nhận hàng', 'Trả tiền mặt cho nhân viên giao hàng', true],
    ['qr', 'Chuyển khoản ngân hàng', 'Hiện mã QR ngay sau khi đặt hàng', false],
  ]
  pay.forEach(([ic, a, b, on], i) => {
    const px = 104 + i * (pw + 20)
    s += rect(px, py + 64, pw, 100, {
      r: 14,
      fill: on ? tint(P, 0.94) : '#fff',
      stroke: on ? P : '#D0D5DD',
      sw: on ? 2 : 1,
    })
    s += radio(px + 30, py + 100, on, 10) + icon(ic, px + 54, py + 89, 22, on ? P : C.text2)
    s +=
      text(px + 86, py + 106, a, { size: 16, weight: 700, maxW: pw - 100 }) +
      text(px + 54, py + 140, b, { size: 14, fill: C.text2, maxW: pw - 70 })
  })
  s +=
    icon('arrowLeft', 80, py + 222, 18, PD()) +
    text(106, py + 237, 'Quay lại giỏ hàng', { size: 15, weight: 600, fill: PD() })
  const rx = 980
  const rw = 540
  const rh = H - 32 - ly
  s += card(rx, ly, rw, rh, { title: 'Đơn hàng (3 sản phẩm)', link: 'Sửa giỏ' })
  const its = [
    ['Áo khoác dạ dáng dài cổ vest', 'Nâu caramel / M', 1, 1290000, 'caramel', 'shirt'],
    ['Áo len cổ lọ dệt kim', 'Kem / S', 2, 459000, 'cream', 'shirt'],
    ['Túi tote da mềm', 'Đen', 1, 690000, 'ink', 'bag'],
  ]
  its.forEach(([n, v, q, p, pal, ic], i) => {
    const iy = ly + 66 + i * 96
    s += photo(rx + 24, iy, 64, 80, pal, ic, { r: 10 })
    s +=
      circle(rx + 84, iy + 4, 11, { fill: C.text2, stroke: '#fff', sw: 2 }) +
      text(rx + 84, iy + 8.5, String(q), { size: 12, weight: 700, fill: '#fff', anchor: 'middle' })
    s +=
      text(rx + 104, iy + 26, n, { size: 15.5, weight: 600, maxW: rw - 260 }) +
      text(rx + 104, iy + 50, v, { size: 14, fill: C.text2 })
    s += text(rx + rw - 24, iy + 26, vnd(q * p), { size: 15.5, weight: 600, anchor: 'end' })
  })
  let cy = ly + 66 + 3 * 96 + 8
  s += line(rx + 24, cy, rx + rw - 24, cy, { stroke: C.line })
  cy += 22
  s +=
    input(rx + 24, cy, rw - 48 - 112, { value: 'THUDONG10', icon: 'tag', weight: 600 }) +
    button(rx + rw - 24 - 100, cy, 'Áp dụng', { variant: 'soft', w: 100, h: 44 })
  s +=
    icon('checkCircle', rx + 24, cy + 56, 18, TONES.success.dot) +
    text(rx + 50, cy + 70, 'Đã áp dụng: giảm 10%, tối đa 200.000 ₫', {
      size: 14,
      weight: 600,
      fill: TONES.success.fg,
    })
  cy += 104
  const sumRows = [
    ['Tạm tính', vnd(2898000)],
    ['Mã giảm giá THUDONG10', vnd(-200000), 'success'],
    ['Phí giao hàng · TP. Hồ Chí Minh', vnd(30000)],
  ]
  sumRows.forEach(
    ([a, b, t], i) =>
      (s +=
        text(rx + 24, cy + i * 32, a, { size: 15, fill: C.text2 }) +
        text(rx + rw - 24, cy + i * 32, b, {
          size: 15.5,
          weight: 600,
          fill: t ? TONES[t].fg : C.body,
          anchor: 'end',
        }))
  )
  cy += 3 * 32 + 4
  s += line(rx + 24, cy, rx + rw - 24, cy, { stroke: C.border, dash: '5 5' })
  s +=
    text(rx + 24, cy + 36, 'Tổng cộng', { size: 18, weight: 700 }) +
    text(rx + rw - 24, cy + 38, vnd(2728000), { size: 28, weight: 700, fill: PD(), anchor: 'end' })
  s += button(rx + 24, ly + rh - 24 - 56 - 30, 'Đặt hàng', {
    w: rw - 48,
    h: 56,
    size: 17,
    icon: 'check',
  })
  s += text(rx + rw / 2, ly + rh - 22, 'Bạn sẽ nhận tin nhắn xác nhận đơn qua số điện thoại', {
    size: 13,
    fill: C.text3,
    anchor: 'middle',
  })
  return browser('maystore.vn/thanh-toan', s)
}
SCREENS['website-ban-hang/4.webp'] = (ctx) => {
  let s = card(CX, BODY_Y, CW, BODY_B - BODY_Y)
  s += tabs(
    CX + 24,
    BODY_Y + 12,
    [
      { label: 'Tất cả', count: 248 },
      { label: 'Chờ xác nhận', count: 12 },
      { label: 'Đang đóng gói', count: 8 },
      { label: 'Đang giao', count: 21 },
      { label: 'Hoàn thành', count: 196 },
      { label: 'Đã hủy', count: 11 },
    ],
    0,
    { w: CW - 48 }
  )
  const fy = BODY_Y + 76
  s += searchBox(CX + 24, fy, 340, 44, 'Mã đơn, tên khách, số điện thoại')
  s += input(CX + 380, fy, 220, { value: 'Thanh toán: Tất cả', select: true })
  s += input(CX + 616, fy, 280, { value: '01/10/2026 – 13/10/2026', icon: 'calendar' })
  s += button(CX + CW - 24, fy + 2, 'In phiếu giao (2)', {
    anchor: 'end',
    variant: 'outline',
    icon: 'printer',
  })
  const pay = {
    cod: ['COD', 'neutral'],
    ck: ['Đã chuyển khoản', 'success'],
    wait: ['Chờ chuyển khoản', 'warning'],
  }
  const st = {
    new: ['Chờ xác nhận', 'warning'],
    pack: ['Đang đóng gói', 'info'],
    ship: ['Đang giao', 'violet'],
    done: ['Hoàn thành', 'success'],
    cancel: ['Đã hủy', 'danger'],
  }
  const data = [
    [
      'DH261013-0248',
      'Nguyễn Thị Thu Trang',
      '0908 123 456',
      '13/10/2026',
      '09:24',
      4,
      2728000,
      'cod',
      'new',
      true,
    ],
    [
      'DH261013-0247',
      'Trần Minh Khoa',
      '0912 456 789',
      '13/10/2026',
      '08:51',
      1,
      459000,
      'ck',
      'new',
      true,
    ],
    [
      'DH261012-0246',
      'Lê Ngọc Hân',
      '0935 222 618',
      '12/10/2026',
      '21:16',
      2,
      1148000,
      'cod',
      'pack',
    ],
    [
      'DH261012-0245',
      'Phạm Gia Bảo',
      '0977 310 452',
      '12/10/2026',
      '19:02',
      1,
      1290000,
      'ck',
      'ship',
    ],
    [
      'DH261012-0244',
      'Võ Thị Mỹ Duyên',
      '0903 884 120',
      '12/10/2026',
      '15:40',
      4,
      1876000,
      'cod',
      'ship',
    ],
    [
      'DH261011-0243',
      'Đặng Quốc Huy',
      '0918 772 035',
      '11/10/2026',
      '20:33',
      2,
      919000,
      'ck',
      'done',
    ],
    [
      'DH261011-0242',
      'Bùi Thanh Thảo',
      '0988 145 367',
      '11/10/2026',
      '14:12',
      1,
      589000,
      'cod',
      'done',
    ],
    [
      'DH261010-0241',
      'Hoàng Anh Tuấn',
      '0909 556 781',
      '10/10/2026',
      '10:05',
      3,
      1637000,
      'cod',
      'cancel',
    ],
    [
      'DH261010-0240',
      'Ngô Phương Linh',
      '0937 610 229',
      '10/10/2026',
      '08:47',
      2,
      1149000,
      'wait',
      'new',
    ],
  ]
  const rows = data.map(([id, n, ph, d, t, q, tot, pm, stt, chk]) => ({
    bg: chk ? tint(P, 0.96) : undefined,
    cells: [
      { fn: (x, y, w, h) => checkbox(x + 18, y + h / 2 - 9, !!chk) },
      { t: id, weight: 600, fill: PD() },
      { t: n, sub: ph },
      { t: d, sub: t },
      { t: `${q} sản phẩm` },
      { t: vnd(tot), weight: 600, fill: C.text },
      { badge: pay[pm][0], tone: pay[pm][1] },
      { badge: st[stt][0], tone: st[stt][1], dot: true },
      {
        fn: (x, y, w, h) =>
          icon('printer', x + 10, y + h / 2 - 10, 20, C.text3) +
          icon('more', x + 40, y + h / 2 - 10, 20, C.text3),
      },
    ],
  }))
  s += table(
    CX,
    fy + 64,
    CW,
    [
      { label: '', w: 52, fnHead: (x, y, w, h) => checkbox(x + 18, y + h / 2 - 9, false) },
      { label: 'Mã đơn', w: 1.15 },
      { label: 'Khách hàng', w: 1.4 },
      { label: 'Ngày đặt', w: 0.95 },
      { label: 'Số lượng', w: 0.9 },
      { label: 'Tổng tiền', w: 1, align: 'right' },
      { label: 'Thanh toán', w: 1.25 },
      { label: 'Trạng thái', w: 1.2 },
      { label: '', w: 76 },
    ],
    rows,
    { rowH: 60, headTop: true }
  )
  s += pager(CX + 24, BODY_B - 56, CW - 48, 'Hiển thị 1–9 trong 248 đơn hàng', [
    '1',
    '2',
    '3',
    '…',
    '28',
  ])
  return appShell(
    ctx,
    {
      active: 'Đơn hàng',
      title: 'Đơn hàng',
      subtitle: 'Xác nhận đơn, in phiếu giao và theo dõi trạng thái giao hàng',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Tạo đơn', icon: 'plus' },
      ],
    },
    s
  )
}

// ============================================================ 07 · POS Cửa hàng Bán lẻ
function stepsBar(x, y, steps, step) {
  let s = ''
  let sx = x
  steps.forEach((st, i) => {
    const done = i < step
    const on = i <= step
    s += circle(sx + 14, y + 14, 14, { fill: on ? P : '#fff', stroke: on ? P : '#D0D5DD', sw: 1.5 })
    s += done
      ? icon('check', sx + 6, y + 6, 16, '#fff', { sw: 3 })
      : text(sx + 14, y + 19, String(i + 1), {
          size: 14,
          weight: 700,
          fill: on ? '#fff' : C.text3,
          anchor: 'middle',
        })
    s += text(sx + 36, y + 19, st, {
      size: 15,
      weight: 600,
      fill: i === step ? C.text : on ? C.text2 : C.text3,
    })
    sx += 36 + tw(st, 15, 600) + 16
    if (i < steps.length - 1) {
      s += line(sx, y + 14, sx + 44, y + 14, { stroke: done ? P : C.border, sw: 2 })
      sx += 60
    }
  })
  return s
}
const stepsW = (steps) =>
  sum(steps.map((st) => 36 + tw(st, 15, 600) + 16)) + (steps.length - 1) * 60 - 16
function unitCell(label) {
  return {
    fn: (x, y, w, h) =>
      rect(x + 12, y + h / 2 - 17, w - 24, 34, { r: 8, fill: C.soft, stroke: C.border }) +
      text(x + 24, y + h / 2 + 5, label, { size: 14, fill: C.body, maxW: w - 66 }) +
      icon('chevronDown', x + w - 38, y + h / 2 - 8, 16, C.text3),
  }
}
SCREENS['pos-cua-hang-ban-le/1.webp'] = (ctx) => {
  const x0 = RAIL + 24
  const y0 = TOP + 20
  const lw = 1056 - x0
  let s = ''
  const tabsL = [['Hóa đơn 1', true], ['Hóa đơn 2 · 3 món'], ['Hóa đơn 3 · 1 món']]
  let tx = x0
  for (const [t, on] of tabsL) {
    const w = tw(t, 15, 600) + 36
    s +=
      rect(tx, y0, w, 42, {
        r: 10,
        fill: on ? '#fff' : C.muted,
        stroke: on ? P : 'none',
        sw: 1.5,
        sh: on ? 'sh' : undefined,
      }) + text(tx + 18, y0 + 26.5, t, { size: 15, weight: 600, fill: on ? PD() : C.text2 })
    tx += w + 10
  }
  s += iconBtn(tx, y0 + 1, 'plus', { size: 40, color: P })
  s += text(x0 + lw, y0 + 27, 'Giữ tối đa 5 hóa đơn chờ', {
    size: 14,
    fill: C.text3,
    anchor: 'end',
  })
  s += input(x0, y0 + 58, lw, {
    h: 60,
    icon: 'scan',
    placeholder: 'Quét mã vạch hoặc nhập tên, mã hàng',
    focus: true,
    kbd: 'F3',
    size: 17,
  })
  const ty = y0 + 140
  const th = H - 24 - ty
  s += card(x0, ty, lw, th)
  const lines0 = [
    ['Nước suối tinh khiết 500ml', '8934588012112', 'Thùng 24 chai', 1, 105000],
    ['Mì tôm chua cay 75g', '8934563138165', 'Thùng 30 gói', 1, 118000],
    ['Sữa tươi tiệt trùng 180ml', '8935049501503', 'Lốc 4 hộp', 2, 34000],
    ['Dầu ăn thực vật 1L', '8934673102209', 'Chai', 1, 62000],
    ['Nước rửa chén hương chanh 750g', '8936036020373', 'Chai', 1, 31500],
    ['Bánh quy bơ hộp 400g', '8934822101118', 'Hộp', 2, 45000],
    ['Trứng gà sạch vỉ 10 quả', '8938505970012', 'Vỉ', 1, 38000],
  ]
  const rows = lines0.map(([n, bc, u, q, p], i) => ({
    bg: i === 6 ? tint(P, 0.94) : undefined,
    bar: i === 6 ? P : undefined,
    cells: [
      { t: String(i + 1), fill: C.text3 },
      { t: n, sub: bc },
      unitCell(u),
      { fn: (x, y, w, h) => stepper(x + 12, y + h / 2 - 17, q, { h: 34, w: w - 24 }) },
      { t: num(p) },
      { t: num(q * p), weight: 700, fill: C.text },
      { fn: (x, y, w, h) => icon('trash', x + w / 2 - 10, y + h / 2 - 10, 20, C.text3) },
    ],
  }))
  const tcid = clip(x0, ty, lw, th, 16)
  s += clipped(
    tcid,
    table(
      x0,
      ty,
      lw,
      [
        { label: 'STT', w: 56, align: 'center' },
        { label: 'Tên hàng', w: 2.6 },
        { label: 'Đơn vị tính', w: 170 },
        { label: 'Số lượng', w: 132 },
        { label: 'Đơn giá', w: 1, align: 'right' },
        { label: 'Thành tiền', w: 1.1, align: 'right' },
        { label: '', w: 52 },
      ],
      rows,
      { rowH: 70 }
    )
  )
  s += badge(
    x0 + 82 + tw('Trứng gà sạch vỉ 10 quả', 15, 600),
    ty + 46 + 6 * 70 + 16,
    'Vừa quét',
    'primary',
    { h: 22, size: 12, padX: 8 }
  )
  const ky = ty + th - 64
  s += line(x0, ky, x0 + lw, ky, { stroke: C.line })
  let kx = x0 + 20
  for (const [k, l] of [
    ['F2', 'Sửa số lượng'],
    ['F4', 'Khách hàng'],
    ['F6', 'Giảm giá'],
    ['F8', 'Lưu tạm'],
    ['Del', 'Xóa dòng'],
  ]) {
    const kw = tw(k, 12.5, 700) + 14
    s +=
      rect(kx, ky + 20, kw, 24, { r: 6, fill: '#fff', stroke: C.border }) +
      text(kx + kw / 2, ky + 36.5, k, {
        size: 12.5,
        weight: 700,
        fill: C.text2,
        anchor: 'middle',
      }) +
      text(kx + kw + 8, ky + 37, l, { size: 14, fill: C.text2 })
    kx += kw + 8 + tw(l, 14) + 26
  }
  // khung thanh toán
  const px = 1076
  const pw = W - px
  s += rect(px, TOP, pw, H - TOP, { fill: '#fff' }) + line(px + 0.5, TOP, px + 0.5, H)
  const ix = px + 28
  const iw = pw - 56
  s +=
    rect(ix, TOP + 24, iw, 52, { r: 12, fill: C.soft, stroke: C.line }) +
    icon('user', ix + 14, TOP + 40, 20, C.text2) +
    text(ix + 44, TOP + 56, 'Khách lẻ', { size: 15.5, weight: 600, fill: C.body }) +
    text(ix + iw - 14, TOP + 56, 'Thêm khách (F4)', {
      size: 14,
      weight: 600,
      fill: PD(),
      anchor: 'end',
    })
  let y = TOP + 120
  s +=
    text(ix, y, 'Tổng tiền hàng (9 món)', { size: 15.5, fill: C.text2 }) +
    text(ix + iw, y, vnd(512500), { size: 16, weight: 600, anchor: 'end' })
  s +=
    text(ix, y + 34, 'Giảm giá (F6)', { size: 15.5, fill: C.text2 }) +
    text(ix + iw, y + 34, vnd(0), { size: 16, weight: 600, anchor: 'end' })
  s += line(ix, y + 56, ix + iw, y + 56, { stroke: C.border, dash: '5 5' })
  s +=
    text(ix, y + 100, 'Khách cần trả', { size: 18, weight: 700 }) +
    text(ix + iw, y + 104, vnd(512500), { size: 34, weight: 700, fill: PD(), anchor: 'end' })
  y += 136
  s += field(ix, y, iw, 'Khách đưa', {
    value: '600.000',
    suffix: '₫',
    h: 60,
    size: 24,
    weight: 700,
    focus: true,
  })
  y += 104
  const quick = ['Đủ tiền', '520.000', '550.000', '600.000', '700.000', '1.000.000']
  const qw = (iw - 20) / 3
  quick.forEach((q, i) => {
    const qx = ix + (i % 3) * (qw + 10)
    const qy = y + Math.floor(i / 3) * 56
    const on = q === '600.000'
    s +=
      rect(qx, qy, qw, 46, {
        r: 10,
        fill: on ? tint(P, 0.92) : '#fff',
        stroke: on ? P : '#D0D5DD',
        sw: on ? 1.6 : 1,
      }) +
      text(qx + qw / 2, qy + 29, q, {
        size: 16,
        weight: 700,
        fill: on ? PD() : C.text,
        anchor: 'middle',
      })
  })
  y += 128
  s +=
    rect(ix, y, iw, 76, { r: 14, fill: TONES.success.bg }) +
    text(ix + 20, y + 45, 'Tiền thối lại', { size: 16, weight: 600, fill: TONES.success.fg }) +
    text(ix + iw - 20, y + 48, vnd(87500), {
      size: 28,
      weight: 700,
      fill: TONES.success.fg,
      anchor: 'end',
    })
  y += 100
  s += text(ix, y, 'Hình thức', { size: 14, weight: 600, fill: C.body })
  s += segmented(ix, y + 12, ['Tiền mặt', 'Chuyển khoản', 'Thẻ'], 0, { h: 44, padX: 26 })
  s +=
    checkbox(ix, y + 82, true) +
    text(ix + 28, y + 96, 'In hóa đơn sau khi thanh toán', { size: 15, fill: C.body })
  const ry = H - 24 - 64 - 24 - 64
  s +=
    rect(ix, ry, iw, 64, { r: 12, fill: C.soft, stroke: C.line }) +
    icon('receipt', ix + 16, ry + 21, 22, C.text2)
  s +=
    text(ix + 52, ry + 28, 'Hóa đơn vừa thanh toán', { size: 14.5, weight: 600, fill: C.body }) +
    text(ix + 52, ry + 49, 'HD-261013-1042 · 186.000 ₫ · 17:21', { size: 13.5, fill: C.text3 })
  s += text(ix + iw - 16, ry + 39, 'In lại', { size: 14.5, weight: 600, fill: PD(), anchor: 'end' })
  s +=
    button(ix, H - 24 - 64, 'Lưu tạm (F8)', { variant: 'outline', h: 64, w: 160, size: 16 }) +
    button(ix + 172, H - 24 - 64, 'Thanh toán (F9)', {
      h: 64,
      w: iw - 172,
      size: 18,
      icon: 'wallet',
    })
  return posShell(
    ctx,
    { active: 'Bán hàng', shift: 'Ca chiều · 14:00 – 22:00', clock: '17:26 · Thứ Ba, 13/10/2026' },
    s
  )
}
SCREENS['pos-cua-hang-ban-le/2.webp'] = (ctx) => {
  const x0 = RAIL + 32
  const y0 = TOP + 28
  const fw = W - 32 - x0
  let s =
    text(x0, y0 + 28, 'Đổi trả hàng', { size: 28, weight: 700 }) +
    text(x0, y0 + 58, 'Đổi trả theo hóa đơn trong 7 ngày, hàng còn bán được tự nhập lại kho', {
      size: 15,
      fill: C.text2,
    })
  const st = ['Chọn hóa đơn', 'Chọn hàng trả', 'Hoàn tiền']
  s += stepsBar(x0 + fw - stepsW(st), y0 + 14, st, 1)
  const iy = y0 + 92
  s += card(x0, iy, fw, 112)
  s += text(x0 + 24, iy + 36, 'Hóa đơn gốc', { size: 14, weight: 600, fill: C.body })
  s += input(x0 + 24, iy + 46, 300, { value: 'HD-261012-0587', icon: 'search', weight: 600 })
  s += button(x0 + 336, iy + 48, 'Tìm', { variant: 'soft', h: 40 })
  const info = [
    ['Ngày mua', '12/10/2026 18:42'],
    ['Thu ngân', 'Nguyễn Văn Tâm'],
    ['Khách hàng', 'Chị Hoa · 0909 315 274'],
    ['Tổng hóa đơn', vnd(514000)],
  ]
  info.forEach(
    ([a, b], i) =>
      (s +=
        text(x0 + 470 + i * 220, iy + 46, a, { size: 13.5, fill: C.text3 }) +
        text(x0 + 470 + i * 220, iy + 74, b, { size: 15.5, weight: 600, maxW: 205 }))
  )
  s += badge(x0 + fw - 24, iy + 20, 'Còn hạn đổi trả · 6 ngày', 'success', {
    anchor: 'end',
    icon: 'checkCircle',
  })
  const ly = iy + 132
  const rw = 400
  const lw = fw - rw - 24
  const lh = H - 28 - ly
  s += card(x0, ly, lw, lh, { title: 'Chọn hàng trả lại', link: '2/4 mặt hàng' })
  const rows = [
    [
      true,
      'Sữa chua uống vị dâu',
      'Lốc 4 chai · 8934673600125',
      'Lốc',
      2,
      1,
      28000,
      'Hết hạn sử dụng',
    ],
    [
      true,
      'Nước giặt hương hoa 3.6kg',
      'Can · 8936017366458',
      'Can',
      1,
      1,
      189000,
      'Bao bì bị rò rỉ',
    ],
    [false, 'Gạo thơm 5kg', 'Túi · 8936095000183', 'Túi', 1, 0, 135000, ''],
    [false, 'Dầu gội thảo dược 650ml', 'Chai · 8935212801642', 'Chai', 1, 0, 134000, ''],
  ].map(([c, n, sub, u, qb, qr0, p, why]) => ({
    bg: c ? tint(P, 0.96) : undefined,
    cells: [
      { fn: (x, y, w, h) => checkbox(x + 18, y + h / 2 - 9, c) },
      { t: n, sub, fill: c ? C.text : C.body },
      { t: u },
      { t: String(qb), align: 'center' },
      {
        fn: (x, y, w, h) =>
          c
            ? stepper(x + 12, y + h / 2 - 17, qr0, { h: 34, w: w - 24 })
            : text(x + w / 2, y + h / 2 + 5, '0', { size: 15, fill: C.text3, anchor: 'middle' }),
      },
      { t: num(p) },
      { t: c ? num(p * qr0) : '—', weight: c ? 700 : 400, fill: c ? C.text : C.text3 },
      c
        ? {
            fn: (x, y, w, h) =>
              rect(x + 12, y + h / 2 - 17, w - 24, 34, { r: 8, fill: '#fff', stroke: '#D0D5DD' }) +
              text(x + 24, y + h / 2 + 5, why, { size: 14, maxW: w - 66 }) +
              icon('chevronDown', x + w - 38, y + h / 2 - 8, 16, C.text3),
          }
        : '',
    ],
  }))
  s += table(
    x0,
    ly + 62,
    lw,
    [
      { label: '', w: 52 },
      { label: 'Tên hàng', w: 2 },
      { label: 'ĐVT', w: 76 },
      { label: 'SL mua', w: 84, align: 'center' },
      { label: 'SL trả', w: 136 },
      { label: 'Đơn giá', w: 1, align: 'right' },
      { label: 'Tiền trả', w: 1, align: 'right' },
      { label: 'Lý do', w: 210 },
    ],
    rows,
    { rowH: 72, headTop: true }
  )
  s += rect(x0 + 24, ly + lh - 96, lw - 48, 72, { r: 14, fill: TONES.info.bg })
  s +=
    icon('info', x0 + 44, ly + lh - 72, 22, TONES.info.fg) +
    text(
      x0 + 78,
      ly + lh - 64,
      'Hàng hết hạn hoặc hỏng bao bì được ghi vào phiếu hủy, không nhập lại kho bán',
      { size: 14.5, weight: 600, fill: TONES.info.fg, maxW: lw - 120 }
    ) +
    text(x0 + 78, ly + lh - 42, 'Chủ cửa hàng xem lại trong báo cáo đổi trả cuối ngày', {
      size: 13.5,
      fill: TONES.info.fg,
    })
  const rx = x0 + lw + 24
  s += card(rx, ly, rw, lh, { title: 'Hoàn tiền' })
  s +=
    text(rx + 24, ly + 84, 'Hàng trả lại', { size: 15, fill: C.text2 }) +
    text(rx + rw - 24, ly + 84, '2 món', { size: 15.5, weight: 600, anchor: 'end' })
  s +=
    text(rx + 24, ly + 116, 'Giá trị hàng trả', { size: 15, fill: C.text2 }) +
    text(rx + rw - 24, ly + 116, vnd(217000), { size: 15.5, weight: 600, anchor: 'end' })
  s +=
    rect(rx + 24, ly + 140, rw - 48, 84, { r: 14, fill: tint(P, 0.92) }) +
    text(rx + 44, ly + 176, 'Hoàn cho khách', { size: 15, weight: 600, fill: shade(P, 0.3) }) +
    text(rx + 44, ly + 208, vnd(217000), { size: 28, weight: 700, fill: PD() })
  s += text(rx + 24, ly + 262, 'Hình thức hoàn', { size: 14, weight: 600, fill: C.body })
  ;[
    ['Hoàn tiền mặt', true],
    ['Đổi sang hàng khác', false],
  ].forEach(([l, on], i) => {
    const yy = ly + 276 + i * 56
    s +=
      rect(rx + 24, yy, rw - 48, 46, {
        r: 10,
        fill: on ? tint(P, 0.94) : '#fff',
        stroke: on ? P : '#D0D5DD',
        sw: on ? 1.6 : 1,
      }) +
      radio(rx + 46, yy + 23, on) +
      text(rx + 66, yy + 28.5, l, { size: 15, weight: on ? 600 : 400 })
  })
  s +=
    checkbox(rx + 24, ly + 400, true) +
    text(rx + 52, ly + 414, 'Nhập lại kho hàng còn bán được', { size: 15, fill: C.body })
  s +=
    text(rx + 24, ly + 460, 'Ghi chú', { size: 14, weight: 600, fill: C.body }) +
    textarea(rx + 24, ly + 472, rw - 48, 84, 'Khách mang hóa đơn giấy, đã kiểm tra tem nhãn')
  s +=
    button(rx + 24, ly + lh - 24 - 52, 'Hủy', { variant: 'outline', w: 110, h: 52 }) +
    button(rx + 146, ly + lh - 24 - 52, 'Xác nhận đổi trả', {
      w: rw - 170,
      h: 52,
      icon: 'check',
      size: 16,
    })
  return posShell(
    ctx,
    { active: 'Đổi trả', shift: 'Ca chiều · 14:00 – 22:00', clock: '15:08 · Thứ Ba, 13/10/2026' },
    s
  )
}
SCREENS['pos-cua-hang-ban-le/3.webp'] = (ctx) => {
  const sw = (CW - 3 * 20) / 4
  let s = ''
  ;[
    { label: 'Tổng mặt hàng', value: '1.248', sub: 'đang kinh doanh' },
    { label: 'Giá trị tồn kho', value: vnd(486250000) },
    {
      label: 'Sắp hết hàng',
      value: '23',
      dot: TONES.warning.dot,
      color: TONES.warning.fg,
      sub: 'dưới tồn tối thiểu',
    },
    {
      label: 'Hết hàng',
      value: '6',
      dot: TONES.danger.dot,
      color: TONES.danger.fg,
      sub: 'cần nhập gấp',
    },
  ].forEach((o, i) => (s += statCard(CX + i * (sw + 20), BODY_Y, sw, 96, o)))
  const ty = BODY_Y + 116
  s += card(CX, ty, CW, BODY_B - ty)
  s += searchBox(CX + 24, ty + 20, 340, 44, 'Tên hàng, mã hàng, mã vạch')
  s +=
    input(CX + 380, ty + 20, 230, { value: 'Nhóm hàng: Tất cả', select: true }) +
    input(CX + 626, ty + 20, 230, { value: 'Tồn kho: Tất cả', select: true })
  s +=
    toggle(CX + CW - 24 - 196, ty + 31, true) +
    text(CX + CW - 24 - 146, ty + 47, 'Chỉ hàng sắp hết', { size: 15, weight: 600, fill: C.body })
  const st = {
    ok: ['Còn hàng', 'success'],
    low: ['Sắp hết', 'warning'],
    out: ['Hết hàng', 'danger'],
  }
  const data = [
    [
      'SP00012',
      '8934588012112',
      'Nước suối tinh khiết 500ml',
      'Đồ uống',
      'Chai · Thùng 24',
      3900,
      5000,
      '412 chai',
      'ok',
    ],
    [
      'SP00045',
      '8934563138165',
      'Mì tôm chua cay 75g',
      'Thực phẩm khô',
      'Gói · Thùng 30',
      3600,
      4500,
      '38 gói',
      'low',
    ],
    [
      'SP00078',
      '8935049501503',
      'Sữa tươi tiệt trùng 180ml',
      'Sữa',
      'Hộp · Lốc 4 · Thùng 48',
      7200,
      8500,
      '264 hộp',
      'ok',
    ],
    [
      'SP00103',
      '8934673102209',
      'Dầu ăn thực vật 1L',
      'Gia vị',
      'Chai · Thùng 12',
      52000,
      62000,
      '0 chai',
      'out',
    ],
    [
      'SP00117',
      '8936036020373',
      'Nước rửa chén hương chanh 750g',
      'Hóa phẩm',
      'Chai',
      25500,
      31500,
      '46 chai',
      'ok',
    ],
    [
      'SP00152',
      '8934822101118',
      'Bánh quy bơ hộp 400g',
      'Bánh kẹo',
      'Hộp · Thùng 12',
      37000,
      45000,
      '9 hộp',
      'low',
    ],
    [
      'SP00168',
      '8938505970012',
      'Trứng gà sạch vỉ 10 quả',
      'Thực phẩm tươi',
      'Vỉ',
      30500,
      38000,
      '52 vỉ',
      'ok',
    ],
    [
      'SP00236',
      '8935001800274',
      'Cà phê hòa tan 3in1 (20 gói)',
      'Đồ uống',
      'Hộp · Thùng 24',
      52000,
      64000,
      '15 hộp',
      'low',
    ],
  ]
  const rows = data.map(([c, bc, n, g, u, cost, price, stock, k]) => [
    { t: c, sub: bc, fill: PD() },
    { t: n, sub: g },
    { t: u },
    { t: num(cost) },
    { t: num(price), weight: 600, fill: C.text },
    { t: stock, weight: 700, fill: k === 'ok' ? C.text : tone(st[k][1]).fg },
    { badge: st[k][0], tone: st[k][1], dot: true },
    { fn: (x, y, w, h) => icon('more', x + w / 2 - 10, y + h / 2 - 10, 20, C.text3) },
  ])
  s += table(
    CX,
    ty + 84,
    CW,
    [
      { label: 'Mã hàng', w: 1.1 },
      { label: 'Tên hàng', w: 2.1 },
      { label: 'Đơn vị tính', w: 1.3 },
      { label: 'Giá vốn', w: 0.8, align: 'right' },
      { label: 'Giá bán', w: 0.8, align: 'right' },
      { label: 'Tồn kho', w: 0.85, align: 'right' },
      { label: 'Trạng thái', w: 1 },
      { label: '', w: 56 },
    ],
    rows,
    { rowH: 60, headTop: true }
  )
  s += pager(CX + 24, BODY_B - 56, CW - 48, 'Hiển thị 1–8 trong 1.248 mặt hàng', [
    '1',
    '2',
    '3',
    '…',
    '156',
  ])
  return appShell(
    ctx,
    {
      active: 'Hàng hóa',
      user: ctx.manager,
      title: 'Hàng hóa',
      subtitle: 'Giá vốn bình quân, nhiều đơn vị tính quy đổi và cảnh báo tồn kho',
      actions: [
        { label: 'Nhập từ Excel', variant: 'outline', icon: 'upload' },
        { label: 'Thêm hàng hóa', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['pos-cua-hang-ban-le/4.webp'] = (ctx) => {
  let s = segmented(CX, BODY_Y, ['Hôm nay', '7 ngày', '30 ngày', 'Tháng này'], 2, { h: 42 })
  s +=
    icon(
      'calendar',
      CX + segW(['Hôm nay', '7 ngày', '30 ngày', 'Tháng này']) + 20,
      BODY_Y + 11,
      20,
      C.text2
    ) +
    text(
      CX + segW(['Hôm nay', '7 ngày', '30 ngày', 'Tháng này']) + 48,
      BODY_Y + 27,
      '14/09/2026 – 13/10/2026',
      { size: 15, weight: 600, fill: C.body }
    )
  s += input(CX + CW - 220, BODY_Y, 220, { value: 'Ca: Tất cả', select: true, h: 42 })
  const ky = BODY_Y + 62
  const kw = (CW - 60) / 4
  ;[
    {
      label: 'Doanh thu',
      value: vnd(386420000),
      delta: '+9,4%',
      note: 'so với 30 ngày trước',
      icon: 'wallet',
    },
    {
      label: 'Lợi nhuận gộp',
      value: vnd(71488000),
      delta: '+6,1%',
      note: 'so với 30 ngày trước',
      icon: 'trend',
    },
    {
      label: 'Biên lợi nhuận gộp',
      value: '18,5%',
      delta: '−0,6 điểm',
      note: 'giá vốn tăng nhẹ',
      icon: 'percent',
    },
    { label: 'Số hóa đơn', value: '4.812', note: 'Trung bình 80.300 ₫/hóa đơn', icon: 'receipt' },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), ky, kw, 132, o)))
  const cy = ky + 152
  const cw1 = 848
  const ch = 290
  s += card(CX, cy, cw1, ch, { title: 'Doanh thu và lợi nhuận gộp theo ngày' })
  s += legend(
    CX + cw1 - 24,
    cy + 40,
    [
      ['Giá vốn', tint(P, 0.7)],
      ['Lợi nhuận gộp', P],
    ],
    { anchor: 'end' }
  )
  const rnd = mulberry32(7)
  const base = range(30).map(
    (i) => (0.85 + 0.3 * ((i % 7) / 6 > 0.7 ? 1 : 0.5) + rnd() * 0.25) * (1 + i * 0.004)
  )
  const scale = 386420000 / sum(base)
  const rev = base.map((v) => Math.round(v * scale))
  const pr = rev.map((v, i) => Math.round(v * (0.172 + ((i * 37) % 10) / 400)))
  const pScale = 71488000 / sum(pr)
  const prof = pr.map((v) => Math.round(v * pScale))
  const labels = range(30).map((i) => dateAgo(29 - i).slice(0, 5))
  const opts = {
    labels,
    max: 20000000,
    fmt: vndShort,
    labelEvery: 5,
    maxBar: 18,
    gap: 0.3,
    radius: 3,
  }
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 90, {
    ...opts,
    series: [{ values: rev, color: tint(P, 0.7) }],
  })
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 90, {
    ...opts,
    noAxis: true,
    radius: 0,
    series: [{ values: prof, color: P }],
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Lợi nhuận theo nhóm hàng' })
  const grp = [
    ['Đồ uống', 18.6],
    ['Thực phẩm khô', 15.2],
    ['Sữa', 12.4],
    ['Hóa phẩm', 9.8],
    ['Bánh kẹo', 8.1],
  ]
  s += hbars(
    rx + 24,
    cy + 62,
    rw - 48,
    grp.map(([l, v]) => ({ label: l, value: v, display: `${dec(v)} tr` })),
    { rowH: 43 }
  )
  const by = cy + ch + 20
  s += card(CX, by, CW, BODY_B - by, {
    title: 'Mặt hàng lãi nhiều nhất',
    link: 'Xem báo cáo chi tiết',
  })
  const top = [
    ['Gạo thơm 5kg', 214, 28890000, 23968000, '17,0%'],
    ['Nước suối tinh khiết 500ml', 3420, 17100000, 13338000, '22,0%'],
    ['Mì tôm chua cay 75g', 4150, 18675000, 14940000, '20,0%'],
  ]
  s += table(
    CX,
    by + 58,
    CW,
    [
      { label: 'Tên hàng', w: 2 },
      { label: 'SL bán', w: 0.7, align: 'right' },
      { label: 'Doanh thu', w: 1, align: 'right' },
      { label: 'Giá vốn', w: 1, align: 'right' },
      { label: 'Lợi nhuận gộp', w: 1, align: 'right' },
      { label: 'Biên lợi nhuận', w: 0.9, align: 'right' },
    ],
    top.map(([n, q, r0, c0, m]) => [
      { t: n, weight: 600, fill: C.text },
      { t: num(q) },
      { t: num(r0) },
      { t: num(c0) },
      { t: num(r0 - c0), weight: 700, fill: TONES.success.fg },
      { t: m },
    ]),
    { rowH: 46, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Báo cáo',
      user: ctx.manager,
      title: 'Báo cáo doanh thu, lợi nhuận',
      subtitle: 'Lợi nhuận gộp tính theo giá vốn bình quân của từng mặt hàng',
      actions: [{ label: 'Xuất Excel', variant: 'outline', icon: 'download' }],
    },
    s
  )
}

// ============================================================ 08 · Quản lý Kho
SCREENS['quan-ly-kho/1.webp'] = (ctx) => {
  const wh = [
    ['Kho tổng Bình Dương', '12,46 tỷ ₫', '1.842 mã hàng'],
    ['Kho Quận 7', '3,10 tỷ ₫', '968 mã hàng'],
    ['Kho Thủ Đức', '2,60 tỷ ₫', '744 mã hàng'],
  ]
  const sw = (CW - 60) / 4
  let s = ''
  wh.forEach(([n, v, sub], i) => {
    const x = CX + i * (sw + 20)
    s +=
      card(x, BODY_Y, sw, 104) +
      rect(x + 20, BODY_Y + 20, 36, 36, { r: 10, fill: tint(P, 0.88) }) +
      icon('warehouse', x + 28, BODY_Y + 28, 20, P)
    s +=
      text(x + 68, BODY_Y + 43, n, { size: 15, weight: 600, fill: C.text2, maxW: sw - 84 }) +
      text(x + 20, BODY_Y + 86, v, { size: 24, weight: 700 }) +
      text(x + 28 + tw(v, 24, 700), BODY_Y + 86, sub, { size: 14, fill: C.text3 })
  })
  const wx = CX + 3 * (sw + 20)
  s +=
    card(wx, BODY_Y, sw, 104, { stroke: '#FEC84B' }) +
    rect(wx + 20, BODY_Y + 20, 36, 36, { r: 10, fill: TONES.warning.bg }) +
    icon('alert', wx + 28, BODY_Y + 28, 20, TONES.warning.fg)
  s +=
    text(wx + 68, BODY_Y + 43, 'Dưới tồn tối thiểu', {
      size: 15,
      weight: 600,
      fill: TONES.warning.fg,
    }) +
    text(wx + 20, BODY_Y + 86, '17', { size: 24, weight: 700, fill: TONES.warning.fg }) +
    text(wx + 50, BODY_Y + 86, 'mặt hàng cần đặt thêm', { size: 14, fill: C.text3 })
  const ty = BODY_Y + 124
  s += card(CX, ty, CW, BODY_B - ty)
  s += searchBox(CX + 24, ty + 20, 320, 44, 'Mã hàng, tên hàng')
  s += input(CX + 360, ty + 20, 220, { value: 'Nhóm hàng: Tất cả', select: true })
  s +=
    toggle(CX + 600, ty + 31, false) +
    text(CX + 650, ty + 47, 'Chỉ hàng dưới tồn tối thiểu', { size: 15, weight: 600, fill: C.body })
  s += text(CX + CW - 24, ty + 47, 'Cập nhật lúc 10:42', { size: 14, fill: C.text3, anchor: 'end' })
  const lowCell = (v, low) => ({
    t: num(v),
    weight: low ? 700 : 400,
    fill: low ? TONES.danger.fg : C.body,
  })
  const data = [
    ['HH-0102', 'Nước giặt hương hoa 3.6kg', 'Can', 1240, 186, 142, 120, 300],
    ['HH-0115', 'Nước xả vải 3.8L', 'Can', 860, 94, 21, 40, 200, [2]],
    ['TP-0231', 'Dầu ăn thực vật 2L', 'Chai', 2400, 320, 260, 480, 600],
    ['TP-0248', 'Gạo thơm 5kg', 'Túi', 1150, 210, 175, 0, 400],
    ['TP-0263', 'Đường tinh luyện 1kg', 'Gói', 3200, 58, 410, 150, 800, [1]],
    ['DU-0310', 'Nước suối 500ml (thùng 24)', 'Thùng', 920, 145, 98, 200, 300],
    ['DU-0326', 'Trà xanh đóng chai 455ml (thùng 24)', 'Thùng', 410, 36, 12, 60, 500, [1, 2]],
    ['VS-0412', 'Khăn giấy rút 180 tờ', 'Gói', 5600, 820, 640, 0, 1500],
    ['VS-0437', 'Bột giặt 6kg', 'Túi', 180, 24, 9, 30, 250, [2]],
  ]
  const rows = data.map(([c, n, u, a, b, d, hold, min, lows = []]) => {
    const total = a + b + d
    const avail = total - hold
    const under = avail < min
    return {
      bg: under ? '#FFFCF5' : undefined,
      cells: [
        { t: c, weight: 600, fill: PD() },
        { t: n, sub: `ĐVT: ${u}` },
        lowCell(a, lows.includes(0)),
        lowCell(b, lows.includes(1)),
        lowCell(d, lows.includes(2)),
        { t: num(total), weight: 700, fill: C.text },
        {
          t: hold ? num(hold) : '—',
          fill: hold ? TONES.warning.fg : C.text3,
          weight: hold ? 600 : 400,
        },
        { t: num(avail), weight: 600, fill: C.text },
        under
          ? { badge: `Dưới mức ${num(min)}`, tone: 'warning', icon: 'alert' }
          : { badge: `Đủ · tối thiểu ${num(min)}`, tone: 'neutral' },
      ],
    }
  })
  s += table(
    CX,
    ty + 84,
    CW,
    [
      { label: 'Mã hàng', w: 0.8 },
      { label: 'Tên hàng', w: 2.1 },
      { label: 'Kho tổng BD', w: 0.85, align: 'right' },
      { label: 'Kho Q.7', w: 0.7, align: 'right' },
      { label: 'Kho Thủ Đức', w: 0.85, align: 'right' },
      { label: 'Tổng tồn', w: 0.75, align: 'right' },
      { label: 'Giữ chỗ', w: 0.7, align: 'right' },
      { label: 'Khả dụng', w: 0.75, align: 'right' },
      { label: 'Tồn tối thiểu', w: 1.45 },
    ],
    rows,
    { rowH: 56, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Tồn kho',
      title: 'Tồn kho',
      subtitle: 'Số lượng thời gian thực tại 3 kho · hàng trên phiếu chờ duyệt được giữ chỗ',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Lập phiếu', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-kho/2.webp'] = (ctx) => {
  let s = card(CX, BODY_Y, CW, 160)
  const info = [
    ['Nhà cung cấp', 'Công ty CP Hàng tiêu dùng Minh Phát'],
    ['Kho nhập', 'Kho tổng Bình Dương'],
    ['Ngày lập', '13/10/2026 08:15'],
    ['Người lập', 'Trần Văn Lộc · Thủ kho'],
    ['Số hóa đơn nhà cung cấp', '0004187'],
    ['Ghi chú', 'Nhập hàng đợt 2 tháng 10'],
  ]
  const cw = (CW - 48) / 3
  info.forEach(([a, b], i) => {
    const x = CX + 24 + (i % 3) * cw
    const y = BODY_Y + 26 + Math.floor(i / 3) * 66
    s +=
      text(x, y + 14, a, { size: 13.5, fill: C.text3 }) +
      text(x, y + 42, b, { size: 16, weight: 600, maxW: cw - 24 })
  })
  const ly = BODY_Y + 180
  const rw = 372
  const lw = CW - rw - 20
  const lh = BODY_B - ly
  s += card(CX, ly, lw, lh, { title: 'Hàng nhập (5 mặt hàng)' })
  const items = [
    ['HH-0102', 'Nước giặt hương hoa 3.6kg', 'Can', 200, 168000],
    ['HH-0115', 'Nước xả vải 3.8L', 'Can', 150, 142000],
    ['VS-0437', 'Bột giặt 6kg', 'Túi', 120, 215000],
    ['VS-0412', 'Khăn giấy rút 180 tờ', 'Gói', 1000, 12500],
    ['DU-0326', 'Trà xanh đóng chai 455ml (thùng 24)', 'Thùng', 300, 168000],
  ]
  s += table(
    CX,
    ly + 60,
    lw,
    [
      { label: 'STT', w: 56, align: 'center' },
      { label: 'Mã hàng', w: 100 },
      { label: 'Tên hàng', w: 2 },
      { label: 'ĐVT', w: 76 },
      { label: 'Số lượng', w: 0.7, align: 'right' },
      { label: 'Đơn giá', w: 0.8, align: 'right' },
      { label: 'Thành tiền', w: 0.95, align: 'right' },
    ],
    items.map(([c, n, u, q, p], i) => [
      { t: String(i + 1), fill: C.text3 },
      { t: c, weight: 600, fill: PD() },
      { t: n, weight: 600, fill: C.text },
      { t: u },
      { t: num(q) },
      { t: num(p) },
      { t: num(q * p), weight: 700, fill: C.text },
    ]),
    { rowH: 56, headTop: true }
  )
  const total = sum(items.map(([, , , q, p]) => q * p))
  const tx = CX + lw - 24
  let ty = ly + 60 + 46 + 5 * 56 + 40
  ;[
    ['Tổng tiền hàng', vnd(total)],
    ['Thuế GTGT (8%)', vnd(total * 0.08)],
  ].forEach(([a, b]) => {
    s +=
      text(tx - 220, ty, a, { size: 15, fill: C.text2, anchor: 'end' }) +
      text(tx, ty, b, { size: 16, weight: 600, anchor: 'end' })
    ty += 32
  })
  s += line(tx - 420, ty - 10, tx, ty - 10, { stroke: C.border, dash: '5 5' })
  s +=
    text(tx - 220, ty + 24, 'Tổng thanh toán', { size: 17, weight: 700, anchor: 'end' }) +
    text(tx, ty + 26, vnd(total * 1.08), { size: 24, weight: 700, fill: PD(), anchor: 'end' })
  const rx = CX + lw + 20
  s += card(rx, ly, rw, lh, { title: 'Quy trình duyệt' })
  const steps = [
    ['done', 'Lập phiếu', 'Trần Văn Lộc · 08:15'],
    ['done', 'Gửi duyệt', 'Trần Văn Lộc · 08:32'],
    ['now', 'Chờ quản lý kho duyệt', 'Phan Thị Ngọc'],
    ['todo', 'Cập nhật tồn kho', 'Tự động sau khi duyệt'],
  ]
  steps.forEach(([k, a, b], i) => {
    const y = ly + 76 + i * 72
    if (i < steps.length - 1)
      s += line(rx + 38, y + 14, rx + 38, y + 72, {
        stroke: k === 'done' ? TONES.success.dot : C.border,
        sw: 2,
      })
    if (k === 'done')
      s +=
        circle(rx + 38, y, 13, { fill: TONES.success.dot }) +
        icon('check', rx + 31, y - 7, 14, '#fff', { sw: 3.4 })
    else if (k === 'now')
      s +=
        circle(rx + 38, y, 13, { fill: tint(P, 0.85), stroke: P, sw: 2 }) +
        circle(rx + 38, y, 5, { fill: P })
    else s += circle(rx + 38, y, 13, { fill: '#fff', stroke: '#D0D5DD', sw: 2 })
    s +=
      text(rx + 64, y + 2, a, { size: 15.5, weight: 600, fill: k === 'todo' ? C.text3 : C.text }) +
      text(rx + 64, y + 24, b, { size: 13.5, fill: C.text3 })
  })
  const ny = ly + 76 + 4 * 72 - 10
  s += rect(rx + 24, ny, rw - 48, 92, { r: 14, fill: TONES.warning.bg })
  s +=
    icon('info', rx + 40, ny + 18, 20, TONES.warning.fg) +
    para(
      rx + 70,
      ny + 32,
      'Tồn kho chỉ tăng sau khi phiếu được duyệt. Hàng trên phiếu đang được giữ chỗ.',
      rw - 110,
      { size: 14, fill: TONES.warning.fg, lh: 21, maxLines: 3 }
    )
  s +=
    text(rx + 24, ny + 124, 'Ý kiến duyệt', { size: 14, weight: 600, fill: C.body }) +
    textarea(rx + 24, ny + 136, rw - 48, lh - (ny + 136 - ly) - 24, '')
  return appShell(
    ctx,
    {
      active: 'Chờ duyệt',
      title: 'Phiếu nhập PN-2610-0412',
      back: true,
      badge: ['Chờ duyệt', 'warning'],
      subtitle: 'Nhập mua từ nhà cung cấp · 5 mặt hàng · 1.770 đơn vị',
      actions: [
        { label: 'In phiếu', variant: 'outline', icon: 'printer' },
        { label: 'Từ chối', variant: 'danger', icon: 'x' },
        { label: 'Duyệt phiếu', icon: 'check' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-kho/3.webp'] = (ctx) => {
  const sw = (CW - 60) / 4
  let s = ''
  const sc = [
    { label: 'Đã đếm', value: '48/52', sub: 'mặt hàng' },
    { label: 'Khớp sổ sách', value: '41', dot: TONES.success.dot, sub: 'mặt hàng' },
    {
      label: 'Chênh lệch',
      value: '7',
      dot: TONES.warning.dot,
      color: TONES.warning.fg,
      sub: 'cần ghi nguyên nhân',
    },
    {
      label: 'Giá trị chênh lệch',
      value: vnd(-2184000),
      dot: TONES.danger.dot,
      color: TONES.danger.fg,
    },
  ]
  sc.forEach((o, i) => (s += statCard(CX + i * (sw + 20), BODY_Y, sw, 96, o)))
  s += progress(CX + 22, BODY_Y + 82, sw - 44, 48 / 52, { h: 6 })
  const ty = BODY_Y + 116
  s += card(CX, ty, CW, BODY_B - ty)
  s += tabs(
    CX + 24,
    ty + 12,
    [
      { label: 'Tất cả', count: 52 },
      { label: 'Chênh lệch', count: 7 },
      { label: 'Chưa đếm', count: 4 },
    ],
    0,
    { w: CW - 48 }
  )
  s += badge(CX + CW - 24, ty + 22, 'Kiểm mù: thủ kho không thấy số sổ sách khi đếm', 'info', {
    anchor: 'end',
    icon: 'eye',
  })
  const data = [
    ['DU-0310', 'Nước suối 500ml (thùng 24)', 'Thùng', 920, 918, 98000, 'Bể vỡ khi xếp dỡ'],
    ['DU-0326', 'Trà xanh đóng chai 455ml (thùng 24)', 'Thùng', 410, 410, 168000, ''],
    ['DU-0331', 'Nước tăng lực lon 250ml (thùng 24)', 'Thùng', 265, 259, 214000, null],
    [
      'DU-0345',
      'Cà phê lon 235ml (thùng 24)',
      'Thùng',
      132,
      134,
      198000,
      'Nhập thiếu trên phiếu PN-0398',
    ],
    ['DU-0352', 'Nước ép cam 1L', 'Hộp', 480, 472, 31000, 'Hết hạn, chờ lập phiếu hủy'],
    ['DU-0368', 'Sữa đậu nành 200ml (lốc 6)', 'Lốc', 1120, 1120, 36000, ''],
    [
      'DU-0374',
      'Trà sữa đóng chai 350ml (lốc 6)',
      'Lốc',
      860,
      848,
      71000,
      'Đang xác minh camera kho',
    ],
  ]
  const rows = data.map(([c, n, u, book, real, price, why]) => {
    const d = real - book
    const big = Math.abs(d * price) >= 1000000
    return {
      bg: why === null ? '#FFFBFA' : undefined,
      cells: [
        { t: c, weight: 600, fill: PD() },
        { t: n, sub: `ĐVT: ${u}` },
        { t: num(book) },
        {
          fn: (x, y, w, h) =>
            input(x + 12, y + h / 2 - 20, w - 24, {
              h: 40,
              value: num(real),
              align: 'right',
              weight: 600,
            }),
        },
        d === 0
          ? { badge: 'Khớp', tone: 'success', icon: 'check' }
          : {
              t: d > 0 ? `+${d}` : `−${-d}`,
              weight: 700,
              fill: d > 0 ? TONES.info.fg : TONES.danger.fg,
            },
        {
          t: d === 0 ? '—' : d > 0 ? `+${num(d * price)}` : num(d * price),
          weight: d ? 600 : 400,
          fill: d > 0 ? TONES.info.fg : d < 0 ? TONES.danger.fg : C.text3,
        },
        why === null
          ? {
              fn: (x, y, w, h) =>
                input(x + 12, y + h / 2 - 20, w - 24, {
                  h: 40,
                  placeholder: 'Chọn nguyên nhân (bắt buộc)',
                  select: true,
                  error: true,
                  size: 14,
                }),
            }
          : why
            ? { t: why }
            : { t: '—', fill: C.text3 },
        big ? { badge: 'Lệch lớn', tone: 'danger', dot: true } : '',
      ],
    }
  })
  s += table(
    CX,
    ty + 70,
    CW,
    [
      { label: 'Mã hàng', w: 0.75 },
      { label: 'Tên hàng', w: 1.9 },
      { label: 'Tồn sổ sách', w: 0.8, align: 'right' },
      { label: 'Thực đếm', w: 0.85, align: 'right' },
      { label: 'Chênh lệch', w: 0.75, align: 'right' },
      { label: 'Giá trị', w: 0.9, align: 'right' },
      { label: 'Nguyên nhân', w: 2 },
      { label: '', w: 120 },
    ],
    rows,
    { rowH: 62, headTop: true }
  )
  s +=
    rect(CX + 24, BODY_B - 76, CW - 48, 56, { r: 12, fill: TONES.danger.bg }) +
    icon('alert', CX + 42, BODY_B - 58, 20, TONES.danger.fg) +
    text(
      CX + 72,
      BODY_B - 42,
      'Còn 1 mặt hàng lệch lớn chưa ghi nguyên nhân, chưa thể hoàn tất kiểm kê',
      { size: 15, weight: 600, fill: TONES.danger.fg }
    )
  return appShell(
    ctx,
    {
      active: 'Kiểm kê',
      title: 'Phiếu kiểm kê KK-2610-03',
      back: true,
      badge: ['Đang đối chiếu', 'info'],
      subtitle: 'Nhóm Đồ uống · Kho tổng Bình Dương · bắt đầu 13/10/2026 07:30',
      actions: [
        { label: 'In phiếu đếm', variant: 'outline', icon: 'printer' },
        { label: 'Hoàn tất kiểm kê', icon: 'check' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-kho/4.webp'] = (ctx) => {
  let s =
    input(CX, BODY_Y, 250, { value: 'Kỳ: Tháng 9/2026', select: true, icon: 'calendar', h: 42 }) +
    input(CX + 266, BODY_Y, 220, { value: 'Kho: Tất cả', select: true, h: 42 })
  s += text(CX + CW, BODY_Y + 27, '01/09/2026 – 30/09/2026 · đã khóa sổ', {
    size: 14.5,
    fill: C.text3,
    anchor: 'end',
  })
  const ky = BODY_Y + 62
  const kw = (CW - 60) / 4
  ;[
    { label: 'Tồn đầu kỳ', value: '17,60 tỷ ₫', note: '3.554 mã hàng', icon: 'warehouse' },
    {
      label: 'Nhập trong kỳ',
      value: '4,82 tỷ ₫',
      delta: '126 phiếu',
      good: true,
      note: 'đã duyệt',
      icon: 'importIc',
      color: '#17B26A',
    },
    {
      label: 'Xuất trong kỳ',
      value: '4,26 tỷ ₫',
      delta: '214 phiếu',
      good: true,
      note: 'đã duyệt',
      icon: 'exportIc',
      color: '#F79009',
    },
    {
      label: 'Tồn cuối kỳ',
      value: '18,16 tỷ ₫',
      delta: '+3,2%',
      note: 'so với đầu kỳ',
      icon: 'package',
    },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), ky, kw, 132, o)))
  const cy = ky + 152
  const cw1 = 848
  const ch = 290
  s += card(CX, cy, cw1, ch, { title: 'Nhập, xuất theo tuần' })
  s += legend(
    CX + cw1 - 24,
    cy + 40,
    [
      ['Nhập kho', '#17B26A'],
      ['Xuất kho', '#F79009'],
    ],
    { anchor: 'end' }
  )
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 90, {
    labels: ['01 – 06/9', '07 – 13/9', '14 – 20/9', '21 – 27/9', '28 – 30/9'],
    series: [
      { values: [1.12, 0.98, 1.24, 1.06, 0.42].map((v) => v * 1e9), color: '#17B26A' },
      { values: [0.86, 1.02, 0.94, 1.08, 0.36].map((v) => v * 1e9), color: '#F79009' },
    ],
    fmt: (v) => (v === 0 ? '0' : `${dec(v / 1e9, 1)} tỷ`),
    maxBar: 40,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Giá trị tồn theo kho' })
  const seg = [
    ['Kho tổng Bình Dương', 12.46, P],
    ['Kho Quận 7', 3.1, tint(P, 0.4)],
    ['Kho Thủ Đức', 2.6, tint(P, 0.7)],
  ]
  s += donut(
    rx + 110,
    cy + 168,
    70,
    24,
    seg.map(([, v, c]) => ({ value: v, color: c })),
    { center: '18,16', centerSize: 22, sub: 'tỷ ₫' }
  )
  seg.forEach(
    ([l, v, c], i) =>
      (s +=
        rect(rx + 214, cy + 116 + i * 44, 12, 12, { r: 3.5, fill: c }) +
        text(rx + 234, cy + 127 + i * 44, l, { size: 14, fill: C.text2, maxW: rw - 250 }) +
        text(rx + 234, cy + 147 + i * 44, `${dec(v, 2)} tỷ ₫`, { size: 14.5, weight: 700 }))
  )
  const by = cy + ch + 20
  s += card(CX, by, CW, BODY_B - by, {
    title: 'Xuất nhập tồn theo mặt hàng',
    link: 'Xem đủ 3.554 mặt hàng',
  })
  const data = [
    ['HH-0102', 'Nước giặt hương hoa 3.6kg', 'Can', 1320, 600, 352],
    ['TP-0231', 'Dầu ăn thực vật 2L', 'Chai', 2640, 1200, 860],
    ['DU-0310', 'Nước suối 500ml (thùng 24)', 'Thùng', 1010, 480, 327],
  ]
  s += table(
    CX,
    by + 58,
    CW,
    [
      { label: 'Mã hàng', w: 0.8 },
      { label: 'Tên hàng', w: 2 },
      { label: 'ĐVT', w: 0.6 },
      { label: 'Tồn đầu', w: 0.8, align: 'right' },
      { label: 'Nhập', w: 0.8, align: 'right' },
      { label: 'Xuất', w: 0.8, align: 'right' },
      { label: 'Tồn cuối', w: 0.8, align: 'right' },
    ],
    data.map(([c, n, u, a, b, d]) => [
      { t: c, weight: 600, fill: PD() },
      { t: n, weight: 600, fill: C.text },
      { t: u },
      { t: num(a) },
      { t: `+${num(b)}`, fill: TONES.success.fg, weight: 600 },
      { t: `−${num(d)}`, fill: TONES.warning.fg, weight: 600 },
      { t: num(a + b - d), weight: 700, fill: C.text },
    ]),
    { rowH: 46, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Báo cáo',
      title: 'Báo cáo xuất nhập tồn',
      subtitle: 'Tổng hợp theo kỳ, theo kho và từng mặt hàng',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'In báo cáo', variant: 'outline', icon: 'printer' },
      ],
    },
    s
  )
}

// ============================================================ 09 · Quản lý Spa Salon
function dateNav(x, y, label) {
  return (
    iconBtn(x, y, 'chevronLeft') +
    text(x + 56, y + 26, label, { size: 17, weight: 700 }) +
    iconBtn(x + 56 + tw(label, 17, 700) + 16, y, 'chevronRight')
  )
}
const dateNavW = (label) => 56 + tw(label, 17, 700) + 16 + 40
function legendBadges(xr, y, items) {
  let s = ''
  let x = xr
  for (const [l, tn, dashed] of [...items].reverse()) {
    const t = tone(tn)
    const w = tw(l, 14, 500) + 26
    x -= w
    s +=
      rect(x, y + 8, 14, 14, {
        r: 4,
        fill: t.bg,
        stroke: t.dot,
        sw: 1.4,
        dash: dashed ? '3 2' : undefined,
      }) + text(x + 20, y + 20, l, { size: 14, fill: C.text2 })
    x -= 18
  }
  return s
}
SCREENS['quan-ly-spa-salon/1.webp'] = (ctx) => {
  let s = dateNav(CX, BODY_Y, 'Thứ Ba, 13/10/2026')
  s += segmented(CX + dateNavW('Thứ Ba, 13/10/2026') + 20, BODY_Y, ['Ngày', 'Tuần'], 0)
  s += legendBadges(CX + CW, BODY_Y + 6, [
    ['Đã xong', 'neutral'],
    ['Đang làm', 'primary'],
    ['Đã xác nhận', 'info'],
    ['Khách đặt online', 'warning', true],
  ])
  const ev = (col, from, to, title, sub, tn, extra = {}) => ({
    col,
    from,
    to,
    title,
    sub,
    tone: tn,
    ...extra,
  })
  const events = [
    ev(0, 9, 10.5, 'Chị Hồng Nhung', 'Chăm sóc da chuyên sâu', 'neutral', {
      sub2: 'Đã thanh toán',
    }),
    ev(0, 11, 12, 'Chị Thanh Hà', 'Gội đầu dưỡng sinh', 'primary', { sub2: 'Đang làm · 20 phút' }),
    ev(0, 14, 15.5, 'Chị Kim Oanh', 'Trị mụn · buổi 4/10', 'info', { sub2: 'Trừ vào gói' }),
    ev(0, 16, 17, 'Chị Diễm My', 'Massage mặt', 'info'),
    ev(1, 9.5, 10.5, 'Anh Quốc Việt', 'Massage cổ vai gáy', 'neutral'),
    ev(1, 10.5, 12, 'Chị Phương Thảo', 'Tắm trắng · buổi 5/8', 'primary', {
      sub2: 'Đang làm · 50 phút',
    }),
    ev(1, 13.5, 14.5, 'Chị Lan Anh', 'Gội đầu dưỡng sinh', 'warning', { dashed: true }),
    ev(1, 15, 17, 'Chị Bích Ngọc', 'Massage body đá nóng', 'info', {
      sub2: '120 phút · 520.000 ₫',
    }),
    ev(2, 9, 10, 'Chị Hoài An', 'Sơn gel', 'neutral'),
    ev(2, 10, 11.5, 'Chị Thùy Linh', 'Nối mi', 'primary', { sub2: 'Đang làm · 80 phút' }),
    ev(2, 13, 14, 'Chị Minh Châu', 'Chăm sóc móng', 'warning', { dashed: true }),
    ev(2, 15.5, 16.5, 'Chị Ngọc Trâm', 'Sơn gel', 'info'),
    ev(3, 10, 11.5, 'Chị Yến Nhi', 'Triệt lông · buổi 7/10', 'primary', {
      sub2: 'Đang làm · 80 phút',
    }),
    { col: 3, from: 12, to: 13, title: 'Nghỉ trưa', striped: true },
    ev(3, 14, 16, 'Chị Thu Hà', 'Chăm sóc da chuyên sâu', 'info', { sub2: '90 phút · 450.000 ₫' }),
    ev(3, 16.5, 17.5, 'Chị Mỹ Linh', 'Massage mặt', 'info'),
    ev(4, 9, 10.5, 'Chị Thanh Tâm', 'Massage body', 'neutral', { sub2: 'Đã thanh toán' }),
    { col: 4, from: 12, to: 13, title: 'Nghỉ trưa', striped: true },
    ev(4, 13, 14.5, 'Chị Hải Yến', 'Gội đầu dưỡng sinh', 'info'),
    ev(4, 15, 16, 'Chị Kiều Oanh', 'Chăm sóc da cơ bản', 'warning', { dashed: true }),
    ev(4, 16.5, 18, 'Chị Ánh Tuyết', 'Liệu trình trị nám', 'info', {
      sub2: 'Trừ vào gói · buổi 2/6',
    }),
  ]
  s += timeGrid(CX, BODY_Y + 60, CW, BODY_B - BODY_Y - 60, {
    cols: [
      { title: 'Ngọc Anh', sub: '4 lịch hẹn', avatar: true },
      { title: 'Thu Trang', sub: '4 lịch hẹn', avatar: true },
      { title: 'Mai Hương', sub: '4 lịch hẹn', avatar: true },
      { title: 'Bảo Vy', sub: '3 lịch hẹn', avatar: true },
      { title: 'Minh Thư', sub: '4 lịch hẹn', avatar: true },
    ],
    start: 9,
    end: 18,
    now: 11 + 20 / 60,
    events,
    headH: 66,
    half: true,
  })
  return appShell(
    ctx,
    {
      active: 'Lịch hẹn',
      title: 'Lịch hẹn',
      subtitle: '19 lịch hẹn hôm nay · kéo thả để đổi giờ hoặc đổi kỹ thuật viên',
      actions: [
        { label: 'Hôm nay', variant: 'outline', icon: 'calendar' },
        { label: 'Đặt lịch', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-spa-salon/2.webp'] = () => {
  const screen = (x, y, w, h) => {
    let s = phoneHeader(x, y, w, 'Đặt lịch', 'Lotus Spa & Beauty', { back: true })
    const bx = x + 18
    const bw = w - 36
    let cy = y + 82
    range(3).forEach(
      (i) =>
        (s += rect(bx + i * ((bw - 12) / 3 + 6), cy, (bw - 12) / 3, 5, {
          r: 2.5,
          fill: i < 2 ? P : C.border,
        }))
    )
    s += text(bx, cy + 28, 'Bước 2/3 · Chọn thời gian', { size: 13.5, weight: 600, fill: C.text2 })
    cy += 44
    s += rect(bx, cy, bw, 74, { r: 14, fill: C.soft, stroke: C.line })
    s += photo(bx + 12, cy + 11, 52, 52, 'berry', 'sparkles', { r: 12 })
    s +=
      text(bx + 76, cy + 32, 'Chăm sóc da chuyên sâu', {
        size: 15.5,
        weight: 700,
        maxW: bw - 130,
      }) + text(bx + 76, cy + 54, '90 phút · 450.000 ₫', { size: 13.5, fill: C.text2 })
    s += text(bx + bw - 14, cy + 43, 'Đổi', { size: 14, weight: 600, fill: PD(), anchor: 'end' })
    cy += 102
    s += text(bx, cy, 'Kỹ thuật viên', { size: 16, weight: 700 })
    const techs = ['Bất kỳ', 'Ngọc Anh', 'Thu Trang', 'Bảo Vy', 'Minh Thư']
    techs.forEach((t, i) => {
      const ax = bx + 30 + i * ((bw - 60) / 4)
      const on = i === 1
      if (i === 0)
        s +=
          circle(ax, cy + 42, 24, { fill: C.muted }) + icon('users', ax - 11, cy + 31, 22, C.text2)
      else s += avatar(ax, cy + 42, 24, t)
      if (on) s += circle(ax, cy + 42, 28, { stroke: P, sw: 2.5 })
      s += text(ax, cy + 90, t, {
        size: 12.5,
        weight: on ? 700 : 500,
        fill: on ? PD() : C.text2,
        anchor: 'middle',
      })
    })
    cy += 128
    s +=
      text(bx, cy, 'Chọn ngày', { size: 16, weight: 700 }) +
      text(bx + bw, cy, 'Tháng 10/2026', { size: 13.5, fill: C.text3, anchor: 'end' })
    const days = [
      ['T2', '12'],
      ['T3', '13'],
      ['T4', '14'],
      ['T5', '15'],
      ['T6', '16'],
      ['T7', '17'],
    ]
    const dw = (bw - 5 * 8) / 6
    days.forEach(([a, b], i) => {
      const dx = bx + i * (dw + 8)
      const on = i === 2
      const dis = i === 0
      s += rect(dx, cy + 14, dw, 66, {
        r: 12,
        fill: on ? P : dis ? C.soft : '#fff',
        stroke: on ? P : C.border,
      })
      s +=
        text(dx + dw / 2, cy + 38, a, { size: 13, fill: on ? '#fff' : C.text3, anchor: 'middle' }) +
        text(dx + dw / 2, cy + 64, b, {
          size: 18,
          weight: 700,
          fill: on ? '#fff' : dis ? C.text3 : C.text,
          anchor: 'middle',
        })
    })
    cy += 116
    s +=
      text(bx, cy, 'Giờ còn trống', { size: 16, weight: 700 }) +
      text(bx + bw, cy, 'Ngọc Anh · Thứ Tư', { size: 13.5, fill: C.text3, anchor: 'end' })
    const slots = [
      ['09:00', 0],
      ['09:30', 0],
      ['10:00', 1],
      ['10:30', 1],
      ['11:00', 0],
      ['13:30', 1],
      ['14:00', 2],
      ['14:30', 1],
      ['15:00', 1],
      ['15:30', 0],
      ['16:00', 1],
      ['16:30', 1],
    ]
    const sw0 = (bw - 3 * 8) / 4
    slots.forEach(([t, k], i) => {
      const sx = bx + (i % 4) * (sw0 + 8)
      const sy = cy + 14 + Math.floor(i / 4) * 50
      s += rect(sx, sy, sw0, 42, {
        r: 10,
        fill: k === 2 ? P : k === 0 ? C.soft : '#fff',
        stroke: k === 2 ? P : k === 0 ? C.line : '#D0D5DD',
      })
      s += text(sx + sw0 / 2, sy + 26.5, t, {
        size: 14.5,
        weight: 600,
        fill: k === 2 ? '#fff' : k === 0 ? '#C0C5CE' : C.text,
        anchor: 'middle',
        deco: k === 0 ? 'line-through' : undefined,
      })
    })
    const fy = y + h - 118
    s += rect(x, fy, w, 118, { fill: '#fff' }) + line(x, fy, x + w, fy, { stroke: C.border })
    s += text(bx, fy + 28, 'Thứ Tư 14/10 · 14:00 – 15:30 · Ngọc Anh', {
      size: 13.5,
      weight: 600,
      fill: C.body,
      maxW: bw,
    })
    s += button(bx, fy + 42, 'Tiếp tục', { w: bw, h: 52, r: 14, size: 16.5, icon: 'arrowRight' })
    return s
  }
  return phoneScene(screen, [
    {
      x: 236,
      y: 300,
      icon: 'calendarCheck',
      title: 'Chỉ hiện giờ còn trống',
      sub: 'Khách không đặt trùng lịch',
    },
    {
      x: 1064,
      y: 600,
      icon: 'gift',
      title: 'Gói còn 6/10 buổi',
      sub: 'Tự trừ buổi sau mỗi lần làm',
      tone: 'violet',
    },
  ])
}
SCREENS['quan-ly-spa-salon/3.webp'] = (ctx) => {
  const sw = (CW - 60) / 4
  let s = ''
  ;[
    { label: 'Gói đang hoạt động', value: '86' },
    { label: 'Sắp hết buổi (≤ 2)', value: '12', dot: TONES.warning.dot, color: TONES.warning.fg },
    {
      label: 'Sắp hết hạn trong 30 ngày',
      value: '7',
      dot: TONES.danger.dot,
      color: TONES.danger.fg,
    },
    { label: 'Bán gói tháng 10', value: vnd(64500000) },
  ].forEach((o, i) => (s += statCard(CX + i * (sw + 20), BODY_Y, sw, 96, o)))
  const ty = BODY_Y + 116
  s += card(CX, ty, CW, BODY_B - ty)
  s += tabs(
    CX + 24,
    ty + 12,
    [
      { label: 'Đang hoạt động', count: 86 },
      { label: 'Sắp hết buổi', count: 12 },
      { label: 'Hết hạn', count: 9 },
      { label: 'Tất cả', count: 214 },
    ],
    0,
    { w: CW - 48 }
  )
  s += searchBox(CX + CW - 24 - 300, ty + 12, 300, 40, 'Tên khách, số điện thoại', { size: 14.5 })
  const st = {
    use: ['Đang dùng', 'success'],
    low: ['Sắp hết buổi', 'warning'],
    exp: ['Sắp hết hạn', 'danger'],
    done: ['Đã dùng hết', 'neutral'],
  }
  const data = [
    [
      'Nguyễn Hồng Nhung',
      '0903 112 458',
      'Chăm sóc da chuyên sâu',
      '10 buổi · 3.800.000 ₫',
      '02/08/2026',
      7,
      10,
      '02/02/2027',
      'use',
    ],
    [
      'Trần Yến Nhi',
      '0938 207 615',
      'Triệt lông nách',
      '10 buổi · 2.500.000 ₫',
      '15/06/2026',
      7,
      10,
      '15/06/2027',
      'use',
    ],
    [
      'Lê Kim Oanh',
      '0917 552 093',
      'Liệu trình trị mụn',
      '10 buổi · 4.200.000 ₫',
      '20/09/2026',
      4,
      10,
      '20/03/2027',
      'use',
    ],
    [
      'Phạm Thu Hà',
      '0986 431 270',
      'Massage body đá nóng',
      '5 buổi · 2.300.000 ₫',
      '10/07/2026',
      4,
      5,
      '10/01/2027',
      'low',
    ],
    [
      'Võ Diễm My',
      '0909 664 812',
      'Gội đầu dưỡng sinh',
      '20 buổi · 2.400.000 ₫',
      '01/05/2026',
      18,
      20,
      '01/05/2027',
      'low',
    ],
    [
      'Đặng Thanh Hà',
      '0932 118 746',
      'Tắm trắng',
      '8 buổi · 3.600.000 ₫',
      '12/11/2025',
      5,
      8,
      '12/11/2026',
      'exp',
    ],
    [
      'Bùi Phương Thảo',
      '0978 305 924',
      'Massage cổ vai gáy',
      '10 buổi · 2.000.000 ₫',
      '03/10/2026',
      1,
      10,
      '03/04/2027',
      'use',
    ],
    [
      'Hoàng Lan Anh',
      '0915 870 331',
      'Chăm sóc da cơ bản',
      '5 buổi · 1.250.000 ₫',
      '18/03/2026',
      5,
      5,
      '18/09/2026',
      'done',
    ],
  ]
  const rows = data.map(([n, ph, pk, pr, d, u, tot, ex, k]) => [
    { avatar: n, t: n, sub: ph },
    { t: pk, sub: pr },
    { t: d },
    {
      fn: (x, y, w, h) =>
        progress(x + 16, y + h / 2 - 4, w - 92, u / tot, {
          color: k === 'low' || k === 'exp' ? TONES.warning.dot : k === 'done' ? '#D0D5DD' : P,
          h: 8,
        }) +
        text(x + w - 16, y + h / 2 + 5, `${u}/${tot} buổi`, {
          size: 14,
          weight: 600,
          anchor: 'end',
        }),
    },
    { t: `${tot - u} buổi`, weight: 700, fill: tot - u <= 2 ? TONES.warning.fg : C.text },
    { t: ex, fill: k === 'exp' ? TONES.danger.fg : C.body, weight: k === 'exp' ? 600 : 400 },
    { badge: st[k][0], tone: st[k][1], dot: true },
  ])
  s += table(
    CX,
    ty + 70,
    CW,
    [
      { label: 'Khách hàng', w: 1.5 },
      { label: 'Gói liệu trình', w: 1.5 },
      { label: 'Ngày mua', w: 0.8 },
      { label: 'Đã dùng', w: 1.35 },
      { label: 'Còn lại', w: 0.7, align: 'right' },
      { label: 'Hạn dùng', w: 0.85 },
      { label: 'Trạng thái', w: 1 },
    ],
    rows,
    { rowH: 62, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Gói liệu trình',
      user: ctx.manager,
      title: 'Gói liệu trình',
      subtitle: 'Mỗi lần làm dịch vụ trong gói, hệ thống tự trừ buổi',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Bán gói', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-spa-salon/4.webp'] = (ctx) => {
  const kw = (CW - 60) / 4
  let s = ''
  ;[
    {
      label: 'Tổng hoa hồng tháng 9',
      value: vnd(38640000),
      delta: '+7,8%',
      note: 'so với tháng 8',
      icon: 'wallet',
    },
    {
      label: 'Doanh thu dịch vụ',
      value: vnd(352800000),
      delta: '+5,2%',
      note: 'so với tháng 8',
      icon: 'trend',
    },
    {
      label: 'Lượt dịch vụ',
      value: '1.124',
      note: 'Trong đó 412 lượt trừ vào gói',
      icon: 'sparkles',
    },
    { label: 'Dẫn đầu', value: 'Ngọc Anh', note: '186 lượt · 9.120.000 ₫', icon: 'star' },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), BODY_Y, kw, 132, o)))
  const cy = BODY_Y + 152
  const cw1 = 848
  const ch = 290
  s += card(CX, cy, cw1, ch, { title: 'Hoa hồng theo kỹ thuật viên' })
  const techs = [
    ['Ngọc Anh', 9.12],
    ['Thu Trang', 7.58],
    ['Bảo Vy', 6.53],
    ['Mai Hương', 4.79],
    ['Minh Thư', 4.12],
    ['Khánh Linh', 3.26],
    ['Hải Yến', 2.04],
    ['Tú Uyên', 1.2],
  ]
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 86, {
    labels: techs.map((t) => t[0]),
    series: [{ values: techs.map((t) => t[1] * 1e6), color: (i) => (i === 0 ? P : tint(P, 0.45)) }],
    max: 12e6,
    ticks: 4,
    fmt: vndShort,
    valueLabels: true,
    valueFmt: (v) => `${dec(v / 1e6, 2)} tr`,
    maxBar: 44,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Theo nhóm dịch vụ' })
  const grp = [
    ['Chăm sóc da', 42, P],
    ['Massage', 28, tint(P, 0.35)],
    ['Gội đầu dưỡng sinh', 14, tint(P, 0.6)],
    ['Móng và mi', 16, tint(P, 0.8)],
  ]
  s += donut(
    rx + 100,
    cy + 168,
    66,
    22,
    grp.map(([, v, c]) => ({ value: v, color: c })),
    { center: '4', centerSize: 22, sub: 'nhóm' }
  )
  grp.forEach(
    ([l, v, c], i) =>
      (s +=
        rect(rx + 196, cy + 102 + i * 40, 12, 12, { r: 3.5, fill: c }) +
        text(rx + 216, cy + 113 + i * 40, l, { size: 14.5, fill: C.text2, maxW: rw - 280 }) +
        text(rx + rw - 24, cy + 113 + i * 40, `${v}%`, { size: 14.5, weight: 700, anchor: 'end' }))
  )
  const by = cy + ch + 20
  s += card(CX, by, CW, BODY_B - by, {
    title: 'Bảng hoa hồng tháng 9/2026',
    link: 'Xem đủ 8 kỹ thuật viên',
  })
  const data = [
    ['Ngọc Anh', 186, 78400000, 7840000, 1280000],
    ['Thu Trang', 172, 66200000, 6620000, 960000],
    ['Bảo Vy', 158, 58900000, 5890000, 640000],
    ['Mai Hương', 149, 44700000, 4470000, 320000],
  ]
  s += table(
    CX,
    by + 58,
    CW,
    [
      { label: 'Kỹ thuật viên', w: 1.6 },
      { label: 'Số lượt', w: 0.7, align: 'right' },
      { label: 'Doanh thu dịch vụ', w: 1.2, align: 'right' },
      { label: 'Hoa hồng dịch vụ', w: 1.2, align: 'right' },
      { label: 'Thưởng bán gói', w: 1.1, align: 'right' },
      { label: 'Tổng hoa hồng', w: 1.1, align: 'right' },
    ],
    data.map(([n, q, r0, c0, b]) => [
      { avatar: n, t: n, weight: 600, fill: C.text },
      { t: String(q) },
      { t: num(r0) },
      { t: num(c0) },
      { t: num(b) },
      { t: num(c0 + b), weight: 700, fill: PD() },
    ]),
    { rowH: 46, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Hoa hồng',
      user: ctx.manager,
      title: 'Bảng hoa hồng tháng',
      subtitle: 'Hoa hồng cộng dồn theo từng dịch vụ kỹ thuật viên thực hiện',
      actions: [
        { label: 'Tháng 9/2026', variant: 'outline', icon: 'calendar' },
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Chốt bảng hoa hồng', icon: 'check' },
      ],
    },
    s
  )
}

// ============================================================ 11 · Cho thuê Sân thể thao
SCREENS['cho-thue-san-the-thao/1.webp'] = (ctx) => {
  let s = dateNav(CX, BODY_Y, 'Thứ Ba, 13/10/2026')
  s += segmented(
    CX + dateNavW('Thứ Ba, 13/10/2026') + 20,
    BODY_Y,
    ['Tất cả sân', 'Pickleball', 'Cầu lông', 'Bóng đá mini'],
    0
  )
  s += legendBadges(CX + CW, BODY_Y + 6, [
    ['Đang chơi', 'primary'],
    ['Đã cọc', 'info'],
    ['Cố định', 'violet'],
    ['Giữ chỗ', 'warning', true],
  ])
  const lgx =
    CX +
    CW -
    sum(['Đang chơi', 'Đã cọc', 'Cố định', 'Giữ chỗ'].map((l) => tw(l, 14, 500) + 44)) -
    tw('Giờ cao điểm', 14, 500) -
    30
  s +=
    rect(lgx, BODY_Y + 14, 14, 14, { r: 4, fill: tint(P, 0.88), stroke: tint(P, 0.6), sw: 1 }) +
    text(lgx + 20, BODY_Y + 26, 'Giờ cao điểm', { size: 14, fill: C.text2 })
  const ev = (col, from, to, title, sub, tn, extra = {}) => ({
    col,
    from,
    to,
    title,
    sub,
    tone: tn,
    ...extra,
  })
  const events = [
    ev(0, 15, 16, 'Anh Hoàng', 'Đã thanh toán', 'neutral'),
    ev(0, 17, 19, 'Nhóm Minh Khang', 'Cố định thứ Ba', 'primary', { sub2: 'Đang chơi · 4 người' }),
    ev(0, 19, 21, 'Chị Thảo', 'Đã cọc 220.000 ₫', 'info', { sub2: '0912 xxx 486' }),
    ev(1, 16, 17.5, 'Anh Tuấn', 'Đã thanh toán', 'neutral'),
    ev(1, 18, 20, 'CLB Pickleball Q7', 'Cố định thứ Ba', 'violet', { sub2: 'Giảm 10%' }),
    ev(1, 20, 22, 'Anh Bảo', 'Đã cọc 50%', 'info'),
    ev(2, 17, 18, 'Anh Long', 'Đang chơi', 'primary'),
    ev(2, 18, 19, 'Giữ chỗ', 'Còn 08:12 để cọc', 'warning', { dashed: true }),
    ev(2, 19, 21, 'Nhóm Sao Mai', 'Cố định thứ Ba', 'violet', { sub2: 'Giảm 10%' }),
    ev(3, 15.5, 17, 'Chị Hạnh', 'Đã thanh toán', 'neutral'),
    ev(3, 19, 20, 'Anh Phúc', 'Đã cọc 50%', 'info'),
    ev(4, 17, 19, 'Anh Dũng', 'Đang chơi', 'primary', { sub2: 'Thuê thêm 2 vợt' }),
    ev(4, 19, 21, 'Nhóm Hưng Phát', 'Cố định thứ Ba', 'violet'),
    ev(5, 18, 20, 'Chị Ngân', 'Đã cọc 50%', 'info'),
    ev(5, 20, 21, 'Giữ chỗ', 'Còn 12:40 để cọc', 'warning', { dashed: true }),
    ev(6, 17, 18.5, 'Đội Phú An', 'Đang chơi', 'primary', { sub2: '10 người' }),
    ev(6, 18.5, 20, 'Đội Tân Phong', 'Cố định thứ Ba', 'violet'),
    ev(6, 20, 21.5, 'Đội Kỹ Thuật', 'Đã cọc 50%', 'info'),
  ]
  s += timeGrid(CX, BODY_Y + 60, CW, BODY_B - BODY_Y - 60, {
    cols: [
      { title: 'Pickleball 1', sub: 'Trong nhà' },
      { title: 'Pickleball 2', sub: 'Trong nhà' },
      { title: 'Pickleball 3', sub: 'Ngoài trời' },
      { title: 'Pickleball 4', sub: 'Ngoài trời' },
      { title: 'Cầu lông 1', sub: 'Thảm PVC' },
      { title: 'Cầu lông 2', sub: 'Thảm PVC' },
      { title: 'Bóng đá mini A', sub: 'Sân 7 người' },
    ],
    start: 15,
    end: 22,
    now: 17 + 24 / 60,
    events,
    band: [17, 21],
    headH: 62,
  })
  return appShell(
    ctx,
    {
      active: 'Lịch sân',
      title: 'Lịch sân',
      subtitle: '7 sân · công suất hôm nay 76% · 2 lượt đang giữ chỗ chờ cọc',
      actions: [
        { label: 'Hôm nay', variant: 'outline', icon: 'calendar' },
        { label: 'Đặt sân', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['cho-thue-san-the-thao/2.webp'] = () => {
  const screen = (x, y, w, h) => {
    let s = phoneHeader(x, y, w, 'Sân thể thao Phú An', 'Đặt sân online', {
      right: iconBtn(x + w - 60, y + 12, 'phone', { stroke: 'none', fill: C.muted }),
    })
    const bx = x + 18
    const bw = w - 36
    let cy = y + 80
    s += segmented(bx, cy, ['Pickleball', 'Cầu lông', 'Bóng đá'], 0, { h: 40, size: 14, padX: 22 })
    cy += 58
    const days = [
      ['T3', '13'],
      ['T4', '14'],
      ['T5', '15'],
      ['T6', '16'],
      ['T7', '17'],
      ['CN', '18'],
    ]
    const dw = (bw - 5 * 8) / 6
    days.forEach(([a, b], i) => {
      const dx = bx + i * (dw + 8)
      const on = i === 1
      s += rect(dx, cy, dw, 62, { r: 12, fill: on ? P : '#fff', stroke: on ? P : C.border })
      s +=
        text(dx + dw / 2, cy + 23, a, {
          size: 12.5,
          fill: on ? '#fff' : C.text3,
          anchor: 'middle',
        }) +
        text(dx + dw / 2, cy + 48, b, {
          size: 17,
          weight: 700,
          fill: on ? '#fff' : C.text,
          anchor: 'middle',
        })
    })
    cy += 90
    s +=
      text(bx, cy, 'Chọn khung giờ', { size: 16, weight: 700 }) +
      text(bx + bw, cy, 'Giá mỗi giờ', { size: 13, fill: C.text3, anchor: 'end' })
    cy += 16
    const courts = ['Sân 1', 'Sân 2', 'Sân 3', 'Sân 4']
    const lw = 52
    const cw = (bw - lw - 3 * 6) / 4
    courts.forEach(
      (c, i) =>
        (s += text(bx + lw + i * (cw + 6) + cw / 2, cy + 14, c, {
          size: 13,
          weight: 600,
          fill: C.text2,
          anchor: 'middle',
        }))
    )
    const times = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
    const grid = [
      [1, 1, 0, 1],
      [0, 1, 0, 0],
      [0, 2, 0, 1],
      [1, 2, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 1, 1],
    ]
    const price = ['120.000', '220.000', '220.000', '220.000', '180.000', '180.000']
    times.forEach((t, r) => {
      const ry = cy + 26 + r * 50
      s += text(bx, ry + 27, t, { size: 13.5, weight: 600, fill: C.text2 })
      grid[r].forEach((k, ci) => {
        const cx = bx + lw + ci * (cw + 6)
        if (k === 0)
          s +=
            rect(cx, ry, cw, 42, { r: 9, fill: C.muted }) +
            text(cx + cw / 2, ry + 26, 'Đã đặt', { size: 12, fill: C.text3, anchor: 'middle' })
        else if (k === 2)
          s +=
            rect(cx, ry, cw, 42, { r: 9, fill: P }) +
            icon('check', cx + cw / 2 - 8, ry + 5, 14, '#fff', { sw: 3 }) +
            text(cx + cw / 2, ry + 35, price[r], {
              size: 11.5,
              weight: 600,
              fill: '#fff',
              anchor: 'middle',
            })
        else
          s +=
            rect(cx, ry, cw, 42, { r: 9, fill: '#fff', stroke: '#D0D5DD' }) +
            text(cx + cw / 2, ry + 26, price[r], {
              size: 12.5,
              weight: 600,
              fill: C.body,
              anchor: 'middle',
            })
      })
    })
    const fy = y + h - 196
    s += rect(x, fy, w, 196, { fill: '#fff' }) + line(x, fy, x + w, fy, { stroke: C.border })
    s += text(bx, fy + 30, 'Sân 2 · 18:00 – 20:00 · Thứ Tư 14/10', {
      size: 14.5,
      weight: 700,
      maxW: bw,
    })
    s +=
      text(bx, fy + 56, 'Tổng 440.000 ₫', { size: 14, fill: C.text2 }) +
      text(bx + bw, fy + 56, 'Cọc 50%: 220.000 ₫', {
        size: 14.5,
        weight: 700,
        fill: PD(),
        anchor: 'end',
      })
    s +=
      rect(bx, fy + 70, bw, 34, { r: 10, fill: TONES.warning.bg }) +
      icon('timer', bx + 10, fy + 77, 18, TONES.warning.fg) +
      text(bx + 36, fy + 92, 'Giữ chỗ 15 phút chờ đặt cọc · còn 14:52', {
        size: 13,
        weight: 600,
        fill: TONES.warning.fg,
        maxW: bw - 46,
      })
    s += button(bx, fy + 116, 'Đặt cọc 220.000 ₫', { w: bw, h: 52, r: 14, size: 16.5, icon: 'qr' })
    return s
  }
  return phoneScene(screen, [
    {
      x: 236,
      y: 290,
      icon: 'timer',
      title: 'Giữ chỗ 15 phút',
      sub: 'Quá giờ chưa cọc tự nhả sân',
      tone: 'warning',
    },
    {
      x: 1064,
      y: 580,
      icon: 'repeat',
      title: 'Đặt cố định hằng tuần',
      sub: 'Khách quen được giảm 10%',
    },
  ])
}
SCREENS['cho-thue-san-the-thao/3.webp'] = (ctx) => {
  let s = segmented(
    CX,
    BODY_Y,
    ['Pickleball · 4 sân', 'Cầu lông · 2 sân', 'Bóng đá mini · 1 sân'],
    0,
    { h: 42 }
  )
  s += text(CX + CW, BODY_Y + 27, 'Áp dụng từ 01/10/2026 · giá tính theo giờ', {
    size: 14.5,
    fill: C.text3,
    anchor: 'end',
  })
  const ty = BODY_Y + 62
  const th = 380
  s += card(CX, ty, CW, th, { title: 'Bảng giá Pickleball', link: 'Lịch sử thay đổi' })
  const rows = [
    ['Sáng sớm', '05:00 – 08:00', 140000, 180000, 200000, ''],
    ['Ban ngày', '08:00 – 16:00', 120000, 160000, 200000, ''],
    ['Chiều tối', '16:00 – 20:00', 220000, 240000, 260000, 'peak'],
    ['Tối', '20:00 – 22:00', 180000, 220000, 240000, ''],
  ].map(([n, t, a, b, c, k]) => ({
    bg: k ? tint(P, 0.96) : undefined,
    cells: [
      { t: n, weight: 700, fill: C.text, sub: t },
      { t: vnd(a), weight: 600, fill: C.text },
      { t: vnd(b), weight: 600, fill: C.text },
      { t: vnd(c), weight: 600, fill: C.text },
      k ? { badge: 'Giờ cao điểm', tone: 'primary', icon: 'zap' } : { t: '—', fill: C.text3 },
      { fn: (x, y, w, h) => icon('edit', x + w / 2 - 10, y + h / 2 - 10, 20, C.text3) },
    ],
  }))
  s += table(
    CX,
    ty + 62,
    CW,
    [
      { label: 'Khung giờ', w: 1.3 },
      { label: 'Thứ 2 – Thứ 6', w: 1 },
      { label: 'Thứ 7, Chủ nhật', w: 1 },
      { label: 'Ngày lễ', w: 1 },
      { label: 'Ghi chú', w: 1 },
      { label: '', w: 70 },
    ],
    rows,
    { rowH: 70, headTop: true }
  )
  const by = ty + th + 20
  const bw = (CW - 20) / 2
  const bh = BODY_B - by
  s += card(CX, by, bw, bh, { title: 'Ưu đãi và chính sách cọc' })
  const pol = [
    ['repeat', 'Đặt cố định hằng tuần (từ 4 tuần)', 'Giảm 10%'],
    ['wallet', 'Tiền cọc khi đặt online', '50% giá trị'],
    ['timer', 'Giữ chỗ chờ cọc', '15 phút'],
    ['undo', 'Hủy trước 24 giờ', 'Hoàn 100% cọc'],
    ['alert', 'Hủy trong 24 giờ', 'Hoàn 50% cọc'],
  ]
  pol.forEach(([ic, a, b], i) => {
    const yy = by + 64 + i * 44
    s +=
      icon(ic, CX + 24, yy, 20, PD()) +
      text(CX + 56, yy + 15, a, { size: 15, fill: C.body }) +
      text(CX + bw - 24, yy + 15, b, { size: 15, weight: 700, anchor: 'end' })
  })
  const rx = CX + bw + 20
  s += card(rx, by, bw, bh, { title: 'Dịch vụ bán kèm', link: '+ Thêm' })
  const sv = [
    ['cupSoda', 'Nước suối 500ml', vnd(10000), 'mint'],
    ['cupSoda', 'Nước điện giải', vnd(20000), 'sky'],
    ['target', 'Thuê vợt pickleball', `${vnd(30000)}/lượt`, 'orange'],
    ['target', 'Bóng pickleball (3 quả)', vnd(60000), 'lime'],
    ['shirt', 'Khăn lạnh', vnd(5000), 'cream'],
  ]
  sv.forEach(([ic, a, b, pal], i) => {
    const yy = by + 58 + i * 44
    s +=
      photo(rx + 24, yy, 32, 32, pal, ic, { r: 8, sw: 2.2, iconScale: 0.6 }) +
      text(rx + 70, yy + 21, a, { size: 15, fill: C.body }) +
      text(rx + bw - 24, yy + 21, b, { size: 15, weight: 700, anchor: 'end' })
  })
  return appShell(
    ctx,
    {
      active: 'Bảng giá',
      user: ctx.manager,
      title: 'Bảng giá theo khung giờ',
      subtitle: 'Giá tự tính theo khung giờ và ngày trong tuần khi khách đặt sân',
      actions: [{ label: 'Thêm khung giá', icon: 'plus' }],
    },
    s
  )
}
SCREENS['cho-thue-san-the-thao/4.webp'] = (ctx) => {
  const kw = (CW - 60) / 4
  let s = ''
  ;[
    {
      label: 'Công suất trung bình',
      value: '68%',
      delta: '+5 điểm',
      note: 'so với tháng trước',
      icon: 'gauge',
    },
    {
      label: 'Giờ sân đã bán',
      value: '1.428 giờ',
      delta: '+8,3%',
      note: '30 ngày qua',
      icon: 'clock',
    },
    {
      label: 'Doanh thu sân',
      value: vnd(286400000),
      delta: '+11,2%',
      note: '30 ngày qua',
      icon: 'wallet',
    },
    { label: 'Khách đặt cố định', value: '34', note: 'Chiếm 41% giờ cao điểm', icon: 'repeat' },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), BODY_Y, kw, 132, o)))
  const cy = BODY_Y + 152
  const cw1 = 848
  const ch = 330
  s += card(CX, cy, cw1, ch, {
    title: 'Công suất theo khung giờ',
    sub: 'Tỉ lệ giờ đã đặt, 30 ngày qua',
  })
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  const hours = range(17).map((i) => 5 + i)
  const hx = CX + 64
  const hy = cy + 96
  const cwH = (cw1 - 64 - 24) / 17
  const chH = (ch - 96 - 46) / 7
  const rnd = mulberry32(11)
  days.forEach((d, r) => {
    s += text(CX + 24, hy + r * chH + chH / 2 + 5, d, { size: 13.5, weight: 600, fill: C.text2 })
    hours.forEach((h, c) => {
      const wk = r >= 5
      let v = h < 8 ? 0.6 : h < 16 ? (wk ? 0.62 : 0.28) : h === 16 ? 0.62 : h <= 20 ? 0.93 : 0.66
      v = Math.max(0.05, Math.min(1, v + (rnd() - 0.5) * 0.18))
      s += rect(hx + c * cwH + 2, hy + r * chH + 2, cwH - 4, chH - 4, {
        r: 5,
        fill: mix(tint(P, 0.94), P, v),
      })
    })
  })
  hours.forEach(
    (h, c) =>
      c % 2 === 0 &&
      (s += text(hx + c * cwH + cwH / 2, hy + 7 * chH + 22, `${h}h`, {
        size: 12.5,
        fill: C.text3,
        anchor: 'middle',
      }))
  )
  s += text(CX + cw1 - 24 - 166, cy + 38, 'Thấp', { size: 13, fill: C.text3, anchor: 'end' })
  range(5).forEach(
    (i) =>
      (s += rect(CX + cw1 - 24 - 156 + i * 24, cy + 26, 20, 16, {
        r: 4,
        fill: mix(tint(P, 0.94), P, i / 4),
      }))
  )
  s += text(CX + cw1 - 24, cy + 38, 'Cao', { size: 13, fill: C.text3, anchor: 'end' })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Công suất theo sân' })
  const courts = [
    ['Pickleball 1', 84],
    ['Pickleball 2', 79],
    ['Pickleball 3', 71],
    ['Pickleball 4', 66],
    ['Cầu lông 1', 62],
    ['Bóng đá mini A', 58],
  ]
  s += hbars(
    rx + 24,
    cy + 62,
    rw - 48,
    courts.map(([l, v]) => ({ label: l, value: v, display: `${v}%` })),
    { max: 100, rowH: 43 }
  )
  const by = cy + ch + 20
  const bh = BODY_B - by
  s += card(CX, by, cw1, bh, { title: 'Doanh thu sân 30 ngày' })
  const rv = range(30).map(
    (i) => 8.2e6 + Math.sin(i / 2.2) * 1.4e6 + (i % 7 >= 5 ? 1.8e6 : 0) + i * 30000
  )
  s += lineChart(CX + 24, by + 56, cw1 - 48, bh - 66, {
    labels: range(30).map((i) => dateAgo(29 - i).slice(0, 5)),
    series: [{ values: rv, color: P, area: true, lastDot: true }],
    max: 15e6,
    ticks: 3,
    fmt: vndShort,
    labelEvery: 6,
  })
  s += card(rx, by, rw, bh, { title: 'Bán kèm 30 ngày' })
  s += hbars(
    rx + 24,
    by + 62,
    rw - 48,
    [
      ['Nước uống', 6200000],
      ['Thuê vợt', 4800000],
      ['Bóng, khăn lạnh', 1900000],
    ].map(([l, v]) => ({ label: l, value: v, display: vnd(v) })),
    { rowH: 50 }
  )
  s +=
    rect(rx + 24, by + bh - 70, rw - 48, 48, { r: 12, fill: C.soft, stroke: C.line }) +
    icon('trend', rx + 40, by + bh - 56, 20, PD()) +
    text(rx + 70, by + bh - 40, '46% lượt đặt có mua kèm dịch vụ', {
      size: 14.5,
      weight: 600,
      fill: C.body,
      maxW: rw - 100,
    })
  return appShell(
    ctx,
    {
      active: 'Báo cáo',
      user: ctx.manager,
      title: 'Báo cáo công suất sân',
      subtitle: '30 ngày qua · từ 14/09/2026 đến 13/10/2026',
      actions: [
        { label: '30 ngày', variant: 'outline', icon: 'calendar' },
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
      ],
    },
    s
  )
}

// ============================================================ 13 · CRM Quản lý Khách hàng
function dealCard(d) {
  return (x, y, w) => {
    const nl = wrap(d.co, w - 32, 15, 700, 2)
    const h = 60 + nl.length * 20 + 72 + (d.tag ? 30 : 0)
    let s = rect(x, y, w, h, { r: 12, fill: '#fff', stroke: C.border, sh: 'sh' })
    let cy = y + 16
    if (d.tag) {
      s += badge(x + 14, cy, d.tag[0], d.tag[1], { h: 22, size: 12, padX: 8, dot: true })
      cy += 30
    }
    s += lines(x + 14, cy + 15, nl, { size: 15, weight: 700, lh: 20 })
    cy += nl.length * 20
    s += text(x + 14, cy + 18, d.deal, { size: 13.5, fill: C.text2, maxW: w - 28 })
    s += text(x + 14, cy + 50, vnd(d.v), { size: 16, weight: 700, fill: PD() })
    s += line(x + 14, cy + 66, x + w - 14, cy + 66, { stroke: C.line })
    s +=
      avatar(x + 26, cy + 88, 12, d.who) +
      text(x + 44, cy + 93, d.who.split(' ').slice(-2).join(' '), {
        size: 13,
        fill: C.text2,
        maxW: 90,
      })
    s +=
      icon(
        d.done ? 'checkCircle' : 'calendar',
        x + w - 84,
        cy + 81,
        15,
        d.done ? TONES.success.dot : d.late ? '#F04438' : C.text3
      ) +
      text(x + w - 14, cy + 93, d.date, {
        size: 13,
        weight: d.late ? 600 : 400,
        fill: d.late ? '#B42318' : C.text2,
        anchor: 'end',
      })
    return { s, h }
  }
}
SCREENS['crm-quan-ly-khach-hang/1.webp'] = (ctx) => {
  let s =
    segmented(CX, BODY_Y, ['Kanban', 'Danh sách'], 0) +
    input(CX + 196, BODY_Y, 220, { value: 'Sales: Tất cả (6)', select: true, h: 40 }) +
    input(CX + 432, BODY_Y, 200, { value: 'Nguồn: Tất cả', select: true, h: 40 })
  s += text(CX + CW, BODY_Y + 26, 'Dự kiến chốt trong tháng: 1,38 tỷ ₫', {
    size: 15,
    weight: 600,
    fill: C.body,
    anchor: 'end',
  })
  const cols = [
    {
      title: 'Mới',
      color: '#98A2B3',
      count: 8,
      sub: '1,12 tỷ',
      deals: [
        {
          co: 'Nhà hàng Hương Quê',
          deal: 'Máy POS và phần mềm bán hàng',
          v: 86000000,
          who: 'Trần Quốc Hùng',
          date: '20/10',
          tag: ['Giới thiệu', 'neutral'],
        },
        {
          co: 'Trường Mầm non Hoa Sen',
          deal: 'Camera và màn hình lớp học',
          v: 145000000,
          who: 'Nguyễn Thu Ngân',
          date: '22/10',
        },
        {
          co: 'Công ty Logistics Sao Việt',
          deal: 'Máy in mã vạch cho kho',
          v: 64000000,
          who: 'Lê Hoàng Nam',
          date: '25/10',
        },
      ],
    },
    {
      title: 'Đã liên hệ',
      color: TONES.info.dot,
      count: 11,
      sub: '1,86 tỷ',
      deals: [
        {
          co: 'Công ty CP Thực phẩm Minh Long',
          deal: '40 bộ máy tính văn phòng',
          v: 520000000,
          who: 'Trần Quốc Hùng',
          date: '16/10',
          tag: ['Nóng', 'danger'],
        },
        {
          co: 'Nha khoa Smile',
          deal: 'Phần mềm quản lý phòng khám',
          v: 96000000,
          who: 'Đỗ Mỹ Linh',
          date: '12/10',
          late: true,
        },
        {
          co: 'Khách sạn Biển Xanh',
          deal: 'Wifi và tổng đài nội bộ',
          v: 238000000,
          who: 'Phạm Đức Anh',
          date: '21/10',
        },
      ],
    },
    {
      title: 'Gửi báo giá',
      color: TONES.warning.dot,
      count: 9,
      sub: '1,94 tỷ',
      deals: [
        {
          co: 'Chuỗi cafe Mộc',
          deal: '5 bộ POS cho chi nhánh mới',
          v: 175000000,
          who: 'Nguyễn Thu Ngân',
          date: '15/10',
          tag: ['Khách đã xem báo giá', 'info'],
        },
        {
          co: 'Công ty May Phú Thịnh',
          deal: 'Chấm công khuôn mặt 300 người',
          v: 260000000,
          who: 'Võ Thanh Tâm',
          date: '19/10',
        },
        {
          co: 'Siêu thị mini An Phú',
          deal: 'Phần mềm bán hàng 3 cửa hàng',
          v: 72000000,
          who: 'Lê Hoàng Nam',
          date: '24/10',
        },
      ],
    },
    {
      title: 'Thương lượng',
      color: TONES.violet.dot,
      count: 6,
      sub: '1,38 tỷ',
      deals: [
        {
          co: 'Tập đoàn Giáo dục Ánh Dương',
          deal: 'Máy chiếu cho 24 phòng học',
          v: 612000000,
          who: 'Trần Quốc Hùng',
          date: '17/10',
          tag: ['Nóng', 'danger'],
        },
        {
          co: 'Bệnh viện Đa khoa Tâm An',
          deal: 'Màn hình gọi số và kiosk',
          v: 348000000,
          who: 'Phạm Đức Anh',
          date: '28/10',
        },
      ],
    },
    {
      title: 'Đã chốt',
      color: TONES.success.dot,
      count: 5,
      sub: '0,54 tỷ',
      deals: [
        {
          co: 'Văn phòng Luật Tín Nghĩa',
          deal: 'Máy photocopy đa năng',
          v: 96000000,
          who: 'Đỗ Mỹ Linh',
          date: '09/10',
          done: true,
          tag: ['Đã ký hợp đồng', 'success'],
        },
        {
          co: 'Du lịch Hành Trình Việt',
          deal: '15 laptop cho nhân viên',
          v: 285000000,
          who: 'Nguyễn Thu Ngân',
          date: '06/10',
          done: true,
          tag: ['Đã ký hợp đồng', 'success'],
        },
        {
          co: 'Nhà thuốc Phúc Khang',
          deal: 'Phần mềm bán thuốc 2 chi nhánh',
          v: 48000000,
          who: 'Võ Thanh Tâm',
          date: '02/10',
          done: true,
        },
      ],
    },
  ]
  const cw = (CW - 4 * 16) / 5
  cols.forEach(
    (c, i) =>
      (s += kanbanCol(
        CX + i * (cw + 16),
        BODY_Y + 60,
        cw,
        BODY_B - BODY_Y - 60,
        { title: c.title, color: c.color, count: c.count, sub: c.sub },
        c.deals.map(dealCard)
      ))
  )
  return appShell(
    ctx,
    {
      active: 'Cơ hội',
      user: ctx.manager,
      title: 'Cơ hội bán hàng',
      subtitle: '39 cơ hội · tổng giá trị 6,84 tỷ ₫ · kéo thả thẻ để chuyển giai đoạn',
      actions: [
        { label: 'Nhập từ Excel', variant: 'outline', icon: 'upload' },
        { label: 'Thêm cơ hội', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['crm-quan-ly-khach-hang/2.webp'] = (ctx) => {
  const lw = 400
  let s = card(CX, BODY_Y, lw, BODY_B - BODY_Y)
  s +=
    rect(CX + 24, BODY_Y + 24, 64, 64, { r: 16, fill: tint(P, 0.88) }) +
    text(CX + 56, BODY_Y + 64, 'ML', { size: 22, weight: 700, fill: PD(), anchor: 'middle' })
  s += lines(CX + 104, BODY_Y + 48, wrap('Công ty CP Thực phẩm Minh Long', lw - 128, 18, 700, 2), {
    size: 18,
    weight: 700,
    lh: 24,
  })
  s += badge(CX + 104, BODY_Y + 86, 'Khách hàng tiềm năng', 'primary', {
    h: 24,
    size: 12.5,
    padX: 9,
  })
  const info = [
    ['Mã số thuế', '0315 482 769'],
    ['Ngành nghề', 'Sản xuất thực phẩm'],
    ['Quy mô', '200 – 500 nhân viên'],
    ['Địa chỉ', 'KCN Tân Tạo, TP. Hồ Chí Minh'],
    ['Nguồn', 'Hội chợ triển lãm 09/2026'],
  ]
  info.forEach(
    ([a, b], i) =>
      (s +=
        text(CX + 24, BODY_Y + 152 + i * 50, a, { size: 13.5, fill: C.text3 }) +
        text(CX + 24, BODY_Y + 174 + i * 50, b, { size: 15.5, weight: 600, maxW: lw - 48 }))
  )
  let y = BODY_Y + 152 + 5 * 50
  s +=
    text(CX + 24, y, 'Phụ trách', { size: 13.5, fill: C.text3 }) +
    avatar(CX + 38, y + 24, 14, 'Trần Quốc Hùng') +
    text(CX + 60, y + 29, 'Trần Quốc Hùng', { size: 15.5, weight: 600 })
  y += 66
  s += line(CX + 24, y, CX + lw - 24, y, { stroke: C.line })
  s +=
    text(CX + 24, y + 34, 'Người liên hệ (3)', { size: 16, weight: 700 }) +
    text(CX + lw - 24, y + 34, '+ Thêm', { size: 14, weight: 600, fill: PD(), anchor: 'end' })
  const ppl = [
    ['Phạm Thu Hằng', 'Trưởng phòng mua hàng'],
    ['Nguyễn Văn Long', 'Giám đốc'],
    ['Lê Minh Tú', 'Phụ trách IT'],
  ]
  ppl.forEach(([n, r], i) => {
    const yy = y + 56 + i * 60
    s +=
      avatar(CX + 44, yy + 18, 18, n) +
      text(CX + 72, yy + 14, n, { size: 15, weight: 600 }) +
      text(CX + 72, yy + 34, r, { size: 13.5, fill: C.text3 })
    s +=
      iconBtn(CX + lw - 24 - 76, yy, 'phone', { size: 34, r: 9 }) +
      iconBtn(CX + lw - 24 - 34, yy, 'mail', { size: 34, r: 9 })
  })
  const rx = CX + lw + 20
  const rw = CW - lw - 20
  s += card(rx, BODY_Y, rw, 132)
  s +=
    text(rx + 24, BODY_Y + 38, 'Cơ hội: 40 bộ máy tính văn phòng', { size: 17, weight: 700 }) +
    text(rx + rw - 24, BODY_Y + 38, vnd(520000000), {
      size: 18,
      weight: 700,
      fill: PD(),
      anchor: 'end',
    })
  const stages = ['Mới', 'Đã liên hệ', 'Gửi báo giá', 'Thương lượng', 'Chốt']
  const sw = (rw - 48) / 5
  stages.forEach((st, i) => {
    const sx = rx + 24 + i * sw
    const done = i < 1
    const cur = i === 1
    const fill = done ? tint(P, 0.75) : cur ? P : C.muted
    const d = `M${sx},${BODY_Y + 62} H${sx + sw - 14} L${sx + sw},${BODY_Y + 84} L${sx + sw - 14},${BODY_Y + 106} H${sx} ${i > 0 ? `L${sx + 14},${BODY_Y + 84}` : ''} Z`
    s += path(d, { fill, stroke: '#fff', sw: 3 })
    s += text(sx + sw / 2 + 4, BODY_Y + 89, st, {
      size: 14,
      weight: 600,
      fill: cur ? '#fff' : done ? shade(P, 0.35) : C.text2,
      anchor: 'middle',
    })
  })
  const ty = BODY_Y + 152
  const th = BODY_B - ty
  s += card(rx, ty, rw, th)
  s += tabs(
    rx + 24,
    ty + 12,
    [
      { label: 'Lịch sử tương tác', count: 14 },
      { label: 'Cơ hội', count: 2 },
      { label: 'Báo giá', count: 3 },
      { label: 'Ghi chú' },
    ],
    0,
    { w: rw - 48 }
  )
  s += input(rx + 24, ty + 74, rw - 48 - 3 * 48, {
    placeholder: 'Ghi nhanh kết quả gọi điện, gặp khách…',
    h: 44,
  })
  ;['phone', 'mail', 'calendar'].forEach(
    (ic, i) => (s += iconBtn(rx + rw - 24 - (3 - i) * 48 + 8, ty + 76, ic, { size: 40 }))
  )
  s += rect(rx + 24, ty + 136, rw - 48, 52, { r: 12, fill: TONES.warning.bg })
  s +=
    icon('clock', rx + 40, ty + 150, 22, TONES.warning.fg) +
    text(
      rx + 74,
      ty + 168,
      'Việc sắp tới: Gặp trực tiếp chị Hằng tại văn phòng khách · 16/10/2026 09:30',
      { size: 14.5, weight: 600, fill: TONES.warning.fg, maxW: rw - 120 }
    )
  const ev = [
    [
      'phone',
      'info',
      'Gọi điện cho chị Phạm Thu Hằng',
      '13/10/2026 09:15 · Trần Quốc Hùng',
      'Chị Hằng xác nhận cần 40 bộ, muốn giao trước 15/11. Hẹn gặp trực tiếp thứ Sáu.',
      ['Tích cực', 'success'],
    ],
    [
      'file',
      'warning',
      'Gửi báo giá BG-2610-018 · 520.000.000 ₫',
      '10/10/2026 14:30 · Trần Quốc Hùng',
      '40 bộ máy tính văn phòng kèm bảo hành 36 tháng, giao lắp trong 10 ngày.',
      ['Khách đã xem 3 lần', 'info'],
    ],
    [
      'users',
      'primary',
      'Gặp khách tại văn phòng',
      '07/10/2026 10:00 · Trần Quốc Hùng',
      'Khảo sát hiện trạng 3 phòng ban, ghi nhận yêu cầu cấu hình và ngân sách.',
      null,
    ],
    [
      'mail',
      'neutral',
      'Gửi email hồ sơ năng lực',
      '02/10/2026 16:45 · Trần Quốc Hùng',
      'Kèm danh sách khách hàng tiêu biểu trong ngành thực phẩm.',
      null,
    ],
  ]
  ev.forEach(([ic, tn, t, meta, body, bd], i) => {
    const yy = ty + 216 + i * 96
    const T = tone(tn)
    if (i < ev.length - 1)
      s += line(rx + 44, yy + 40, rx + 44, yy + 96, { stroke: C.border, sw: 2 })
    s += circle(rx + 44, yy + 18, 18, { fill: T.bg }) + icon(ic, rx + 35, yy + 9, 18, T.fg)
    s +=
      text(rx + 76, yy + 16, t, { size: 15.5, weight: 700, maxW: rw - 300 }) +
      text(rx + rw - 24, yy + 16, meta, { size: 13, fill: C.text3, anchor: 'end' })
    s += text(rx + 76, yy + 42, body, { size: 14.5, fill: C.body, maxW: rw - 110 })
    if (bd) s += badge(rx + 76, yy + 54, bd[0], bd[1], { h: 22, size: 12, padX: 8 })
  })
  return appShell(
    ctx,
    {
      active: 'Khách hàng',
      title: 'Hồ sơ khách hàng',
      back: true,
      badge: ['Nóng', 'danger'],
      subtitle: 'Khách hàng từ 28/09/2026 · tương tác gần nhất hôm nay 09:15',
      actions: [
        { label: 'Gửi báo giá', variant: 'outline', icon: 'file' },
        { label: 'Ghi hoạt động', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['crm-quan-ly-khach-hang/3.webp'] = (ctx) => {
  let s =
    dateNav(CX, BODY_Y, '12/10 – 18/10/2026') +
    segmented(CX + dateNavW('12/10 – 18/10/2026') + 20, BODY_Y, ['Ngày', 'Tuần', 'Tháng'], 1)
  s += input(
    CX + dateNavW('12/10 – 18/10/2026') + 40 + segW(['Ngày', 'Tuần', 'Tháng']),
    BODY_Y,
    230,
    { value: 'Nhân viên: Tất cả', select: true, h: 40 }
  )
  s += legendBadges(CX + CW, BODY_Y + 6, [
    ['Gọi điện', 'info'],
    ['Gặp khách', 'primary'],
    ['Báo giá', 'warning'],
    ['Demo', 'violet'],
    ['Quá hạn', 'danger'],
  ])
  const ev = (col, from, to, title, sub, tn) => ({ col, from, to, title, sub, tone: tn })
  const events = [
    ev(0, 9, 10, 'Gọi · Sao Việt', 'Xác nhận nhu cầu', 'info'),
    ev(0, 14, 15.5, 'Demo · Hoa Sen', 'Tại trường, Quận 3', 'violet'),
    ev(1, 9, 10, 'Gọi · Minh Long', 'Chị Hằng, mua hàng', 'info'),
    ev(1, 10.5, 12, 'Gặp · Ánh Dương', 'Thương lượng điều khoản', 'primary'),
    ev(1, 14, 15, 'Báo giá · Hương Quê', 'POS và phần mềm', 'warning'),
    ev(1, 16, 17, 'Gọi lại · Biển Xanh', 'Quá hạn từ hôm qua', 'danger'),
    ev(2, 9, 10.5, 'Gặp · Phú Thịnh', 'Khảo sát xưởng may', 'primary'),
    ev(2, 13.5, 14.5, 'Gọi · Nha khoa Smile', 'Nhắc lịch demo', 'info'),
    ev(2, 15, 16, 'Báo giá · An Phú', '3 cửa hàng', 'warning'),
    ev(3, 8.5, 9.5, 'Gọi · Mộc Cafe', 'Nhắc phản hồi báo giá', 'info'),
    ev(3, 10, 12, 'Demo · Tâm An', 'Màn hình gọi số', 'violet'),
    ev(3, 14, 15, 'Gọi · Hành Trình Việt', 'Hỏi thăm sau bàn giao', 'info'),
    ev(4, 9.5, 11, 'Gặp · Minh Long', 'Gặp trực tiếp chị Hằng', 'primary'),
    ev(4, 14, 15, 'Báo giá · Sao Việt', 'Máy in mã vạch', 'warning'),
    ev(4, 16, 17, 'Họp đội kinh doanh', 'Tổng kết tuần', 'neutral'),
    ev(5, 9, 10, 'Gọi · Tín Nghĩa', 'Chăm sóc sau bán', 'info'),
  ]
  const days = [
    ['Thứ 2', '12/10'],
    ['Thứ 3', '13/10'],
    ['Thứ 4', '14/10'],
    ['Thứ 5', '15/10'],
    ['Thứ 6', '16/10'],
    ['Thứ 7', '17/10'],
    ['Chủ nhật', '18/10'],
  ]
  s += timeGrid(CX, BODY_Y + 60, CW, BODY_B - BODY_Y - 60, {
    cols: days.map(([a, b], i) => ({ title: a, sub: b, highlight: i === 1 })),
    start: 8,
    end: 18,
    now: 11.25,
    nowCol: 1,
    events,
    headH: 62,
  })
  return appShell(
    ctx,
    {
      active: 'Lịch chăm sóc',
      user: ctx.manager,
      title: 'Lịch chăm sóc khách hàng',
      subtitle: '16 hoạt động trong tuần · 1 việc quá hạn cần xử lý',
      actions: [
        { label: 'Hôm nay', variant: 'outline', icon: 'calendar' },
        { label: 'Thêm lịch hẹn', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['crm-quan-ly-khach-hang/4.webp'] = (ctx) => {
  const kw = (CW - 60) / 4
  let s = ''
  ;[
    { label: 'Doanh số tháng 10', value: '2,48 tỷ ₫', icon: 'wallet' },
    {
      label: 'Hợp đồng thắng',
      value: '18',
      delta: '+4',
      note: 'so với tháng 9',
      icon: 'checkCircle',
    },
    {
      label: 'Tỉ lệ chuyển đổi',
      value: '24,6%',
      delta: '+2,1 điểm',
      note: 'cơ hội thành hợp đồng',
      icon: 'target',
    },
    { label: 'Giá trị trung bình', value: vnd(137800000), note: 'mỗi hợp đồng', icon: 'trend' },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), BODY_Y, kw, 132, o)))
  s +=
    progress(CX + 24, BODY_Y + 98, kw - 48, 0.62, { h: 6 }) +
    text(CX + 24, BODY_Y + 122, 'Đạt 62% mục tiêu 4 tỷ ₫', { size: 13.5, fill: C.text3 })
  const cy = BODY_Y + 152
  const cw1 = 848
  const ch = 300
  s += card(CX, cy, cw1, ch, { title: 'Doanh số theo nhân viên kinh doanh' })
  s += legend(
    CX + cw1 - 24,
    cy + 40,
    [
      ['Mục tiêu', tint(P, 0.78)],
      ['Đạt được', P],
    ],
    { anchor: 'end' }
  )
  const sales = [
    ['Quốc Hùng', 800, 620],
    ['Thu Ngân', 700, 540],
    ['Hoàng Nam', 600, 410],
    ['Đức Anh', 700, 380],
    ['Thanh Tâm', 600, 330],
    ['Mỹ Linh', 600, 200],
  ]
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 86, {
    labels: sales.map((x) => x[0]),
    series: [
      { values: sales.map((x) => x[1] * 1e6), color: tint(P, 0.78) },
      { values: sales.map((x) => x[2] * 1e6), color: P },
    ],
    max: 1e9,
    ticks: 4,
    fmt: vndShort,
    maxBar: 32,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Phễu chuyển đổi 90 ngày' })
  const fun = [
    ['Lead', 286],
    ['Đã liên hệ', 172],
    ['Cơ hội', 73],
    ['Báo giá', 41],
    ['Thắng', 18],
  ]
  const fw = rw - 48
  fun.forEach(([l, v], i) => {
    const bw = Math.max(fw * 0.34, (fw * v) / 286)
    const fx = rx + 24 + (fw - bw) / 2
    const fy = cy + 64 + i * 44
    s += rect(fx, fy, bw, 38, { r: 8, fill: mix(P, '#FFFFFF', i * 0.17) })
    s += text(rx + 24 + fw / 2, fy + 25, `${l} · ${v}`, {
      size: 14.5,
      weight: 700,
      fill: i < 3 ? '#fff' : shade(P, 0.35),
      anchor: 'middle',
    })
  })
  const by = cy + ch + 20
  s += card(CX, by, CW, BODY_B - by, {
    title: 'Chi tiết theo nhân viên',
    link: 'Xem đủ 6 nhân viên',
  })
  const rows = [
    ['Trần Quốc Hùng', 52, 16, 5, '31,3%', 620000000, 0.78],
    ['Nguyễn Thu Ngân', 48, 14, 4, '28,6%', 540000000, 0.77],
    ['Lê Hoàng Nam', 50, 13, 3, '23,1%', 410000000, 0.68],
    ['Phạm Đức Anh', 46, 12, 3, '25,0%', 380000000, 0.54],
  ]
  s += table(
    CX,
    by + 58,
    CW,
    [
      { label: 'Nhân viên', w: 1.6 },
      { label: 'Lead nhận', w: 0.7, align: 'right' },
      { label: 'Cơ hội', w: 0.6, align: 'right' },
      { label: 'Thắng', w: 0.6, align: 'right' },
      { label: 'Chuyển đổi', w: 0.8, align: 'right' },
      { label: 'Doanh số', w: 1, align: 'right' },
      { label: '% mục tiêu', w: 1.3 },
    ],
    rows.map(([n, l, o, w0, r, d, pct]) => [
      { avatar: n, t: n, weight: 600, fill: C.text },
      { t: String(l) },
      { t: String(o) },
      { t: String(w0), weight: 700, fill: C.text },
      { t: r },
      { t: num(d), weight: 600, fill: C.text },
      {
        fn: (x, y, w, h) =>
          progress(x + 16, y + h / 2 - 4, w - 84, pct, { h: 8 }) +
          text(x + w - 16, y + h / 2 + 5, `${Math.round(pct * 100)}%`, {
            size: 14,
            weight: 600,
            anchor: 'end',
          }),
      },
    ]),
    { rowH: 50, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Báo cáo',
      user: ctx.manager,
      title: 'Báo cáo doanh số',
      subtitle: 'Tháng 10/2026 · cập nhật đến 13/10',
      actions: [
        { label: 'Tháng 10/2026', variant: 'outline', icon: 'calendar' },
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
      ],
    },
    s
  )
}

// ============================================================ 14 · HRM Chấm công Tính lương
SCREENS['hrm-cham-cong-tinh-luong/1.webp'] = (ctx) => {
  let s =
    input(CX, BODY_Y, 230, { value: 'Phòng: Kinh doanh', select: true, h: 40 }) +
    input(CX + 246, BODY_Y, 200, { value: 'Tháng 9/2026', select: true, icon: 'calendar', h: 40 })
  const codes = {
    X: ['Đủ công', 'success'],
    P: ['Nghỉ phép', 'info'],
    M: ['Đi muộn', 'warning'],
    H: ['Nửa ngày', 'teal'],
    Q: ['Quên chấm', 'violet'],
    V: ['Vắng', 'danger'],
    L: ['Nghỉ lễ', 'neutral'],
  }
  const sym = { X: '', P: 'P', M: 'M', H: '½', Q: 'Q', V: 'V', L: 'L' }
  let lx = CX + CW
  for (const k of ['L', 'V', 'Q', 'H', 'M', 'P', 'X']) {
    const [l, tn] = codes[k]
    const t = tone(tn)
    lx -= tw(l, 13.5) + 30
    s +=
      (k === 'X'
        ? circle(lx + 9, BODY_Y + 20, 4.5, { fill: t.dot })
        : rect(lx, BODY_Y + 10, 20, 20, { r: 5, fill: t.bg }) +
          text(lx + 10, BODY_Y + 24.5, sym[k], {
            size: 12.5,
            weight: 700,
            fill: t.fg,
            anchor: 'middle',
          })) + text(lx + 26, BODY_Y + 25, l, { size: 13.5, fill: C.text2 })
    lx -= 14
  }
  const ty = BODY_Y + 60
  const th = BODY_B - ty
  s += card(CX, ty, CW, th)
  const nameW = 214
  const totW = [74, 60, 60]
  const dW = (CW - nameW - sum(totW)) / 30
  const hh = 56
  s += rect(CX + 1, ty + 1, CW - 2, hh - 1, { fill: C.soft }) + line(CX, ty + hh, CX + CW, ty + hh)
  s += text(CX + 20, ty + 34, 'Nhân viên', { size: 13.5, weight: 600, fill: C.text2 })
  const dow = (d) => (d + 1) % 7
  for (let d = 1; d <= 30; d++) {
    const x = CX + nameW + (d - 1) * dW
    const wk = dow(d) === 0 || dow(d) === 6
    if (wk) s += rect(x, ty + 1, dW, th - 2, { fill: '#F2F4F7' })
    s += text(x + dW / 2, ty + 25, String(d), {
      size: 13,
      weight: 600,
      fill: wk ? C.text3 : C.body,
      anchor: 'middle',
    })
    s += text(x + dW / 2, ty + 43, dow(d) === 0 ? 'CN' : `T${dow(d) + 1}`, {
      size: 11,
      fill: C.text3,
      anchor: 'middle',
    })
  }
  ;['Công', 'Phép', 'Muộn'].forEach(
    (t, i) =>
      (s += text(CX + nameW + 30 * dW + sum(totW.slice(0, i)) + totW[i] / 2, ty + 34, t, {
        size: 13.5,
        weight: 600,
        fill: C.text2,
        anchor: 'middle',
      }))
  )
  s += line(CX + nameW + 30 * dW, ty, CX + nameW + 30 * dW, ty + th, { stroke: C.border })
  const emps = [
    ['Nguyễn Văn An', 'NV001 · Trưởng nhóm'],
    ['Trần Thị Bích', 'NV002 · Chuyên viên'],
    ['Lê Minh Châu', 'NV003 · Chuyên viên'],
    ['Phạm Quốc Dũng', 'NV004 · Chuyên viên'],
    ['Hoàng Thị Giang', 'NV005 · Chuyên viên'],
    ['Vũ Đức Hải', 'NV006 · Thực tập'],
    ['Đỗ Thị Hạnh', 'NV007 · Chuyên viên'],
    ['Bùi Tuấn Kiệt', 'NV008 · Chuyên viên'],
    ['Đặng Ngọc Lan', 'NV009 · Hành chính'],
    ['Ngô Thanh Phong', 'NV010 · Chuyên viên'],
  ]
  const rh = (th - hh - 4) / emps.length
  const rnd = mulberry32(914)
  emps.forEach(([n, sub], r) => {
    const ry = ty + hh + r * rh
    if (r === 2) s += rect(CX + 1, ry, nameW - 1, rh, { fill: tint(P, 0.94) })
    s +=
      avatar(CX + 34, ry + rh / 2, 15, n) +
      text(CX + 58, ry + rh / 2 - 3, n, { size: 14.5, weight: 600, maxW: nameW - 66 }) +
      text(CX + 58, ry + rh / 2 + 15, sub, { size: 12, fill: C.text3, maxW: nameW - 66 })
    let cong = 0
    let phep = 0
    let muon = 0
    for (let d = 1; d <= 30; d++) {
      const x = CX + nameW + (d - 1) * dW
      const wk = dow(d) === 0 || dow(d) === 6
      if (wk) continue
      let k = d <= 2 ? 'L' : 'X'
      if (r === 2 && d === 24) k = 'H'
      else if (k === 'X') {
        const v = rnd()
        k =
          v < 0.07
            ? 'M'
            : v < 0.095
              ? 'P'
              : v < 0.11
                ? 'H'
                : v < 0.118
                  ? 'Q'
                  : v < 0.121
                    ? 'V'
                    : 'X'
      }
      if (k === 'X' || k === 'M' || k === 'P' || k === 'L') cong += 1
      if (k === 'H') cong += 0.5
      if (k === 'P') phep += 1
      if (k === 'M') muon += 1
      const t = tone(codes[k][1])
      if (k === 'X') s += circle(x + dW / 2, ry + rh / 2, 4, { fill: t.dot })
      else
        s +=
          rect(x + dW / 2 - 10, ry + rh / 2 - 10, 20, 20, { r: 5, fill: t.bg }) +
          text(x + dW / 2, ry + rh / 2 + 4.5, sym[k], {
            size: 12,
            weight: 700,
            fill: t.fg,
            anchor: 'middle',
          })
    }
    const tx = CX + nameW + 30 * dW
    s += text(tx + totW[0] / 2, ry + rh / 2 + 5, dec(cong, cong % 1 ? 1 : 0), {
      size: 15,
      weight: 700,
      anchor: 'middle',
      fill: cong < 22 ? TONES.warning.fg : C.text,
    })
    s += text(tx + totW[0] + totW[1] / 2, ry + rh / 2 + 5, String(phep), {
      size: 15,
      anchor: 'middle',
      fill: phep ? TONES.info.fg : C.text3,
    })
    s += text(tx + totW[0] + totW[1] + totW[2] / 2, ry + rh / 2 + 5, String(muon), {
      size: 15,
      anchor: 'middle',
      fill: muon ? TONES.warning.fg : C.text3,
    })
    if (r < emps.length - 1) s += line(CX, ry + rh, CX + CW, ry + rh, { stroke: C.line })
  })
  return appShell(
    ctx,
    {
      active: 'Bảng công',
      title: 'Bảng công tháng 9/2026',
      badge: ['Chờ chốt', 'warning'],
      subtitle: 'Phòng Kinh doanh · 24 nhân viên · công chuẩn 22 ngày (gồm 2 ngày lễ Quốc khánh)',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Chốt bảng công', icon: 'check' },
      ],
    },
    s
  )
}
SCREENS['hrm-cham-cong-tinh-luong/2.webp'] = (ctx) => {
  const lw = 360
  let s = card(CX, BODY_Y, lw, BODY_B - BODY_Y)
  s += searchBox(CX + 20, BODY_Y + 20, lw - 40, 42, 'Tìm nhân viên', { size: 14.5 })
  s += text(CX + 20, BODY_Y + 92, 'PHÒNG KINH DOANH · 24 NGƯỜI', {
    size: 12,
    weight: 600,
    fill: C.text3,
    ls: 0.4,
  })
  const list = [
    ['Lê Minh Châu', 20220950],
    ['Nguyễn Văn An', 24860000],
    ['Trần Thị Bích', 16245500],
    ['Phạm Quốc Dũng', 12930000],
    ['Hoàng Thị Giang', 18402000],
    ['Vũ Đức Hải', 6500000],
    ['Đỗ Thị Hạnh', 15110000],
    ['Bùi Tuấn Kiệt', 13540000],
    ['Đặng Ngọc Lan', 11786000],
  ]
  list.forEach(([n, v], i) => {
    const yy = BODY_Y + 106 + i * 68
    if (i === 0) s += rect(CX + 10, yy, lw - 20, 62, { r: 12, fill: tint(P, 0.9) })
    s +=
      avatar(CX + 42, yy + 31, 18, n) +
      text(CX + 70, yy + 27, n, { size: 15, weight: 600, fill: i === 0 ? shade(P, 0.3) : C.text }) +
      text(CX + 70, yy + 47, `Thực lĩnh ${vnd(v)}`, { size: 13, fill: C.text2 })
    s += icon('checkCircle', CX + lw - 42, yy + 21, 20, TONES.success.dot)
  })
  const rx = CX + lw + 20
  const rw = CW - lw - 20
  s += card(rx, BODY_Y, rw, BODY_B - BODY_Y)
  const px = rx + 40
  const pw = rw - 80
  s +=
    logoMark(px, BODY_Y + 32, 40, 'users') +
    text(px + 54, BODY_Y + 50, 'CÔNG TY CP THƯƠNG MẠI HOÀNG GIA', {
      size: 14,
      weight: 700,
      ls: 0.5,
    }) +
    text(px + 54, BODY_Y + 70, 'Số 18 Phan Xích Long, TP. Hồ Chí Minh', { size: 13, fill: C.text3 })
  s +=
    text(px + pw, BODY_Y + 50, 'PHIẾU LƯƠNG THÁNG 09/2026', {
      size: 18,
      weight: 700,
      fill: PD(),
      anchor: 'end',
    }) +
    text(px + pw, BODY_Y + 72, 'Kỳ trả lương 05/10/2026', {
      size: 13.5,
      fill: C.text3,
      anchor: 'end',
    })
  s += line(px, BODY_Y + 96, px + pw, BODY_Y + 96, { stroke: C.border })
  const info = [
    ['Họ và tên', 'Lê Minh Châu'],
    ['Mã nhân viên', 'NV003'],
    ['Phòng ban', 'Kinh doanh'],
    ['Chức danh', 'Chuyên viên kinh doanh'],
    ['Ngày công', '21,5 / 22'],
    ['Lương cơ bản', vnd(18000000)],
  ]
  const iw = pw / 3
  info.forEach(
    ([a, b], i) =>
      (s +=
        text(px + (i % 3) * iw, BODY_Y + 128 + Math.floor(i / 3) * 52, a, {
          size: 13,
          fill: C.text3,
        }) +
        text(px + (i % 3) * iw, BODY_Y + 150 + Math.floor(i / 3) * 52, b, {
          size: 15.5,
          weight: 600,
        }))
  )
  const cy = BODY_Y + 232
  const colW = (pw - 32) / 2
  const block = (bx, title, rows, totalLabel, total, tn) => {
    let b = rect(bx, cy, colW, 330, { r: 14, fill: '#fff', stroke: C.border })
    b +=
      rect(bx, cy, colW, 48, { r: 14, fill: tone(tn).bg }) +
      rect(bx, cy + 34, colW, 14, { fill: tone(tn).bg })
    b += text(bx + 20, cy + 31, title, { size: 15.5, weight: 700, fill: tone(tn).fg })
    rows.forEach(
      ([a, v], i) =>
        (b +=
          text(bx + 20, cy + 82 + i * 38, a, { size: 14.5, fill: C.body, maxW: colW - 170 }) +
          text(bx + colW - 20, cy + 82 + i * 38, num(v), { size: 15, weight: 600, anchor: 'end' }))
    )
    b += line(bx + 20, cy + 282, bx + colW - 20, cy + 282, { stroke: C.border, dash: '5 5' })
    b +=
      text(bx + 20, cy + 312, totalLabel, { size: 15.5, weight: 700 }) +
      text(bx + colW - 20, cy + 312, vnd(total), {
        size: 17,
        weight: 700,
        fill: tone(tn).fg,
        anchor: 'end',
      })
    return b
  }
  s += block(
    px,
    'Thu nhập',
    [
      ['Lương theo ngày công (21,5/22)', 17591000],
      ['Phụ cấp ăn trưa', 730000],
      ['Phụ cấp xăng xe', 500000],
      ['Phụ cấp điện thoại', 300000],
      ['Thưởng doanh số', 3200000],
    ],
    'Tổng thu nhập',
    22321000,
    'success'
  )
  s += block(
    px + colW + 32,
    'Khấu trừ',
    [
      ['Bảo hiểm xã hội (8%)', 1440000],
      ['Bảo hiểm y tế (1,5%)', 270000],
      ['Bảo hiểm thất nghiệp (1%)', 180000],
      ['Thuế thu nhập cá nhân', 210050],
      ['Tạm ứng', 0],
    ],
    'Tổng khấu trừ',
    2100050,
    'danger'
  )
  const ny = cy + 352
  s += rect(px, ny, pw, 96, {
    r: 16,
    fill: grad(
      [
        [0, P],
        [1, shade(P, 0.25)],
      ],
      { x1: 0, y1: 0, x2: 1, y2: 0 }
    ),
  })
  s +=
    text(px + 28, ny + 40, 'THỰC LĨNH', { size: 14, weight: 700, fill: '#fff', ls: 1, op: 0.85 }) +
    text(px + 28, ny + 74, 'Hai mươi triệu hai trăm hai mươi nghìn chín trăm năm mươi đồng', {
      size: 14,
      fill: '#fff',
      op: 0.9,
      maxW: pw - 340,
    })
  s += text(px + pw - 28, ny + 62, vnd(20220950), {
    size: 36,
    weight: 700,
    fill: '#fff',
    anchor: 'end',
  })
  s +=
    icon('card', px, ny + 120, 20, C.text3) +
    text(px + 30, ny + 135, 'Chuyển khoản Vietcombank ···· 4521 ngày 05/10/2026', {
      size: 14,
      fill: C.text2,
    })
  s += text(px + pw, ny + 135, 'Nhân viên đã xem lúc 05/10/2026 10:12', {
    size: 14,
    fill: C.text3,
    anchor: 'end',
  })
  return appShell(
    ctx,
    {
      active: 'Phiếu lương',
      title: 'Phiếu lương nhân viên',
      badge: ['Đã phát hành', 'success'],
      subtitle: 'Tháng 9/2026 · 24 phiếu lương · tự tính từ bảng công đã chốt',
      actions: [
        { label: 'Tải PDF', variant: 'outline', icon: 'download' },
        { label: 'Gửi cho nhân viên', icon: 'send' },
      ],
    },
    s
  )
}

// ============================================================ 16 · Quản lý Nhà trọ
const ROOMS = {
  4: [
    ['A401', 'ok', 'Châu Ngọc Hân', 3900000, 2],
    ['A402', 'ok', 'Hồ Văn Toàn', 3600000, 1],
    ['A403', 'ok', 'Kiều Minh Tâm', 3600000, 2],
    ['A404', 'empty', '', 3600000, 0, 'Trống từ 01/10'],
    ['A405', 'exp', 'Âu Thị Bảo Ngọc', 3600000, 2, 'HĐ hết 02/11'],
    ['A406', 'ok', 'Cao Đức Huy', 3900000, 3],
  ],
  3: [
    ['A301', 'ok', 'Phan Văn Đạt', 3800000, 2],
    ['A302', 'ok', 'Mai Anh Thư', 3500000, 1],
    ['A303', 'empty', '', 3500000, 0, 'Trống từ 25/09'],
    ['A304', 'ok', 'Tạ Quốc Khánh', 3500000, 2],
    ['A305', 'exp', 'Đinh Hoàng Yến', 3500000, 2, 'HĐ hết 15/11'],
    ['A306', 'ok', 'Lương Văn Sang', 3800000, 2],
  ],
  2: [
    ['A201', 'ok', 'Hoàng Gia Bảo', 4200000, 3],
    ['A202', 'debt', 'Vũ Thị Hồng', 3800000, 2, 'Nợ 4,6 tr'],
    ['A203', 'ok', 'Bùi Văn Lâm', 3500000, 1],
    ['A204', 'debt', 'Ngô Thu Trang', 3600000, 2, 'Nợ 4,3 tr'],
    ['A205', 'ok', 'Lý Minh Quân', 3600000, 2],
    ['A206', 'ok', 'Trịnh Thảo Nguyên', 4200000, 3],
  ],
  1: [
    ['A101', 'ok', 'Nguyễn Văn Tài', 3500000, 2],
    ['A102', 'ok', 'Trần Thị Mỹ', 3200000, 1],
    ['A103', 'debt', 'Lê Quang Huy', 3800000, 2, 'Nợ 3,1 tr'],
    ['A104', 'empty', '', 3500000, 0, 'Trống từ 01/10'],
    ['A105', 'ok', 'Phạm Thanh Tú', 3200000, 1],
    ['A106', 'ok', 'Đỗ Minh Khang', 3500000, 2],
  ],
}
function roomTile(x, y, w, h, [id, st, who, price, ppl, note]) {
  const sty = {
    ok: ['#fff', C.border, 'success'],
    exp: ['#FFFCF5', '#FEC84B', 'warning'],
    debt: ['#FFFBFA', '#FDA29B', 'danger'],
    empty: [C.soft, '#D0D5DD', 'neutral'],
  }[st]
  let s = rect(x, y, w, h, {
    r: 14,
    fill: sty[0],
    stroke: sty[1],
    sw: st === 'ok' ? 1 : 1.4,
    dash: st === 'empty' ? '6 5' : undefined,
    sh: st === 'empty' ? undefined : 'sh',
  })
  s += text(x + 16, y + 32, id, { size: 19, weight: 700, fill: st === 'empty' ? C.text2 : C.text })
  if (st === 'ok') s += circle(x + w - 22, y + 25, 5, { fill: TONES.success.dot })
  else if (note && st !== 'empty')
    s += badge(x + w - 12, y + 13, note, sty[2], { anchor: 'end', h: 24, size: 12, padX: 8 })
  if (st === 'empty') {
    s +=
      text(x + 16, y + 62, 'Phòng trống', { size: 14.5, weight: 600, fill: C.text2 }) +
      text(x + 16, y + 84, note, { size: 13, fill: C.text3 })
    s +=
      text(x + 16, y + h - 20, vnd(price), { size: 14, weight: 600, fill: C.text2 }) +
      text(x + w - 16, y + h - 20, '+ Cho thuê', {
        size: 13.5,
        weight: 600,
        fill: PD(),
        anchor: 'end',
      })
    return s
  }
  s += text(x + 16, y + 62, who, { size: 14.5, weight: 600, maxW: w - 32 })
  s +=
    icon('users', x + 16, y + 74, 15, C.text3) +
    text(x + 38, y + 86, `${ppl} người`, { size: 13, fill: C.text3 })
  s += line(x + 16, y + h - 44, x + w - 16, y + h - 44, { stroke: C.line })
  s +=
    text(x + 16, y + h - 18, vnd(price), { size: 14.5, weight: 700 }) +
    text(x + w - 16, y + h - 18, '/tháng', { size: 12.5, fill: C.text3, anchor: 'end' })
  return s
}
SCREENS['quan-ly-nha-tro/1.webp'] = (ctx) => {
  let s = segmented(CX, BODY_Y, ['Tòa A · 24 phòng', 'Tòa B · 16 phòng'], 0, { h: 42 })
  s += legendBadges(CX + CW, BODY_Y + 6, [
    ['Đang thuê 16', 'success'],
    ['Sắp hết hạn hợp đồng 2', 'warning'],
    ['Còn nợ tiền 3', 'danger'],
    ['Trống 3', 'neutral', true],
  ])
  const gy = BODY_Y + 60
  const gh = BODY_B - gy
  s += card(CX, gy, CW, gh)
  const lw = 92
  const tw0 = (CW - 48 - lw - 5 * 14) / 6
  const th0 = (gh - 48 - 3 * 14) / 4
  ;[4, 3, 2, 1].forEach((f, r) => {
    const ry = gy + 24 + r * (th0 + 14)
    s +=
      text(CX + 24, ry + th0 / 2 - 2, `Tầng ${f}`, { size: 16, weight: 700 }) +
      text(CX + 24, ry + th0 / 2 + 20, '6 phòng', { size: 13, fill: C.text3 })
    ROOMS[f].forEach((rm, i) => (s += roomTile(CX + 24 + lw + i * (tw0 + 14), ry, tw0, th0, rm)))
  })
  return appShell(
    ctx,
    {
      active: 'Tòa nhà và phòng',
      title: 'Sơ đồ phòng',
      subtitle: 'Tòa A · 12 Lê Văn Việt, TP. Thủ Đức · đang thuê 21/24 phòng',
      actions: [
        { label: 'Thêm người thuê', variant: 'outline', icon: 'userPlus' },
        { label: 'Thêm phòng', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-nha-tro/2.webp'] = (ctx) => {
  let s =
    segmented(CX, BODY_Y, ['Tòa A', 'Tòa B'], 0, { h: 42, padX: 22 }) +
    input(CX + segW(['Tòa A', 'Tòa B'], { padX: 22 }) + 16, BODY_Y, 200, {
      value: 'Tầng: Tất cả',
      select: true,
      h: 42,
    })
  s +=
    text(CX + CW - 280, BODY_Y + 18, 'Đã chốt 19/21 phòng đang thuê', {
      size: 14.5,
      weight: 600,
      fill: C.body,
    }) + progress(CX + CW - 280, BODY_Y + 30, 280, 19 / 21, { h: 8 })
  const ty = BODY_Y + 62
  s += card(CX, ty, CW, BODY_B - ty)
  const meter = (v, o = {}) => ({
    fn: (x, y, w, h) =>
      input(x + 10, y + h / 2 - 21, w - 20, {
        h: 42,
        value: v ?? undefined,
        placeholder: o.ph,
        align: o.focus ? undefined : 'right',
        weight: 600,
        error: o.error,
        focus: o.focus,
        caret: o.focus,
        size: 15,
      }),
  })
  const mk = (room, who, eo, en, wo, wn, st, o = {}) => {
    const ok = en != null && en >= eo && wn != null
    const amt = ok ? (en - eo) * 3800 + (wn - wo) * 18000 : null
    return {
      bg: o.bg,
      cells: [
        { t: room, sub: who, fill: C.text },
        { t: num(eo) },
        meter(en != null ? num(en) : null, { error: o.err, focus: o.focus, ph: 'Nhập chỉ số' }),
        { t: ok ? `${en - eo} kWh` : '—', weight: ok ? 600 : 400, fill: ok ? C.text : C.text3 },
        { t: num(wo) },
        meter(wn != null ? num(wn) : null, { ph: 'Nhập' }),
        { t: ok ? `${wn - wo} m³` : '—', weight: ok ? 600 : 400, fill: ok ? C.text : C.text3 },
        { t: amt != null ? num(amt) : '—', weight: 700, fill: amt != null ? C.text : C.text3 },
        st,
      ],
    }
  }
  const rows = [
    mk('A101', 'Nguyễn Văn Tài', 4812, 4968, 312, 319, {
      badge: 'Đã chốt',
      tone: 'success',
      icon: 'check',
    }),
    mk('A102', 'Trần Thị Mỹ', 3205, 3318, 205, 210, {
      badge: 'Đã chốt',
      tone: 'success',
      icon: 'check',
    }),
    mk('A103', 'Lê Quang Huy', 5640, 5873, 418, 427, {
      badge: 'Điện tăng 48%',
      tone: 'warning',
      icon: 'alert',
    }),
    {
      bg: C.soft,
      cells: [
        { t: 'A104', sub: 'Phòng trống', fill: C.text2 },
        { t: num(2210), fill: C.text3 },
        { t: '—', fill: C.text3 },
        '',
        { t: num(98), fill: C.text3 },
        { t: '—', fill: C.text3 },
        '',
        '',
        { badge: 'Không tính', tone: 'neutral' },
      ],
    },
    mk('A105', 'Phạm Thanh Tú', 2987, 3074, 176, 180, {
      badge: 'Đã chốt',
      tone: 'success',
      icon: 'check',
    }),
    mk(
      'A106',
      'Đỗ Minh Khang',
      4150,
      null,
      298,
      null,
      { badge: 'Chưa chốt', tone: 'neutral', dot: true },
      { focus: true, bg: tint(P, 0.96) }
    ),
    mk('A201', 'Hoàng Gia Bảo', 6022, 6170, 390, 398, {
      badge: 'Đã chốt',
      tone: 'success',
      icon: 'check',
    }),
    mk(
      'A202',
      'Vũ Thị Hồng',
      3876,
      3861,
      255,
      261,
      { badge: 'Nhỏ hơn số cũ', tone: 'danger', icon: 'alert' },
      { err: true }
    ),
  ]
  s += table(
    CX,
    ty + 20,
    CW,
    [
      { label: 'Phòng', w: 1.25 },
      { label: 'Điện cũ', w: 0.7, align: 'right' },
      { label: 'Điện mới', w: 1 },
      { label: 'Tiêu thụ', w: 0.75, align: 'right' },
      { label: 'Nước cũ', w: 0.65, align: 'right' },
      { label: 'Nước mới', w: 0.9 },
      { label: 'Tiêu thụ', w: 0.65, align: 'right' },
      { label: 'Thành tiền', w: 0.85, align: 'right' },
      { label: 'Trạng thái', w: 1.15 },
    ],
    rows,
    { rowH: 66, headTop: true }
  )
  s +=
    rect(CX + 24, BODY_B - 74, CW - 48, 52, { r: 12, fill: TONES.info.bg }) +
    icon('info', CX + 40, BODY_B - 59, 20, TONES.info.fg) +
    text(
      CX + 70,
      BODY_B - 43,
      'Quản lý tòa chốt bằng điện thoại, chụp ảnh đồng hồ; chỉ số bất thường được đánh dấu để kiểm tra lại',
      { size: 14.5, weight: 600, fill: TONES.info.fg, maxW: CW - 110 }
    )
  return appShell(
    ctx,
    {
      active: 'Chốt điện nước',
      user: ['Trần Văn Lực', 'Quản lý tòa'],
      title: 'Chốt chỉ số điện nước kỳ 10/2026',
      subtitle: 'Tòa A · hạn chốt 30/10/2026 · điện 3.800 ₫/kWh, nước 18.000 ₫/m³',
      actions: [
        { label: 'Xuất Excel', variant: 'outline', icon: 'download' },
        { label: 'Lập hóa đơn từ chỉ số', icon: 'receipt' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-nha-tro/3.webp'] = (ctx) => {
  const sw = (CW - 60) / 4
  let s = ''
  ;[
    { label: 'Tổng phải thu', value: vnd(86420000) },
    { label: 'Đã thu', value: vnd(61380000), dot: TONES.success.dot, color: TONES.success.fg },
    { label: 'Còn nợ', value: vnd(25040000), dot: TONES.warning.dot, color: TONES.warning.fg },
    {
      label: 'Hóa đơn quá hạn',
      value: '3',
      dot: TONES.danger.dot,
      color: TONES.danger.fg,
      sub: 'phòng',
    },
  ].forEach((o, i) => (s += statCard(CX + i * (sw + 20), BODY_Y, sw, 96, o)))
  const ty = BODY_Y + 116
  s += card(CX, ty, CW, BODY_B - ty)
  s += tabs(
    CX + 24,
    ty + 12,
    [
      { label: 'Tất cả', count: 37 },
      { label: 'Chưa thu', count: 6 },
      { label: 'Thu một phần', count: 2 },
      { label: 'Đã thu', count: 28 },
      { label: 'Quá hạn', count: 3 },
    ],
    0,
    { w: CW - 48 }
  )
  s += input(CX + CW - 24 - 200, ty + 12, 200, {
    value: 'Tòa: Tất cả',
    select: true,
    h: 40,
    size: 14.5,
  })
  const st = {
    paid: ['Đã thu', 'success'],
    part: ['Thu một phần', 'warning'],
    unpaid: ['Chưa thu', 'info'],
    over: ['Quá hạn 8 ngày', 'danger'],
  }
  const data = [
    ['A101', 'Nguyễn Văn Tài', '', 3500000, 592800, 126000, 250000, 'all', 'paid'],
    ['A102', 'Trần Thị Mỹ', '', 3200000, 429400, 90000, 250000, 'all', 'paid'],
    ['A103', 'Lê Quang Huy', '', 3800000, 885400, 162000, 250000, 2000000, 'part'],
    [
      'A105',
      'Phạm Thanh Tú',
      'Vào ở 12/10 · tính 20/31 ngày',
      2064500,
      330600,
      72000,
      161300,
      0,
      'unpaid',
    ],
    ['A201', 'Hoàng Gia Bảo', '', 4200000, 562400, 144000, 300000, 'all', 'paid'],
    ['A202', 'Vũ Thị Hồng', '', 3800000, 467400, 108000, 250000, 0, 'over'],
    ['A203', 'Bùi Văn Lâm', '', 3500000, 520600, 90000, 250000, 'all', 'paid'],
    ['A204', 'Ngô Thu Trang', '', 3600000, 398200, 72000, 250000, 0, 'unpaid'],
  ]
  const rows = data.map(([r, n, note, room, el, wa, sv, paid, k]) => {
    const tot = room + el + wa + sv
    const p = paid === 'all' ? tot : paid
    return [
      { t: r, weight: 700, fill: C.text },
      { t: n, sub: note || undefined, weight: 600, fill: C.text, subFill: PD() },
      { t: num(room) },
      { t: num(el) },
      { t: num(wa) },
      { t: num(sv) },
      { t: num(tot), weight: 700, fill: C.text },
      {
        t: p ? num(p) : '0',
        fill: p === tot ? TONES.success.fg : p ? TONES.warning.fg : C.text3,
        weight: 600,
      },
      { badge: st[k][0], tone: st[k][1], dot: true },
    ]
  })
  s += table(
    CX,
    ty + 70,
    CW,
    [
      { label: 'Phòng', w: 0.55 },
      { label: 'Người thuê', w: 1.7 },
      { label: 'Tiền phòng', w: 0.85, align: 'right' },
      { label: 'Điện', w: 0.7, align: 'right' },
      { label: 'Nước', w: 0.65, align: 'right' },
      { label: 'Dịch vụ', w: 0.65, align: 'right' },
      { label: 'Tổng tiền', w: 0.85, align: 'right' },
      { label: 'Đã thu', w: 0.8, align: 'right' },
      { label: 'Trạng thái', w: 1.15 },
    ],
    rows,
    { rowH: 62, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Hóa đơn',
      title: 'Hóa đơn tháng 10/2026',
      subtitle: 'Tự lập từ hợp đồng và chỉ số điện nước, tính theo ngày ở khi vào giữa tháng',
      actions: [
        { label: 'Gửi nhắc nợ (5)', variant: 'outline', icon: 'send' },
        { label: 'Lập hóa đơn', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['quan-ly-nha-tro/4.webp'] = (ctx) => {
  const kw = (CW - 60) / 4
  let s = ''
  ;[
    {
      label: 'Phải thu kỳ 10/2026',
      value: vnd(86420000),
      note: '37 hóa đơn · 2 tòa',
      icon: 'receipt',
    },
    {
      label: 'Đã thu',
      value: vnd(61380000),
      delta: '71%',
      good: true,
      note: 'tổng phải thu',
      icon: 'wallet',
      color: '#17B26A',
    },
    {
      label: 'Còn nợ',
      value: vnd(25040000),
      delta: '8 phòng',
      good: false,
      note: '3 phòng quá hạn',
      icon: 'alert',
      color: '#F04438',
    },
    { label: 'Tỉ lệ lấp đầy', value: '92,5%', note: '37/40 phòng đang thuê', icon: 'home' },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), BODY_Y, kw, 132, o)))
  const cy = BODY_Y + 152
  const cw1 = 848
  const ch = 300
  s += card(CX, cy, cw1, ch, { title: 'Thu tiền 6 kỳ gần nhất' })
  s += legend(
    CX + cw1 - 24,
    cy + 40,
    [
      ['Phải thu', tint(P, 0.7)],
      ['Đã thu', P],
    ],
    { anchor: 'end' }
  )
  s += barChart(CX + 24, cy + 70, cw1 - 48, ch - 86, {
    labels: ['Kỳ 5', 'Kỳ 6', 'Kỳ 7', 'Kỳ 8', 'Kỳ 9', 'Kỳ 10'],
    series: [
      { values: [82.1, 83.4, 84.0, 85.2, 85.9, 86.42].map((v) => v * 1e6), color: tint(P, 0.7) },
      { values: [81.2, 82.9, 83.1, 84.6, 84.0, 61.38].map((v) => v * 1e6), color: P },
    ],
    max: 100e6,
    ticks: 4,
    fmt: vndShort,
    maxBar: 34,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Tình hình thu kỳ này' })
  s += donut(
    rx + 110,
    cy + 170,
    70,
    24,
    [
      { value: 71, color: P },
      { value: 29, color: tint(P, 0.75) },
    ],
    { center: '71%', centerSize: 26, sub: 'đã thu' }
  )
  s +=
    rect(rx + 214, cy + 124, 12, 12, { r: 3.5, fill: P }) +
    text(rx + 234, cy + 135, 'Đã thu', { size: 14, fill: C.text2 }) +
    text(rx + 234, cy + 157, vnd(61380000), { size: 15, weight: 700 })
  s +=
    rect(rx + 214, cy + 184, 12, 12, { r: 3.5, fill: tint(P, 0.75) }) +
    text(rx + 234, cy + 195, 'Còn nợ', { size: 14, fill: C.text2 }) +
    text(rx + 234, cy + 217, vnd(25040000), { size: 15, weight: 700 })
  const by = cy + ch + 20
  const bh = BODY_B - by
  s += card(CX, by, cw1, bh, { title: 'Cần nhắc nợ', link: 'Gửi nhắc tất cả' })
  const debt = [
    ['A202', 'Vũ Thị Hồng', 4625400, 'Quá hạn 8 ngày', 'danger'],
    ['B105', 'Trịnh Văn Nam', 3980000, 'Quá hạn 5 ngày', 'danger'],
    ['A103', 'Lê Quang Huy', 3097400, 'Quá hạn 2 ngày', 'warning'],
  ]
  s += table(
    CX,
    by + 58,
    cw1,
    [
      { label: 'Phòng', w: 0.6 },
      { label: 'Người thuê', w: 1.5 },
      { label: 'Còn nợ', w: 1, align: 'right' },
      { label: 'Tình trạng', w: 1.2 },
      { label: '', w: 120 },
    ],
    debt.map(([r, n, v, t, tn]) => [
      { t: r, weight: 700, fill: C.text },
      { avatar: n, t: n },
      { t: vnd(v), weight: 700, fill: C.text },
      { badge: t, tone: tn, dot: true },
      {
        fn: (x, y, w, h) =>
          button(x + w - 16, y + h / 2 - 17, 'Nhắc', {
            anchor: 'end',
            variant: 'soft',
            h: 34,
            size: 14,
            icon: 'send',
            padX: 12,
          }),
      },
    ]),
    { rowH: 50, headTop: true }
  )
  s += card(rx, by, rw, bh, { title: 'Việc cần làm' })
  const todo = [
    ['file', 'Hợp đồng sắp hết hạn', 'A405 (02/11) · A305 (15/11)', 'warning'],
    ['wrench', 'Sự cố chưa xử lý', 'B104 rò nước · A402 hỏng ổ cắm', 'danger'],
    ['door', 'Phòng trống', 'A104 · A303 · A404', 'neutral'],
  ]
  todo.forEach(([ic, a, b, tn], i) => {
    const yy = by + 64 + i * 64
    const T = tone(tn)
    s +=
      rect(rx + 24, yy, 40, 40, { r: 12, fill: T.bg }) +
      icon(ic === 'door' ? 'home' : ic, rx + 34, yy + 10, 20, T.fg)
    s +=
      text(rx + 78, yy + 17, a, { size: 15, weight: 600 }) +
      text(rx + 78, yy + 37, b, { size: 13.5, fill: C.text2, maxW: rw - 100 })
  })
  return appShell(
    ctx,
    {
      active: 'Tổng quan',
      title: 'Tổng quan thu tiền kỳ này',
      subtitle: 'Kỳ 10/2026 · 2 tòa nhà · cập nhật 13/10/2026 10:30',
      actions: [
        { label: 'Kỳ 10/2026', variant: 'outline', icon: 'calendar' },
        { label: 'Xuất báo cáo', variant: 'outline', icon: 'download' },
      ],
    },
    s
  )
}

// ============================================================ 17 · Website Công ty
const AG_NAV = ['Trang chủ', 'Giới thiệu', 'Dịch vụ', 'Dự án', 'Tin tức', 'Tuyển dụng', 'Liên hệ']
function agHeader(active) {
  const y = SITE_Y
  let s = rect(0, y, W, 80, { fill: '#fff' }) + line(0, y + 79.5, W, y + 79.5)
  s +=
    rect(120, y + 20, 40, 40, { r: 11, fill: P }) +
    icon('sofa', 129, y + 29, 22, '#fff', { sw: 2.1 })
  s +=
    text(172, y + 40, 'AN GIA', { size: 21, weight: 700, ls: 1.5 }) +
    text(172, y + 58, 'Thiết kế & Thi công nội thất', { size: 12, fill: C.text3 })
  let nx = 430
  AG_NAV.forEach((n) => {
    const on = n === active
    s += text(nx, y + 46, n, { size: 15.5, weight: 600, fill: on ? PD() : C.body })
    if (on) s += rect(nx, y + 76, tw(n, 15.5, 600), 3, { r: 1.5, fill: P })
    nx += tw(n, 15.5, 600) + 30
  })
  s += button(1480, y + 18, 'Nhận báo giá', { anchor: 'end', h: 44, size: 15 })
  s +=
    icon('phone', 1480 - btnW('Nhận báo giá', { size: 15 }) - 190, y + 30, 20, PD()) +
    text(1480 - btnW('Nhận báo giá', { size: 15 }) - 162, y + 46, '028 3812 6868', {
      size: 15.5,
      weight: 700,
    })
  return s
}
const AG_Y = SITE_Y + 80
function agBanner(title, sub, crumb, o = {}) {
  const h = o.h ?? 200
  let s = ''
  if (o.dark) {
    s += rect(0, AG_Y, W, h, {
      fill: grad(
        [
          [0, shade(P, 0.35)],
          [1, P],
        ],
        { x1: 0, y1: 0, x2: 1, y2: 1 }
      ),
    })
    s += clipped(
      clip(0, AG_Y, W, h, 0),
      circle(1350, AG_Y + 40, 220, { fill: '#fff', fo: 0.07 }) +
        circle(1500, AG_Y + h, 160, { fill: '#fff', fo: 0.06 }) +
        circle(200, AG_Y + h + 60, 180, { fill: '#fff', fo: 0.05 })
    )
  } else
    s += rect(0, AG_Y, W, h, {
      fill: grad(
        [
          [0, tint(P, 0.94)],
          [1, '#FFFFFF'],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 }
      ),
    })
  const fg = o.dark ? '#fff' : C.text
  s += text(120, AG_Y + 52, crumb, { size: 14, fill: o.dark ? 'rgba(255,255,255,0.75)' : C.text3 })
  s += text(120, AG_Y + 108, title, { size: 42, weight: 700, fill: fg })
  s += text(120, AG_Y + 146, sub, { size: 18, fill: o.dark ? 'rgba(255,255,255,0.85)' : C.text2 })
  return s
}
SCREENS['website-cong-ty/1.webp'] = () => {
  let s = rect(0, AG_Y, W, 560, {
    fill: grad(
      [
        [0, tint(P, 0.95)],
        [1, '#FFFFFF'],
      ],
      { x1: 0, y1: 0, x2: 0, y2: 1 }
    ),
  })
  s += agHeader('Trang chủ')
  const hy = AG_Y + 70
  s += badge(120, hy, 'THIẾT KẾ & THI CÔNG TRỌN GÓI', 'primary', { h: 30, size: 13, padX: 14 })
  s +=
    text(120, hy + 96, 'Không gian sống tinh tế,', { size: 50, weight: 700 }) +
    text(120, hy + 160, 'bàn giao đúng hẹn', { size: 50, weight: 700, fill: P })
  s += para(
    120,
    hy + 210,
    'Hơn 450 căn hộ, nhà phố và văn phòng đã hoàn thiện tại TP. Hồ Chí Minh và Bình Dương. Một đầu mối từ thiết kế 3D đến thi công, bảo hành 5 năm.',
    600,
    { size: 18, fill: C.text2, lh: 28 }
  )
  s +=
    button(120, hy + 286, 'Nhận báo giá miễn phí', {
      h: 56,
      size: 16.5,
      padX: 26,
      icon: 'arrowRight',
    }) +
    button(
      120 + btnW('Nhận báo giá miễn phí', { size: 16.5, padX: 26, icon: 'arrowRight' }) + 14,
      hy + 286,
      'Xem dự án',
      { variant: 'outline', h: 56, size: 16.5, padX: 26 }
    )
  ;['Gia Hân', 'Minh Khôi', 'Thu Trang', 'Quốc Bảo'].forEach(
    (n, i) => (s += avatar(140 + i * 26, hy + 392, 18, n, { ring: true }))
  )
  s += text(250, hy + 386, '450+ gia đình đã chọn An Gia', { size: 15, weight: 600 })
  for (let i = 0; i < 5; i++)
    s += icon('star', 250 + i * 18, hy + 394, 15, '#F79009', { fill: '#F79009', sw: 1 })
  s += text(350, hy + 407, '4,9/5 trên Google', { size: 13.5, fill: C.text3 })
  s += scene(820, AG_Y + 36, 700, 460, 'warm', { r: 28, seed: 3 })
  s +=
    rect(760, AG_Y + 400, 300, 92, { r: 18, fill: '#fff', sh: 'sh2' }) +
    scene(776, AG_Y + 416, 60, 60, 'cool', { r: 12, seed: 8 })
  s +=
    text(850, AG_Y + 440, 'Căn hộ 3 phòng ngủ', { size: 15.5, weight: 700 }) +
    text(850, AG_Y + 464, '98 m² · bàn giao sau 45 ngày', { size: 13.5, fill: C.text2 })
  s +=
    rect(1340, AG_Y + 64, 150, 70, { r: 16, fill: '#fff', sh: 'sh2' }) +
    icon('star', 1356, AG_Y + 86, 26, '#F79009', { fill: '#F79009', sw: 1 }) +
    text(1392, AG_Y + 98, '4,9/5', { size: 20, weight: 700 }) +
    text(1392, AG_Y + 118, '312 đánh giá', { size: 12.5, fill: C.text3 })
  const sy = AG_Y + 590
  s += rect(120, sy, 1360, 112, { r: 20, fill: '#fff', stroke: C.border, sh: 'sh' })
  const stats = [
    ['12+', 'năm kinh nghiệm'],
    ['450+', 'công trình bàn giao'],
    ['98%', 'khách hàng hài lòng'],
    ['5 năm', 'bảo hành thi công'],
  ]
  stats.forEach(([a, b], i) => {
    const x = 120 + i * 340
    if (i) s += line(x, sy + 26, x, sy + 86, { stroke: C.line })
    s +=
      text(x + 170, sy + 56, a, { size: 34, weight: 700, fill: P, anchor: 'middle' }) +
      text(x + 170, sy + 84, b, { size: 15, fill: C.text2, anchor: 'middle' })
  })
  const vy = sy + 168
  s += text(W / 2, vy, 'Dịch vụ của chúng tôi', { size: 30, weight: 700, anchor: 'middle' })
  const sv = [
    ['ruler', 'Thiết kế nội thất'],
    ['hammer', 'Thi công trọn gói'],
    ['paint', 'Cải tạo nhà cũ'],
    ['briefcase', 'Nội thất văn phòng'],
  ]
  const cw = (1360 - 72) / 4
  sv.forEach(([ic, t], i) => {
    const x = 120 + i * (cw + 24)
    s +=
      rect(x, vy + 30, cw, 160, { r: 18, fill: '#fff', stroke: C.border, sh: 'sh' }) +
      rect(x + 24, vy + 54, 48, 48, { r: 14, fill: tint(P, 0.9) }) +
      icon(ic === 'hammer' ? 'wrench' : ic, x + 36, vy + 66, 24, P) +
      text(x + 88, vy + 86, t, { size: 18, weight: 700 })
  })
  return browser('noithatangia.vn', s)
}
SCREENS['website-cong-ty/2.webp'] = () => {
  let s =
    agBanner(
      'Dịch vụ',
      'Từ ý tưởng đến bàn giao, một đầu mối chịu trách nhiệm toàn bộ',
      'Trang chủ  /  Dịch vụ',
      { dark: true, h: 210 }
    ) + agHeader('Dịch vụ')
  const y0 = AG_Y + 260
  s +=
    text(120, y0, 'Giải pháp trọn gói cho mọi không gian', { size: 28, weight: 700 }) +
    text(1480, y0 - 2, 'Tư vấn miễn phí tại nhà trong 48 giờ', {
      size: 15,
      weight: 600,
      fill: PD(),
      anchor: 'end',
    })
  const cw = (1360 - 48) / 3
  const svc = [
    [
      'warm',
      'Thiết kế nội thất',
      'Phương án 3D chân thực, chỉnh sửa đến khi ưng ý',
      ['Khảo sát, đo đạc tận nơi', 'Phối cảnh 3D từng phòng', 'Hồ sơ kỹ thuật chi tiết'],
      'Từ 180.000 ₫/m²',
    ],
    [
      'cool',
      'Thi công trọn gói',
      'Đội thợ riêng, giám sát hằng ngày, báo cáo qua ảnh',
      ['Tiến độ cam kết theo hợp đồng', 'Vật tư rõ nguồn gốc', 'Bảo hành 5 năm'],
      'Từ 3,5 triệu ₫/m²',
    ],
    [
      'green',
      'Cải tạo nhà cũ',
      'Làm mới không gian, tối ưu công năng, giữ kết cấu',
      ['Đánh giá hiện trạng miễn phí', 'Thi công gọn, ít bụi', 'Bàn giao sạch sẽ'],
      'Từ 2,2 triệu ₫/m²',
    ],
  ]
  svc.forEach(([kind, t, d, bullets, price], i) => {
    const x = 120 + i * (cw + 24)
    const y = y0 + 32
    s += rect(x, y, cw, 470, { r: 20, fill: '#fff', stroke: C.border, sh: 'sh' })
    s += scene(x + 12, y + 12, cw - 24, 190, kind, { r: 14, seed: i + 4 })
    s +=
      text(x + 28, y + 246, t, { size: 21, weight: 700 }) +
      text(x + 28, y + 274, d, { size: 15, fill: C.text2, maxW: cw - 56 })
    bullets.forEach(
      (b, j) =>
        (s +=
          circle(x + 38, y + 312 + j * 34, 10, { fill: tint(P, 0.88) }) +
          icon('check', x + 32, y + 306 + j * 34, 12, P, { sw: 3.2 }) +
          text(x + 58, y + 317 + j * 34, b, { size: 15, fill: C.body }))
    )
    s += line(x + 28, y + 412, x + cw - 28, y + 412, { stroke: C.line })
    s +=
      text(x + 28, y + 446, price, { size: 17, weight: 700, fill: PD() }) +
      text(x + cw - 28, y + 446, 'Xem chi tiết', {
        size: 15,
        weight: 600,
        fill: C.body,
        anchor: 'end',
      })
  })
  const py = y0 + 560
  s += text(120, py, 'Quy trình làm việc', { size: 24, weight: 700 })
  const steps = ['Khảo sát', 'Thiết kế 3D', 'Báo giá chi tiết', 'Thi công', 'Bàn giao, bảo hành']
  const stw = 1360 / 5
  s += line(120 + stw / 2, py + 44, 120 + stw * 4.5, py + 44, {
    stroke: tint(P, 0.7),
    sw: 2,
    dash: '6 6',
  })
  steps.forEach(
    (st, i) =>
      (s +=
        circle(120 + stw * i + stw / 2, py + 44, 20, {
          fill: i === 0 ? P : '#fff',
          stroke: P,
          sw: 2,
        }) +
        text(120 + stw * i + stw / 2, py + 50, String(i + 1), {
          size: 16,
          weight: 700,
          fill: i === 0 ? '#fff' : P,
          anchor: 'middle',
        }) +
        text(120 + stw * i + stw / 2, py + 92, st, { size: 16, weight: 600, anchor: 'middle' }))
  )
  return browser('noithatangia.vn/dich-vu', s)
}
SCREENS['website-cong-ty/3.webp'] = () => {
  let s =
    agBanner(
      'Dự án tiêu biểu',
      'Hơn 450 công trình đã bàn giao, mỗi dự án một câu chuyện riêng',
      'Trang chủ  /  Dự án',
      { h: 190 }
    ) + agHeader('Dự án')
  const cy = AG_Y + 218
  s += chips(
    120,
    cy,
    [
      { label: 'Tất cả', count: 48 },
      { label: 'Căn hộ', count: 21 },
      { label: 'Nhà phố', count: 12 },
      { label: 'Biệt thự', count: 6 },
      { label: 'Văn phòng', count: 7 },
      { label: 'Showroom', count: 2 },
    ],
    { active: 'Tất cả', h: 40 }
  )
  s += input(1480 - 220, cy, 220, { value: 'Mới nhất', select: true, h: 40 })
  const cw = (1360 - 48) / 3
  const ih = cw * 0.62
  const prj = [
    ['warm', 'Căn hộ', 'Căn hộ 3 phòng ngủ phong cách hiện đại', 'Quận 7, TP. HCM', '98 m² · 2026'],
    ['stone', 'Nhà phố', 'Nhà phố 4 tầng tông gỗ sáng', 'Thảo Điền, TP. HCM', '240 m² · 2025'],
    [
      'office',
      'Văn phòng',
      'Văn phòng công ty công nghệ 120 chỗ ngồi',
      'Quận 1, TP. HCM',
      '650 m² · 2025',
    ],
    [
      'green',
      'Biệt thự',
      'Biệt thự ven sông phong cách nhiệt đới',
      'Biên Hòa, Đồng Nai',
      '420 m² · 2025',
    ],
    ['dusk', 'Showroom', 'Showroom gạch ốp lát', 'Thủ Dầu Một, Bình Dương', '300 m² · 2024'],
    ['cool', 'Căn hộ', 'Căn hộ duplex tối giản', 'TP. Thủ Đức', '156 m² · 2024'],
  ]
  prj.forEach(([kind, tag, t, loc, meta], i) => {
    const x = 120 + (i % 3) * (cw + 24)
    const y = cy + 66 + Math.floor(i / 3) * (ih + 140)
    s += scene(x, y, cw, ih, kind, { r: 18, seed: i + 11 })
    s += badge(
      x + 16,
      y + 16,
      tag,
      { bg: 'rgba(255,255,255,0.92)', fg: C.text, dot: P },
      { h: 28, dot: true }
    )
    s += text(x, y + ih + 34, t, { size: 19, weight: 700, maxW: cw })
    s +=
      icon('mapPin', x, y + ih + 50, 16, C.text3) +
      text(x + 22, y + ih + 63, loc, { size: 14.5, fill: C.text2 }) +
      text(x + cw, y + ih + 63, meta, { size: 14.5, fill: C.text3, anchor: 'end' })
  })
  return browser('noithatangia.vn/du-an', s)
}
SCREENS['website-cong-ty/4.webp'] = () => {
  let s =
    agBanner(
      'Tin tức',
      'Kinh nghiệm làm nhà, xu hướng nội thất và tin hoạt động của An Gia',
      'Trang chủ  /  Tin tức',
      { h: 190 }
    ) + agHeader('Tin tức')
  const cy = AG_Y + 218
  s += chips(120, cy, ['Tất cả', 'Kinh nghiệm', 'Xu hướng', 'Phong thủy', 'Tin công ty'], {
    active: 'Tất cả',
    h: 40,
  })
  s += searchBox(1480 - 300, cy, 300, 40, 'Tìm bài viết', { size: 14.5 })
  const fy = cy + 66
  const fw = 790
  s += scene(120, fy, fw, 400, 'dusk', { r: 20, seed: 21 })
  s += badge(140, fy + 20, 'Xu hướng', 'primary', { solid: true, h: 28 })
  s += text(120, fy + 444, '08/10/2026 · 6 phút đọc', { size: 14, fill: C.text3 })
  s += lines(120, fy + 484, wrap('7 xu hướng nội thất căn hộ nổi bật năm 2026', fw, 30, 700, 2), {
    size: 30,
    weight: 700,
    lh: 40,
  })
  s += para(
    120,
    fy + 528,
    'Gỗ sáng màu, đường cong mềm và ánh sáng gián tiếp tiếp tục dẫn dắt phong cách căn hộ đô thị, cùng những gợi ý áp dụng cho diện tích nhỏ.',
    fw,
    { size: 16.5, fill: C.text2, lh: 26, maxLines: 2 }
  )
  const posts = [
    ['warm', 'Kinh nghiệm', 'Chi phí hoàn thiện nội thất căn hộ 70 m² mới nhất', '02/10/2026'],
    ['stone', 'Kinh nghiệm', 'Chọn gỗ công nghiệp hay gỗ tự nhiên cho tủ bếp?', '25/09/2026'],
    ['office', 'Tin công ty', 'An Gia bàn giao 30 căn hộ cho cư dân dự án ven sông', '18/09/2026'],
    ['green', 'Phong thủy', 'Bố trí bàn làm việc hợp phong thủy trong căn hộ nhỏ', '11/09/2026'],
  ]
  const rx = 120 + fw + 40
  const rw = 1480 - rx
  posts.forEach(([kind, tag, t, d], i) => {
    const y = fy + i * 150
    s += scene(rx, y, 190, 128, kind, { r: 14, seed: 30 + i })
    s += text(rx + 210, y + 22, tag.toUpperCase(), { size: 12.5, weight: 700, fill: PD(), ls: 0.6 })
    s += lines(rx + 210, y + 52, wrap(t, rw - 210, 17.5, 700, 2), {
      size: 17.5,
      weight: 700,
      lh: 25,
    })
    s += text(rx + 210, y + 118, d, { size: 13.5, fill: C.text3 })
    if (i < posts.length - 1) s += line(rx, y + 140, 1480, y + 140, { stroke: C.line })
  })
  return browser('noithatangia.vn/tin-tuc', s)
}
SCREENS['website-cong-ty/5.webp'] = () => {
  let s =
    agBanner(
      'Liên hệ và báo giá',
      'Kiến trúc sư sẽ gọi lại trong 2 giờ làm việc',
      'Trang chủ  /  Liên hệ',
      { h: 180 }
    ) + agHeader('Liên hệ')
  const y0 = AG_Y + 212
  const lw = 470
  s += card(120, y0, lw, 290, { title: 'Văn phòng An Gia' })
  const info = [
    ['mapPin', '25 Nguyễn Văn Hưởng, P. An Khánh, TP. HCM'],
    ['phone', '028 3812 6868 · 0909 868 368'],
    ['mail', 'lienhe@noithatangia.vn'],
    ['clock', 'Thứ 2 – Thứ 7, 8:00 – 17:30'],
  ]
  info.forEach(
    ([ic, t], i) =>
      (s +=
        rect(144, y0 + 62 + i * 54, 38, 38, { r: 10, fill: tint(P, 0.9) }) +
        icon(ic, 153, y0 + 71 + i * 54, 20, P) +
        text(196, y0 + 87 + i * 54, t, { size: 15, fill: C.body, maxW: lw - 100 }))
  )
  const my = y0 + 310
  const mh = H - 24 - my
  const mid = clip(120, my, lw, mh, 18)
  let mp = rect(120, my, lw, mh, { fill: '#EEF1F4' })
  for (let i = 0; i < 9; i++)
    mp += line(120, my + 20 + i * 34, 120 + lw, my + i * 26 + 60, {
      stroke: '#fff',
      sw: i % 3 === 0 ? 9 : 4,
    })
  for (let i = 0; i < 7; i++)
    mp += line(140 + i * 74, my, 110 + i * 80, my + mh, { stroke: '#fff', sw: i % 2 ? 4 : 7 })
  mp +=
    rect(330, my + 70, 120, 60, { r: 6, fill: '#D7E6D2' }) +
    rect(160, my + 150, 90, 50, { r: 6, fill: '#D7E6D2' }) +
    path(
      `M${120},${my + mh - 40} C${260},${my + mh - 70} ${380},${my + mh - 10} ${120 + lw},${my + mh - 50}`,
      { stroke: '#BBD4EA', sw: 14 }
    )
  s += clipped(mid, mp) + rect(120, my, lw, mh, { r: 18, stroke: C.border })
  s +=
    circle(355, my + mh / 2 - 6, 22, { fill: P, fo: 0.18 }) +
    icon('mapPin', 339, my + mh / 2 - 26, 32, '#fff', { fill: P, sw: 1.6 })
  const fx = 120 + lw + 30
  const fw = 1480 - fx
  s += card(fx, y0, fw, H - 24 - y0, {
    title: 'Yêu cầu báo giá',
    sub: 'Điền thông tin, chúng tôi gửi phương án sơ bộ miễn phí',
  })
  const c2 = (fw - 48 - 24) / 2
  const ix = fx + 24
  s +=
    field(ix, y0 + 86, c2, 'Họ và tên', { value: 'Phạm Minh Khôi', req: true }) +
    field(ix + c2 + 24, y0 + 86, c2, 'Số điện thoại', { value: '0912 345 678', req: true })
  const c3 = (fw - 48 - 48) / 3
  s +=
    field(ix, y0 + 168, c3, 'Loại công trình', { value: 'Căn hộ chung cư', select: true }) +
    field(ix + c3 + 24, y0 + 168, c3, 'Diện tích', { value: '86', suffix: 'm²' }) +
    field(ix + 2 * (c3 + 24), y0 + 168, c3, 'Ngân sách dự kiến', {
      value: '300 – 500 triệu ₫',
      select: true,
    })
  s += text(ix, y0 + 264, 'Dịch vụ quan tâm', { size: 14, weight: 600, fill: C.body })
  let chx = ix
  ;[
    ['Thiết kế nội thất', true],
    ['Thi công trọn gói', true],
    ['Cải tạo nhà cũ', false],
    ['Nội thất văn phòng', false],
  ].forEach(([l, on]) => {
    const w = tw(l, 14.5, 600) + 52
    s +=
      rect(chx, y0 + 276, w, 40, {
        r: 10,
        fill: on ? tint(P, 0.92) : '#fff',
        stroke: on ? P : '#D0D5DD',
      }) +
      checkbox(chx + 12, y0 + 287, on) +
      text(chx + 38, y0 + 301, l, { size: 14.5, weight: 600, fill: on ? PD() : C.body })
    chx += w + 10
  })
  s +=
    text(ix, y0 + 350, 'Nội dung', { size: 14, weight: 600, fill: C.body }) +
    textarea(
      ix,
      y0 + 362,
      fw - 48,
      92,
      'Căn hộ 3 phòng ngủ bàn giao thô, muốn phong cách hiện đại tông gỗ sáng, dự kiến vào ở tháng 3/2027.'
    )
  s +=
    rect(ix, y0 + 470, fw - 48, 56, { r: 12, stroke: '#D0D5DD', dash: '6 5', fill: C.soft }) +
    icon('upload', ix + 20, y0 + 488, 20, C.text2) +
    text(ix + 50, y0 + 503, 'Đính kèm bản vẽ mặt bằng (không bắt buộc)', {
      size: 14.5,
      fill: C.text2,
    })
  s +=
    button(ix, y0 + 550, 'Gửi yêu cầu', { w: 220, h: 54, icon: 'send', size: 16 }) +
    text(ix + 240, y0 + 582, 'Thông tin của bạn chỉ dùng để tư vấn', { size: 14, fill: C.text3 })
  return browser('noithatangia.vn/lien-he', s)
}
SCREENS['website-cong-ty/6.webp'] = (ctx) => {
  let s = card(CX, BODY_Y, CW, BODY_B - BODY_Y)
  s += tabs(
    CX + 24,
    BODY_Y + 12,
    [
      { label: 'Tất cả', count: 20 },
      { label: 'Đã đăng', count: 15 },
      { label: 'Hẹn giờ', count: 2 },
      { label: 'Bản nháp', count: 3 },
    ],
    0,
    { w: CW - 48 }
  )
  s +=
    searchBox(CX + CW - 24 - 300 - 216, BODY_Y + 12, 300, 40, 'Tìm tiêu đề bài viết', {
      size: 14.5,
    }) +
    input(CX + CW - 24 - 200, BODY_Y + 12, 200, {
      value: 'Chuyên mục: Tất cả',
      select: true,
      h: 40,
      size: 14.5,
    })
  const st = {
    pub: ['Đã đăng', 'success'],
    sch: ['Hẹn giờ 15/10 09:00', 'info'],
    draft: ['Bản nháp', 'neutral'],
  }
  const data = [
    [
      'dusk',
      '7 xu hướng nội thất căn hộ nổi bật năm 2026',
      '/tin-tuc/7-xu-huong-noi-that-2026',
      'Xu hướng',
      'Lương Bảo Ngọc',
      'pub',
      '2.418',
      '08/10/2026',
    ],
    [
      'warm',
      'Báo giá thi công nội thất trọn gói 2026',
      '/tin-tuc/bao-gia-thi-cong-noi-that',
      'Kinh nghiệm',
      'Lương Bảo Ngọc',
      'sch',
      '—',
      '12/10/2026',
    ],
    [
      'warm',
      'Chi phí hoàn thiện nội thất căn hộ 70 m²',
      '/tin-tuc/chi-phi-noi-that-can-ho-70m2',
      'Kinh nghiệm',
      'Trần Gia Huy',
      'pub',
      '3.906',
      '02/10/2026',
    ],
    [
      'cool',
      'Mẹo chọn rèm cửa cho phòng ngủ hướng Tây',
      '/tin-tuc/chon-rem-cua-phong-ngu',
      'Kinh nghiệm',
      'Trần Gia Huy',
      'draft',
      '—',
      '11/10/2026',
    ],
    [
      'stone',
      'Chọn gỗ công nghiệp hay gỗ tự nhiên cho tủ bếp?',
      '/tin-tuc/go-cong-nghiep-hay-go-tu-nhien',
      'Kinh nghiệm',
      'Lương Bảo Ngọc',
      'pub',
      '1.752',
      '25/09/2026',
    ],
    [
      'office',
      'An Gia bàn giao 30 căn hộ cho cư dân dự án ven sông',
      '/tin-tuc/ban-giao-30-can-ho',
      'Tin công ty',
      'Phòng Truyền thông',
      'pub',
      '864',
      '18/09/2026',
    ],
    [
      'green',
      'Phong cách Japandi: tối giản và ấm áp',
      '/tin-tuc/phong-cach-japandi',
      'Xu hướng',
      'Trần Gia Huy',
      'pub',
      '1.290',
      '14/09/2026',
    ],
    [
      'green',
      'Bố trí bàn làm việc hợp phong thủy',
      '/tin-tuc/ban-lam-viec-phong-thuy',
      'Phong thủy',
      'Lương Bảo Ngọc',
      'pub',
      '2.035',
      '11/09/2026',
    ],
  ]
  const rows = data.map(([k, t, slug, cat, au, stt, v, d], i) => [
    {
      t,
      sub: slug,
      thumb: (x, y) => scene(x, y, 72, 46, k, { r: 8, seed: 50 + i }),
      thumbW: 72,
      thumbH: 46,
      fill: C.text,
    },
    { badge: cat, tone: 'neutral' },
    { avatar: au, t: au },
    { badge: st[stt][0], tone: st[stt][1], dot: true },
    { t: v, weight: 600 },
    { t: d },
    {
      fn: (x, y, w, h) =>
        icon('edit', x + 14, y + h / 2 - 10, 20, C.text3) +
        icon('more', x + 44, y + h / 2 - 10, 20, C.text3),
    },
  ])
  s += table(
    CX,
    BODY_Y + 70,
    CW,
    [
      { label: 'Bài viết', w: 3 },
      { label: 'Chuyên mục', w: 0.95 },
      { label: 'Tác giả', w: 1.35 },
      { label: 'Trạng thái', w: 1.25 },
      { label: 'Lượt xem', w: 0.65, align: 'right' },
      { label: 'Cập nhật', w: 0.8 },
      { label: '', w: 80 },
    ],
    rows,
    { rowH: 70, headTop: true }
  )
  s += pager(CX + 24, BODY_B - 54, CW - 48, 'Hiển thị 1–8 trong 20 bài viết', ['1', '2', '3'])
  return appShell(
    ctx,
    {
      active: 'Bài viết',
      title: 'Bài viết',
      subtitle: 'Biên tập viên tự đăng bài, hẹn giờ và chỉnh SEO mà không cần lập trình viên',
      actions: [
        { label: 'Chuyên mục', variant: 'outline', icon: 'layers' },
        { label: 'Viết bài mới', icon: 'edit' },
      ],
    },
    s
  )
}
SCREENS['website-cong-ty/7.webp'] = () => {
  const screen = (x, y, w, h) => {
    let s =
      rect(x, y, w, 64, { fill: '#fff' }) + line(x, y + 63.5, x + w, y + 63.5, { stroke: C.line })
    s +=
      rect(x + 18, y + 14, 36, 36, { r: 10, fill: P }) +
      icon('sofa', x + 26, y + 22, 20, '#fff') +
      text(x + 64, y + 38, 'AN GIA', { size: 18, weight: 700, ls: 1.2 })
    s += icon('menu', x + w - 44, y + 20, 24, C.text)
    const hy = y + 64
    s += scene(x, hy, w, 330, 'warm', { r: 0, seed: 41, overlay: false })
    s += rect(x, hy, w, 330, {
      fill: grad(
        [
          [0, '#101828', 0.08],
          [0.45, '#101828', 0.4],
          [1, '#101828', 0.82],
        ],
        { x1: 0, y1: 0, x2: 0, y2: 1 }
      ),
    })
    s += badge(
      x + 20,
      hy + 150,
      'THIẾT KẾ & THI CÔNG',
      { bg: 'rgba(255,255,255,0.2)', fg: '#fff', dot: '#fff' },
      { h: 26, size: 12 }
    )
    s +=
      text(x + 20, hy + 214, 'Không gian sống tinh tế,', { size: 26, weight: 700, fill: '#fff' }) +
      text(x + 20, hy + 248, 'bàn giao đúng hẹn', { size: 26, weight: 700, fill: '#fff' })
    s += button(x + 20, hy + 268, 'Nhận báo giá miễn phí', {
      h: 46,
      size: 15,
      icon: 'arrowRight',
      r: 12,
    })
    const sy = hy + 350
    ;[
      ['12+', 'năm'],
      ['450+', 'công trình'],
      ['5 năm', 'bảo hành'],
    ].forEach(([a, b], i) => {
      const cw = (w - 40 - 20) / 3
      const cx = x + 20 + i * (cw + 10)
      s +=
        rect(cx, sy, cw, 70, { r: 14, fill: tint(P, 0.94) }) +
        text(cx + cw / 2, sy + 32, a, { size: 20, weight: 700, fill: P, anchor: 'middle' }) +
        text(cx + cw / 2, sy + 54, b, { size: 13, fill: C.text2, anchor: 'middle' })
    })
    s +=
      text(x + 20, sy + 112, 'Dịch vụ', { size: 19, weight: 700 }) +
      text(x + w - 20, sy + 112, 'Xem tất cả', { size: 14, weight: 600, fill: PD(), anchor: 'end' })
    ;[
      ['ruler', 'Thiết kế nội thất', 'Phối cảnh 3D, hồ sơ kỹ thuật'],
      ['wrench', 'Thi công trọn gói', 'Cam kết tiến độ, bảo hành 5 năm'],
    ].forEach(([ic, a, b], i) => {
      const cy = sy + 130 + i * 82
      s +=
        rect(x + 20, cy, w - 40, 70, { r: 14, fill: '#fff', stroke: C.border }) +
        rect(x + 34, cy + 13, 44, 44, { r: 12, fill: tint(P, 0.9) }) +
        icon(ic, x + 44, cy + 23, 24, P)
      s +=
        text(x + 92, cy + 31, a, { size: 15.5, weight: 700 }) +
        text(x + 92, cy + 52, b, { size: 13, fill: C.text2 }) +
        icon('chevronRight', x + w - 52, cy + 25, 20, C.text3)
    })
    const fy = y + h - 82
    s += rect(x, fy, w, 82, { fill: '#fff' }) + line(x, fy, x + w, fy, { stroke: C.border })
    const bw = (w - 50) / 2
    s +=
      button(x + 20, fy + 14, 'Gọi ngay', {
        variant: 'outline',
        w: bw,
        h: 46,
        icon: 'phone',
        r: 12,
      }) + button(x + 30 + bw, fy + 14, 'Nhắn tin', { w: bw, h: 46, icon: 'message', r: 12 })
    return s
  }
  return phoneScene(screen, [
    {
      x: 236,
      y: 300,
      icon: 'zap',
      title: 'Tải trang 1,2 giây',
      sub: 'Tối ưu cho mạng di động',
      tone: 'success',
    },
    { x: 1064, y: 590, icon: 'search', title: 'Chuẩn SEO', sub: 'Hiển thị đẹp trên Google' },
  ])
}

// ============================================================ 01 · Danh mục Demo
const DEV_STATUS = {
  HoanThien: ['Hoàn thiện', 'success'],
  DemoDuoc: ['Demo được', 'info'],
  DangLam: ['Đang làm', 'warning'],
  MoiTao: ['Mới tạo', 'neutral'],
}
const PUBLIC_STATUS = {
  HoanThien: ['Hoàn thiện', 'success'],
  DemoDuoc: ['Demo được', 'info'],
  DangLam: ['Sắp ra mắt', 'neutral'],
}
// Biểu tượng Danh mục Demo: lưới 2×2, ô cuối là nút phát (trùng public/logo/logo-mark.svg)
function dmMark(x, y, size, color) {
  const k = size / 64
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(k)})"><rect width="64" height="64" rx="15" fill="${color}"/><path d="M24 51V14h12a12 12 0 0 1 0 24H24" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`
}
function dmHeader() {
  const y = SITE_Y
  let s = rect(0, y, W, 72, { fill: '#fff' }) + line(0, y + 71.5, W, y + 71.5)
  s +=
    dmMark(120, y + 16, 40, P) +
    text(172, y + 36, 'PUM', { size: 18, weight: 700 }) +
    text(172, y + 55, 'Danh mục giải pháp', { size: 12.5, fill: C.text3 })
  s += button(1480, y + 16, 'Đăng nhập', { anchor: 'end', variant: 'ghost', h: 40 })
  const zx = 1480 - btnW('Đăng nhập') - 12
  s += button(zx, y + 16, 'Chat Zalo', { anchor: 'end', variant: 'soft', h: 40, icon: 'message' })
  const hx = zx - btnW('Chat Zalo', { icon: 'message' }) - 24
  s +=
    text(hx, y + 42, 'Hotline 0385 884 912', { size: 15, weight: 600, anchor: 'end' }) +
    icon('phone', hx - tw('Hotline 0385 884 912', 15, 600) - 28, y + 26, 20, PD())
  return s
}
function industryBadge(x, y, ind, o = {}) {
  return badge(
    x,
    y,
    ind.name,
    { bg: tint(ind.color, 0.88), fg: shade(ind.color, 0.3), dot: ind.color },
    { h: o.h ?? 26, size: o.size ?? 13, padX: o.padX ?? 10, anchor: o.anchor }
  )
}
const industryBadgeW = (ind, o = {}) => badgeW(ind.name, { size: o.size ?? 13, padX: o.padX ?? 10 })
function coverOrImage(x, y, w, h, demo, img, rt, rb = rt) {
  return img
    ? image(x, y, w, h, img, rt, rb)
    : defaultCover(x, y, w, h, demo, INDUSTRIES[demo.industry].color, { r: rt, rb })
}
function demoCard(x, y, w, imgH, demo, img) {
  const ind = INDUSTRIES[demo.industry]
  const h = imgH + 206
  let s = rect(x, y, w, h, { r: 18, fill: '#fff', sh: 'sh' })
  s += coverOrImage(x, y, w, imgH, demo, img, 18, 0)
  s += rect(x, y, w, h, { r: 18, stroke: C.border })
  if (demo.isFeatured)
    s +=
      rect(x + 12, y + 12, 86, 26, { r: 13, fill: '#fff', sh: 'sh' }) +
      icon('star', x + 22, y + 17, 16, '#F79009', { fill: '#F79009', sw: 1 }) +
      text(x + 43, y + 30, 'Nổi bật', { size: 13, weight: 600 })
  let by = y + imgH + 16
  s += industryBadge(x + 16, by, ind)
  const st = PUBLIC_STATUS[demo.devStatus]
  s += badge(x + 16 + industryBadgeW(ind) + 8, by, st[0], st[1], { h: 26, size: 13, padX: 10 })
  s += text(x + 16, by + 58, demo.name, { size: 19, weight: 700, maxW: w - 32 })
  s += lines(x + 16, by + 84, wrap(demo.shortDescription, w - 32, 14.5, 400, 2), {
    size: 14.5,
    fill: C.text2,
    lh: 22,
  })
  const bw = 150
  s +=
    button(x + 16, y + h - 58, 'Xem demo', {
      variant: 'cta',
      w: bw,
      h: 42,
      icon: 'external',
      size: 14.5,
    }) +
    button(x + 16 + bw + 10, y + h - 58, 'Chi tiết', {
      variant: 'outline',
      w: w - 32 - bw - 10,
      h: 42,
      size: 14.5,
    })
  return s
}
SCREENS['danh-muc-demo/1.webp'] = async () => {
  const order = [
    'pos-quan-cafe',
    'menu-qr-goi-mon',
    'website-ban-hang',
    'quan-ly-spa-salon',
    'crm-quan-ly-khach-hang',
    'quan-ly-nha-hang',
    'pos-cua-hang-ban-le',
    'quan-ly-nha-tro',
  ]
  const cw = (1360 - 3 * 24) / 4
  const imgH = Math.round(cw * 0.625)
  const imgs = {}
  for (const slug of order) imgs[slug] = await demoThumb(slug, cw, imgH)
  let s = rect(0, SITE_Y + 72, W, 330, {
    fill: grad(
      [
        [0, tint(P, 0.93)],
        [1, '#FFFFFF'],
      ],
      { x1: 0, y1: 0, x2: 0, y2: 1 }
    ),
  })
  s += dmHeader()
  const hy = SITE_Y + 72
  s += text(120, hy + 76, 'Giải pháp phần mềm doanh nghiệp và đồ án sinh viên', { size: 38, weight: 700 })
  s += text(
    120,
    hy + 114,
    'Xem trước 13 sản phẩm mẫu chạy thật, chọn đúng ngành và mở demo chỉ với một chạm.',
    { size: 18, fill: C.text2 }
  )
  s += input(120, hy + 140, 640, {
    h: 56,
    icon: 'search',
    placeholder: 'Tìm demo: POS, nhà trọ, spa…',
    size: 17,
    fill: '#fff',
  })
  const vis = DATA.demos.filter((d) => d.isVisible)
  const cnt = (slug) => vis.filter((d) => d.industry === slug).length
  const chipList = [
    { label: 'Tất cả', count: vis.length, active: true },
    ...DATA.industries
      .filter((i) => cnt(i.slug))
      .map((i) => ({
        label: i.name,
        count: cnt(i.slug),
        dot: true,
        color: i.color,
        active: false,
      })),
  ]
  s += chips(120, hy + 218, chipList, { h: 40 })
  s += text(120, hy + 302, `Tìm thấy ${vis.length} demo`, { size: 16, weight: 600, fill: C.text2 })
  s += button(1480, hy + 278, 'Sao chép link', {
    anchor: 'end',
    variant: 'outline',
    icon: 'copy',
    h: 38,
    size: 14.5,
  })
  const gy = hy + 326
  order.forEach((slug, i) => {
    const d = DATA.demos.find((x) => x.slug === slug)
    s += demoCard(
      120 + (i % 4) * (cw + 24),
      gy + Math.floor(i / 4) * (imgH + 206 + 24),
      cw,
      imgH,
      d,
      imgs[slug]
    )
  })
  return browser('localhost:3101', s)
}
SCREENS['danh-muc-demo/2.webp'] = async () => {
  const demo = DATA.demos.find((d) => d.slug === 'pos-quan-cafe')
  const ind = INDUSTRIES[demo.industry]
  const mw = 800
  const mh = 500
  const main = await thumb(demo.slug, demo.screenshots[0].file, mw, mh)
  const tws = []
  for (const sh of demo.screenshots) tws.push(await thumb(demo.slug, sh.file, 144, 90))
  let s = dmHeader()
  const y0 = SITE_Y + 72
  s +=
    icon('arrowLeft', 120, y0 + 26, 18, PD()) +
    text(146, y0 + 41, 'Danh mục', { size: 15, weight: 600, fill: PD() })
  const iy = y0 + 64
  s +=
    rect(120, iy, mw, mh, { r: 18, fill: '#fff', sh: 'sh2' }) +
    image(120, iy, mw, mh, main, 18) +
    rect(120, iy, mw, mh, { r: 18, stroke: C.border })
  s +=
    rect(120 + mw - 56, iy + 16, 40, 40, { r: 12, fill: '#fff', sh: 'sh' }) +
    icon('maximize', 120 + mw - 46, iy + 26, 20, C.body)
  const cap = demo.screenshots[0].caption
  s +=
    rect(136, iy + mh - 52, tw(cap, 14, 600) + 28, 34, { r: 17, fill: '#101828', fo: 0.72 }) +
    text(150, iy + mh - 30, cap, { size: 14, weight: 600, fill: '#fff' })
  tws.forEach((t, i) => {
    const tx = 120 + i * (144 + 20)
    s += image(tx, iy + mh + 18, 144, 90, t, 10)
    s += rect(tx, iy + mh + 18, 144, 90, {
      r: 10,
      stroke: i === 0 ? P : C.border,
      sw: i === 0 ? 3 : 1,
    })
  })
  const rx = 970
  const rw = 1480 - rx
  s +=
    industryBadge(rx, iy, ind, { h: 28, size: 13.5 }) +
    badge(rx + industryBadgeW(ind, { size: 13.5 }) + 8, iy, 'Hoàn thiện', 'success', {
      h: 28,
      dot: true,
    })
  s += text(rx, iy + 78, demo.name, { size: 38, weight: 700 })
  s += para(rx, iy + 118, demo.shortDescription, rw, {
    size: 17,
    fill: C.text2,
    lh: 27,
    maxLines: 3,
  })
  s += button(rx, iy + 196, 'Xem demo', {
    variant: 'cta',
    w: rw,
    h: 56,
    icon: 'external',
    size: 17,
  })
  s += button(rx, iy + 264, 'Sao chép gửi khách', {
    variant: 'outline',
    w: rw,
    h: 48,
    icon: 'copy',
    size: 15.5,
  })
  const ay = iy + 336
  s += card(rx, ay, rw, 282, { title: 'Tài khoản demo', titleSize: 17 })
  s += table(
    rx,
    ay + 54,
    rw,
    [
      { label: 'Tài khoản', w: 0.8 },
      { label: 'Vai trò', w: 1 },
      { label: 'Dùng để', w: 1.4 },
    ],
    demo.accounts.map((a) => [
      { t: a.username, weight: 700, fill: C.text },
      { t: a.roleName },
      { t: a.purpose, size: 13.5 },
    ]),
    { rowH: 44, headH: 38, headTop: true }
  )
  s +=
    icon('info', rx + 20, ay + 240, 18, C.text3) +
    text(rx + 46, ay + 254, 'Mở link, bấm Đăng nhập nhanh và chọn vai trò để vào ngay', {
      size: 13.5,
      fill: C.text2,
      maxW: rw - 60,
    })
  const fy = iy + mh + 150
  s += line(120, fy - 24, 1480, fy - 24, { stroke: C.line })
  s += text(120, fy + 10, 'Tính năng nổi bật', { size: 22, weight: 700 })
  const fw = 1360 / 3
  demo.features.forEach((f, i) => {
    const fx = 120 + (i % 3) * fw
    const fyy = fy + 40 + Math.floor(i / 3) * 46
    s +=
      circle(fx + 12, fyy + 12, 12, { fill: TONES.success.bg }) +
      icon('check', fx + 5, fyy + 5, 14, TONES.success.fg, { sw: 3 }) +
      text(fx + 34, fyy + 18, f, { size: 15.5, fill: C.body, maxW: fw - 50 })
  })
  return browser('localhost:3101/demos/pos-quan-cafe', s)
}
const OWNERS = ['Nguyễn Minh Quân', 'Trần Thị Mai', 'Lê Hoàng Nam', 'Phạm Đức Anh', 'Võ Thanh Tâm']
SCREENS['danh-muc-demo/3.webp'] = async (ctx) => {
  const demos = DATA.demos.slice(0, 9)
  const thumbs = {}
  for (const d of demos) thumbs[d.slug] = await demoThumb(d.slug, 64, 40)
  const all = DATA.demos
  const c = (st) => all.filter((d) => d.devStatus === st).length
  const stats = [
    ['Tổng demo', all.length, null],
    ['Mới tạo', c('MoiTao'), '#98A2B3'],
    ['Đang làm', c('DangLam'), TONES.warning.dot],
    ['Demo được', c('DemoDuoc'), TONES.info.dot],
    ['Hoàn thiện', c('HoanThien'), TONES.success.dot],
    ['Đang hiển thị', all.filter((d) => d.isVisible).length, P],
    ['Nổi bật', `${all.filter((d) => d.isFeatured).length}/6`, '#F79009'],
  ]
  const sw = (CW - 6 * 14) / 7
  let s = ''
  stats.forEach(
    ([l, v, dot], i) =>
      (s += statCard(CX + i * (sw + 14), BODY_Y, sw, 92, {
        label: l,
        value: String(v),
        dot,
        size: 26,
      }))
  )
  const ty = BODY_Y + 110
  s += card(CX, ty, CW, BODY_B - ty)
  s += searchBox(CX + 20, ty + 18, 300, 42, 'Tên demo, thư mục…', { size: 14.5 })
  s +=
    input(CX + 336, ty + 18, 200, {
      value: 'Nhóm ngành: Tất cả',
      select: true,
      h: 42,
      size: 14.5,
    }) +
    input(CX + 548, ty + 18, 190, {
      value: 'Trạng thái: Tất cả',
      select: true,
      h: 42,
      size: 14.5,
    }) +
    input(CX + 750, ty + 18, 180, { value: 'Hiển thị: Tất cả', select: true, h: 42, size: 14.5 })
  const rows = demos.map((d) => {
    const ind = INDUSTRIES[d.industry]
    const st = DEV_STATUS[d.devStatus]
    return [
      { t: String(d.number), fill: C.text3 },
      {
        fn: (x, y, w, h) =>
          coverOrImage(x + 12, y + h / 2 - 20, 64, 40, d, thumbs[d.slug], 6) +
          rect(x + 12, y + h / 2 - 20, 64, 40, { r: 6, stroke: C.border }),
      },
      { t: d.name, sub: `${String(d.number).padStart(2, '0')}-${d.projectCode}`, fill: C.text },
      { fn: (x, y, w, h) => industryBadge(x + 16, y + h / 2 - 13, ind, { size: 12.5, padX: 9 }) },
      { badge: st[0], tone: st[1], dot: true },
      { fn: (x, y, w, h) => toggle(x + 16, y + h / 2 - 11, d.isVisible) },
      {
        fn: (x, y, w, h) =>
          icon('star', x + 16, y + h / 2 - 11, 22, d.isFeatured ? '#F79009' : '#D0D5DD', {
            fill: d.isFeatured ? '#F79009' : 'none',
            sw: 1.6,
          }),
      },
      { avatar: OWNERS[d.number % OWNERS.length], t: OWNERS[d.number % OWNERS.length], size: 14 },
      { t: dateAgo(d.updatedDaysAgo) },
    ]
  })
  s += table(
    CX,
    ty + 78,
    CW,
    [
      { label: '#', w: 46, align: 'center' },
      { label: 'Ảnh', w: 92 },
      { label: 'Demo', w: 1.9 },
      { label: 'Nhóm ngành', w: 1.05 },
      { label: 'Trạng thái', w: 1.05 },
      { label: 'Hiển thị', w: 86 },
      { label: 'Nổi bật', w: 80 },
      { label: 'Phụ trách', w: 1.35 },
      { label: 'Cập nhật', w: 0.8 },
    ],
    rows,
    { rowH: 60, headTop: true }
  )
  return appShell(
    ctx,
    {
      active: 'Quản lý demo',
      title: 'Quản lý demo',
      subtitle: 'Thêm demo, ảnh chụp, trạng thái và thứ tự hiển thị trên trang công khai',
      actions: [
        { label: 'Sắp xếp', variant: 'outline', icon: 'sort' },
        { label: 'Thêm demo', icon: 'plus' },
      ],
    },
    s
  )
}
SCREENS['danh-muc-demo/4.webp'] = (ctx) => {
  const vs = DATA.visitStats
  const last = vs.filter((v) => v.dayOffset >= -29)
  const prev = vs.filter((v) => v.dayOffset >= -59 && v.dayOffset < -29)
  const tot = (arr, k) => sum(arr.map((v) => v[k]))
  const views = tot(last, 'views')
  const opens = tot(last, 'opens')
  const pv = tot(prev, 'views')
  const po = tot(prev, 'opens')
  const pct = (a, b) => (b ? `${a >= b ? '+' : '−'}${dec(Math.abs((a - b) / b) * 100)}%` : '+0%')
  const rate = views ? (opens / views) * 100 : 0
  const prate = pv ? (po / pv) * 100 : 0
  let s =
    segmented(CX, BODY_Y, ['7 ngày', '30 ngày', '90 ngày', 'Tùy chọn'], 1, { h: 42 }) +
    input(CX + segW(['7 ngày', '30 ngày', '90 ngày', 'Tùy chọn']) + 16, BODY_Y, 230, {
      value: 'Nhóm ngành: Tất cả',
      select: true,
      h: 42,
    })
  s += text(CX + CW, BODY_Y + 27, `${dateAgo(29)} – ${dateAgo(0)}`, {
    size: 14.5,
    fill: C.text3,
    anchor: 'end',
  })
  const ky = BODY_Y + 62
  const kw = (CW - 40) / 3
  ;[
    {
      label: 'Lượt xem trang demo',
      value: num(views),
      delta: pct(views, pv),
      note: 'so với 30 ngày trước',
      icon: 'eye',
    },
    {
      label: 'Lượt mở demo',
      value: num(opens),
      delta: pct(opens, po),
      note: 'so với 30 ngày trước',
      icon: 'external',
    },
    {
      label: 'Tỉ lệ mở demo',
      value: `${dec(rate)}%`,
      delta: `${rate >= prate ? '+' : '−'}${dec(Math.abs(rate - prate))} điểm`,
      note: 'lượt mở trên lượt xem',
      icon: 'trend',
    },
  ].forEach((o, i) => (s += kpi(CX + i * (kw + 20), ky, kw, 132, o)))
  const cy = ky + 152
  const cw1 = 848
  const ch = 300
  s += card(CX, cy, cw1, ch, { title: 'Lượt xem và lượt mở theo ngày' })
  s += legend(
    CX + cw1 - 24,
    cy + 40,
    [
      ['Lượt xem', P],
      ['Lượt mở', '#F79009'],
    ],
    { anchor: 'end' }
  )
  const days = range(30).map((i) => i - 29)
  const vSeries = days.map((d) =>
    tot(
      last.filter((v) => v.dayOffset === d),
      'views'
    )
  )
  const oSeries = days.map((d) =>
    tot(
      last.filter((v) => v.dayOffset === d),
      'opens'
    )
  )
  s += lineChart(CX + 24, cy + 66, cw1 - 48, ch - 80, {
    labels: days.map((d) => dateAgo(-d).slice(0, 5)),
    series: [
      { values: vSeries, color: P, area: true },
      { values: oSeries, color: '#F79009', width: 2.4 },
    ],
    ticks: 4,
    labelEvery: 5,
  })
  const rx = CX + cw1 + 20
  const rw = CW - cw1 - 20
  s += card(rx, cy, rw, ch, { title: 'Thiết bị xem' })
  const mob = tot(last, 'mobileViews')
  const desk = tot(last, 'desktopViews')
  const mp = Math.round((mob / Math.max(1, mob + desk)) * 100)
  s += donut(
    rx + 110,
    cy + 170,
    70,
    24,
    [
      { value: mob, color: P },
      { value: desk, color: tint(P, 0.7) },
    ],
    { center: `${mp}%`, centerSize: 24, sub: 'điện thoại' }
  )
  s +=
    rect(rx + 214, cy + 124, 12, 12, { r: 3.5, fill: P }) +
    text(rx + 234, cy + 135, 'Điện thoại', { size: 14, fill: C.text2 }) +
    text(rx + 234, cy + 157, `${num(mob)} lượt`, { size: 15, weight: 700 })
  s +=
    rect(rx + 214, cy + 184, 12, 12, { r: 3.5, fill: tint(P, 0.7) }) +
    text(rx + 234, cy + 195, 'Máy tính', { size: 14, fill: C.text2 }) +
    text(rx + 234, cy + 217, `${num(desk)} lượt`, { size: 15, weight: 700 })
  const by = cy + ch + 20
  const bh = BODY_B - by
  const per = DATA.demos
    .filter((d) => d.isVisible)
    .map((d) => ({
      d,
      v: tot(
        last.filter((x) => x.demo === d.slug),
        'views'
      ),
      o: tot(
        last.filter((x) => x.demo === d.slug),
        'opens'
      ),
    }))
    .sort((a, b) => b.v - a.v)
  s += card(CX, by, cw1, bh, { title: 'Top demo được xem nhiều', link: 'Xem top 10' })
  s += table(
    CX,
    by + 56,
    cw1,
    [
      { label: '#', w: 46, align: 'center' },
      { label: 'Demo', w: 2 },
      { label: 'Lượt xem', w: 0.8, align: 'right' },
      { label: 'Lượt mở', w: 0.8, align: 'right' },
      { label: 'Tỉ lệ mở', w: 0.8, align: 'right' },
    ],
    per
      .slice(0, 3)
      .map((p, i) => [
        { t: String(i + 1), weight: 700, fill: C.text3 },
        { t: p.d.name, weight: 600, fill: C.text },
        { t: num(p.v), weight: 600 },
        { t: num(p.o) },
        { t: `${dec(p.v ? (p.o / p.v) * 100 : 0)}%` },
      ]),
    { rowH: 46, headH: 40, headTop: true }
  )
  s += card(rx, by, rw, bh, { title: 'Theo nhóm ngành' })
  const byInd = DATA.industries
    .map((i) => ({ i, v: sum(per.filter((p) => p.d.industry === i.slug).map((p) => p.v)) }))
    .filter((x) => x.v)
    .sort((a, b) => b.v - a.v)
    .slice(0, 4)
  s += hbars(
    rx + 24,
    by + 58,
    rw - 48,
    byInd.map(({ i, v }) => ({ label: i.name, value: v, display: num(v), color: i.color })),
    { rowH: 44 }
  )
  return appShell(
    ctx,
    {
      active: 'Thống kê',
      title: 'Thống kê',
      subtitle: 'Lượt xem trang chi tiết và lượt bấm Xem demo của khách',
      actions: [{ label: 'Xuất Excel', variant: 'outline', icon: 'download' }],
    },
    s
  )
}

// ============================================================ Dựng và xuất ảnh
const svgCache = new Map()
const rendering = new Set()
let DATA = null
let INDUSTRIES = {}

function genericScreen(ctx, shot) {
  return appShell(
    ctx,
    { active: ctx.menu?.[0]?.label, title: shot.caption, subtitle: ctx.demo.shortDescription },
    card(CX, BODY_Y, CW, BODY_B - BODY_Y, { title: ctx.demo.name }) +
      para(CX + 24, BODY_Y + 80, ctx.demo.description || ctx.demo.shortDescription, CW - 48, {
        size: 16,
        fill: C.text2,
      })
  )
}
async function renderShot(slug, file) {
  const key = `${slug}/${file}`
  if (svgCache.has(key)) return svgCache.get(key)
  const demo = DATA.demos.find((d) => d.slug === slug)
  const shot = demo.screenshots.find((s) => s.file === file)
  const saved = { P, defs, uid }
  rendering.add(key)
  P = INDUSTRIES[demo.industry]?.color ?? '#2563EB'
  defs = []
  uid = 0
  const base = DEMO_CTX[slug] ?? {
    icon: INDUSTRY_ICON[demo.industry] ?? 'layers',
    org: demo.name,
    user: ['Nguyễn Minh Quân', 'Quản trị viên'],
    menu: M(['dashboard', 'Tổng quan'], ['chart', 'Báo cáo']),
  }
  const ctx = { ...base, demo, shot, data: DATA }
  const fn = SCREENS[key]
  const body = fn ? await fn(ctx) : genericScreen(ctx, shot)
  const svg = svgDoc(body)
  ;({ P, defs, uid } = saved)
  rendering.delete(key)
  svgCache.set(key, svg)
  return svg
}
// Ảnh thu nhỏ của một demo khác (PNG base64) để nhúng vào ảnh trang danh mục
async function thumb(slug, file, w, h) {
  const shot = DATA.demos.find((d) => d.slug === slug)?.screenshots?.find((s) => s.file === file)
  // Ảnh chụp thật (không có `layout`) thì thu nhỏ từ file WebP đã có
  const source = shot && !shot.layout ? readFileSync(join(OUT_DIR, slug, file)) : Buffer.from(await renderShot(slug, file))
  const png = await sharp(source)
    .resize(Math.round(w), Math.round(h), { kernel: 'lanczos3' })
    .png()
    .toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}
async function demoThumb(slug, w, h) {
  const demo = DATA.demos.find((d) => d.slug === slug)
  const first = demo?.screenshots?.[0]
  if (!first || rendering.has(`${slug}/${first.file}`)) return null
  return thumb(slug, first.file, w, h)
}
function image(x, y, w, h, href, r = 0, rb = r) {
  const id = clip(x, y, w, h, r, rb)
  return clipped(
    id,
    `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xlink:href="${href}"/>`
  )
}
async function encodeWebp(svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  for (const q of [90, 86, 82, 78, 74, 70, 64, 58, 50]) {
    const buf = await sharp(png).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer()
    if (buf.length <= MAX_BYTES) return { buf, q, png }
  }
  throw new Error('Không nén được ảnh xuống 150 KB')
}

async function main() {
  DATA = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  INDUSTRIES = Object.fromEntries(DATA.industries.map((i) => [i.slug, i]))
  const jobs = []
  for (const demo of DATA.demos)
    for (const shot of demo.screenshots ?? [])
      // Ảnh không có `layout` là ảnh chụp thật của demo đã chạy: giữ nguyên, không vẽ đè
      if (shot.layout) jobs.push({ slug: demo.slug, file: shot.file, layout: shot.layout })
  // Ảnh của Danh mục Demo nhúng ảnh thu nhỏ của demo khác nên vẽ sau cùng
  jobs.sort((a, b) => (a.slug === 'danh-muc-demo') - (b.slug === 'danh-muc-demo'))
  if (PREVIEW) mkdirSync(PREVIEW, { recursive: true })
  const sizes = new Map()
  for (const job of jobs) {
    const key = `${job.slug}/${job.file}`
    if (ONLY && !key.includes(ONLY)) continue
    const svg = await renderShot(job.slug, job.file)
    const { buf, q, png } = await encodeWebp(svg)
    const meta = await sharp(buf).metadata()
    const dir = join(OUT_DIR, job.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, job.file), buf)
    sizes.set(key, { width: meta.width, height: meta.height, sizeBytes: buf.length })
    if (PREVIEW)
      writeFileSync(join(PREVIEW, `${job.slug}__${job.file.replace(/\.\w+$/, '')}.png`), png)
    console.log(
      `${key.padEnd(48)} ${job.layout.padEnd(11)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB  q${q}`
    )
  }
  if (ONLY) return
  // Đọc lại file ngay trước khi ghi, chỉ gán width/height/sizeBytes cho từng ảnh
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  for (const demo of data.demos)
    for (const shot of demo.screenshots ?? []) {
      const m = sizes.get(`${demo.slug}/${shot.file}`)
      if (!m) continue
      shot.width = m.width
      shot.height = m.height
      shot.sizeBytes = m.sizeBytes
    }
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
  const all = [...sizes.values()]
  console.log(
    `Đã tạo ${all.length} ảnh · lớn nhất ${(Math.max(...all.map((s) => s.sizeBytes)) / 1024).toFixed(1)} KB · trung bình ${(sum(all.map((s) => s.sizeBytes)) / all.length / 1024).toFixed(1)} KB`
  )
}

await main()
