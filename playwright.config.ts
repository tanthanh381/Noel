import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "/tmp/noel-playwright-report" }]],
  outputDir: "/tmp/noel-test-results",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  webServer: { command: "npm run dev -- --hostname localhost", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
