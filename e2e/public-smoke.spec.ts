import { expect, test } from "@playwright/test";

test("website public tải được logo và không có lỗi console nghiêm trọng", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto("https://tanthanh381.github.io/Noel/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByAltText("Logo Tiệm nhà Noel").first()).toBeVisible();
  expect(errors).toEqual([]);
});
