import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
  const email = String(body.email).trim().toLowerCase();
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "local";
  const rateLimitKey = `${address}:${email}`;
  const limit = checkLoginRateLimit(rateLimitKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(String(body.password), user.passwordHash))) return NextResponse.json({ error: "Thông tin đăng nhập không đúng" }, { status: 401 });
  clearLoginRateLimit(rateLimitKey);
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId } });
}
