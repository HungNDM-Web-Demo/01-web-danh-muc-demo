'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogKeys } from '@/features/catalog/hooks/use-catalog'
import { demoService } from '../services/demo.service'
import type {
  ChangeStatusRequest,
  DemoDetail,
  SaveDemoRequest,
  UpdateScreenshotsRequest,
} from '../types/demo.types'

export const demoKeys = {
  all: ['demos'] as const,
  list: ['demos', 'list'] as const,
  summary: ['demos', 'summary'] as const,
  nextNumber: ['demos', 'next-number'] as const,
  detail: (id: string) => ['demos', 'detail', id] as const,
  bySlug: (slug: string) => ['demos', 'by-slug', slug] as const,
  history: (id: string) => ['demos', 'history', id] as const,
}

export function useDemos(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: demoKeys.list,
    queryFn: () => demoService.list(),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useDemoSummary() {
  return useQuery({ queryKey: demoKeys.summary, queryFn: () => demoService.summary() })
}

export function useNextDemoNumber(enabled: boolean) {
  return useQuery({
    queryKey: demoKeys.nextNumber,
    queryFn: () => demoService.nextNumber(),
    enabled,
    staleTime: 0,
  })
}

export function useDemo(id: string | undefined) {
  return useQuery({
    queryKey: demoKeys.detail(id ?? ''),
    queryFn: () => demoService.get(id!),
    enabled: !!id,
  })
}

/** Khung nội bộ, xem trước trên trang chi tiết (chỉ gọi khi có demos.view-internal) */
export function useDemoBySlug(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: demoKeys.bySlug(slug),
    queryFn: () => demoService.getBySlug(slug),
    enabled,
    staleTime: 15_000,
  })
}

export function useStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: demoKeys.history(id ?? ''),
    queryFn: () => demoService.statusHistory(id!),
    enabled: !!id,
  })
}

/** Sau khi ghi: làm mới danh sách, thẻ tổng hợp, trang công khai, nhóm ngành (số demo), nhật ký */
function useInvalidateDemos() {
  const queryClient = useQueryClient()
  return (detail?: DemoDetail) => {
    if (detail) queryClient.setQueryData(demoKeys.detail(detail.id), detail)
    void queryClient.invalidateQueries({ queryKey: demoKeys.all })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['industries'] })
    void queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
  }
}

export function useCreateDemo() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: (request: SaveDemoRequest) => demoService.create(request),
    onSuccess: (detail) => invalidate(detail),
  })
}

export function useUpdateDemo() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: SaveDemoRequest }) =>
      demoService.update(id, request),
    onSuccess: (detail) => invalidate(detail),
  })
}

export function useDeleteDemo() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: (id: string) => demoService.remove(id),
    onSuccess: () => invalidate(),
  })
}

export function useChangeDemoStatus() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ChangeStatusRequest }) =>
      demoService.changeStatus(id, request),
    onSuccess: (detail) => invalidate(detail),
  })
}

export function useSetDemoVisibility() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      demoService.setVisibility(id, { isVisible }),
    onSuccess: (detail) => invalidate(detail),
  })
}

export function useSetDemoFeatured() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      demoService.setFeatured(id, { isFeatured }),
    onSuccess: (detail) => invalidate(detail),
  })
}

export function useReorderDemos() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: (ids: string[]) => demoService.reorder({ ids }),
    onSuccess: () => invalidate(),
  })
}

export function useUploadScreenshots() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({
      id,
      files,
      onProgress,
    }: {
      id: string
      files: File[]
      onProgress?: (percent: number) => void
    }) => demoService.uploadScreenshots(id, files, onProgress),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateScreenshots() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateScreenshotsRequest }) =>
      demoService.updateScreenshots(id, request),
    onSuccess: () => invalidate(),
  })
}

export function useDeleteScreenshot() {
  const invalidate = useInvalidateDemos()
  return useMutation({
    mutationFn: ({ id, screenshotId }: { id: string; screenshotId: string }) =>
      demoService.deleteScreenshot(id, screenshotId),
    onSuccess: () => invalidate(),
  })
}
