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
npm run db:seed
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
npm run db:seed     # tạo dữ liệu mẫu
npm run db:studio   # mở Prisma Studio
npm run db:down     # dừng container, giữ volume
```

Tài khoản development sau khi seed đều dùng mật khẩu `NoelDev-2026-ChangeMe`; hãy đổi ngay khi thêm màn hình đăng nhập thật. Không dùng mật khẩu này trong production.

## Biến môi trường

Copy `.env.example` thành `.env`; không commit `.env` thật hoặc credentials. `DATABASE_URL` mặc định trỏ tới PostgreSQL Docker local.

## Tài khoản và phân quyền

Backend/RBAC sẽ được triển khai ở module tiếp theo với các vai trò: Chủ quán, Quản lý, Thu ngân và Pha chế. Dữ liệu demo hiện được hiển thị dưới tài khoản giao diện `Nguyễn An · Quản lý`.

## Giới hạn hiện tại và hướng phát triển

Hiện chưa có đăng nhập đầy đủ, API transaction-safe cho tạo đơn/trừ kho, máy in, realtime WebSocket hay export CSV. Các phần tiếp theo cần triển khai: auth/RBAC server-side, transaction POS/kho/khuyến mãi, test unit/e2e Playwright và deploy database production.

## Quy trình đóng góp

Phát triển trên nhánh `feature/cafe-management`, chạy lint/build trước khi commit, không đưa secrets hoặc dữ liệu khách hàng thật vào repository. Pull Request cần nêu rõ thay đổi, cách chạy và kết quả kiểm thử.
