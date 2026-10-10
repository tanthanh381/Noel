# Tiệm nhà Noel

Dashboard POS hiện đại cho quán cà phê, tối ưu thao tác trên máy tính bảng và máy tính. Giao diện MVP hiện bao gồm bán hàng, giỏ hàng, tính tiền, thanh toán, pha chế, tổng quan doanh thu và các màn hình quản lý nền tảng.

## MVP hiện tại

- POS tiếng Việt: tìm kiếm món, lọc danh mục, thêm món, tăng/giảm số lượng, bàn, mang đi, mã giảm giá và thanh toán.
- Dashboard tổng quan: doanh thu, số đơn, khách hàng mới, giá trị đơn trung bình, biểu đồ và sản phẩm bán chạy.
- Màn hình pha chế: danh sách ticket, ưu tiên đơn mới và chuyển trạng thái Mới → Đang pha chế → Sẵn sàng → Hoàn thành.
- Điều hướng nền tảng cho Đơn hàng, Bàn & khu vực, Sản phẩm, Kho nguyên liệu, Khách hàng và Báo cáo.
- Responsive cho tablet/mobile, toast thành công và các token giao diện sẵn sàng mở rộng.

## Kiến trúc dự kiến

Ứng dụng sử dụng Next.js App Router + TypeScript + Tailwind CSS. MVP giao diện hiện đang dùng dữ liệu mẫu cục bộ để kiểm chứng trải nghiệm. Bước backend tiếp theo sẽ thêm PostgreSQL + Prisma, session HttpOnly, RBAC phía server, transaction cho thanh toán/kho/điểm và audit log. Kiến trúc domain được giữ theo một cửa hàng nhưng có `branchId` để mở rộng nhiều chi nhánh.

## Yêu cầu môi trường

- Node.js 20+
- npm 10+
- PostgreSQL 16 (giai đoạn backend)
- Docker Desktop (tùy chọn)

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

```bash
npm run lint
npm run build
```

## Biến môi trường

MVP giao diện chưa cần biến môi trường. Khi bật backend, tạo `.env` từ `.env.example`; không commit `.env` thật hoặc credentials.

## Tài khoản và phân quyền

Backend/RBAC sẽ được triển khai ở module tiếp theo với các vai trò: Chủ quán, Quản lý, Thu ngân và Pha chế. Dữ liệu demo hiện được hiển thị dưới tài khoản giao diện `Nguyễn An · Quản lý`.

## Giới hạn hiện tại và hướng phát triển

Hiện chưa có API/database thật, đăng nhập, migration/seed, máy in, realtime WebSocket hay export CSV. Các phần tiếp theo cần triển khai theo thứ tự: schema Prisma + migration/seed, auth/RBAC, API transaction-safe cho POS/kho/khuyến mãi, test unit/e2e Playwright, Docker Compose và deploy.

## Quy trình đóng góp

Phát triển trên nhánh `feature/cafe-management`, chạy lint/build trước khi commit, không đưa secrets hoặc dữ liệu khách hàng thật vào repository. Pull Request cần nêu rõ thay đổi, cách chạy và kết quả kiểm thử.
