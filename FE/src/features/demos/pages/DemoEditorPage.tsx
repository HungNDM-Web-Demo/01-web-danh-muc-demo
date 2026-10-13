'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormProvider, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CircleX,
  ExternalLink,
  History,
  Images,
  Info,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorState } from '@/components/shared/ErrorState'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appConfig } from '@/config/app.config'
import { permissions } from '@/config/permissions'
import { routePath, routeTo } from '@/config/route-path'
import { useIndustries } from '@/features/industries/hooks/use-industries'
import { usePermissions } from '@/hooks/use-permissions'
import { applyFieldErrors, getErrorMessage, getMissing, isApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { DemoThumb } from '../components/DemoThumb'
import { DevStatusBadge } from '../components/DevStatusBadge'
import { MissingConditionsDialog } from '../components/MissingConditionsDialog'
import { AccountsTab } from '../components/editor/AccountsTab'
import { ChangeStatusDialog } from '../components/editor/ChangeStatusDialog'
import { HistoryTab } from '../components/editor/HistoryTab'
import { InfoTab } from '../components/editor/InfoTab'
import { InternalTab } from '../components/editor/InternalTab'
import { ScreenshotsManager } from '../components/editor/ScreenshotsManager'
import { VisibilityPanel } from '../components/editor/VisibilityPanel'
import { useDemoPublishActions } from '../hooks/use-demo-actions'
import {
  useCreateDemo,
  useDeleteDemo,
  useDemo,
  useDemos,
  useNextDemoNumber,
  useUpdateDemo,
  useUpdateScreenshots,
} from '../hooks/use-demos'
import { useUnsavedChangesWarning } from '../hooks/use-unsaved-changes'
import { demoErrors, slugify, uniqueSlug } from '../lib/demo-rules'
import {
  demoFormSchema,
  emptyDemoForm,
  toDemoForm,
  toSaveDemoRequest,
  type DemoFormValues,
} from '../schemas/demo.schema'
import type { Screenshot } from '../types/demo.types'

type TabKey = 'info' | 'screenshots' | 'accounts' | 'internal' | 'history'

/** Ô nhập thuộc tab nào (chuyển tới tab có lỗi đầu tiên khi lưu) */
const FIELD_TAB: Record<keyof DemoFormValues, TabKey> = {
  number: 'info',
  projectCode: 'info',
  name: 'info',
  slug: 'info',
  industryId: 'info',
  ideaCode: 'info',
  targetCustomers: 'info',
  problemSolved: 'info',
  productType: 'info',
  devices: 'info',
  shortDescription: 'info',
  description: 'info',
  features: 'info',
  keywords: 'info',
  demoUrl: 'info',
  requiresLogin: 'accounts',
  demoPassword: 'accounts',
  accounts: 'accounts',
  swaggerUrl: 'internal',
  repoUrl: 'internal',
  ownerName: 'internal',
  internalNotes: 'internal',
  demoScript: 'internal',
  faqs: 'internal',
}

const tabsWithErrors = (errors: FieldErrors<DemoFormValues>) =>
  new Set(
    Object.keys(errors)
      .map((key) => FIELD_TAB[key as keyof DemoFormValues])
      .filter(Boolean)
  )

type ShotEdits = {
  order: string[] | null
  captions: Record<string, string>
  coverId: string | null
}
const NO_EDITS: ShotEdits = { order: null, captions: {}, coverId: null }

/** Ảnh đang chỉnh = ảnh đã lưu + thứ tự, chú thích, ảnh đại diện chưa lưu */
function applyShotEdits(server: Screenshot[], edits: ShotEdits): Screenshot[] {
  const sorted = [...server].sort((a, b) => a.sortOrder - b.sortOrder)
  const byId = new Map(sorted.map((s) => [s.id, s]))
  const ids = edits.order
    ? [
        ...edits.order.filter((id) => byId.has(id)),
        ...sorted.filter((s) => !edits.order!.includes(s.id)).map((s) => s.id),
      ]
    : sorted.map((s) => s.id)
  const cover =
    edits.coverId && byId.has(edits.coverId) ? edits.coverId : sorted.find((s) => s.isCover)?.id
  return ids.map((id) => {
    const shot = byId.get(id)!
    return { ...shot, caption: edits.captions[id] ?? shot.caption ?? '', isCover: id === cover }
  })
}

function shotsChanged(server: Screenshot[], current: Screenshot[]) {
  const sorted = [...server].sort((a, b) => a.sortOrder - b.sortOrder)
  if (sorted.length !== current.length) return false
  return sorted.some(
    (s, i) =>
      s.id !== current[i].id ||
      (s.caption ?? '') !== (current[i].caption ?? '') ||
      s.isCover !== current[i].isCover
  )
}

/**
 * SCR-06 Thêm, sửa demo (UC-05, UC-06, UC-07): đầu trang có tên, thư mục, trạng thái, đổi trạng thái,
 * công tắc hiển thị + điều kiện; 5 tab Thông tin · Ảnh chụp · Tài khoản demo · Nội bộ · Lịch sử;
 * thanh lưu dính đáy, cảnh báo rời trang chưa lưu.
 */
export function DemoEditorPage({ id }: { id?: string }) {
  const mode = id ? 'edit' : 'create'
  const router = useRouter()
  const { can } = usePermissions()
  const canEdit = mode === 'create' ? can(permissions.demos.create) : can(permissions.demos.update)
  const canPublish = can(permissions.demos.publish)
  const canDelete = can(permissions.demos.delete)
  const canViewInternal = can(permissions.demos.viewInternal)

  const detail = useDemo(id)
  const demo = detail.data ?? null
  const industries = useIndustries()
  const demos = useDemos({ enabled: mode === 'create' })
  const nextNumber = useNextDemoNumber(mode === 'create' && canEdit)
  const createDemo = useCreateDemo()
  const updateDemo = useUpdateDemo()
  const updateShots = useUpdateScreenshots()
  const deleteDemo = useDeleteDemo()
  const actions = useDemoPublishActions()

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema(mode)),
    defaultValues: emptyDemoForm(),
    mode: 'onTouched',
  })
  const { isDirty, errors, isSubmitting } = form.formState

  const [tab, setTab] = useState<TabKey>('info')
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saveIssue, setSaveIssue] = useState<{ message: string; missing: string[] } | null>(null)
  const [shotEdits, setShotEdits] = useState<ShotEdits>(NO_EDITS)
  const slugEdited = useRef(mode === 'edit')
  const loadedKey = useRef<string | null>(null)

  // Nạp dữ liệu demo vào form (giữ nguyên khi người dùng đang sửa dở)
  useEffect(() => {
    if (!demo) return
    const key = `${demo.id}:${demo.updatedAt}`
    if (loadedKey.current === key || (loadedKey.current && isDirty)) return
    loadedKey.current = key
    form.reset(toDemoForm(demo))
  }, [demo, isDirty, form])

  // TC-22: số thứ tự gợi ý = lớn nhất + 1
  const suggested = nextNumber.data?.number
  useEffect(() => {
    if (mode === 'create' && suggested && !form.getValues('number')) {
      form.setValue('number', String(suggested).padStart(2, '0'))
    }
  }, [mode, suggested, form])

  // BR-05: thêm mới thì slug tự sinh từ tên, trùng thì thêm -2, -3 (tới khi người dùng tự sửa slug)
  const name = useWatch({ control: form.control, name: 'name' })
  const takenSlugs = useMemo(() => (demos.data ?? []).map((d) => d.slug), [demos.data])
  useEffect(() => {
    if (mode !== 'create' || slugEdited.current) return
    const next = name.trim() ? uniqueSlug(slugify(name), takenSlugs) : ''
    if (form.getValues('slug') !== next)
      form.setValue('slug', next, { shouldValidate: form.formState.isSubmitted })
  }, [mode, name, takenSlugs, form])

  const serverShots = useMemo(() => demo?.screenshots ?? [], [demo])
  const shots = useMemo(() => applyShotEdits(serverShots, shotEdits), [serverShots, shotEdits])
  const shotsDirty = mode === 'edit' && shotsChanged(serverShots, shots)
  const dirty = isDirty || shotsDirty
  useUnsavedChangesWarning(dirty && canEdit)

  const errorTabs = tabsWithErrors(errors)
  const busy = isSubmitting || createDemo.isPending || updateDemo.isPending || updateShots.isPending

  const handleError = (error: unknown) => {
    const missing = getMissing(error)
    if (missing.length) setSaveIssue({ message: getErrorMessage(error), missing })
    const applied = applyFieldErrors(form.setError, error)
    if (applied) {
      const first = Object.keys(form.formState.errors)[0] as keyof DemoFormValues | undefined
      if (first && FIELD_TAB[first]) setTab(FIELD_TAB[first])
      // 409: trùng mã dự án, slug, số thứ tự (thông báo cụ thể của API); 400: lỗi định dạng
      toast.error(
        isApiError(error) && error.status === 409
          ? getErrorMessage(error)
          : 'Chưa lưu được, kiểm tra lại các ô báo lỗi.'
      )
    } else {
      toast.error(getErrorMessage(error))
    }
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    form.handleSubmit(
      async (values) => {
        setSaveIssue(null)
        const request = toSaveDemoRequest(values)
        try {
          if (mode === 'create') {
            const created = await createDemo.mutateAsync(request)
            toast.success(`Đã thêm demo ${created.name}`, {
              description: `Thư mục ${created.folder} · trạng thái Mới tạo, đang ẩn.`,
            })
            router.push(routePath.adminDemos)
            return
          }
          if (isDirty) {
            const saved = await updateDemo.mutateAsync({ id: id!, request })
            loadedKey.current = `${saved.id}:${saved.updatedAt}`
            form.reset(toDemoForm(saved))
          }
          if (shotsDirty) {
            await updateShots.mutateAsync({
              id: id!,
              request: {
                items: shots.map((s, index) => ({
                  id: s.id,
                  caption: s.caption?.trim() || null,
                  sortOrder: index + 1,
                  isCover: s.isCover,
                })),
              },
            })
            setShotEdits(NO_EDITS)
          }
          toast.success('Đã lưu thay đổi')
        } catch (error) {
          handleError(error)
        }
      },
      (formErrors) => {
        const tabs = tabsWithErrors(formErrors)
        const first = (['info', 'accounts', 'internal'] as TabKey[]).find((t) => tabs.has(t))
        if (first) setTab(first)
        toast.error('Chưa lưu được, kiểm tra lại các ô báo lỗi.')
      }
    )(event)

  const discard = () => {
    if (demo) form.reset(toDemoForm(demo))
    else
      form.reset({
        ...emptyDemoForm(),
        number: suggested ? String(suggested).padStart(2, '0') : '',
      })
    slugEdited.current = mode === 'edit'
    setShotEdits(NO_EDITS)
    setSaveIssue(null)
  }

  const confirmDelete = async () => {
    if (!demo) return
    try {
      await deleteDemo.mutateAsync(demo.id)
      toast.success(`Đã xóa demo ${demo.name}`)
      form.reset(form.getValues())
      router.push(routePath.adminDemos)
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  const industry = industries.data?.find(
    (i) => i.id === (demo?.industryId ?? form.getValues('industryId'))
  )
  const everPublished = !!demo?.firstPublishedAt

  if (mode === 'edit' && detail.error) {
    return (
      <PermissionGuard permission={permissions.demos.update} redirect>
        <div className="bg-card rounded-xl border">
          <ErrorState
            error={detail.error}
            onRetry={() => detail.refetch()}
            title="Không tải được demo"
          />
          <div className="flex justify-center pb-8">
            <Button asChild variant="outline">
              <Link href={routePath.adminDemos}>
                <ArrowLeft aria-hidden="true" />
                Về Quản lý demo
              </Link>
            </Button>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  const loading = mode === 'edit' && detail.isPending

  return (
    <PermissionGuard
      permission={mode === 'create' ? permissions.demos.create : permissions.demos.update}
      redirect
    >
      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {/* Đầu trang: tên, thư mục, trạng thái, đổi trạng thái, xóa */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
                <Link href={routePath.adminDemos} aria-label="Về Quản lý demo">
                  <ArrowLeft />
                </Link>
              </Button>
              {demo && (
                <DemoThumb
                  name={demo.name}
                  coverUrl={shots.find((s) => s.isCover)?.url}
                  color={industry?.color ?? '#475569'}
                  className="mt-0.5 hidden h-12 w-20 sm:block"
                />
              )}
              <div className="min-w-0 space-y-1.5">
                {loading ? (
                  <Skeleton className="h-8 w-64" />
                ) : (
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    {mode === 'create' ? 'Thêm demo' : demo?.name}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {demo ? (
                    <>
                      <span className="text-muted-foreground font-mono">{demo.folder}</span>
                      <DevStatusBadge status={demo.devStatus} />
                      {demo.isVisible ? (
                        <StatusBadge tone={demo.devStatus === 'DangLam' ? 'neutral' : 'success'}>
                          {demo.devStatus === 'DangLam' ? 'Sắp ra mắt' : 'Đang hiển thị'}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" dot={false}>
                          Đang ẩn
                        </StatusBadge>
                      )}
                      {demo.isFeatured && (
                        <StatusBadge
                          tone="warning"
                          icon={<Star className="size-3 fill-current" aria-hidden="true" />}
                        >
                          Nổi bật
                        </StatusBadge>
                      )}
                    </>
                  ) : mode === 'create' ? (
                    <>
                      <DevStatusBadge status="MoiTao" />
                      <StatusBadge tone="neutral" dot={false}>
                        Đang ẩn
                      </StatusBadge>
                      <span className="text-muted-foreground">
                        Demo mới luôn ở trạng thái Mới tạo, chưa hiển thị.
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {demo && (
              <div className="flex flex-col items-start gap-1.5 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <a href={routeTo.demoDetail(demo.slug)} target="_blank" rel="noopener">
                      <ExternalLink aria-hidden="true" />
                      Xem trước
                      <span className="sr-only"> (mở tab mới)</span>
                    </a>
                  </Button>
                  {canPublish && (
                    <Button type="button" variant="outline" onClick={() => setStatusOpen(true)}>
                      <RefreshCw aria-hidden="true" />
                      Đổi trạng thái
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={everPublished}
                      aria-describedby={everPublished ? 'delete-hint' : undefined}
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 aria-hidden="true" />
                      Xóa
                    </Button>
                  )}
                </div>
                {canDelete && everPublished && (
                  <p id="delete-hint" className="text-muted-foreground text-xs">
                    {demoErrors.everPublished}
                  </p>
                )}
              </div>
            )}
          </div>

          <VisibilityPanel
            demo={demo}
            canPublish={canPublish}
            pending={!!demo && actions.isPending(demo.id, 'visibility')}
            dirty={dirty}
            onToggle={(next) => demo && actions.toggleVisibility(demo, next)}
          />

          {saveIssue && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-xl border p-4 text-sm"
            >
              <p className="text-destructive font-semibold">{saveIssue.message}</p>
              <ul className="mt-2 space-y-1">
                {saveIssue.missing.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CircleX
                      className="text-destructive mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2">
                Dữ liệu chưa được lưu. Bổ sung lại các mục trên hoặc tắt hiển thị trước.
              </p>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full max-w-xl" />
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-4">
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList className="h-11 w-max">
                  <EditorTab
                    value="info"
                    icon={Info}
                    label="Thông tin"
                    error={errorTabs.has('info')}
                  />
                  <EditorTab
                    value="screenshots"
                    icon={Images}
                    label={`Ảnh chụp${demo ? ` (${shots.length})` : ''}`}
                    disabled={mode === 'create'}
                    dirty={shotsDirty}
                  />
                  <EditorTab
                    value="accounts"
                    icon={KeyRound}
                    label="Tài khoản demo"
                    error={errorTabs.has('accounts')}
                  />
                  {canViewInternal && (
                    <EditorTab
                      value="internal"
                      icon={Lock}
                      label="Nội bộ"
                      error={errorTabs.has('internal')}
                    />
                  )}
                  <EditorTab
                    value="history"
                    icon={History}
                    label="Lịch sử"
                    disabled={mode === 'create'}
                  />
                </TabsList>
              </div>
              {mode === 'create' && (
                <p className="text-muted-foreground -mt-1 text-xs">
                  Lưu demo trước, sau đó mở lại để tải ảnh chụp và xem lịch sử.
                </p>
              )}

              <TabsContent value="info" forceMount className="data-[state=inactive]:hidden">
                <InfoTab
                  mode={mode}
                  industries={industries.data}
                  savedSlug={demo?.slug}
                  everPublished={everPublished}
                  suggestedNumber={suggested}
                  onSlugEdited={() => {
                    slugEdited.current = true
                  }}
                  canEdit={canEdit}
                />
              </TabsContent>
              {demo && (
                <TabsContent value="screenshots">
                  <ScreenshotsManager
                    demoId={demo.id}
                    demoName={demo.name}
                    color={industry?.color ?? '#475569'}
                    items={shots}
                    canEdit={canEdit}
                    onItemsChange={(items) =>
                      setShotEdits({
                        order: items.map((s) => s.id),
                        captions: Object.fromEntries(items.map((s) => [s.id, s.caption ?? ''])),
                        coverId: items.find((s) => s.isCover)?.id ?? null,
                      })
                    }
                  />
                </TabsContent>
              )}
              <TabsContent value="accounts" forceMount className="data-[state=inactive]:hidden">
                <AccountsTab canEdit={canEdit} canViewInternal={canViewInternal} />
              </TabsContent>
              {canViewInternal && (
                <TabsContent value="internal" forceMount className="data-[state=inactive]:hidden">
                  <InternalTab canEdit={canEdit} />
                </TabsContent>
              )}
              {demo && (
                <TabsContent value="history">
                  <HistoryTab demoId={demo.id} />
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* Thanh lưu dính đáy */}
          {canEdit && !loading && (
            <div
              className={cn(
                'bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
                appConfig.demoToolbar && 'sm:pr-40 lg:pr-44'
              )}
            >
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {dirty ? (
                  <span className="text-foreground inline-flex items-center gap-2 font-medium">
                    <span className="bg-warning size-2 rounded-full" aria-hidden="true" />
                    Có thay đổi chưa lưu
                  </span>
                ) : mode === 'create' ? (
                  'Nhập thông tin rồi bấm Lưu'
                ) : (
                  'Mọi thay đổi đã được lưu'
                )}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={discard} disabled={!dirty || busy}>
                  <RotateCcw aria-hidden="true" />
                  Hủy thay đổi
                </Button>
                <Button type="submit" disabled={busy || (mode === 'edit' && !dirty)}>
                  {busy ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {mode === 'create' ? 'Lưu demo' : 'Lưu'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      {demo && canPublish && (
        <ChangeStatusDialog
          key={demo.devStatus}
          demo={demo}
          open={statusOpen}
          onOpenChange={setStatusOpen}
        />
      )}
      {demo && canDelete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          variant="destructive"
          icon={Trash2}
          title={`Xóa demo ${demo.name}?`}
          description="Demo chưa từng công khai nên xóa được. Ảnh chụp, tài khoản demo, lịch sử của demo cũng bị xóa; không hoàn tác được."
          confirmText="Xóa demo"
          loading={deleteDemo.isPending}
          onConfirm={confirmDelete}
        />
      )}
      <MissingConditionsDialog state={actions.missing} onClose={actions.closeMissing} />
    </PermissionGuard>
  )
}

function EditorTab({
  value,
  icon: Icon,
  label,
  error,
  dirty,
  disabled,
}: {
  value: TabKey
  icon: typeof Info
  label: string
  error?: boolean
  dirty?: boolean
  disabled?: boolean
}) {
  return (
    <TabsTrigger value={value} disabled={disabled} className="h-full gap-1.5 px-3">
      <Icon aria-hidden="true" />
      {label}
      {error && (
        <>
          <span className="bg-destructive size-2 rounded-full" aria-hidden="true" />
          <span className="sr-only">(có lỗi)</span>
        </>
      )}
      {!error && dirty && (
        <>
          <span className="bg-warning size-2 rounded-full" aria-hidden="true" />
          <span className="sr-only">(chưa lưu)</span>
        </>
      )}
    </TabsTrigger>
  )
}
