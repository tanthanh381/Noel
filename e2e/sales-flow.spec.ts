import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = "NoelDev-2026-ChangeMe";

test.afterAll(async () => prisma.$disconnect());

test("từ chối thông tin đăng nhập sai", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@noel.local");
  await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Thông tin đăng nhập không đúng")).toBeVisible();
});

test("thu ngân chưa mở ca không thể thanh toán tiền mặt", async ({ context }) => {
  const api = context.request;
  expect((await api.post("/api/auth/login", { data: { email: "cashier2@noel.local", password } })).ok()).toBeTruthy();
  const products = (await (await api.get("/api/products")).json()).products as Array<{ id: string; code: string }>;
  const coffee = products.find((product) => product.code === "NOEL-001")!;
  const response = await api.post("/api/orders", { data: { items: [{ productId: coffee.id, quantity: 1, size: "M" }], type: "TAKEAWAY", paymentMethod: "CASH" } });
  expect(response.status()).toBe(409);
  expect((await response.json()).error).toContain("mở ca");
});

test("đăng nhập → mở ca → bán hàng → pha chế → hoàn thành", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("cashier1@noel.local");
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);

  const api = context.request;
  const shiftResponse = await api.get("/api/shifts");
  expect(shiftResponse.ok()).toBeTruthy();
  const currentShift = (await shiftResponse.json()).shift;
  if (!currentShift) {
    const openShift = await api.post("/api/shifts", { data: { openingCash: 500000 } });
    expect(openShift.status()).toBe(201);
  }

  const productsResponse = await api.get("/api/products");
  expect(productsResponse.ok()).toBeTruthy();
  const products = (await productsResponse.json()).products as Array<{ id: string; code: string; sizes: Array<{ name: string }> }>;
  const coffee = products.find((product) => product.code === "NOEL-001");
  expect(coffee).toBeDefined();

  const createOrder = await api.post("/api/orders", {
    data: { items: [{ productId: coffee!.id, quantity: 1, size: "M" }], type: "TAKEAWAY", paymentMethod: "CASH" },
  });
  expect(createOrder.status()).toBe(201);
  const created = (await createOrder.json()).order as { id: string; status: string; total: number };
  expect(created.status).toBe("NEW");
  expect(created.total).toBeGreaterThan(0);

  for (const status of ["IN_PROGRESS", "READY"]) {
    const response = await api.patch(`/api/orders/${created.id}/status`, { data: { status } });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).order.status).toBe(status);
  }

  const recipe = await prisma.recipe.findFirstOrThrow({ where: { productId: coffee!.id }, include: { ingredient: true } });
  const stockBefore = Number(recipe.ingredient.stock);
  const completionResults = await Promise.all([
    api.patch(`/api/orders/${created.id}/status`, { data: { status: "COMPLETED" } }),
    api.patch(`/api/orders/${created.id}/status`, { data: { status: "COMPLETED" } }),
  ]);
  expect(completionResults.map((response) => response.status()).sort()).toEqual([200, 400]);
  const ingredientAfter = await prisma.ingredient.findUniqueOrThrow({ where: { id: recipe.ingredientId } });
  expect(Number(ingredientAfter.stock)).toBeCloseTo(stockBefore - Number(recipe.quantity), 3);

  const savedOrder = await api.get(`/api/orders/${created.id}`);
  expect(savedOrder.ok()).toBeTruthy();
  const saved = (await savedOrder.json()).order as { status: string; items: unknown[] };
  expect(saved.status).toBe("COMPLETED");
  expect(saved.items).toHaveLength(1);
});

test("áp dụng mã khuyến mãi hợp lệ và tính lại giá phía server", async ({ context }) => {
  const api = context.request;
  expect((await api.post("/api/auth/login", { data: { email: "manager@noel.local", password } })).ok()).toBeTruthy();
  const products = (await (await api.get("/api/products")).json()).products as Array<{ id: string; code: string }>;
  const coffee = products.find((product) => product.code === "NOEL-001")!;
  const response = await api.post("/api/orders", {
    data: { items: [{ productId: coffee.id, quantity: 3, size: "M", unitPrice: 1 }], type: "TAKEAWAY", paymentMethod: "TRANSFER", promotionCode: "noel15", total: 1 },
  });
  expect(response.status()).toBe(201);
  const order = (await response.json()).order as { subtotal: number; discount: number; total: number };
  expect(order.subtotal).toBe(111000);
  expect(order.discount).toBe(16650);
  expect(order.total).toBe(94350);
});

test("pha chế không thể tạo đơn hoặc truy cập nghiệp vụ thu ngân", async ({ context }) => {
  const api = context.request;
  expect((await api.post("/api/auth/login", { data: { email: "barista@noel.local", password } })).ok()).toBeTruthy();
  const response = await api.post("/api/orders", { data: { items: [], type: "TAKEAWAY", paymentMethod: "TRANSFER" } });
  expect(response.status()).toBe(403);
});

for (const viewport of [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet dọc", width: 768, height: 1024 },
  { name: "tablet ngang", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`POS không tràn ngang trên ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    await expect(page.locator('img[alt="Logo Tiệm nhà Noel"]:visible')).toHaveCount(1);
    const dimensions = await page.locator("html").evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}
