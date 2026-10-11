# Báo cáo kiểm thử Tiệm nhà Noel

Ngày kiểm thử: 11/10/2026  
Nhánh: `feature/cafe-management`  
Múi giờ: `Asia/Ho_Chi_Minh`

## 1. Phạm vi kiểm thử

Đã kiểm tra cấu trúc source, migration/seed PostgreSQL, đăng nhập và session, phân quyền API hiện có, tạo đơn, khuyến mãi, chuyển trạng thái pha chế, trừ kho, cạnh tranh khi hoàn thành đơn, mở ca, định dạng responsive, production build, website GitHub Pages và dependency audit.

Các chức năng chỉ đang là giao diện minh họa hoặc chưa có API không thể kiểm thử nghiệp vụ đầy đủ: CRUD sản phẩm/danh mục/topping, đóng ca và thu chi, quản lý khách hàng/điểm, chuyển/gộp bàn, nhập/xuất/điều chỉnh kho, báo cáo thật và CSV/Excel, quản lý nhân viên, audit log, hủy đơn sau khi đã trừ kho và realtime pha chế.

## 2. Môi trường

- macOS, Node.js `v26.0.0`, npm `11.12.1`.
- Docker `29.8.2`, PostgreSQL 16 Alpine trong container `noel-postgres`.
- Database kiểm thử riêng: `noel_test`; không sử dụng database production.
- Next.js `16.4.0`, Prisma `6.19.3`, Vitest `2.1.9`, Playwright `1.51.1`.
- Chromium; viewport 375×812, 768×1024, 1024×768 và 1440×900.

## 3. Migration và seed

- `prisma generate`: thành công.
- `prisma migrate deploy` trên database sạch: thành công, 1 migration.
- Seed tạo đúng: 5 người dùng (1 chủ quán, 1 quản lý, 2 thu ngân, 1 pha chế), 4 danh mục, 15 sản phẩm, 45 size, 4 topping, 2 khu vực/10 bàn, 7 nguyên liệu/7 định mức, 1 khách hàng, 1 khuyến mãi và 1 đơn mẫu.
- Seed được chặn nếu database không kết thúc bằng `_test`, trừ khi người vận hành chủ động đặt `ALLOW_DESTRUCTIVE_SEED=true`.

## 4. Lệnh và kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| `npm ci` | PASS |
| `npm run lint` | PASS, 0 lỗi |
| `npm run typecheck` | PASS, 0 lỗi |
| `npm run test -- --no-file-parallelism` | PASS, 6/6 |
| `npx next build --webpack` | PASS |
| `npm run test:e2e` | PASS, 10/10 |
| Migration + seed sạch | PASS |
| Public smoke test | PASS, HTTP 200, logo tải được, không có console error |

Tổng regression test: 16 pass, 0 fail, 0 skipped. Playwright lưu screenshot, video và trace trong `/tmp` khi thất bại; các artifact này không được commit.

## 5. Lỗi đã phát hiện và sửa

### High — Hoàn thành đơn đồng thời có thể trừ kho hai lần

- Tái hiện: gửi hai `PATCH .../status` với trạng thái `COMPLETED` đồng thời cho cùng một đơn ở trạng thái `READY`.
- Nguyên nhân: cả hai transaction cùng đọc trạng thái cũ trước khi cập nhật.
- Sửa: claim trạng thái bằng optimistic update có điều kiện; chỉ request claim thành công mới được trừ kho.
- Regression: E2E gửi hai request đồng thời, xác nhận một request thành công, một request bị từ chối và tồn kho chỉ giảm một lần.

### High — Session production có secret mặc định

- Nguyên nhân: backend dùng chuỗi fallback khi thiếu `SESSION_SECRET`.
- Sửa: production từ chối tạo/xác minh session nếu secret thiếu, ngắn hơn 32 ký tự hoặc còn là giá trị mẫu. Session của tài khoản đã bị khóa cũng bị vô hiệu.

### Medium — API đơn hàng chấp nhận dữ liệu không hợp lệ

- Tái hiện: gửi type/payment/size/table/customer/promotion không hợp lệ hoặc đơn tại quán không có bàn.
- Sửa: validate rõ ràng, kiểm tra bàn cùng chi nhánh, sản phẩm active, customer tồn tại, số lượng 1–99, size hợp lệ và điều kiện khuyến mãi. Server vẫn tự lấy giá database và tính lại tổng tiền.

### Medium — Đếm khuyến mãi và mã đơn chưa an toàn

- Sửa: cập nhật `usedCount` trong cùng transaction, dùng update có điều kiện khi có giới hạn và tạo mã đơn bằng timestamp + UUID.
- Giới hạn: schema chưa có bảng lượt dùng theo từng khách hàng và chưa có idempotency key cho request thanh toán.

### Medium — Mở hai ca đồng thời

- Sửa: mở ca trong transaction mức `Serializable`; request cạnh tranh nhận HTTP 409.

### Medium — Thiếu rate limit và kiểm tra CSRF cơ bản

- Sửa: giới hạn 5 lần đăng nhập thất bại trong 15 phút theo IP + email, kiểm tra Origin cho API thay đổi dữ liệu và xóa bucket khi đăng nhập thành công.
- Giới hạn: rate limiter đang nằm trong bộ nhớ từng process; production nhiều instance cần Redis/Upstash hoặc rate limit tại gateway.

### Medium — Seed không chạy lặp lại

- Tái hiện: chạy seed lần hai sau khi E2E đã mở ca, gặp foreign-key `CashShift_userId_fkey`.
- Sửa: dọn `CashShift` đúng thứ tự và thêm guard chống seed nhầm database thật.

### Medium — POS tràn ngang ở tablet dọc

- Tái hiện: viewport 768×1024 có `scrollWidth=879`, `clientWidth=768`.
- Sửa: breakpoint responsive được nâng lên 900 px; kiểm tra lại 4 kích thước đều pass.

### Low — Tài khoản mẫu được điền sẵn trên màn hình đăng nhập

- Sửa: trường email và mật khẩu mặc định để trống. Tài khoản development chỉ còn trong README.

## 6. Kiểm tra bảo mật và dependency

- API bảo vệ từ chối người chưa đăng nhập; pha chế không thể tạo đơn; giá/tổng tiền giả từ client bị bỏ qua.
- Cookie session: HttpOnly, SameSite=Lax, Secure trong production, thời hạn 8 giờ.
- Prisma dùng truy vấn tham số hóa; không phát hiện SQL ghép chuỗi trong API hiện có.
- Ghi chú đơn bị giới hạn 500 ký tự và React escape nội dung khi render.
- Error API hiện không trả stack trace/query/secret.
- `npm audit`: 16 cảnh báo trong cây dependency (2 critical, 11 high, 3 moderate), chủ yếu ở công cụ development Vitest/Vite/Tinypool, Playwright, Prisma CLI và ESLint transitive. Không chạy `npm audit fix --force` vì bản sửa đề xuất có major/downgrade không an toàn. Cần một PR nâng dependency riêng và chạy lại toàn bộ regression.

## 7. File/module chính đã sửa

- `src/lib/auth.ts`, `rate-limit.ts`, `request-security.ts`, `order-number.ts`.
- API login, products, orders, order status và shifts.
- `prisma/seed.ts`.
- `src/app/globals.css`, `src/app/login/page.tsx`, `src/app/layout.tsx`.
- Unit test domain/security; Playwright global setup, sales flow và public smoke test.
- `README.md`, `docs/TEST-REPORT.md`.

## 8. Phần chưa thể xác nhận đầy đủ

- GitHub Pages là frontend static: workflow chủ động loại `src/app/api` trước khi build. Vì vậy public URL không có session, API hoặc PostgreSQL production.
- UI chính vẫn dùng dữ liệu mock, chưa nối toàn bộ POS vào API/database.
- Chưa có backend cho phần lớn CRUD, đóng ca, điểm khách hàng, bàn, báo cáo/export và audit log nên các mục này chưa thể E2E.
- Schema hiện chỉ gắn `branchId` đầy đủ cho một số bảng; sản phẩm, danh mục, khuyến mãi, khách hàng và nguyên liệu chưa cô lập theo chi nhánh.
- Chưa có kiểm thử chuyên dụng bằng axe-core; một số nút chỉ có icon cần tiếp tục bổ sung accessible name và kiểm tra contrast/zoom 200% thủ công.

## 9. Đánh giá sẵn sàng

**Sẵn sàng demo. Chưa sẵn sàng staging hoặc production.**

Frontend public phù hợp trình diễn giao diện. Muốn vận hành thật cần deploy Next.js server/API, PostgreSQL production, cấu hình secret, nối UI vào API, hoàn thiện các module còn thiếu, nâng dependency có cảnh báo và thực hiện kiểm thử bảo mật/a11y bổ sung.
