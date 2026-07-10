"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, normalizeLogin, setSessionCookie } from "@/lib/auth";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

const loginSchema = z.object({
  login: z.string().min(1, "Digite email ou username"),
  password: z.string().min(1, "Digite sua senha"),
});

export async function launchLoginAction(formData: FormData): Promise<{ ok: boolean; error?: string; redirect?: string }> {
  const raw = {
    login: (formData.get("login") || formData.get("email")) as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Dados inválidos" };
  }

  const login = normalizeLogin(parsed.data.login);
  const db = getDb();

  const user = db
    .prepare("SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ?")
    .get(login, login) as any;

  if (!user) {
    return { ok: false, error: "Usuário não encontrado" };
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Senha incorreta" };
  }

  // Create session
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, user.id, sessionId, expiresAt, "", "");

  await setSessionCookie(sessionId);
  revalidatePath("/", "layout");

  // Redirect to admin dashboard
  const adminPath = process.env.ADMIN_SECRET_PATH || "";
  return { ok: true, redirect: adminPath ? `/${adminPath}` : "/" };
}
