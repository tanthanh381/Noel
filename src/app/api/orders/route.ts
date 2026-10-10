import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDiscount, calculateSubtotal } from "@/lib/order-domain";

type IncomingItem = { productId: string; quantity: number; size?: string };
type IncomingOrder = { items?: IncomingItem[]; type?: string; paymentMethod?: string; promotionCode?: string; customerId?: string; tableId?: string; note?: string };

export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user || !hasRole(user, ["OWNER", "MANAGER", "CASHIER"])) return NextResponse.json({ error: "Không có quyền tạo đơn" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as IncomingOrder | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const items = body.items ?? [];
  if (!items.length) return NextResponse.json({ error: "Đơn hàng phải có sản phẩm" }, { status: 400 });
  const type = body.type === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN"; const paymentMethod = body.paymentMethod === "TRANSFER" ? "TRANSFER" : body.paymentMethod === "OTHER" ? "OTHER" : "CASH";
  if (paymentMethod === "CASH" && !(await prisma.cashShift.findFirst({ where: { userId: user.id, closedAt: null } }))) return NextResponse.json({ error: "Vui lòng mở ca trước khi thanh toán tiền mặt" }, { status: 409 });
  const ids = [...new Set(items.map((item: { productId?: string }) => item.productId).filter(Boolean))] as string[]; const products = await prisma.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: { sizes: true, toppings: { include: { topping: true } } } }); const byId = new Map(products.map((product) => [product.id, product]));
  if (products.length !== ids.length) return NextResponse.json({ error: "Sản phẩm không tồn tại hoặc đã tạm ngừng bán" }, { status: 400 });
  const lines = items.map((item) => { const product = byId.get(item.productId)!; const size = product.sizes.find((entry) => entry.name === item.size); const quantity = Number(item.quantity); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Số lượng không hợp lệ"); return { product, size, quantity, unitPrice: product.sellingPrice + (size?.extraPrice ?? 0) }; });
  const subtotal = calculateSubtotal(lines); const code = body.promotionCode ? String(body.promotionCode).trim().toUpperCase() : null; const promotion = code ? await prisma.promotion.findFirst({ where: { code, active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } }) : null; const discount = promotion ? calculateDiscount(subtotal, promotion.type, promotion.value, promotion.minimumOrder) : 0; const total = subtotal - discount;
  try { const order = await prisma.$transaction(async (tx) => { if (promotion?.usageLimit !== null && promotion && promotion.usageLimit !== null) { const updated = await tx.promotion.updateMany({ where: { id: promotion.id, usedCount: { lt: promotion.usageLimit } }, data: { usedCount: { increment: 1 } } }); if (updated.count !== 1) throw new Error("Mã khuyến mãi đã hết lượt sử dụng"); } return tx.order.create({ data: { branchId: user.branchId, userId: user.id, customerId: body.customerId || undefined, tableId: type === "DINE_IN" ? body.tableId || undefined : undefined, promotionId: promotion?.id, orderNumber: `NO-${Date.now().toString().slice(-8)}`, type, subtotal, discount, total, paymentMethod, paidAt: new Date(), items: { create: lines.map((line) => ({ productId: line.product.id, nameSnapshot: line.product.name, unitPrice: line.unitPrice, quantity: line.quantity, sizeName: line.size?.name, note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined })) } }, include: { items: true } }); }); return NextResponse.json({ order }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo đơn" }, { status: 400 }); }
}
