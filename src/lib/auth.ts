import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession, type SessionPayload } from "./session";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: { id: string; role: string; email: string }) {
  const token = await signSession({ uid: user.id, role: user.role === "ADMIN" ? "ADMIN" : "CUSTOMER", email: user.email });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.uid } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return user;
}

/** Re-checks the role against the database, not just the cookie. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login?next=/admin");
  return user;
}
