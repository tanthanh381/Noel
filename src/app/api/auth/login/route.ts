import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: String(body.email).trim().toLowerCase() } });
  if (!user || !user.active || !(await verifyPassword(String(body.password), user.passwordHash))) return NextResponse.json({ error: "Thông tin đăng nhập không đúng" }, { status: 401 });
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId } });
}
