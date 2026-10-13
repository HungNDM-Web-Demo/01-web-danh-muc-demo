import { SCREENSHOT_TYPES, demoLimits, screenshotMessages } from './demo-rules'

/** Đọc kích thước ảnh trên trình duyệt (0 khi không đọc được). */
export async function readImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => resolve({ width: 0, height: 0 })
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type ScreenshotCheck = {
  accepted: File[]
  rejected: { fileName: string; reason: string }[]
}

/**
 * Kiểm tra ảnh ngay trên trình duyệt trước khi tải (BR-07, UC-06 E1, E2):
 * định dạng → dung lượng → chiều rộng → số ảnh còn lại; mỗi ảnh lỗi có lý do riêng (TC-28, TC-29),
 * ảnh hợp lệ vẫn được nhận theo thứ tự đã chọn.
 */
export async function checkScreenshots(
  files: File[],
  currentCount: number
): Promise<ScreenshotCheck> {
  const accepted: File[] = []
  const rejected: ScreenshotCheck['rejected'] = []
  let remaining = demoLimits.screenshotsMax - currentCount
  for (const file of files) {
    if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) {
      rejected.push({ fileName: file.name, reason: screenshotMessages.type })
      continue
    }
    if (file.size > demoLimits.screenshotMaxBytes) {
      rejected.push({ fileName: file.name, reason: screenshotMessages.size })
      continue
    }
    const { width } = await readImageDimensions(file)
    if (width < demoLimits.screenshotMinWidth) {
      rejected.push({ fileName: file.name, reason: screenshotMessages.width })
      continue
    }
    if (remaining <= 0) {
      rejected.push({ fileName: file.name, reason: screenshotMessages.count })
      continue
    }
    remaining -= 1
    accepted.push(file)
  }
  return { accepted, rejected }
}
