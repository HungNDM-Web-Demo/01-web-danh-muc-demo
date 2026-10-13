'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpenText,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { routeTo } from '@/config/route-path'
import { DevStatusBadge } from '@/features/demos/components/DevStatusBadge'
import type { DemoDetail } from '@/features/demos/types/demo.types'
import { formatDate } from '@/lib/format'
import { copyText } from '../lib/clipboard'

type InternalPanelProps = {
  detail: DemoDetail | undefined
  isLoading: boolean
  canEdit: boolean
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

function ExternalUrl({ href }: { href?: string | null }) {
  if (!href) return <span className="text-muted-foreground">Chưa có</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex max-w-full items-center gap-1 break-all underline-offset-4 hover:underline"
    >
      {href}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">(mở tab mới)</span>
    </a>
  )
}

/** Mật khẩu che bằng ••••••, nút hiện và nút sao chép (08-THIET-KE-GIAO-DIEN §4) */
function PasswordField({ value }: { value?: string | null }) {
  const [visible, setVisible] = useState(false)
  if (!value) return <span className="text-muted-foreground">Chưa nhập</span>
  return (
    <span className="inline-flex items-center gap-1">
      <code
        className="bg-muted rounded-md px-2 py-1 font-mono text-sm"
        aria-label={visible ? undefined : 'Mật khẩu đang ẩn'}
      >
        {visible ? value : '••••••'}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sao chép mật khẩu"
        onClick={async () => {
          if (await copyText(value)) toast.success('Đã sao chép mật khẩu')
          else toast.error('Không sao chép được, hãy chép thủ công.')
        }}
      >
        <Copy />
      </Button>
    </span>
  )
}

/**
 * Khung "Thông tin nội bộ" (FR-12, UC-03): chỉ người có demos.view-internal thấy; dữ liệu do trình duyệt
 * tự gọi API có token sau khi tải trang, không bao giờ có trong HTML công khai (BR-10).
 */
export function InternalPanel({ detail, isLoading, canEdit }: InternalPanelProps) {
  const internal = detail?.internal

  return (
    <section
      aria-labelledby="internal-title"
      className="border-warning/60 bg-warning/[0.04] rounded-2xl border-2 border-dashed p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="internal-title" className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="text-warning size-5" aria-hidden="true" />
            Thông tin nội bộ
          </h2>
          <p className="text-muted-foreground text-sm">
            Chỉ tài khoản có quyền mới thấy khung này, khách không thấy.
          </p>
        </div>
        {canEdit && detail && (
          <Button asChild variant="outline" size="sm" className="max-sm:h-11">
            <Link href={routeTo.adminDemoEdit(detail.id)}>
              <Pencil aria-hidden="true" />
              Sửa demo
            </Link>
          </Button>
        )}
      </div>

      {isLoading || !detail ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Trạng thái phát triển">
              <span className="flex flex-wrap items-center gap-1.5">
                <DevStatusBadge status={detail.devStatus} />
                {detail.isVisible ? (
                  <StatusBadge tone="success" dot={false}>
                    Đang hiển thị
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral" dot={false}>
                    Đang ẩn
                  </StatusBadge>
                )}
              </span>
            </Field>
            <Field label="Người phụ trách">
              {internal?.ownerName || <span className="text-muted-foreground">Chưa phân công</span>}
            </Field>
            <Field label="Mật khẩu demo">
              {detail.requiresLogin ? (
                <PasswordField value={internal?.demoPassword} />
              ) : (
                <span className="text-muted-foreground">Không cần đăng nhập</span>
              )}
            </Field>
            <Field label="Swagger">
              <ExternalUrl href={internal?.swaggerUrl} />
            </Field>
            <Field label="Repo">
              <ExternalUrl href={internal?.repoUrl} />
            </Field>
            <Field label="Thư mục · công khai lần đầu">
              <span className="font-mono text-[0.8125rem]">{detail.folder}</span>
              <span className="text-muted-foreground">
                {' '}
                · {formatDate(detail.firstPublishedAt, 'chưa công khai')}
              </span>
            </Field>
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-card rounded-xl border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="text-muted-foreground size-4" aria-hidden="true" />
                Ghi chú nội bộ
              </h3>
              <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-line">
                {internal?.internalNotes || (
                  <span className="text-muted-foreground">Chưa có ghi chú.</span>
                )}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <BookOpenText className="text-muted-foreground size-4" aria-hidden="true" />
                Kịch bản tóm tắt
              </h3>
              <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-line">
                {internal?.demoScript || (
                  <span className="text-muted-foreground">Chưa có kịch bản.</span>
                )}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Câu hỏi khách hay hỏi</h3>
            {internal?.faqs.length ? (
              <Accordion type="multiple" className="bg-card mt-2 rounded-xl border px-4">
                {internal.faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`faq-${index}`}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="min-h-11 py-3">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">Chưa có câu hỏi.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
