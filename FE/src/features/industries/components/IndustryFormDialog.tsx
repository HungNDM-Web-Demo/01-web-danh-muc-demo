'use client'

import { useEffect, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { slugify } from '@/features/demos/lib/demo-rules'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useCreateIndustry, useUpdateIndustry } from '../hooks/use-industries'
import { INDUSTRY_COLOR_PATTERN, INDUSTRY_COLOR_PRESETS } from '../lib/industry-rules'
import {
  industryFormSchema,
  toIndustryForm,
  toSaveIndustryRequest,
  type IndustryFormValues,
} from '../schemas/industry.schema'
import type { Industry } from '../types/industry.types'
import { IndustryBadge } from './IndustryBadge'
import { INDUSTRY_ICON_NAMES, IndustryIcon } from './IndustryIcon'
import { industryVars } from './industry-style'

type IndustryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  industry: Industry | null
  nextCode: number
}

/** Thêm, sửa nhóm ngành (UC-09 bước 2): mã, tên, slug, biểu tượng lucide, màu nhãn, mô tả; xem trước nhãn. */
export function IndustryFormDialog({
  open,
  onOpenChange,
  industry,
  nextCode,
}: IndustryFormDialogProps) {
  const create = useCreateIndustry()
  const update = useUpdateIndustry()
  const pending = create.isPending || update.isPending
  const slugEdited = useRef(!!industry)

  const form = useForm<IndustryFormValues>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: toIndustryForm(industry, nextCode),
  })
  const { errors } = form.formState

  useEffect(() => {
    if (!open) return
    form.reset(toIndustryForm(industry, nextCode))
    slugEdited.current = !!industry
  }, [open, industry, nextCode, form])

  const [name, color, icon, slug] = useWatch({
    control: form.control,
    name: ['name', 'color', 'icon', 'slug'],
  })
  useEffect(() => {
    if (!industry && !slugEdited.current) form.setValue('slug', slugify(name).slice(0, 40))
  }, [industry, name, form])

  const slugField = form.register('slug')
  const previewColor = INDUSTRY_COLOR_PATTERN.test(color) ? color : '#475569'

  const onSubmit = form.handleSubmit((values) => {
    const request = toSaveIndustryRequest(values)
    const done = {
      onSuccess: () => {
        toast.success(industry ? `Đã lưu nhóm ${request.name}` : `Đã thêm nhóm ${request.name}`)
        onOpenChange(false)
      },
      onError: (error: unknown) => {
        if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
      },
    }
    if (industry) update.mutate({ id: industry.id, request }, done)
    else create.mutate(request, done)
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{industry ? 'Sửa nhóm ngành' : 'Thêm nhóm ngành'}</DialogTitle>
          <DialogDescription>
            Tên hiện trên nút lọc của danh mục; slug dùng trong đường dẫn ?nganh=.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col">
          <div className="grid max-h-[calc(100dvh-14rem)] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-6">
            <FormField label="Mã" required error={errors.code?.message} className="sm:col-span-1">
              <Input inputMode="numeric" maxLength={2} {...form.register('code')} />
            </FormField>
            <FormField
              label="Tên nhóm"
              required
              error={errors.name?.message}
              className="sm:col-span-3"
            >
              <Input autoComplete="off" placeholder="vd: F&B" {...form.register('name')} />
            </FormField>
            <FormField
              label="Slug"
              required
              error={errors.slug?.message}
              className="sm:col-span-2"
              hint={`?nganh=${slug || '…'}`}
            >
              <Input
                autoComplete="off"
                spellCheck={false}
                {...slugField}
                onChange={(event) => {
                  slugEdited.current = true
                  void slugField.onChange(event)
                }}
              />
            </FormField>

            <div className="grid gap-1.5 sm:col-span-6">
              <span className="text-sm font-medium" id="industry-color-label">
                Màu nhãn
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </span>
              <div
                className="flex flex-wrap items-center gap-2"
                role="radiogroup"
                aria-labelledby="industry-color-label"
              >
                {INDUSTRY_COLOR_PRESETS.map((preset) => {
                  const active = color.toUpperCase() === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`Màu ${preset}`}
                      onClick={() =>
                        form.setValue('color', preset, { shouldDirty: true, shouldValidate: true })
                      }
                      style={industryVars(preset)}
                      className="focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-full bg-[var(--ind)] text-white ring-offset-2 outline-none focus-visible:ring-3"
                    >
                      {active && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  )
                })}
                <Controller
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <span className="flex items-center gap-2">
                      <input
                        type="color"
                        value={INDUSTRY_COLOR_PATTERN.test(field.value) ? field.value : '#475569'}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        aria-label="Chọn màu khác"
                        className="h-9 w-11 cursor-pointer rounded-md border bg-transparent p-1"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        aria-label="Mã màu"
                        aria-invalid={!!errors.color}
                        className="w-28 font-mono uppercase"
                        maxLength={7}
                      />
                    </span>
                  )}
                />
              </div>
              {errors.color && (
                <p role="alert" className="text-destructive text-[0.8125rem]">
                  {errors.color.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5 sm:col-span-6">
              <span className="text-sm font-medium" id="industry-icon-label">
                Biểu tượng
              </span>
              <div
                className="grid grid-cols-8 gap-1.5 sm:grid-cols-12"
                role="radiogroup"
                aria-labelledby="industry-icon-label"
              >
                {INDUSTRY_ICON_NAMES.map((iconName) => {
                  const active = icon === iconName
                  return (
                    <button
                      key={iconName}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={iconName}
                      title={iconName}
                      onClick={() => form.setValue('icon', iconName, { shouldDirty: true })}
                      style={industryVars(previewColor)}
                      className={cn(
                        'focus-visible:ring-ring/50 flex aspect-square items-center justify-center rounded-lg border outline-none focus-visible:ring-3',
                        active ? 'border-transparent bg-[var(--ind)] text-white' : 'hover:bg-muted'
                      )}
                    >
                      <IndustryIcon iconName={iconName} className="size-5" />
                    </button>
                  )
                })}
              </div>
            </div>

            <FormField label="Mô tả" error={errors.description?.message} className="sm:col-span-6">
              <Textarea
                rows={2}
                placeholder="vd: Nhà hàng, quán cafe, trà sữa"
                {...form.register('description')}
              />
            </FormField>

            <div className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 sm:col-span-6">
              <span className="text-muted-foreground text-sm">Xem trước:</span>
              <IndustryBadge name={name || 'Tên nhóm'} color={previewColor} icon={icon} size="md" />
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {industry ? 'Lưu' : 'Thêm nhóm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
