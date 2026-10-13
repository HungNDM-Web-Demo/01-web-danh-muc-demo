'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TagInputProps = {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  max: number
  maxLength?: number
  placeholder?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Ô nhập từ khóa dạng thẻ: Enter hoặc dấu phẩy để thêm, Backspace ở ô trống để xóa thẻ cuối (BR-08: tối đa 10). */
export function TagInput({
  id,
  value,
  onChange,
  max,
  maxLength = 40,
  placeholder,
  ...aria
}: TagInputProps) {
  const [text, setText] = useState('')

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, '').slice(0, maxLength)
    if (!tag) return
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setText('')
      return
    }
    onChange([...value, tag])
    setText('')
  }

  return (
    <div
      className={cn(
        'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-xs transition-[box-shadow] focus-within:ring-3',
        aria['aria-invalid'] && 'border-destructive ring-destructive/20 ring-3'
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="bg-secondary text-secondary-foreground inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-2.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== tag))}
            aria-label={`Xóa từ khóa ${tag}`}
            className="hover:bg-foreground/10 focus-visible:ring-ring/50 flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => {
          const next = e.target.value
          if (next.endsWith(',')) add(next)
          else setText(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => add(text)}
        placeholder={value.length >= max ? '' : placeholder}
        className="placeholder:text-muted-foreground h-7 min-w-32 flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
        {...aria}
      />
    </div>
  )
}
