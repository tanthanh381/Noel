# Tiệm nhà Noel

Dashboard POS hiện đại cho quán cà phê, tối ưu thao tác trên máy tính bảng và máy tính. Giao diện MVP hiện bao gồm bán hàng, giỏ hàng, tính tiền, thanh toán, pha chế, tổng quan doanh thu và các màn hình quản lý nền tảng.

## MVP hiện tại

- POS tiếng Việt: tìm kiếm món, lọc danh mục, thêm món, tăng/giảm số lượng, bàn, mang đi, mã giảm giá và thanh toán.
- Dashboard tổng quan: doanh thu, số đơn, khách hàng mới, giá trị đơn trung bình, biểu đồ và sản phẩm bán chạy.
- Màn hình pha chế: danh sách ticket, ưu tiên đơn mới và chuyển trạng thái Mới → Đang pha chế → Sẵn sàng → Hoàn thành.
- Điều hướng nền tảng cho Đơn hàng, Bàn & khu vực, Sản phẩm, Kho nguyên liệu, Khách hàng và Báo cáo.
- Responsive cho tablet/mobile, toast thành công và các token giao diện sẵn sàng mở rộng.

## Kiến trúc dự kiến

Ứng dụng sử dụng Next.js App Router + TypeScript + Tailwind CSS, PostgreSQL local và Prisma. Database được chạy bằng Docker Compose; schema đã có branch, người dùng, RBAC role, sản phẩm, size, topping, nguyên liệu, định mức, bàn, khách hàng, khuyến mãi, đơn hàng, ca tiền mặt, biến động kho và audit log. API `/api/products` đã đọc dữ liệu thật từ PostgreSQL. Kiến trúc domain được giữ theo một cửa hàng nhưng có `branchId` để mở rộng nhiều chi nhánh.

## Yêu cầu môi trường

- Node.js 20+
- npm 10+
- Docker Desktop với `docker-compose`

## Cài đặt và chạy

```bash
npm install
npm run db:up
npm run db:migrate
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
npm run dev
```

Mở http://localhost:3000.

```bash
npm run lint
npm run build
```

## Database local

PostgreSQL chạy tại `localhost:5432`, database `noel`, user `postgres`, password development `postgres`. Dữ liệu nằm trong Docker volume `noel_noel_postgres_data` và không được commit lên GitHub.

```bash
npm run db:up       # khởi động PostgreSQL
npm run db:migrate  # tạo/apply migration
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed # tạo lại dữ liệu mẫu development
npm run db:studio   # mở Prisma Studio
npm run db:down     # dừng container, giữ volume
```

Tài khoản development sau khi seed đều dùng mật khẩu `NoelDev-2026-ChangeMe`; hãy đổi ngay khi thêm màn hình đăng nhập thật. Không dùng mật khẩu này trong production.

## Biến môi trường

Copy `.env.example` thành `.env`; không commit `.env` thật hoặc credentials. `DATABASE_URL` mặc định trỏ tới PostgreSQL Docker local.

## Tài khoản và phân quyền

Backend/RBAC đã có session HttpOnly và kiểm tra quyền ở các API chính. Tài khoản development sau khi seed: `owner@noel.local`, `manager@noel.local`, `cashier1@noel.local`, `cashier2@noel.local`, `barista@noel.local`.

## Kiểm thử E2E

Playwright kiểm thử luồng đăng nhập → mở ca → tạo đơn tiền mặt → chuyển trạng thái pha chế → hoàn thành và đọc lại đơn từ API. Test chỉ chạy trên database có tên kết thúc bằng `_test` để không ghi đè dữ liệu development/production:

```bash
npx playwright install chromium
docker exec noel-postgres psql -U postgres -d postgres -c "CREATE DATABASE noel_test"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/noel_test?schema=public npm run test:e2e
```

Global setup tự chạy migration và seed lại database `noel_test` trước bộ E2E. Seed development có thao tác dọn dữ liệu và vì vậy yêu cầu xác nhận rõ bằng `ALLOW_DESTRUCTIVE_SEED=true`; không chạy seed trên production.

## Giới hạn hiện tại và hướng phát triển

Các giới hạn còn lại: giao diện POS vẫn cần nối hoàn toàn vào API thật, chưa có máy in/realtime WebSocket/export CSV, chưa có màn hình đóng ca và báo cáo đầy đủ. Database production, rate limit phân tán và quy trình deploy cần cấu hình riêng trước khi vận hành thật.

## Quy trình đóng góp

Phát triển trên nhánh `feature/cafe-management`, chạy lint/build trước khi commit, không đưa secrets hoặc dữ liệu khách hàng thật vào repository. Pull Request cần nêu rõ thay đổi, cách chạy và kết quả kiểm thử.
