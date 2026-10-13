'use client'

import { CircleX, ListChecks } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type MissingState = { title: string; missing: string[] } | null

/** Liệt kê từng mục còn thiếu khi bật hiển thị, đổi trạng thái, sửa demo đang hiển thị (FR-22, UC-07 E1). */
export function MissingConditionsDialog({
  state,
  onClose,
}: {
  state: MissingState
  onClose: () => void
}) {
  return (
    <AlertDialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader className="sm:flex sm:flex-row sm:items-start sm:gap-4 sm:text-left">
          <span
            className="bg-warning/12 text-warning mx-auto flex size-11 shrink-0 items-center justify-center rounded-full sm:mx-0"
            aria-hidden="true"
          >
            <ListChecks className="size-5" />
          </span>
          <div className="space-y-1.5">
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            <AlertDialogDescription>Bổ sung các mục sau rồi thử lại:</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <ul className="space-y-2">
          {state?.missing.map((item) => (
            <li
              key={item}
              className="bg-destructive/5 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <CircleX className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
