import { beforeEach, describe, expect, it } from "vitest";
import { createOrderNumber } from "./order-number";
import { checkLoginRateLimit, clearLoginRateLimit, resetLoginRateLimitsForTests } from "./rate-limit";
import { hasTrustedOrigin } from "./request-security";

describe("security helpers", () => {
  beforeEach(() => resetLoginRateLimitsForTests());

  it("rate-limits the sixth failed login and can clear a successful login", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) expect(checkLoginRateLimit("127.0.0.1:user", 1_000).allowed).toBe(true);
    expect(checkLoginRateLimit("127.0.0.1:user", 1_000)).toMatchObject({ allowed: false });
    clearLoginRateLimit("127.0.0.1:user");
    expect(checkLoginRateLimit("127.0.0.1:user", 1_000).allowed).toBe(true);
  });

  it("rejects a cross-site mutation origin", () => {
    const trusted = new Request("http://localhost:3000/api/orders", { headers: { origin: "http://localhost:3000", host: "localhost:3000" } });
    const forged = new Request("http://localhost:3000/api/orders", { headers: { origin: "https://attacker.example", host: "localhost:3000" } });
    expect(hasTrustedOrigin(trusted)).toBe(true);
    expect(hasTrustedOrigin(forged)).toBe(false);
  });

  it("creates collision-resistant human-readable order numbers", () => {
    const values = new Set(Array.from({ length: 1_000 }, () => createOrderNumber(1_700_000_000_000)));
    expect(values.size).toBe(1_000);
    expect([...values][0]).toMatch(/^NO-[A-Z0-9]+-[A-F0-9]{8}$/);
  });
});
