import { execFileSync } from "node:child_process";

export default function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("/noel_test")) {
    throw new Error("E2E bị chặn để bảo vệ dữ liệu: DATABASE_URL phải trỏ tới database noel_test");
  }
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: process.env });
  execFileSync("npm", ["run", "db:seed"], { stdio: "inherit", env: process.env });
}
