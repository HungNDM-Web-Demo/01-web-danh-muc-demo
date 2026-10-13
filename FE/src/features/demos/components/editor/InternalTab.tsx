'use client'

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { demoLimits } from '../../lib/demo-rules'
import type { DemoFormValues } from '../../schemas/demo.schema'
import { Counter, EditorSection } from './EditorSection'

/**
 * Tab Nội bộ (FR-20): người phụ trách, link Swagger, repo, ghi chú nội bộ (tối đa 2.000 ký tự, BR-08),
 * kịch bản tóm tắt, câu hỏi khách hay hỏi kèm câu trả lời gợi ý. Không bao giờ hiện cho khách (BR-10).
 */
export function InternalTab({ canEdit }: { canEdit: boolean }) {
  const { register, control, formState } = useFormContext<DemoFormValues>()
  const errors = formState.errors
  const faqs = useFieldArray({ control, name: 'faqs' })
  const notes = useWatch({ control, name: 'internalNotes' })

  return (
    <fieldset disabled={!canEdit} className="space-y-5">
      <legend className="sr-only">Thông tin nội bộ</legend>
      <EditorSection
        title="Phụ trách và liên kết kỹ thuật"
        description="Chỉ nhân viên có quyền xem thông tin nội bộ mới thấy."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Người phụ trách" error={errors.ownerName?.message}>
            <Input
              autoComplete="off"
              placeholder="vd: Nguyễn Minh Quân"
              {...register('ownerName')}
            />
          </FormField>
          <FormField
            label="Link Swagger"
            error={errors.swaggerUrl?.message}
            hint="vd https://localhost:7102/swagger"
          >
            <Input
              type="url"
              inputMode="url"
              spellCheck={false}
              placeholder="https://"
              {...register('swaggerUrl')}
            />
          </FormField>
          <FormField label="Repo" error={errors.repoUrl?.message} hint="Link GitHub của dự án">
            <Input
              type="url"
              inputMode="url"
              spellCheck={false}
              placeholder="https://github.com/…"
              {...register('repoUrl')}
            />
          </FormField>
        </div>
      </EditorSection>

      <EditorSection title="Ghi chú và kịch bản">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label="Ghi chú nội bộ"
            error={errors.internalNotes?.message}
            hint={
              <span className="flex justify-between gap-2">
                <span>Lưu ý khi demo, lỗi đã biết…</span>
                <Counter value={notes.trim().length} max={demoLimits.internalNotesMax} />
              </span>
            }
          >
            <Textarea rows={6} {...register('internalNotes')} />
          </FormField>
          <FormField
            label="Kịch bản tóm tắt"
            error={errors.demoScript?.message}
            hint="Các bước trình bày trước khách"
          >
            <Textarea rows={6} {...register('demoScript')} />
          </FormField>
        </div>
      </EditorSection>

      <EditorSection
        title="Câu hỏi khách hay hỏi"
        description="Kèm câu trả lời gợi ý để nhân viên mới cũng trả lời được."
        actions={
          <span className="text-muted-foreground text-xs tabular-nums">
            {faqs.fields.length} câu hỏi
          </span>
        }
      >
        <div className="space-y-3">
          {faqs.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1.4fr_auto] md:items-start"
            >
              <FormField
                label={`Câu hỏi ${index + 1}`}
                required
                error={errors.faqs?.[index]?.question?.message}
              >
                <Textarea rows={2} {...register(`faqs.${index}.question` as const)} />
              </FormField>
              <FormField
                label="Trả lời gợi ý"
                required
                error={errors.faqs?.[index]?.answer?.message}
              >
                <Textarea rows={2} {...register(`faqs.${index}.answer` as const)} />
              </FormField>
              <div className="md:pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => faqs.remove(index)}
                  aria-label={`Xóa câu hỏi ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => faqs.append({ question: '', answer: '' }, { shouldFocus: true })}
          >
            <Plus aria-hidden="true" />
            Thêm câu hỏi
          </Button>
        </div>
      </EditorSection>
    </fieldset>
  )
}
