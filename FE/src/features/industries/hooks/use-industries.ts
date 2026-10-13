'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogKeys } from '@/features/catalog/hooks/use-catalog'
import { industryService } from '../services/industry.service'
import type { SaveIndustryRequest } from '../types/industry.types'

export const industryKeys = {
  all: ['industries'] as const,
  list: ['industries', 'list'] as const,
}

export function useIndustries(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: industryKeys.list,
    queryFn: () => industryService.list(),
    enabled: options.enabled ?? true,
  })
}

/** Đổi nhóm ngành: làm mới danh sách nhóm, bảng demo (tên nhóm), trang công khai (nút lọc), nhật ký */
function useInvalidateIndustries() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: industryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['demos'] })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
  }
}

export function useCreateIndustry() {
  const invalidate = useInvalidateIndustries()
  return useMutation({
    mutationFn: (request: SaveIndustryRequest) => industryService.create(request),
    onSuccess: invalidate,
  })
}

export function useUpdateIndustry() {
  const invalidate = useInvalidateIndustries()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: SaveIndustryRequest }) =>
      industryService.update(id, request),
    onSuccess: invalidate,
  })
}

export function useDeleteIndustry() {
  const invalidate = useInvalidateIndustries()
  return useMutation({
    mutationFn: (id: string) => industryService.remove(id),
    onSuccess: invalidate,
  })
}

export function useReorderIndustries() {
  const invalidate = useInvalidateIndustries()
  return useMutation({
    mutationFn: (ids: string[]) => industryService.reorder({ ids }),
    onSuccess: invalidate,
  })
}
