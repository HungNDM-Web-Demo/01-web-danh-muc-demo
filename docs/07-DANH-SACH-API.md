# Danh sách API — Danh mục Demo

> Base URL dev: `https://localhost:7101` · Swagger: `https://localhost:7101/swagger`
> Quy ước chung (đường dẫn, phân trang, lỗi) và API nền (auth, users, roles, settings, audit-logs, demo): xem `ZDOCS/03-KIEN-TRUC/QUY-UOC-API.md`.
> File này là hợp đồng giữa BE và FE: BE (`Application/DTOs`) và FE (`features/*/types`) phải khớp từng trường. Ở chế độ `mock`, handler trong `features/*/mock` trả đúng các kiểu này và áp đúng các quy tắc nghiệp vụ.

---

## 1. Mã quyền nghiệp vụ

| Nhóm | Mã quyền | Vai trò mặc định |
| :--- | :--- | :--- |
| Demo | `demos.view` | ADMIN, MANAGER, STAFF |
| Demo | `demos.view-internal` | ADMIN, MANAGER, STAFF |
| Demo | `demos.create`, `demos.update` | ADMIN, MANAGER |
| Demo | `demos.publish` | ADMIN, MANAGER |
| Demo | `demos.delete` | ADMIN |
| Demo | `demos.share` | ADMIN, MANAGER, STAFF |
| Nhóm ngành | `industries.view` | ADMIN, MANAGER, STAFF |
| Nhóm ngành | `industries.create`, `industries.update`, `industries.delete` | ADMIN, MANAGER |
| Thống kê | `reports.view` | ADMIN, MANAGER |

---

## 2. API công khai — `/api/public` (không cần đăng nhập)

Chỉ trả trường được phép công khai. **Không bao giờ** có `demoPassword`, `internalNotes`, `demoScript`, `faqs`, `swaggerUrl`, `repoUrl`, `ownerName` (BR-10).

| Method | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| GET | `/api/public/industries` | Nhóm ngành có ít nhất 1 demo hiển thị, kèm số demo (BR-13) → `PublicIndustry[]` |
| GET | `/api/public/demos` | Demo hiển thị, đúng thứ tự BR-04 → `PublicDemoCard[]`. Lọc và tìm kiếm làm ở FE (BR-03), dữ liệu nhỏ |
| GET | `/api/public/demos/{slug}` | Chi tiết demo hiển thị → `PublicDemoLookup`. Slug cũ trả `redirectSlug`; không có hoặc không hiển thị → 404 |
| POST | `/api/public/demos/{slug}/visits` | Ghi lượt xem, lượt mở (BR-14) → `{ counted: boolean }`. Bỏ qua (`counted: false`) khi có header `Authorization`, user agent là bot hoặc trùng trong 30 phút; demo không hiển thị → 404; `visitorId` ngoài 16–64 ký tự → 400 `errors.visitorId` |

```ts
type PublicIndustry = {
  slug: string; name: string; icon?: string; color: string
  sortOrder: number
  count: number                    // số demo hiển thị, gồm Sắp ra mắt
}

type DemoDevStatus = 'MoiTao' | 'DangLam' | 'DemoDuoc' | 'HoanThien'

type PublicDemoCard = {
  slug: string
  name: string
  industry: { slug: string; name: string; color: string; icon?: string }
  shortDescription?: string
  coverUrl?: string                // null → FE vẽ ảnh mặc định theo màu nhóm ngành (BR-07)
  devStatus: DemoDevStatus         // chỉ DangLam | DemoDuoc | HoanThien
  isComingSoon: boolean            // devStatus = DangLam
  demoUrl?: string                 // null khi Sắp ra mắt
  isFeatured: boolean
  sortOrder: number
  features: string[]               // để FE tìm kiếm (BR-03)
  keywords: string[]
}

type PublicDemoDetail = PublicDemoCard & {
  targetCustomers?: string
  problemSolved?: string
  description?: string
  productType?: string
  devices?: string
  requiresLogin: boolean
  accounts: { username: string; roleName: string; purpose?: string }[]
  screenshots: { url: string; caption?: string; width: number; height: number; isCover: boolean }[]
  related: PublicDemoCard[]        // tối đa 3 demo công khai cùng nhóm, thứ tự BR-04 (FR-09)
  updatedAt: string
}

type PublicDemoLookup = { demo?: PublicDemoDetail; redirectSlug?: string }

type RecordVisitRequest = {
  type: 'View' | 'Open'
  visitorId: string                // mã ngẫu nhiên lưu ở localStorage, 16–64 ký tự
  device: 'Mobile' | 'Desktop'
  referrer?: string
}
```

---

## 3. Demo — `/api/demos`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/demos` | `demos.view` | Danh sách quản trị, thứ tự `sortOrder` → `DemoListItem[]` (lọc, tìm ở FE) |
| GET | `/api/demos/summary` | `demos.view` | Thẻ tổng hợp → `DemoSummary` |
| GET | `/api/demos/next-number` | `demos.create` | Số thứ tự gợi ý → `{ number: number }` |
| GET | `/api/demos/{id}` | `demos.view` | Chi tiết quản trị → `DemoDetail` (trường nội bộ chỉ có khi có `demos.view-internal`) |
| GET | `/api/demos/by-slug/{slug}` | `demos.view-internal` | Trang chi tiết: khung nội bộ và xem trước demo chưa công khai → `DemoDetail` |
| POST | `/api/demos` | `demos.create` | Thêm demo, trạng thái `MoiTao`, ẩn → `DemoDetail` (201) |
| PUT | `/api/demos/{id}` | `demos.update` | Sửa thông tin, tài khoản, câu hỏi, nội bộ (BR-02, BR-05, BR-06, BR-08) → `DemoDetail` |
| DELETE | `/api/demos/{id}` | `demos.delete` | Xóa demo chưa từng công khai (BR-12) → 204 |
| PATCH | `/api/demos/{id}/status` | `demos.publish` | Đổi trạng thái (BR-11, BR-02) → `DemoDetail` |
| PATCH | `/api/demos/{id}/visibility` | `demos.publish` | Bật/tắt hiển thị (BR-01, BR-02) → `DemoDetail`; thiếu điều kiện → 400 kèm `missing` |
| PATCH | `/api/demos/{id}/featured` | `demos.publish` | Nổi bật (BR-04, tối đa 6) → `DemoDetail` |
| PUT | `/api/demos/order` | `demos.publish` | Lưu thứ tự kéo thả, đánh lại 10, 20, 30… (BR-18) → 204 |
| GET | `/api/demos/{id}/status-history` | `demos.view` | Lịch sử trạng thái, mới nhất trước → `StatusHistoryItem[]` |
| POST | `/api/demos/{id}/screenshots` | `demos.update` | Tải ảnh (multipart, field `files`, nhiều file; cả request tối đa 40 MB) → 200 `UploadScreenshotsResult`. Ảnh lưu ở `/uploads/demos/{yyyy}/{MM}/{guid}.{ext}` |
| PUT | `/api/demos/{id}/screenshots` | `demos.update` | Sửa chú thích, thứ tự, ảnh đại diện → `Screenshot[]` |
| DELETE | `/api/demos/{id}/screenshots/{screenshotId}` | `demos.update` | Xóa ảnh (BR-02 khi đang công khai) → `Screenshot[]` |

```ts
type DemoListItem = {
  id: string
  number: number
  folder: string                   // "02-fnb-pos-cafe"
  projectCode: string
  name: string
  slug: string
  industry: { id: string; slug: string; name: string; color: string }
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
  coverUrl?: string
  screenshotCount: number
  ownerName?: string               // chỉ khi có demos.view-internal
  everPublished: boolean           // firstPublishedAt != null
  updatedAt: string
}

type DemoSummary = {
  total: number
  moiTao: number; dangLam: number; demoDuoc: number; hoanThien: number
  visible: number                  // gồm Sắp ra mắt
  featured: number
  featuredMax: 6
}

type Screenshot = {
  id: string; url: string; caption?: string
  width: number; height: number; sizeBytes: number
  sortOrder: number; isCover: boolean
}

type DemoAccountItem = { username: string; roleName: string; purpose?: string }
type DemoFaqItem = { question: string; answer: string }

type DemoDetail = {
  id: string
  number: number
  projectCode: string
  folder: string
  name: string
  slug: string
  oldSlugs: string[]
  industryId: string
  ideaCode?: string
  targetCustomers?: string
  problemSolved?: string
  productType?: string
  devices?: string
  shortDescription?: string
  description?: string
  features: string[]
  keywords: string[]
  demoUrl?: string
  requiresLogin: boolean
  accounts: DemoAccountItem[]
  screenshots: Screenshot[]
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
  firstPublishedAt?: string
  updatedAt: string
  visibilityCheck: { canShow: boolean; missing: string[] }   // kiểm tra BR-01, BR-02 cho trạng thái hiện tại
  // Chỉ có khi người gọi có demos.view-internal:
  internal?: {
    swaggerUrl?: string
    repoUrl?: string
    ownerName?: string
    demoPassword?: string
    internalNotes?: string
    demoScript?: string
    faqs: DemoFaqItem[]
  }
}

type SaveDemoRequest = {
  number: number
  projectCode: string              // chỉ dùng khi thêm mới; sửa thì bỏ qua (BR-09)
  name: string
  slug: string
  industryId: string
  ideaCode?: string
  targetCustomers?: string
  problemSolved?: string
  productType?: string
  devices?: string
  shortDescription?: string
  description?: string
  features: string[]
  keywords: string[]
  demoUrl?: string
  swaggerUrl?: string
  repoUrl?: string
  ownerName?: string
  requiresLogin: boolean
  demoPassword?: string
  internalNotes?: string
  demoScript?: string
  accounts: DemoAccountItem[]      // thứ tự mảng = thứ tự hiển thị
  faqs: DemoFaqItem[]
}

type ChangeStatusRequest = { status: DemoDevStatus; reason?: string }
type SetVisibilityRequest = { isVisible: boolean }
type SetFeaturedRequest = { isFeatured: boolean }
type ReorderDemosRequest = { ids: string[] }                  // toàn bộ demo theo thứ tự mới

type StatusHistoryItem = {
  fromStatus?: DemoDevStatus; toStatus: DemoDevStatus
  reason?: string; changedByName: string; changedAt: string
}

type UploadScreenshotsResult = {
  accepted: Screenshot[]
  rejected: { fileName: string; reason: string }[]            // lý do theo TC-28, TC-29
}
type UpdateScreenshotsRequest = { items: { id: string; caption?: string; sortOrder: number; isCover: boolean }[] }
```

**Lỗi nghiệp vụ** trả 400 ProblemDetails:

| Tình huống | `detail` | Mở rộng |
| :--- | :--- | :--- |
| Bật hiển thị thiếu điều kiện, đổi trạng thái lên Demo được thiếu điều kiện | "Demo chưa đủ điều kiện hiển thị" | `missing: string[]`, vd `["Cần ít nhất 1 ảnh chụp màn hình"]` |
| Sửa, xóa ảnh làm demo đang hiển thị mất điều kiện | "Demo đang hiển thị, cần tắt hiển thị trước" | `missing` |
| Xóa ảnh cuối của demo công khai | "Demo đang công khai cần ít nhất 1 ảnh chụp" | |
| Nổi bật quá 6 | "Tối đa 6 demo nổi bật, hãy bỏ bớt một demo" | |
| Nổi bật demo Sắp ra mắt hoặc chưa hiển thị | "Chỉ demo công khai mới được đánh dấu nổi bật" | |
| Lùi bậc thiếu lý do hoặc lý do ngoài 10–500 ký tự | "Lùi bậc trạng thái cần lý do 10–500 ký tự" | `errors.reason` |
| Bật hiển thị demo Mới tạo | "Chuyển sang Đang làm trở lên trước" | `missing: ["Chuyển sang Đang làm trở lên trước"]` |
| Xóa demo đã từng công khai | "Demo đã từng công khai, chỉ tắt hiển thị được" | |

Trùng mã dự án, slug (kể cả slug cũ), số thứ tự → **409** theo quy ước chung (QUY-UOC-API §1.3), `detail` là câu thông báo, kèm `errors.projectCode` ("Mã dự án đã tồn tại"), `errors.slug` ("Slug đã được dùng cho demo khác") hoặc `errors.number` ("Số thứ tự NN đã được dùng"). Mỗi lần báo một trường trùng, theo thứ tự trên form: số thứ tự, mã dự án, slug. Nhóm ngành không tồn tại → 400 `errors.industryId`. Lỗi định dạng, độ dài (BR-05, BR-08, BR-09, BR-16) trả 400 theo trường, thông báo giống FE mock; trường con viết dạng `accounts[1].username`, `faqs[0].answer`, `items[0].caption`. Thứ tự kiểm tra: định dạng (400) → nhóm ngành (400) → trùng dữ liệu (409), nên các nhóm lỗi không trả cùng lúc.

**Ngoại lệ có chủ đích so với quy ước chung:** QUY-UOC-API §1.1 cho PATCH trả 204. Ở dự án này `PATCH /api/demos/{id}/status|visibility|featured` trả 200 kèm `DemoDetail` để FE cập nhật ngay `visibilityCheck`, `isFeatured`, `firstPublishedAt` sau mỗi lần đổi mà không phải gọi lại chi tiết.

Lưu thứ tự (`PUT /api/demos/order`) hoặc sửa ảnh (`PUT .../screenshots`) với danh sách không đủ, thừa phần tử → 400 `errors.ids` / `errors.items`. Sửa ảnh phải có đúng 1 ảnh đại diện.

---

## 4. Nhóm ngành — `/api/industries`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/industries` | `industries.view` | Theo `sortOrder` → `Industry[]` |
| POST | `/api/industries` | `industries.create` | → `Industry` (201) |
| GET | `/api/industries/{id}` | `industries.view` | Chi tiết một nhóm → `Industry` (đích header `Location` của POST) |
| PUT | `/api/industries/{id}` | `industries.update` | → `Industry` |
| DELETE | `/api/industries/{id}` | `industries.delete` | Chỉ khi không còn demo (BR-13), lỗi "Nhóm đang có N demo" → 204 |
| PUT | `/api/industries/order` | `industries.update` | `{ ids: string[] }` → 204 |

```ts
type Industry = {
  id: string; code: number; name: string; slug: string
  icon?: string; color: string; description?: string; sortOrder: number
  demoCount: number; visibleDemoCount: number
}
type SaveIndustryRequest = { code: number; name: string; slug: string; icon?: string; color: string; description?: string }
// Trùng mã hoặc slug → 409 kèm errors.code ("Mã nhóm N đã được dùng") hoặc errors.slug ("Slug đã được dùng cho nhóm khác")
// Sai định dạng → 400 theo trường, vd errors.color (#RRGGBB)
// Xóa nhóm còn demo: 400 detail "Nhóm đang có N demo", mở rộng demoCount: N
```

---

## 5. Thống kê — `/api/reports`

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | `/api/reports/visits?from=yyyy-MM-dd&to=yyyy-MM-dd&industryId=` | `reports.view` | → `VisitReport`; ngày theo giờ Việt Nam, khoảng tối đa 366 ngày (sai khoảng → 400 `errors.from`). Xuất Excel làm ở FE từ dữ liệu này |

```ts
type VisitReport = {
  from: string; to: string
  totals: { views: number; opens: number; openRate?: number }   // BR-15, null khi views = 0
  daily: { date: string; views: number; opens: number; openRate?: number }[]   // đủ mọi ngày trong khoảng
  topDemos: { demoId: string; name: string; slug: string; views: number; opens: number; openRate?: number }[]  // tối đa 10
  byIndustry: { industryId: string; name: string; color: string; views: number; opens: number; share: number }[]
  byDevice: { device: 'Mobile' | 'Desktop'; views: number; share: number }[]
}
```

`share` là phần trăm, làm tròn 1 chữ số; `openRate` theo BR-15.
