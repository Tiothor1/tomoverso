import { SignJWT, jwtVerify, EncryptJWT, jwtDecrypt } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { User } from "./types";
import { createHash, randomUUID } from "crypto";
import type Database from "better-sqlite3";

const AUTH_SECRET = process.env.AUTH_SECRET;
// Only throw at runtime on Vercel, not during build
if (!AUTH_SECRET && process.env.VERCEL && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("AUTH_SECRET não configurado no ambiente de produção! Defina no Vercel Dashboard > Settings > Environment Variables.");
}
const SECRET = AUTH_SECRET || "tomoverso-dev-secret-change-in-production-min-32-chars";
const JWT_SECRET = new TextEncoder().encode(SECRET);
const JWE_SECRET = createHash("sha256").update(SECRET).digest();
const SESSION_DURATION_DAYS = 30;
const ACCOUNT_BACKUP_DAYS = 365;
export const COOKIE_NAME = "tomoverso-session";
const ACCOUNT_COOKIE_NAME = "tomoverso-account";

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

export interface AccountBackupPayload {
  userId: string;
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: "user" | "admin" | "author";
  createdAt: string;
}

export function generateId(): string {
  return randomUUID();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function normalizeLogin(login: string): string {
  const value = login.trim().toLowerCase();
  return value.startsWith("@") ? normalizeUsername(value) : value;
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
    if (!payload.userId || !payload.sessionId) return null;
    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string,
    };
  } catch {
    return null;
  }
}

export async function createAccountBackupToken(payload: AccountBackupPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${ACCOUNT_BACKUP_DAYS}d`)
    .encrypt(JWE_SECRET);
}

export async function verifyAccountBackupToken(token: string): Promise<AccountBackupPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, JWE_SECRET);
    if (!payload.userId || !payload.email || !payload.username || !payload.passwordHash) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      username: String(payload.username),
      passwordHash: String(payload.passwordHash),
      displayName: String(payload.displayName || payload.username),
      role: (payload.role as AccountBackupPayload["role"]) || "user",
      createdAt: String(payload.createdAt || new Date().toISOString()),
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

export async function setAccountBackupCookie(payload: AccountBackupPayload) {
  const token = await createAccountBackupToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCOUNT_BACKUP_DAYS * 24 * 60 * 60,
  });
}

export async function getAccountBackupFromCookie(): Promise<AccountBackupPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAccountBackupToken(token);
}

export function restoreUserFromBackup(db: Database.Database, backup: AccountBackupPayload): UserRecord {
  const existing = db
    .prepare("SELECT * FROM users WHERE id = ? OR lower(email) = ? OR lower(username) = ? LIMIT 1")
    .get(backup.userId, backup.email, backup.username) as UserRecord | undefined;

  if (existing) return existing;

  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, display_name, role, created_at, updated_at, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    backup.userId,
    backup.email,
    backup.username,
    backup.passwordHash,
    backup.displayName,
    backup.role,
    backup.createdAt,
    new Date().toISOString()
  );

  return db.prepare("SELECT * FROM users WHERE id = ?").get(backup.userId) as UserRecord;
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  let user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(payload.userId) as UserRecord | undefined;

  if (!user) {
    const backup = await getAccountBackupFromCookie();
    if (backup && backup.userId === payload.userId) {
      user = restoreUserFromBackup(db, backup);
    }
  }

  if (user) {
    const access = db
      .prepare("SELECT is_suspended FROM user_access_controls WHERE user_id = ?")
      .get(user.id) as { is_suspended: number } | undefined;
    if (access?.is_suspended) {
      return null;
    }
  }

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
