'use client'

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ArrowDown, ArrowUp, Plus, Trash2, UserRound } from 'lucide-react'
import { FormField } from '@/components/shared/FormField'
import { PasswordInput } from '@/components/shared/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { demoLimits } from '../../lib/demo-rules'
import type { DemoFormValues } from '../../schemas/demo.schema'
import { Counter, EditorSection } from './EditorSection'

/**
 * Tab Tài khoản demo (FR-19, BR-16): bật/tắt "Cần đăng nhập", mật khẩu demo (nội bộ),
 * 0–6 tài khoản: tên đăng nhập (BR-SYS-01, không trùng trong demo), tên vai trò, dùng để xem gì, thứ tự.
 */
export function AccountsTab({
  canEdit,
  canViewInternal,
}: {
  canEdit: boolean
  canViewInternal: boolean
}) {
  const { register, control, formState } = useFormContext<DemoFormValues>()
  const errors = formState.errors
  const accounts = useFieldArray({ control, name: 'accounts' })
  const requiresLogin = useWatch({ control, name: 'requiresLogin' })

  return (
    <fieldset disabled={!canEdit} className="space-y-5">
      <legend className="sr-only">Tài khoản demo</legend>
      <EditorSection
        title="Đăng nhập"
        description="Demo như landing page không cần đăng nhập; trang chi tiết sẽ ghi “Không cần đăng nhập”."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="requiresLogin"
            render={({ field }) => (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <span>
                  <span className="block text-sm font-medium">Cần đăng nhập</span>
                  <span className="text-muted-foreground block text-xs">
                    Bật khi demo có trang đăng nhập
                  </span>
                </span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canEdit}
                  aria-label="Cần đăng nhập"
                />
              </label>
            )}
          />
          {canViewInternal && (
            <FormField
              label="Mật khẩu demo"
              error={errors.demoPassword?.message}
              hint="Nội bộ, trang công khai không hiển thị; thường là DEMO_PASSWORD của dự án"
            >
              <PasswordInput
                autoComplete="new-password"
                disabled={!canEdit || !requiresLogin}
                {...register('demoPassword')}
              />
            </FormField>
          )}
        </div>
      </EditorSection>

      <EditorSection
        title="Tài khoản demo"
        description="Khách thấy tên đăng nhập, vai trò, dùng để xem gì; vào bằng nút “Đăng nhập nhanh”."
        actions={
          <Counter
            value={accounts.fields.length}
            max={demoLimits.accountsMax}
            suffix=" tài khoản"
          />
        }
      >
        {!requiresLogin && (
          <p className="bg-muted text-muted-foreground mb-3 rounded-lg px-3 py-2 text-sm">
            Đang tắt “Cần đăng nhập”: danh sách tài khoản không hiện trên trang công khai.
          </p>
        )}
        <div className="space-y-3">
          {accounts.fields.map((field, index) => {
            const rowErrors = errors.accounts?.[index]
            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[auto_1fr_1fr_1.4fr_auto] md:items-start"
              >
                <span
                  className="bg-muted text-muted-foreground hidden size-10 items-center justify-center rounded-full md:flex"
                  aria-hidden="true"
                >
                  <UserRound className="size-4" />
                </span>
                <FormField label="Tên đăng nhập" required error={rowErrors?.username?.message}>
                  <Input
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="vd: thungan"
                    {...register(`accounts.${index}.username` as const)}
                  />
                </FormField>
                <FormField label="Vai trò" required error={rowErrors?.roleName?.message}>
                  <Input
                    autoComplete="off"
                    placeholder="vd: Thu ngân"
                    {...register(`accounts.${index}.roleName` as const)}
                  />
                </FormField>
                <FormField label="Dùng để xem gì" error={rowErrors?.purpose?.message}>
                  <Input
                    autoComplete="off"
                    placeholder="vd: Bán hàng, thanh toán"
                    {...register(`accounts.${index}.purpose` as const)}
                  />
                </FormField>
                <div className="flex gap-1 md:pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => accounts.move(index, index - 1)}
                    aria-label={`Đưa tài khoản ${index + 1} lên`}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === accounts.fields.length - 1}
                    onClick={() => accounts.move(index, index + 1)}
                    aria-label={`Đưa tài khoản ${index + 1} xuống`}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => accounts.remove(index)}
                    aria-label={`Xóa tài khoản ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )
          })}
          {errors.accounts?.message && (
            <p role="alert" className="text-destructive text-[0.8125rem]">
              {errors.accounts.message}
            </p>
          )}
          {accounts.fields.length === 0 && (
            <p className="text-muted-foreground text-sm">Chưa có tài khoản demo.</p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={accounts.fields.length >= demoLimits.accountsMax}
            onClick={() =>
              accounts.append({ username: '', roleName: '', purpose: '' }, { shouldFocus: true })
            }
          >
            <Plus aria-hidden="true" />
            Thêm tài khoản
          </Button>
        </div>
      </EditorSection>
    </fieldset>
  )
}
