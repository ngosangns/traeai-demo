# Kế Hoạch Ứng Dụng Học Tiếng Anh (Next.js)

## Mục Tiêu

- Xây dựng app học tiếng Anh bằng `Next.js` (App Router) với API tích hợp.
- Đăng ký/đăng nhập bằng `username/password`, quản lý `nativeLanguage`, `targetLanguage`, và `keywords`.
- Khởi tạo `elo = 1000` cho mỗi user; dùng Elo để gợi ý bài tập phù hợp.
- Trang `overview` gồm 2 section: `Keyword Manager` và `Practice Suggestions`.
- API suggestion dựa trên `keywords` + `elo`, trả về các bài tập: `mcq`, `true_false`, `match`, `anagram`.
- Sau mỗi bài, chấm đúng/sai và cập nhật Elo.

## Yêu Cầu Chức Năng (Functional Requirements)

- Đăng ký/đăng nhập bằng `username/password`.
- Thiết lập và cập nhật `nativeLanguage`, `targetLanguage`.
- CRUD `keywords`: thêm/xóa/xem danh sách.
- Xem trang `overview` với 2 section: `Keyword Manager` và `Practice Suggestions`.
- API suggestion trả về danh sách bài tập theo `keywords` và mức `elo`.
- Tạo `keywords` phổ biến mặc định (đời sống) cho user ngay khi đăng ký, gồm: `family`, `work`, `food`, `travel`, `health`, `shopping`, `school`, `weather`, `transport`, `daily routines`. Nếu người dùng xóa hết `keywords`, hệ thống fallback dùng bộ mặc định này để sinh đề xuất.
- Làm bài: `mcq`, `true_false`, `match` (nối từ), `anagram` (xếp chữ cái).
- Đánh giá bài làm, cập nhật Elo.
- Xem tổng quan tiến độ: Elo hiện tại.

## Yêu Cầu Phi Chức Năng (Non‑Functional)

- Bảo mật mật khẩu: `bcrypt` hash, không lưu plaintext.
- Phiên người dùng an toàn (cookie session hoặc JWT với HttpOnly).
- Khả năng mở rộng: kiến trúc module hóa (API route handlers, services).
- Tính nhất quán dữ liệu: transaction khi cập nhật Elo và ghi lịch sử.
- Khả năng kiểm thử: unit/integ cho API và logic Elo.
- Khả dụng: API idempotent nơi phù hợp (ví dụ submit không nhân bản).

## Use Cases Chính

- Đăng ký: người dùng tạo tài khoản với `username/password`.
- Đăng nhập: vào `overview`, xem Elo và đề xuất.
- Thiết lập ngôn ngữ: chọn `nativeLanguage` và `targetLanguage`.
- Quản lý từ khóa: thêm/xóa `keywords` cá nhân.
- Lấy đề xuất: nhận danh sách bài tập phù hợp với Elo và từ khóa.
- Làm bài và nộp: hệ thống chấm điểm, cập nhật Elo.
- Xem tiến độ: Elo hiện tại.

## Kiến Trúc Hệ Thống

- UI: `Next.js` App Router (`app/overview/page.tsx`, `app/(auth)/login`, `app/(auth)/register`, `app/practice/[id]`).
- API: `route.ts` cho các endpoint dưới `app/api/...`.
- Auth: `Credentials` (session cookie hoặc NextAuth Credentials).
- DB & ORM: PostgreSQL/MySQL + `Prisma` (đề xuất) hoặc tương đương.
- Services: tách lớp `suggestionService`, `practiceService`, `eloService`, `keywordService`, `authService`.
- State: client components cho tương tác (forms), server components cho dữ liệu.

## Mô Hình Dữ Liệu

- `User`: `id`, `username` (unique), `passwordHash`, `nativeLanguage`, `targetLanguage`, `elo` (default 1000), `createdAt`.
- `Keyword`: `id`, `userId` (FK), `value`, `createdAt`.
- Bài tập được sinh mới mỗi lần gọi API, không lưu DB; chỉ tồn tại dạng cấu trúc dữ liệu trả về (`PracticeSuggestionItem`).

## API Thiết Kế

- `POST /api/auth/register`: body `username`, `password`. Trả `user` (ẩn hash), khởi tạo `elo=1000`.
- Khi đăng ký, tự động tạo `defaultPopularKeywords` gắn với user để đảm bảo có dữ liệu đề xuất ban đầu.
- `POST /api/auth/login`: body `username`, `password`. Trả `session` hoặc `token`.
- `GET /api/user/me`: trả hồ sơ user + `elo`.
- `PUT /api/user/me`: cập nhật `nativeLanguage`, `targetLanguage`.
- `GET /api/keywords`: trả danh sách keywords của user.
- `POST /api/keywords`: body `value`. Tạo keyword.
- `DELETE /api/keywords/:id`: xóa keyword.
- `GET /api/suggestions`: mặc định `limit=5`. Sử dụng LLM để sinh 5 bài tập phù hợp theo Elo và keywords (hoặc keywords mặc định). Trả `{ items: PracticeSuggestionItem[], nextCursor?: string }` để hỗ trợ tải tiếp lô kế tiếp.
- `POST /api/practice/submit`: body `{ exerciseId, answer }`; trả `{ isCorrect, deltaElo, newElo }`, chỉ cập nhật Elo của user, không lưu lịch sử bài làm.

## Logic Gợi Ý bằng LLM (Chi Tiết)

- Đầu vào:
  - Hồ sơ user: `nativeLanguage`, `targetLanguage`, `elo`, danh sách `keywords` (nếu rỗng dùng bộ mặc định phổ biến).
  - Tham số: `limit=5`, `diversity=true` để đa dạng loại bài.
- Prompt cấu trúc:
  - System: mô tả vai trò “English practice item generator”, tuân thủ định dạng JSON và ngôn ngữ `targetLanguage`.
  - Developer: ràng buộc schema, cửa sổ độ khó quanh Elo (`±100–150`), tránh nội dung nhạy cảm, ràng buộc tính duy nhất keyword.
  - User: truyền keywords, Elo hiện tại; yêu cầu sinh đúng `limit=5` mục.
- Sinh output:
  - Mỗi mục gồm: `id` (UUID), `type` (`mcq|true_false|match|anagram`), `prompt`, `data` theo schema, `difficultyRating`, `estimatedTime`, `keywords` liên quan.
  - Phân phối loại bài: round-robin hoặc weighted để đa dạng, không phụ thuộc lịch sử.
  - `difficultyRating` ~ `user.elo ± [100..150]` (không dùng lịch sử đúng/sai).
- Hậu xử lý server:
  - Xác thực JSON/schema, chuẩn hóa ngôn ngữ/charset.
  - Khử trùng lặp trong cùng batch; seed `nextCursor` đảm bảo sinh mới mỗi lần gọi.
  - Rà soát safety (từ ngữ không phù hợp), fallback về ngân hàng bài tập mẫu nếu LLM lỗi.
  - Trả về đúng `5` mục và `nextCursor` (mã hóa thời điểm + seed) để lô tiếp theo đa dạng.
- Lưu ý: LLM chỉ dùng để sinh bài tập; không tham gia chấm điểm.

## Cấu Trúc practiceSuggestionData

- Mỗi item: `id`, `type` (`mcq|true_false|match|anagram`), `prompt`, `data` (JSON phụ thuộc type), `difficultyRating`, `estimatedTime`, `keywords`.
- `mcq.data`: `{ question: string, options: string[], correctIndex: number }`.
- `true_false.data`: `{ statement: string, correct: boolean }`.
- `match.data`: `{ left: string[], right: string[], pairs: Record<number,number> }`.
- `anagram.data`: `{ letters: string[], target: string }`.

## Thuật Toán Gợi Ý (Suggestions)

- Lọc theo `user.keywords` + `targetLanguage`.
- Chọn bài có `difficultyRating` gần `user.elo` trong khoảng `±100–150`.
- Đa dạng hóa `type` (round-robin hoặc weighted).
- Giới hạn số lượng theo `limit` và tránh trùng lặp trong cùng batch.
- Nếu `user.keywords` rỗng, dùng bộ `defaultPopularKeywords` (đời sống) để tạo đề xuất.
- Tích hợp LLM theo logic chi tiết ở trên, có hậu xử lý đảm bảo tính hợp lệ và an toàn.

## Thuật Toán Elo

- Kỳ vọng thắng: `E = 1 / (1 + 10 ^ ((R_d - R_u) / 400))` với `R_u` là Elo của user, `R_d` là `difficultyRating` của bài.
- Hệ số `K` mặc định: `32`; có thể điều chỉnh `K=24` khi `elo > 1600`, `K=40` khi `elo < 1000`.
- Cập nhật: `R'_u = R_u + K * (S - E)`; `S=1` nếu đúng, `S=0` nếu sai.
- Cập nhật Elo trực tiếp cho `User`; không lưu lịch sử.

## Luồng UI Chính

- `Register`: form `username`, `password`; tạo account và chuyển `overview`.
- `Login`: form `username`, `password`; vào `overview`.
- `Overview`:
  - `Keyword Manager`: list + add + delete `keywords`.
  - `Practice Suggestions`: gọi `GET /api/suggestions`, hiển thị cards; click “Practice” chuyển `app/practice/[id]`.
- `Practice Detail`:
  - Render theo `type`; nộp bài bằng `POST /api/practice/submit`; hiển thị kết quả, `deltaElo`, `newElo`, nút “Tiếp tục”.
  - Mỗi phiên lấy `5` bài; sau khi nộp và xử lý bài thứ `5`, tự động gọi `GET /api/suggestions` để tải lô `5` bài kế tiếp (dùng `nextCursor` nếu có) và tiếp tục luyện liên tục. Bài tập được sinh mới mỗi lần gọi API.

## Đánh Giá Bài Tập

- `mcq`: so sánh `selectedIndex` với `correctIndex`.
- `true_false`: so sánh boolean.
- `match`: đúng nếu tất cả cặp khớp (MVP: đúng/sai toàn phần).
- `anagram`: chuỗi người dùng nhập khớp `target` (case-insensitive, normalize).
- Chuẩn hóa input (trim, lowercasing cho `anagram`), chống gửi đúp.
- Việc chấm điểm diễn ra trong API: server xác định `isCorrect` dựa trên dữ liệu chuẩn (`answerKey`/`data`) và chỉ sau đó cập nhật Elo; client không được tự quyết định đúng/sai. Không sử dụng LLM để đánh giá câu trả lời; logic chấm là thuần code, quyết định nhị phân đúng/sai theo schema từng loại bài.

## Bảo Mật

- Hash mật khẩu bằng `bcrypt` với salt.
- Session cookie `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF bảo vệ form POST.
- Rate limit đăng nhập và tạo keyword.
- Kiểm soát truy cập: mọi API cần session hợp lệ.
- Không log dữ liệu nhạy cảm; ẩn `passwordHash`.

## Kiểm Thử & Quan Sát

- Unit test: `eloService` (E, update), `practiceService` (chấm bài), `suggestionService` (lọc theo Elo/keywords).
- Integration test: đăng ký/đăng nhập, submit bài, cập nhật Elo.
- E2E smoke: đăng nhập → overview → suggestions → làm bài → Elo thay đổi.
- Logging: lỗi chấm bài, lỗi auth, lỗi sinh bài tập; không lưu lịch sử bài làm.

## Lộ Trình Phát Triển (MVP → Mở Rộng)

- MVP:
  - Auth `username/password`, thiết lập ngôn ngữ.
  - CRUD `keywords`.
  - API `suggestions` với 4 loại bài tập cơ bản.
  - Trang `overview` với 2 section: `Keyword Manager` và `Practice Suggestions`.
  - Nộp bài, cập nhật Elo, hiển thị kết quả.
- V2:
  - Partial credit cho `match`, adaptive K‑factor theo độ khó.
  - Dashboard tiến độ chi tiết, lịch sử Elo.
  - i18n UI theo `nativeLanguage`.
- V3:
  - Tạo bài tập tự động từ nguồn từ vựng/corpus.
  - Gamification (nhiệm vụ ngày, streak), social ranking theo Elo.
  - Phân tích lỗi thường gặp và gợi ý ôn tập.

## Giả Định Quan Trọng

- Section thứ hai trên `overview` là `Practice Suggestions`.
- Dùng `Prisma + PostgreSQL` và session cookie cho auth (có thể thay thế tương đương).
- `difficultyRating` của bài được gán sẵn khi tạo bài.

## Bảng Plans (Trạng thái triển khai)

| Hạng mục                                  | Trạng thái | Tệp/Đường dẫn chính                                                | Ghi chú                         |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------ | ------------------------------- |
| Khởi tạo dự án Next.js + TS + Tailwind    | Hoàn tất   | `src/app/*`, `tailwind.config.js`                                  | App Router                      |
| ORM & DB (Prisma + SQLite)                | Hoàn tất   | `prisma/schema.prisma`                                             | `User`, `Keyword`, `elo=1000`   |
| Đăng ký/Đăng nhập/Logout                  | Hoàn tất   | `src/app/api/auth/*/route.ts`, `src/lib/auth.ts`                   | Bcrypt + session/JWT            |
| Hồ sơ người dùng (`GET/PUT /api/user/me`) | Hoàn tất   | `src/app/api/user/me/route.ts`                                     | Cập nhật ngôn ngữ               |
| CRUD Keywords                             | Hoàn tất   | `src/app/api/keywords/*`                                           | Kiểm tra trùng, thứ tự mới nhất |
| Suggestions API (LLM mock)                | Hoàn tất   | `src/app/api/suggestions/route.ts`, `src/lib/suggestionService.ts` | 4 loại bài, 5 mục               |
| Practice Submit + Elo                     | Hoàn tất   | `src/app/api/practice/submit/route.ts`, `src/lib/eloService.ts`    | Chấm điểm + cập nhật Elo        |
| Trang Overview & Practice                 | Hoàn tất   | `src/app/overview/page.tsx`, `src/app/practice/[id]/page.tsx`      | Điều hướng luyện tập            |
| Bảo mật & Rate limiting                   | Hoàn tất   | `src/lib/rateLimit.ts`, middleware liên quan                       | Bcrypt, HttpOnly, rate limit    |
| Kiểm thử                                  | Hoàn tất   | `src/__tests__/*`                                                  | Unit/Integration cho core       |

## Checklists (Hoàn tất)

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
