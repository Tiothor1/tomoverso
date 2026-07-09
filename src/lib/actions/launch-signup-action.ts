"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  generateId,
  hashPassword,
  createSessionToken,
  setSessionCookie,
  getCurrentUser,
  normalizeEmail,
  normalizeUsername,
} from "@/lib/auth";
import { randomUUID } from "crypto";
import type { UserRecord } from "@/lib/auth";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const schema = z.object({
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Mínimo 3 caracteres").max(20).regex(/^@?[a-zA-Z0-9_]+$/, "Só letras, números e _"),
  display_name: z.string().min(2, "Mínimo 2 caracteres").max(40),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function launchSignupAction(formData: FormData): Promise<{ ok: boolean; error?: string; redirect?: string }> {
  const raw = {
    email: formData.get("email") as string,
    username: formData.get("username") as string,
    display_name: formData.get("display_name") as string,
    password: formData.get("password") as string,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Dados inválidos" };
  }

  const email = normalizeEmail(parsed.data.email);
  const username = normalizeUsername(parsed.data.username);
  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ? OR lower(username) = ?").get(email, username);
  if (existing) {
    return { ok: false, error: "Email ou username já cadastrado" };
  }

  // Create in Supabase auth
  const supabaseAdmin = await getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { ok: false, error: "Erro no servidor. Tente novamente." };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: parsed.data.display_name.trim(),
    },
  });

  if (authError || !authData?.user) {
    return { ok: false, error: "Não consegui criar a conta. Tente de novo." };
  }

  const id = authData.user.id;
  const passwordHash = await hashPassword(parsed.data.password);
  const isFirstUser = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c === 0;

  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, display_name, role, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(id, email, username, passwordHash, parsed.data.display_name.trim(), isFirstUser ? "admin" : "user");

  // Create session
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const storedToken = sessionId; // use session id as the token for simplicity

  db.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, id, storedToken, expiresAt, "", "");

  await setSessionCookie(storedToken);
  revalidatePath("/", "layout");

  return { ok: true, redirect: "/" };
}
