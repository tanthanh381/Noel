import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ products: [] });
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, include: { category: true, sizes: true, toppings: { include: { topping: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json({ products });
}
