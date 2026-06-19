import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { User } from "./types";
import { randomUUID } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "tomoverso-dev-secret-change-in-production-min-32-chars"
);
const SESSION_DURATION_DAYS = 30;
const COOKIE_NAME = "tomoverso-session";

export interface SessionPayload {
  userId: string;
  sessionId: string;
}

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "admin" | "author";
  email_verified: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export function generateId(): string {
  return randomUUID();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, sessionId: payload.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(payload.userId) as UserRecord | undefined;

  return user || null;
}

export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<UserRecord> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export function recordToUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    display_name: record.display_name,
    avatar_url: record.avatar_url || undefined,
    bio: record.bio || undefined,
    created_at: record.created_at,
  };
}
