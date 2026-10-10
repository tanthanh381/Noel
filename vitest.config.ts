import { defineConfig } from "vitest/config";
export default defineConfig({
  cacheDir: "/tmp/noel-vitest-cache",
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
