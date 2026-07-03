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
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase/server";
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
  redirect?: string;
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

async function upsertSupabaseProfile(user: UserRecord) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio: user.bio || "",
    role: user.role,
    email_verified: !!user.email_verified,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
}

async function createSupabaseAuthUser(input: { email: string; password: string; username: string; displayName: string }) {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { username: input.username, display_name: input.displayName },
    });
    if (!error && data.user?.id) return data.user.id;
    // If user already exists in Supabase, keep local signup error handling as source of truth.
  }

  const supabaseAuth = getSupabaseAuthClient();
  if (!supabaseAuth) return null;
  const { data, error } = await supabaseAuth.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { username: input.username, display_name: input.displayName } },
  });
  if (error || !data.user?.id) return null;
  return data.user.id;
}

async function signInWithSupabaseAuth(input: { login: string; password: string }) {
  const supabaseAuth = getSupabaseAuthClient();
  if (!supabaseAuth || !input.login.includes("@")) return null;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: input.login, password: input.password });
  if (error || !data.user?.id) return null;
  return data.user;
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

  const supabaseUserId = await createSupabaseAuthUser({
    email,
    password: parsed.data.password,
    username,
    displayName: parsed.data.display_name.trim(),
  });
  const id = supabaseUserId || generateId();
  const passwordHash = await hashPassword(parsed.data.password);
  const isFirstUser = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c === 0;

  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, display_name, role, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    email,
    username,
    passwordHash,
    parsed.data.display_name.trim(),
    isFirstUser ? "admin" : "user"
  );

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRecord;
  await upsertSupabaseProfile(user);

  // Envia código de verificação por email
  const { sendVerificationCode } = await import("@/lib/verify-email");
  const sent = await sendVerificationCode(email).catch(() => false);

  // Se não conseguiu enviar, auto-verifica e vai pro dashboard
  if (!sent) {
    db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(id);
    await createPersistentSession(db, user);
    revalidatePath("/", "layout");
    return { ok: true, redirect: "/onboarding" };
  }

  // Código enviado — redireciona pra página de verificação
  await createPersistentSession(db, user);
  revalidatePath("/", "layout");
  return { ok: true, redirect: `/auth/verify?email=${encodeURIComponent(email)}` };
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

  const supabaseUser = await signInWithSupabaseAuth({ login, password: parsed.data.password });
  let user: UserRecord | undefined;
  if (supabaseUser?.id) {
    user = db
      .prepare("SELECT * FROM users WHERE id = ? OR lower(email) = ? LIMIT 1")
      .get(supabaseUser.id, normalizeEmail(supabaseUser.email || login)) as UserRecord | undefined;

    if (!user && supabaseUser.email) {
      const passwordHash = await hashPassword(parsed.data.password);
      const username = normalizeUsername(String(supabaseUser.user_metadata?.username || supabaseUser.email.split("@")[0] || "user"));
      const displayName = String(supabaseUser.user_metadata?.display_name || username);
      db.prepare(
        `INSERT INTO users (id, email, username, password_hash, display_name, role, email_verified)
         VALUES (?, ?, ?, ?, ?, 'user', 1)`
      ).run(supabaseUser.id, normalizeEmail(supabaseUser.email), username, passwordHash, displayName);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(supabaseUser.id) as UserRecord;
    }
  }

  if (!user) {
    user = db
      .prepare("SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ? LIMIT 1")
      .get(login, usernameLogin) as UserRecord | undefined;
  }

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

  const valid = supabaseUser?.id === user.id || await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Email/username ou senha incorretos" };
  }

  if (supabaseUser?.id && !user.email_verified) {
    db.prepare("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?").run(user.id);
    user = { ...user, email_verified: 1 };
  }

  // Verifica se email foi confirmado
  if (!user.email_verified) {
    return { ok: false, redirect: `/auth/verify?email=${encodeURIComponent(user.email)}`, error: "Confirme seu email antes de entrar" };
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  await upsertSupabaseProfile(user);
  await createPersistentSession(db, user);
  safeActivityLog(db, { userId: user.id, action: "login", targetType: "user", targetId: user.id });

  revalidatePath("/", "layout");
  return { ok: true, redirect: "/dashboard" };
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
