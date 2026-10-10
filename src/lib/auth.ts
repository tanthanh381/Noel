import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "noel_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "local-only-change-this-secret");

export type SessionUser = { id: string; name: string; email: string; role: "OWNER" | "MANAGER" | "CASHIER" | "BARISTA"; branchId: string };

export async function verifyPassword(password: string, passwordHash: string) { return bcrypt.compare(password, passwordHash); }

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role, branchId: user.branchId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("8h").sign(secret);
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearSession() { (await cookies()).set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" }); }

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, branchId: true } }) as Promise<SessionUser | null>;
  } catch { return null; }
}

export function hasRole(user: SessionUser, roles: SessionUser["role"][]) { return roles.includes(user.role); }
