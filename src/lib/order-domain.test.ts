import { describe, expect, it } from "vitest";
import { calculateChange, calculateDiscount, calculateSubtotal, canTransitionOrder } from "./order-domain";

describe("order domain", () => {
  it("calculates subtotal and change", () => { expect(calculateSubtotal([{ unitPrice: 39000, quantity: 2 }, { unitPrice: 49000, quantity: 1 }])).toBe(127000); expect(calculateChange(127000, 150000)).toBe(23000); });
  it("caps discounts and respects minimum order", () => { expect(calculateDiscount(100000, "PERCENTAGE", 15, 120000)).toBe(0); expect(calculateDiscount(200000, "PERCENTAGE", 15)).toBe(30000); expect(calculateDiscount(50000, "FIXED", 90000)).toBe(50000); });
  it("enforces order transitions", () => { expect(canTransitionOrder("NEW", "IN_PROGRESS")).toBe(true); expect(canTransitionOrder("NEW", "COMPLETED")).toBe(false); expect(canTransitionOrder("READY", "COMPLETED")).toBe(true); });
});
