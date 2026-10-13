'use client'

import { useState } from 'react'
import { Check, Copy, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { routeTo } from '@/config/route-path'
import { copyText } from '../lib/clipboard'
import { buildShareText } from '../lib/share-text'
import type { PublicDemoDetail } from '../types/catalog.types'

type ShareDialogProps = {
  demo: PublicDemoDetail
  /** Có quyền demos.view-internal: hiện ô "Kèm mật khẩu" (BR-17, TC-19) */
  canIncludePassword: boolean
  /** Mật khẩu demo từ API nội bộ (chỉ có khi có quyền) */
  password?: string | null
  passwordLoading?: boolean
  className?: string
}

/**
 * SCR-04 Hộp sao chép gửi khách (FR-14, UC-04): xem trước nội dung theo mẫu BR-17, mặc định không kèm mật khẩu.
 * Link chi tiết dùng địa chỉ đang mở (origin hiện tại).
 */
export function ShareDialog({
  demo,
  canIncludePassword,
  password,
  passwordLoading,
  className,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [withPassword, setWithPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const text = buildShareText({
    name: demo.name,
    demoUrl: demo.demoUrl ?? '',
    requiresLogin: demo.requiresLogin,
    accounts: demo.accounts,
    password: canIncludePassword && withPassword ? password : null,
    detailUrl: `${origin}${routeTo.demoDetail(demo.slug)}`,
  })

  const handleCopy = async () => {
    if (await copyText(text)) {
      setCopied(true)
      toast.success('Đã sao chép', { description: 'Dán vào Zalo để gửi khách.' })
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 700)
    } else {
      toast.error('Trình duyệt không cho sao chép, hãy bôi đen nội dung và chép thủ công.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setWithPassword(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Send aria-hidden="true" />
          Sao chép gửi khách
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sao chép gửi khách</DialogTitle>
          <DialogDescription>
            Xem trước nội dung, bấm Sao chép rồi dán vào Zalo gửi khách.
          </DialogDescription>
        </DialogHeader>

        <pre
          className="bg-muted/60 max-h-72 overflow-auto rounded-xl border p-4 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap"
          aria-label="Nội dung sẽ sao chép"
        >
          {text}
        </pre>

        {canIncludePassword && demo.requiresLogin && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="share-with-password"
              checked={withPassword}
              disabled={passwordLoading || !password}
              onCheckedChange={(value) => setWithPassword(value === true)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label htmlFor="share-with-password">Kèm mật khẩu</Label>
              <p className="text-muted-foreground text-xs">
                {passwordLoading
                  ? 'Đang tải mật khẩu demo…'
                  : password
                    ? 'Mặc định không kèm: khách dùng "Đăng nhập nhanh" là đủ.'
                    : 'Demo này chưa nhập mật khẩu.'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button onClick={handleCopy} disabled={passwordLoading && withPassword}>
            {passwordLoading && withPassword ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
