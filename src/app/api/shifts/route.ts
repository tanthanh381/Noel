import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function GET() { const user = await getSessionUser(); if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }); const shift = await prisma.cashShift.findFirst({ where: { userId: user.id, closedAt: null }, orderBy: { openedAt: "desc" } }); return NextResponse.json({ shift }); }
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasRole(user, ["OWNER", "MANAGER", "CASHIER"])) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const openingCash = Number(body?.openingCash);
  if (!Number.isInteger(openingCash) || openingCash < 0) return NextResponse.json({ error: "Tiền đầu ca không hợp lệ" }, { status: 400 });
  try {
    const shift = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashShift.findFirst({ where: { userId: user.id, closedAt: null } });
      if (existing) throw new Error("Bạn đang có ca mở");
      return tx.cashShift.create({ data: { branchId: user.branchId, userId: user.id, openingCash } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể mở ca";
    return NextResponse.json({ error: message === "Bạn đang có ca mở" ? message : "Ca vừa được mở bởi một yêu cầu khác" }, { status: 409 });
  }
}
