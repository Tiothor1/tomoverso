"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  generateId,
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
} from "@/lib/auth";
import { randomUUID } from "crypto";
import type { UserRecord } from "@/lib/auth";

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20")
    .regex(/^[a-zA-Z0-9_]+$/, "Só letras, números e _"),
  display_name: z.string().min(2, "Mínimo 2 caracteres").max(40),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
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

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .get(parsed.data.email, parsed.data.username);
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
    parsed.data.email,
    parsed.data.username,
    passwordHash,
    parsed.data.display_name,
    isFirstUser ? "admin" : "user"
  );

  // Cria sessão
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sessionId, id, sessionId, expiresAt);

  const token = await createSessionToken({ userId: id, sessionId });
  await setSessionCookie(token);

  // Log
  db.prepare(
    "INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)"
  ).run(generateId(), id, "signup", "user", id);

  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Email ou senha inválidos" };
  }

  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? OR username = ?")
    .get(parsed.data.email, parsed.data.email) as UserRecord | undefined;

  if (!user) {
    return { ok: false, error: "Credenciais inválidas" };
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Credenciais inválidas" };
  }

  // Atualiza last_login
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(
    user.id
  );

  // Cria sessão
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ipAddress = ""; // vem de headers se quiser
  const userAgent = "";

  db.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, user.id, sessionId, expiresAt, ipAddress, userAgent);

  const token = await createSessionToken({ userId: user.id, sessionId });
  await setSessionCookie(token);

  // Log
  db.prepare(
    "INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)"
  ).run(generateId(), user.id, "login", "user", user.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  const db = getDb();

  if (user) {
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const token = cookieStore.get("tomoverso-session")?.value;
    if (token) {
      const payload = await import("@/lib/auth").then((m) => m.verifySessionToken(token));
      if (payload) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(payload.sessionId);
      }
    }
    db.prepare(
      "INSERT INTO activity_log (id, user_id, action) VALUES (?, ?, ?)"
    ).run(generateId(), user.id, "logout");
  }

  await clearSessionCookie();
  redirect("/");
}
