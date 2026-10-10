import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ products: [] });
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, include: { category: true, sizes: true, toppings: { include: { topping: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json({ products });
}
