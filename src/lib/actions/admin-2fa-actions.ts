"use server";

import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendAdminOTP, verifyAdminOTP, getOTPCooldownMinutes } from "@/lib/admin-otp";

const ADMIN_EMAIL = "tomoversoeditora@gmail.com";

/** Envia código OTP para o email do admin */
export async function sendAdminOTPCodeAction(): Promise<{
  ok: boolean;
  error?: string;
  cooldownMinutes?: number;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Não autorizado" };

  // Verifica cooldown antes de tentar enviar
  const cooldown = getOTPCooldownMinutes(ADMIN_EMAIL);
  if (cooldown > 0) {
    return { ok: false, error: `Aguarde ${cooldown} minuto(s) antes de solicitar outro código.`, cooldownMinutes: cooldown };
  }

  const result = await sendAdminOTP(ADMIN_EMAIL);
  return result;
}

/** Verifica código OTP e libera acesso ao admin */
export async function verifyAdminOTPCodeAction(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Não autorizado" };

  if (!code || code.length !== 6) {
    return { ok: false, error: "Código deve ter 6 dígitos" };
  }

  const valid = verifyAdminOTP(ADMIN_EMAIL, code);
  if (!valid) {
    return { ok: false, error: "Código inválido ou expirado. Solicite um novo." };
  }

  // Libera acesso — cookie válido por 7 dias
  const cookieStore = await cookies();
  cookieStore.set("admin_2fa_validated", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 7 * 24 * 60 * 60,
  });

  return { ok: true };
}

/** Verifica se o admin já validou 2FA nessa sessão */
export async function getAdminOTPStatusAction(): Promise<{
  validated: boolean;
}> {
  const cookieStore = await cookies();
  const validated = cookieStore.get("admin_2fa_validated")?.value === "1";
  return { validated };
}

/** Limpa validação (logout do admin) */
export async function clearAdminOTPValidationAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("admin_2fa_validated", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}
