"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  COOKIE_NAME,
  generateId,
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
  normalizeEmail,
  normalizeUsername,
  normalizeLogin,
  setAccountBackupCookie,
  getAccountBackupFromCookie,
  restoreUserFromBackup,
  verifySessionToken,
} from "@/lib/auth";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { UserRecord } from "@/lib/auth";
import type Database from "better-sqlite3";

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20")
    .regex(/^@?[a-zA-Z0-9_]+$/, "Só letras, números e _"),
  display_name: z.string().min(2, "Mínimo 2 caracteres").max(40),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const loginSchema = z.object({
  login: z.string().min(1, "Digite email ou username"),
  password: z.string().min(1, "Digite sua senha"),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function safeActivityLog(
  db: Database.Database,
  values: { userId?: string; action: string; targetType?: string; targetId?: string }
) {
  try {
    db.prepare(
      "INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)"
    ).run(
      generateId(),
      values.userId || null,
      values.action,
      values.targetType || null,
      values.targetId || null
    );
  } catch {
    // log não pode quebrar cadastro/login
  }
}

async function createPersistentSession(db: Database.Database, user: UserRecord) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, user.id, sessionId, expiresAt, "", "");

  const token = await createSessionToken({ userId: user.id, sessionId });
  await setSessionCookie(token);
  await setAccountBackupCookie({
    userId: user.id,
    email: user.email,
    username: user.username,
    passwordHash: user.password_hash,
    displayName: user.display_name,
    role: user.role,
    createdAt: user.created_at,
  });
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    username: formData.get("username") as string,
    display_name: formData.get("display_name") as string,
    password: formData.get("password") as string,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);
  const username = normalizeUsername(parsed.data.username);
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE lower(email) = ? OR lower(username) = ?")
    .get(email, username);
  if (existing) {
    return { ok: false, error: "Email ou username já cadastrado" };
  }

  const id = generateId();
  const passwordHash = await hashPassword(parsed.data.password);
  const isFirstUser = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c === 0;

  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, display_name, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    email,
    username,
    passwordHash,
    parsed.data.display_name.trim(),
    isFirstUser ? "admin" : "user"
  );

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRecord;
  await createPersistentSession(db, user);
  safeActivityLog(db, { userId: id, action: "signup", targetType: "user", targetId: id });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    login: (formData.get("login") || formData.get("email")) as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const login = normalizeLogin(parsed.data.login);
  const usernameLogin = normalizeUsername(parsed.data.login);
  const db = getDb();

  let user = db
    .prepare("SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ? LIMIT 1")
    .get(login, usernameLogin) as UserRecord | undefined;

  if (!user) {
    const backup = await getAccountBackupFromCookie();
    const backupMatches =
      backup && (backup.email === login || backup.username === usernameLogin);

    if (backupMatches) {
      const backupPasswordOk = await verifyPassword(parsed.data.password, backup.passwordHash);
      if (backupPasswordOk) {
        user = restoreUserFromBackup(db, backup);
      }
    }
  }

  if (!user) {
    return { ok: false, error: "Email/username ou senha incorretos" };
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Email/username ou senha incorretos" };
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  await createPersistentSession(db, user);
  safeActivityLog(db, { userId: user.id, action: "login", targetType: "user", targetId: user.id });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  const db = getDb();

  if (user) {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        try {
          db.prepare("DELETE FROM sessions WHERE id = ?").run(payload.sessionId);
        } catch {
          // sessão pode ter sido perdida em cold start
        }
      }
    }
    safeActivityLog(db, { userId: user.id, action: "logout" });
  }

  // Mantém o cookie de backup da conta para login funcionar depois de cold start da Vercel.
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/");
}
