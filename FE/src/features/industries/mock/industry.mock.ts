import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { auditCreate, auditDelete, auditUpdate } from '@/mock/mock-audit'
import { requirePermission } from '@/mock/mock-auth'
import { mockDb } from '@/mock/mock-db'
import { conflict, domain, notFound, validation } from '@/mock/mock-errors'
import { newId } from '@/mock/mock-helpers'
import { isListedDemo } from '@/features/demos/lib/demo-rules'
import type { IndustryRecord } from '@/features/demos/mock/demo.data'
import { demosDb, industriesDb } from '@/features/demos/mock/demo.db'
import {
  INDUSTRY_COLOR_MESSAGE,
  INDUSTRY_COLOR_PATTERN,
  INDUSTRY_SLUG_MESSAGE,
  INDUSTRY_SLUG_PATTERN,
} from '../lib/industry-rules'
import type {
  Industry,
  ReorderIndustriesRequest,
  SaveIndustryRequest,
} from '../types/industry.types'

/** Handler `/api/industries` ở chế độ mock (07-DANH-SACH-API §4, BR-13). */

const ENTITY = 'Industry'

function toIndustry(record: IndustryRecord): Industry {
  const demos = demosDb.filter((d) => d.industryId === record.id)
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    slug: record.slug,
    icon: record.icon,
    color: record.color,
    description: record.description,
    sortOrder: record.sortOrder,
    demoCount: demos.length,
    visibleDemoCount: demos.filter(isListedDemo).length,
  }
}

function validateSave(request: SaveIndustryRequest, currentId: string | null) {
  const errors: Record<string, string> = {}
  /** Trùng mã, slug → 409 kèm errors.{field} như BE */
  const duplicates: Record<string, string> = {}
  const others = industriesDb.filter((i) => i.id !== currentId)
  if (!Number.isInteger(request.code) || request.code < 1 || request.code > 99) {
    errors.code = 'Mã nhóm là số nguyên từ 1 đến 99'
  } else if (others.some((i) => i.code === request.code)) {
    duplicates.code = `Mã nhóm ${request.code} đã được dùng`
  }
  const name = request.name?.trim() ?? ''
  if (!name) errors.name = 'Nhập tên nhóm ngành'
  else if (name.length > 60) errors.name = 'Tên nhóm tối đa 60 ký tự'
  const slug = request.slug?.trim() ?? ''
  if (!INDUSTRY_SLUG_PATTERN.test(slug)) errors.slug = INDUSTRY_SLUG_MESSAGE
  else if (others.some((i) => i.slug === slug)) duplicates.slug = 'Slug đã được dùng cho nhóm khác'
  if (!INDUSTRY_COLOR_PATTERN.test(request.color?.trim() ?? ''))
    errors.color = INDUSTRY_COLOR_MESSAGE
  if ((request.description?.trim().length ?? 0) > 300) errors.description = 'Mô tả tối đa 300 ký tự'
  if ((request.icon?.length ?? 0) > 40) errors.icon = 'Tên biểu tượng tối đa 40 ký tự'
  if (Object.keys(errors).length) throw validation(errors)
  const firstDuplicate = Object.values(duplicates)[0]
  if (firstDuplicate) throw conflict(`${firstDuplicate}.`, duplicates)
}

const blankToNull = (value: string | null | undefined) => value?.trim() || null

export const industryMock = {
  async list(): Promise<Industry[]> {
    await mockDelay()
    requirePermission(permissions.industries.view)
    return industriesDb
      .all()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.code - b.code)
      .map(toIndustry)
  },

  async create(request: SaveIndustryRequest): Promise<Industry> {
    await mockDelay()
    requirePermission(permissions.industries.create)
    validateSave(request, null)
    const now = new Date().toISOString()
    const record: IndustryRecord = {
      id: newId(),
      code: request.code,
      name: request.name.trim(),
      slug: request.slug.trim(),
      icon: blankToNull(request.icon),
      color: request.color.trim().toUpperCase(),
      description: blankToNull(request.description),
      sortOrder: industriesDb.all().reduce((acc, i) => Math.max(acc, i.sortOrder), 0) + 1,
      createdAt: now,
      updatedAt: now,
    }
    industriesDb.insert(record)
    auditCreate(ENTITY, record)
    return toIndustry(record)
  },

  async update(id: string, request: SaveIndustryRequest): Promise<Industry> {
    await mockDelay()
    requirePermission(permissions.industries.update)
    const current = industriesDb.get(id)
    if (!current) throw notFound('Không tìm thấy nhóm ngành')
    validateSave(request, id)
    const next: IndustryRecord = {
      ...current,
      code: request.code,
      name: request.name.trim(),
      slug: request.slug.trim(),
      icon: blankToNull(request.icon),
      color: request.color.trim().toUpperCase(),
      description: blankToNull(request.description),
      updatedAt: new Date().toISOString(),
    }
    industriesDb.update(id, next)
    auditUpdate(ENTITY, current, next)
    return toIndustry(next)
  },

  /** BR-13: không xóa nhóm còn demo */
  async remove(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.industries.delete)
    const current = industriesDb.get(id)
    if (!current) throw notFound('Không tìm thấy nhóm ngành')
    const count = demosDb.count((d) => d.industryId === id)
    if (count > 0) throw domain(`Nhóm đang có ${count} demo`)
    industriesDb.remove(id)
    auditDelete(ENTITY, current)
  },

  async reorder(request: ReorderIndustriesRequest): Promise<void> {
    await mockDelay()
    requirePermission(permissions.industries.update)
    const all = industriesDb.all()
    const ids = request.ids ?? []
    const unique = new Set(ids)
    if (
      unique.size !== ids.length ||
      ids.length !== all.length ||
      !all.every((i) => unique.has(i.id))
    ) {
      throw validation({ ids: 'Danh sách sắp xếp phải gồm đủ mọi nhóm ngành' })
    }
    mockDb.batch(() => {
      ids.forEach((id, index) => industriesDb.update(id, { sortOrder: index + 1 }))
    })
  },
}
