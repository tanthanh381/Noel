import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const tables = await prisma.cafeTable.findMany({
    where: { branchId: user.branchId },
    include: { area: true },
    orderBy: [{ area: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json({ tables });
}
