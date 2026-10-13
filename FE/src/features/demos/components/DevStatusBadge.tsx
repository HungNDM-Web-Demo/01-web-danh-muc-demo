import { StatusBadge, type StatusTone } from '@/components/shared/StatusBadge'
import { devStatusLabels, type DemoDevStatus } from '../types/demo.types'

const ADMIN_TONES: Record<DemoDevStatus, StatusTone> = {
  MoiTao: 'neutral',
  DangLam: 'warning',
  DemoDuoc: 'primary',
  HoanThien: 'success',
}

type DevStatusBadgeProps = {
  status: DemoDevStatus
  /** public: Đang làm hiện "Sắp ra mắt" (FR-01); admin: tên trạng thái phát triển */
  audience?: 'public' | 'admin'
  className?: string
}

/**
 * Nhãn trạng thái demo. Trang công khai: Hoàn thiện (xanh lá), Demo được (xanh dương), Sắp ra mắt (xám)
 * theo 08-THIET-KE-GIAO-DIEN §3; trang quản trị: 4 trạng thái phát triển.
 */
export function DevStatusBadge({ status, audience = 'admin', className }: DevStatusBadgeProps) {
  if (audience === 'public' && (status === 'DangLam' || status === 'MoiTao')) {
    return (
      <StatusBadge tone="neutral" className={className}>
        Sắp ra mắt
      </StatusBadge>
    )
  }
  return (
    <StatusBadge tone={ADMIN_TONES[status]} className={className}>
      {devStatusLabels[status]}
    </StatusBadge>
  )
}
