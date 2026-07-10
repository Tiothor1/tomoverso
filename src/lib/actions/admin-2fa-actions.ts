"use server";

import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { generate2FASecret, enable2FA, is2FAEnabled, verify2FAToken } from "@/lib/admin/admin-auth";

export async function setup2FAAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Não autorizado" };

  const secret = generate2FASecret(user.id);
  enable2FA(user.id, secret.base32);

  return {
    ok: true,
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

export async function disable2FAAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Não autorizado" };

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  db.prepare("UPDATE admin_auth SET twofa_secret = NULL, updated_at = datetime('now') WHERE user_id = ?").run(user.id);

  return { ok: true };
}

export async function verify2FAAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Não autorizado" };

  const token = formData.get("token") as string;
  if (!token) return { ok: false, error: "Código obrigatório" };

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const auth = db.prepare("SELECT twofa_secret FROM admin_auth WHERE user_id = ?").get(user.id) as any;

  if (!auth?.twofa_secret) return { ok: false, error: "2FA não configurado" };

  if (!verify2FAToken(auth.twofa_secret, token)) {
    return { ok: false, error: "Código inválido ou expirado" };
  }

  // Set validated cookie - expires in 7 days (same session)
  const cookieStore = await cookies();
  cookieStore.set("admin_2fa_validated", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return { ok: true };
}

export async function get2FAStatusAction(): Promise<{ enabled: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { enabled: false };
  return { enabled: is2FAEnabled(user.id) };
}
