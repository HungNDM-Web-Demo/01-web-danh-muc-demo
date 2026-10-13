'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { reportService } from '../services/report.service'
import type { VisitReportQuery } from '../types/report.types'

export const reportKeys = {
  all: ['reports'] as const,
  visits: (query: VisitReportQuery) => ['reports', 'visits', query] as const,
}

export function useVisitReport(query: VisitReportQuery, enabled = true) {
  return useQuery({
    queryKey: reportKeys.visits(query),
    queryFn: () => reportService.visits(query),
    placeholderData: keepPreviousData,
    enabled,
  })
}
