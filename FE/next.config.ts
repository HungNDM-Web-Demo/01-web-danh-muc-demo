import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    qualities: [100, 75],
  },
  // Ẩn nút "N" của Next.js khi chạy dev để màn hình demo gọn gàng
  devIndicators: false,
}

export default nextConfig
