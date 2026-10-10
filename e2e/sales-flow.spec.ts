import { expect, test } from "@playwright/test";

test("đăng nhập → mở ca → bán hàng → pha chế → hoàn thành", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("cashier1@noel.local");
  await page.getByLabel("Mật khẩu").fill("NoelDev-2026-ChangeMe");
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

  for (const status of ["IN_PROGRESS", "READY", "COMPLETED"]) {
    const response = await api.patch(`/api/orders/${created.id}/status`, { data: { status } });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).order.status).toBe(status);
  }

  const savedOrder = await api.get(`/api/orders/${created.id}`);
  expect(savedOrder.ok()).toBeTruthy();
  const saved = (await savedOrder.json()).order as { status: string; items: unknown[] };
  expect(saved.status).toBe("COMPLETED");
  expect(saved.items).toHaveLength(1);
});
