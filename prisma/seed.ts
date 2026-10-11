import { PrismaClient, Role, ProductStatus, TableStatus, DiscountType, OrderStatus, OrderType, PaymentMethod } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const hashPassword = (value: string) => hash(value, 12);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : "";
  if (!databaseName.endsWith("_test") && process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Seed có dọn dữ liệu nên chỉ được chạy trên database *_test. Đặt ALLOW_DESTRUCTIVE_SEED=true nếu bạn chủ động seed database development.");
  }
  await prisma.auditLog.deleteMany(); await prisma.pointTransaction.deleteMany(); await prisma.orderItem.deleteMany(); await prisma.order.deleteMany(); await prisma.cashShift.deleteMany(); await prisma.promotion.deleteMany(); await prisma.customer.deleteMany(); await prisma.inventoryMovement.deleteMany(); await prisma.recipe.deleteMany(); await prisma.ingredient.deleteMany(); await prisma.productTopping.deleteMany(); await prisma.productSize.deleteMany(); await prisma.product.deleteMany(); await prisma.topping.deleteMany(); await prisma.category.deleteMany(); await prisma.cafeTable.deleteMany(); await prisma.cafeArea.deleteMany(); await prisma.user.deleteMany(); await prisma.branch.deleteMany();
  const branch = await prisma.branch.create({ data: { name: "Chi nhánh trung tâm", address: "Tiệm nhà Noel" } });
  const users = await Promise.all([
    ["Chủ quán", "owner@noel.local", Role.OWNER], ["Quản lý", "manager@noel.local", Role.MANAGER], ["Thu ngân 1", "cashier1@noel.local", Role.CASHIER], ["Thu ngân 2", "cashier2@noel.local", Role.CASHIER], ["Nhân viên pha chế", "barista@noel.local", Role.BARISTA],
  ].map(async ([name, email, role]) => prisma.user.create({ data: { branchId: branch.id, name: name as string, email: email as string, role: role as Role, passwordHash: await hashPassword("NoelDev-2026-ChangeMe") } })));
  const categoryNames = ["Cà phê", "Trà", "Đá xay", "Bánh ngọt"]; const cats = Object.fromEntries(await Promise.all(categoryNames.map((name, sortOrder) => prisma.category.create({ data: { name, sortOrder } }).then((c) => [name, c]))));
  const productNames = ["Cà phê sữa đá", "Bạc xỉu", "Cà phê muối", "Trà đào cam sả", "Trà vải hoa hồng", "Matcha latte", "Đá xay chocolate", "Đá xay dâu", "Tiramisu", "Croissant bơ", "Bánh su kem", "Cold brew cam", "Espresso", "Americano", "Trà nhài"]; const products = [] as Awaited<ReturnType<typeof prisma.product.create>>[];
  for (let i = 0; i < productNames.length; i++) { const cat = categoryNames[i % categoryNames.length]; products.push(await prisma.product.create({ data: { categoryId: cats[cat].id, code: `NOEL-${String(i + 1).padStart(3, "0")}`, name: productNames[i], costPrice: 15000 + (i % 4) * 2000, sellingPrice: 32000 + (i % 6) * 5000, status: ProductStatus.ACTIVE, sizes: { create: [{ name: "S", extraPrice: 0 }, { name: "M", extraPrice: 5000 }, { name: "L", extraPrice: 10000 }] } } })); }
  const toppingNames = ["Trân châu trắng", "Kem cheese", "Shot espresso", "Thạch đào"]; const toppings = await Promise.all(toppingNames.map((name, i) => prisma.topping.create({ data: { name, price: 7000 + i * 1000 } })));
  await Promise.all(products.slice(0, 8).map((product, i) => prisma.productTopping.create({ data: { productId: product.id, toppingId: toppings[i % toppings.length].id } })));
  const ingredientNames = [["Hạt cà phê", "kg", 42], ["Sữa tươi", "lít", 28], ["Trà đào", "kg", 18], ["Cam tươi", "kg", 16], ["Bột matcha", "kg", 8], ["Đường", "kg", 35], ["Bột mì", "kg", 20]] as const; const ingredients = await Promise.all(ingredientNames.map(([name, unit, stock]) => prisma.ingredient.create({ data: { name, unit, stock, minStock: 5 } })));
  await Promise.all(products.slice(0, 7).map((product, i) => prisma.recipe.create({ data: { productId: product.id, ingredientId: ingredients[i % ingredients.length].id, quantity: 0.05 } })));
  const areas = await Promise.all(["Tầng trệt", "Ngoài sân"].map((name) => prisma.cafeArea.create({ data: { name } }))); for (let i = 0; i < 10; i++) await prisma.cafeTable.create({ data: { branchId: branch.id, areaId: areas[i < 5 ? 0 : 1].id, name: `Bàn ${String(i + 1).padStart(2, "0")}`, status: i === 3 ? TableStatus.SERVING : TableStatus.EMPTY } });
  const customer = await prisma.customer.create({ data: { name: "Nguyễn An", phone: "0900000001", points: 120 } }); const now = new Date(); const promotion = await prisma.promotion.create({ data: { code: "NOEL15", type: DiscountType.PERCENTAGE, value: 15, minimumOrder: 100000, startsAt: new Date(now.getFullYear(), 0, 1), endsAt: new Date(now.getFullYear(), 11, 31) } });
  await prisma.order.create({ data: { branchId: branch.id, userId: users[1].id, customerId: customer.id, orderNumber: "NO-0001", type: OrderType.DINE_IN, status: OrderStatus.COMPLETED, subtotal: 88000, total: 88000, paymentMethod: PaymentMethod.CASH, paidAt: now, items: { create: [{ productId: products[0].id, nameSnapshot: products[0].name, unitPrice: products[0].sellingPrice, quantity: 1 }] } } }); await prisma.promotion.update({ where: { id: promotion.id }, data: { usedCount: 0 } });
  console.log("Seeded Noel local database", { branch: branch.name, users: users.length, products: products.length, ingredients: ingredients.length });
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
