# Ghi Chép vào Plans/Checklists và Kế Hoạch Sửa Lỗi Prisma

## Mục Tiêu
- Ghi lại đầy đủ các hạng mục đã triển khai vào “Bảng Plans” và “Checklists” trong tài liệu kế hoạch.
- Lập kế hoạch sửa lỗi runtime liên quan `PrismaClient` (đọc `__internal`) xuất hiện ở `src/lib/auth.ts:4` khi gọi `/api/auth/register`.

## Cập Nhật Tài Liệu (Plans & Checklists)
- Vị trí đề xuất: chèn ngay sau phần “MVP” trong `docs/english-learning-app-plan.md`.
- Nội dung sẽ thêm:

### Bảng Plans (Trạng thái triển khai)
| Hạng mục | Trạng thái | Tệp/Đường dẫn chính | Ghi chú |
|---|---|---|---|
| Khởi tạo dự án Next.js + TS + Tailwind | Hoàn tất | `src/app/*`, `tailwind.config.js` | App Router |
| ORM & DB (Prisma + SQLite) | Hoàn tất | `prisma/schema.prisma` | `User`, `Keyword`, `elo=1000` |
| Đăng ký/Đăng nhập/Logout | Hoàn tất | `src/app/api/auth/*/route.ts`, `src/lib/auth.ts` | Bcrypt + session/JWT |
| Hồ sơ người dùng (`GET/PUT /api/user/me`) | Hoàn tất | `src/app/api/user/me/route.ts` | Cập nhật ngôn ngữ |
| CRUD Keywords | Hoàn tất | `src/app/api/keywords/*` | Có kiểm tra trùng |
| Suggestions API (LLM mock) | Hoàn tất | `src/app/api/suggestions/route.ts`, `src/lib/suggestionService.ts` | 4 loại bài, 5 mục |
| Practice Submit + Elo | Hoàn tất | `src/app/api/practice/submit/route.ts`, `src/lib/eloService.ts` | Chấm điểm + cập nhật Elo |
| Trang Overview & Practice | Hoàn tất | `src/app/overview/page.tsx`, `src/app/practice/[id]/page.tsx` | Điều hướng luyện tập |
| Bảo mật & Rate limiting | Hoàn tất | `src/lib/rateLimit.ts`, middleware liên quan | Bcrypt, HttpOnly, rate limit |
| Kiểm thử | Hoàn tất | `src/__tests__/*` | Unit/Integration cho core |

### Checklists (Hoàn tất)
- Khởi tạo Next.js (App Router), TS, Tailwind.
- Cấu hình Prisma + schema `User`, `Keyword` (elo=1000).
- Triển khai đăng ký/đăng nhập/đăng xuất, hash mật khẩu bằng bcrypt.
- API hồ sơ người dùng (`GET/PUT /api/user/me`).
- CRUD keywords với kiểm tra trùng lặp, fallback keywords mặc định.
- Suggestions API sinh `mcq/true_false/match/anagram` theo Elo.
- Chấm bài thuần code, cập nhật Elo (K‑factor điều chỉnh).
- UI `overview` + điều hướng luyện tập chi tiết.
- Rate limit điểm nhạy (login, tạo keyword).
- Kiểm thử unit/integration cho services và API chính.

## Kế Hoạch Sửa Lỗi PrismaClient
- Triệu chứng: `TypeError: Cannot read properties of undefined (reading '__internal')` tại `src/lib/auth.ts:4` khi khởi tạo `new PrismaClient()` trong môi trường dev route.
- Nguyên nhân khả dĩ:
  - Khởi tạo nhiều PrismaClient trong App Router (hot‑reload) → rò rỉ/khởi tạo sai ngữ cảnh.
  - Chưa chạy `prisma generate` hoặc mismatched version của `@prisma/client` và `prisma`.
  - Sử dụng Prisma trong ngữ cảnh edge (nếu route không ép runtime nodejs).

### Các bước khắc phục dự kiến
1. Tạo singleton Prisma client:
   - `src/lib/prisma.ts`:
     ```ts
     import { PrismaClient } from '@prisma/client'
     const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
     export const prisma = globalForPrisma.prisma || new PrismaClient()
     if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
     ```
2. Refactor tất cả API/Service dùng `new PrismaClient()` sang import `prisma` từ `src/lib/prisma.ts`.
3. Ép runtime Node.js cho các route dùng Prisma:
   - Thêm `export const runtime = 'nodejs'` ở các `route.ts` liên quan (`auth`, `keywords`, `suggestions`, `practice`, `user/me`).
4. Xác nhận Prisma client đã generate:
   - Chạy `npx prisma generate` (hoặc `npm run prisma:generate` nếu đã có script).
   - Kiểm tra phiên bản `prisma` và `@prisma/client` khớp trong `package.json`.
5. Xác nhận cấu hình DB:
   - `prisma/schema.prisma` trỏ SQLite (ví dụ `file:./dev.db`) và biến `DATABASE_URL` tồn tại khi chạy dev.

### Xác Minh Sau Sửa
- Khởi chạy dev server, thử `POST /api/auth/register` → tạo user, trả về `user` (ẩn hash).
- Chạy một vòng CRUD keywords và `GET /api/suggestions` → không còn lỗi Prisma.

## Sau Khi Bạn Xác Nhận
- Mình sẽ:
  - Chèn “Bảng Plans” và “Checklists” vào `docs/english-learning-app-plan.md` đúng vị trí đề xuất.
  - Thực hiện refactor Prisma (singleton + runtime nodejs), generate client nếu cần, và kiểm thử lại các endpoint liên quan.
