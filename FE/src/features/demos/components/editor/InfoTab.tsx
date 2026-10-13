'use client'

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ArrowDown, ArrowUp, Info, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { IndustryIcon } from '@/features/industries/components/IndustryIcon'
import type { Industry } from '@/features/industries/types/industry.types'
import { demoFolder, demoLimits } from '../../lib/demo-rules'
import type { DemoFormValues } from '../../schemas/demo.schema'
import { Counter, EditorSection } from './EditorSection'
import { TagInput } from './TagInput'

type InfoTabProps = {
  mode: 'create' | 'edit'
  industries: Industry[] | undefined
  /** Slug đang lưu (để cảnh báo đổi slug, BR-06) */
  savedSlug?: string
  everPublished: boolean
  suggestedNumber?: number
  onSlugEdited: () => void
  canEdit: boolean
}

/** Tab Thông tin (FR-17): định danh (BR-05, BR-09), giới thiệu (BR-08), tính năng, từ khóa, link demo. */
export function InfoTab({
  mode,
  industries,
  savedSlug,
  everPublished,
  suggestedNumber,
  onSlugEdited,
  canEdit,
}: InfoTabProps) {
  const form = useFormContext<DemoFormValues>()
  const { register, control, formState } = form
  const errors = formState.errors
  const features = useFieldArray({ control, name: 'features' })
  const [number, projectCode, name, slug, shortDescription] = useWatch({
    control,
    name: ['number', 'projectCode', 'name', 'slug', 'shortDescription'],
  })
  const folder =
    /^\d{1,2}$/.test(number.trim()) && projectCode.trim()
      ? demoFolder(Number(number), projectCode.trim())
      : '—'
  const slugChanged = mode === 'edit' && !!savedSlug && slug.trim() !== savedSlug
  const shortLength = shortDescription.trim().length

  return (
    <fieldset disabled={!canEdit} className="space-y-5">
      <legend className="sr-only">Thông tin demo</legend>
      <EditorSection
        title="Định danh"
        description="Số thứ tự, mã dự án, tên, đường dẫn và nhóm ngành của demo."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            label="Số thứ tự"
            required
            error={errors.number?.message}
            hint={
              mode === 'create' && suggestedNumber
                ? `Gợi ý ${String(suggestedNumber).padStart(2, '0')} (lớn nhất + 1)`
                : '2 chữ số, không trùng'
            }
          >
            <Input inputMode="numeric" maxLength={2} {...register('number')} />
          </FormField>
          <FormField
            label="Mã dự án"
            required={mode === 'create'}
            error={errors.projectCode?.message}
            hint={
              mode === 'create'
                ? 'vd fnb-pos-cafe; không đổi sau khi tạo'
                : 'Không đổi sau khi tạo (BR-09)'
            }
            className="lg:col-span-2"
          >
            <Input
              autoComplete="off"
              spellCheck={false}
              disabled={mode === 'edit'}
              {...register('projectCode')}
            />
          </FormField>
          <div className="grid gap-1.5">
            <span className="text-foreground text-sm font-medium">Thư mục</span>
            <span className="bg-muted/60 flex h-10 items-center rounded-md border px-2.5 font-mono text-sm">
              {folder}
            </span>
            <span className="text-muted-foreground text-[0.8125rem]">
              Tự ghép số thứ tự + mã dự án
            </span>
          </div>
          <FormField
            label="Tên demo"
            required
            error={errors.name?.message}
            className="sm:col-span-2"
            hint={<Counter value={name.trim().length} max={demoLimits.nameMax} suffix=" ký tự" />}
          >
            <Input autoComplete="off" placeholder="vd: POS Quán Cafe" {...register('name')} />
          </FormField>
          <FormField
            label="Slug (đường dẫn)"
            required
            error={errors.slug?.message}
            className="sm:col-span-2"
            hint={
              slugChanged && everPublished ? (
                <span className="text-warning inline-flex items-start gap-1 font-medium">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Link cũ sẽ tự chuyển sang link mới (/demos/{savedSlug} → /demos/
                  {slug.trim() || '…'})
                </span>
              ) : mode === 'create' ? (
                'Tự sinh từ tên, có thể sửa: chữ thường không dấu, số, dấu -'
              ) : (
                `/demos/${slug.trim() || '…'}`
              )
            }
          >
            <Input
              autoComplete="off"
              spellCheck={false}
              {...register('slug', { onChange: onSlugEdited })}
            />
          </FormField>
          <FormField
            label="Nhóm ngành"
            required
            error={errors.industryId?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="industryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    // Radix Select báo giá trị rỗng khi danh sách nhóm chưa tải xong: bỏ qua để form không bị "đã sửa"
                    if (value) field.onChange(value)
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full" onBlur={field.onBlur}>
                    <SelectValue placeholder="Chọn nhóm ngành" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries?.map((industry) => (
                      <SelectItem key={industry.id} value={industry.id}>
                        <IndustryIcon iconName={industry.icon} className="size-4" />
                        {industry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Ý tưởng gốc"
            error={errors.ideaCode?.message}
            hint="Mã trong DANH-SACH-Y-TUONG, vd 1.4"
          >
            <Input autoComplete="off" {...register('ideaCode')} />
          </FormField>
          <FormField
            label="Link demo"
            error={errors.demoUrl?.message}
            className="sm:col-span-2 lg:col-span-3"
            hint="Bắt đầu bằng http:// hoặc https://, vd http://localhost:3102"
          >
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              {...register('demoUrl')}
            />
          </FormField>
        </div>
      </EditorSection>

      <EditorSection
        title="Giới thiệu cho khách"
        description="Hiện trên thẻ và trang chi tiết công khai."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label="Mô tả ngắn"
            error={errors.shortDescription?.message}
            className="lg:col-span-2"
            hint={
              <span className="flex justify-between gap-2">
                <span>Dài 50–160 ký tự; cần có để bật hiển thị</span>
                <Counter
                  value={shortLength}
                  max={demoLimits.shortDescriptionMax}
                  min={demoLimits.shortDescriptionMin}
                />
              </span>
            }
          >
            <Textarea rows={2} {...register('shortDescription')} />
          </FormField>
          <FormField label="Đối tượng khách hàng" error={errors.targetCustomers?.message}>
            <Textarea rows={3} {...register('targetCustomers')} />
          </FormField>
          <FormField label="Vấn đề giải quyết" error={errors.problemSolved?.message}>
            <Textarea rows={3} {...register('problemSolved')} />
          </FormField>
          <FormField
            label="Mô tả chi tiết"
            error={errors.description?.message}
            className="lg:col-span-2"
          >
            <Textarea rows={5} {...register('description')} />
          </FormField>
          <FormField
            label="Loại sản phẩm"
            error={errors.productType?.message}
            hint="vd: Ứng dụng web và trang quản trị"
          >
            <Input autoComplete="off" {...register('productType')} />
          </FormField>
          <FormField
            label="Thiết bị sử dụng"
            error={errors.devices?.message}
            hint="vd: Máy tính, tablet, điện thoại"
          >
            <Input autoComplete="off" {...register('devices')} />
          </FormField>
        </div>
      </EditorSection>

      <EditorSection
        title="Tính năng nổi bật"
        description={`Tối đa ${demoLimits.featuresMax} mục, mỗi mục tối đa ${demoLimits.featureMax} ký tự; cần ít nhất ${demoLimits.featuresMinToShow} mục để bật hiển thị.`}
        actions={
          <Counter
            value={features.fields.length}
            max={demoLimits.featuresMax}
            suffix=" tính năng"
          />
        }
      >
        <div className="space-y-2">
          {features.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-2.5 w-6 shrink-0 text-right text-sm tabular-nums">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <Input
                  aria-label={`Tính năng ${index + 1}`}
                  aria-invalid={!!errors.features?.[index]?.value}
                  {...register(`features.${index}.value` as const)}
                />
                {errors.features?.[index]?.value && (
                  <p role="alert" className="text-destructive mt-1 text-[0.8125rem]">
                    {errors.features[index]?.value?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => features.move(index, index - 1)}
                aria-label={`Đưa tính năng ${index + 1} lên`}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === features.fields.length - 1}
                onClick={() => features.move(index, index + 1)}
                aria-label={`Đưa tính năng ${index + 1} xuống`}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => features.remove(index)}
                aria-label={`Xóa tính năng ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {errors.features?.message && (
            <p role="alert" className="text-destructive flex items-center gap-1 text-[0.8125rem]">
              <Info className="size-3.5" aria-hidden="true" />
              {errors.features.message}
            </p>
          )}
          {errors.features?.root?.message && (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {errors.features.root.message}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => features.append({ value: '' }, { shouldFocus: true })}
            disabled={features.fields.length >= demoLimits.featuresMax + 2}
          >
            <Plus aria-hidden="true" />
            Thêm tính năng
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        title="Từ khóa tìm kiếm"
        description="Giúp khách tìm thấy demo khi gõ từ khác tên, vd: cafe, trà sữa. Enter để thêm."
      >
        <Controller
          control={control}
          name="keywords"
          render={({ field, fieldState }) => (
            <div className="grid gap-1.5">
              <TagInput
                id="demo-keywords"
                value={field.value}
                onChange={field.onChange}
                max={demoLimits.keywordsMax}
                placeholder="Nhập từ khóa rồi Enter"
                aria-invalid={!!fieldState.error}
                aria-describedby="demo-keywords-hint"
              />
              <p id="demo-keywords-hint" className="flex justify-between text-[0.8125rem]">
                <span className={fieldState.error ? 'text-destructive' : 'text-muted-foreground'}>
                  {fieldState.error?.message ?? `Tối đa ${demoLimits.keywordsMax} từ khóa`}
                </span>
                <Counter value={field.value.length} max={demoLimits.keywordsMax} />
              </p>
            </div>
          )}
        />
      </EditorSection>
    </fieldset>
  )
}
