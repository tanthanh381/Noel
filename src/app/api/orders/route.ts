import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDiscount, calculateSubtotal } from "@/lib/order-domain";
import { createOrderNumber } from "@/lib/order-number";
import { hasTrustedOrigin } from "@/lib/request-security";

type IncomingItem = { productId: string; quantity: number; size?: string };
type IncomingOrder = { items?: IncomingItem[]; type?: string; paymentMethod?: string; promotionCode?: string; customerId?: string; tableId?: string; note?: string };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const kitchenStatuses = ["NEW", "IN_PROGRESS", "READY"] as const;
  const orders = await prisma.order.findMany({
    where: {
      branchId: user.branchId,
      ...(user.role === "BARISTA" ? { status: { in: [...kitchenStatuses] } } : {}),
    },
    include: { items: true, table: true, user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasRole(user, ["OWNER", "MANAGER", "CASHIER"])) return NextResponse.json({ error: "Không có quyền tạo đơn" }, { status: 403 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as IncomingOrder | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const items = body.items ?? [];
  if (!items.length || items.length > 100) return NextResponse.json({ error: "Đơn hàng phải có từ 1 đến 100 dòng sản phẩm" }, { status: 400 });
  if (body.type !== "DINE_IN" && body.type !== "TAKEAWAY") return NextResponse.json({ error: "Hình thức phục vụ không hợp lệ" }, { status: 400 });
  if (!body.paymentMethod || !["CASH", "TRANSFER", "OTHER"].includes(body.paymentMethod)) return NextResponse.json({ error: "Phương thức thanh toán không hợp lệ" }, { status: 400 });
  const type = body.type;
  const paymentMethod = body.paymentMethod as "CASH" | "TRANSFER" | "OTHER";
  if (type === "DINE_IN" && !body.tableId) return NextResponse.json({ error: "Đơn dùng tại quán phải chọn bàn" }, { status: 400 });
  if (paymentMethod === "CASH" && !(await prisma.cashShift.findFirst({ where: { userId: user.id, branchId: user.branchId, closedAt: null } }))) return NextResponse.json({ error: "Vui lòng mở ca trước khi thanh toán tiền mặt" }, { status: 409 });
  if (body.tableId && !(await prisma.cafeTable.findFirst({ where: { id: body.tableId, branchId: user.branchId } }))) return NextResponse.json({ error: "Bàn không hợp lệ" }, { status: 400 });
  if (body.customerId && !(await prisma.customer.findUnique({ where: { id: body.customerId } }))) return NextResponse.json({ error: "Khách hàng không hợp lệ" }, { status: 400 });
  const ids = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { sizes: true, toppings: { include: { topping: true } } } });
  const byId = new Map(products.map((product) => [product.id, product]));
  if (products.length !== ids.length) return NextResponse.json({ error: "Sản phẩm không tồn tại hoặc đã tạm ngừng bán" }, { status: 400 });
  const lines: Array<{ product: (typeof products)[number]; size: (typeof products)[number]["sizes"][number] | undefined; quantity: number; unitPrice: number }> = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return NextResponse.json({ error: "Sản phẩm không hợp lệ" }, { status: 400 });
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return NextResponse.json({ error: "Số lượng không hợp lệ" }, { status: 400 });
    const size = product.sizes.find((entry) => entry.name === item.size);
    if (product.sizes.length && !size) return NextResponse.json({ error: `Kích thước của ${product.name} không hợp lệ` }, { status: 400 });
    lines.push({ product, size, quantity, unitPrice: product.sellingPrice + (size?.extraPrice ?? 0) });
  }
  const subtotal = calculateSubtotal(lines);
  const code = body.promotionCode ? String(body.promotionCode).trim().toUpperCase() : null;
  const promotion = code ? await prisma.promotion.findFirst({ where: { code, active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } }) : null;
  if (code && !promotion) return NextResponse.json({ error: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn" }, { status: 400 });
  if (promotion && subtotal < promotion.minimumOrder) return NextResponse.json({ error: "Đơn hàng chưa đạt giá trị tối thiểu của khuyến mãi" }, { status: 400 });
  const discount = promotion ? calculateDiscount(subtotal, promotion.type, promotion.value, promotion.minimumOrder) : 0;
  const total = Math.max(0, subtotal - discount);
  try {
    const order = await prisma.$transaction(async (tx) => {
      if (promotion) {
        if (promotion.usageLimit === null) await tx.promotion.update({ where: { id: promotion.id }, data: { usedCount: { increment: 1 } } });
        else {
          const updated = await tx.promotion.updateMany({ where: { id: promotion.id, usedCount: { lt: promotion.usageLimit } }, data: { usedCount: { increment: 1 } } });
          if (updated.count !== 1) throw new Error("Mã khuyến mãi đã hết lượt sử dụng");
        }
      }
      return tx.order.create({ data: { branchId: user.branchId, userId: user.id, customerId: body.customerId || undefined, tableId: type === "DINE_IN" ? body.tableId : undefined, promotionId: promotion?.id, orderNumber: createOrderNumber(), type, subtotal, discount, total, paymentMethod, paidAt: new Date(), items: { create: lines.map((line) => ({ productId: line.product.id, nameSnapshot: line.product.name, unitPrice: line.unitPrice, quantity: line.quantity, sizeName: line.size?.name, note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined })) } }, include: { items: true } });
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo đơn" }, { status: 400 });
  }
}
