import { getDb } from "@/lib/db";
import { randomUUID, randomInt } from "crypto";
import { sendEmail } from "@/lib/email";

const CODE_EXPIRY_MINUTES = 10;
const RATE_WINDOW_MINUTES = 10;
const RATE_LIMIT = 5;
const RATE_COOLDOWN_MINUTES = 30;
const RATE_HARD_LIMIT = 10;
const RATE_HARD_WINDOW_MINUTES = 60;
const RATE_HARD_COOLDOWN_MINUTES = 1440; // 24h

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

function getExpiration(): string {
  const d = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  return d.toISOString();
}

export interface OTPResult {
  ok: boolean;
  error?: string;
  cooldownMinutes?: number;
}

/** Verifica rate limit na tabela verification_codes para um email */
function checkRateLimit(email: string): OTPResult {
  const db = getDb();
  const now = Date.now();

  // Hard limit: 10 códigos na última hora → bloqueia 24h
  const hardWindow = new Date(now - RATE_HARD_WINDOW_MINUTES * 60 * 1000).toISOString();
  const hardCount = db.prepare(
    "SELECT COUNT(*) as c FROM verification_codes WHERE email = ? AND purpose = 'email_verification' AND created_at > ?"
  ).get(email, hardWindow) as { c: number };

  if (hardCount.c >= RATE_HARD_LIMIT) {
    // Calcula quando vai liberar
    const oldest = db.prepare(
      "SELECT created_at FROM verification_codes WHERE email = ? AND purpose = 'email_verification' AND created_at > ? ORDER BY created_at ASC LIMIT 1"
    ).get(email, hardWindow) as { created_at: string } | undefined;

    if (oldest) {
      const unlockAt = new Date(oldest.created_at).getTime() + RATE_HARD_COOLDOWN_MINUTES * 60 * 1000;
      return {
        ok: false,
        error: "Limite máximo de códigos atingido. Tente novamente em 24 horas.",
        cooldownMinutes: Math.max(0, Math.ceil((unlockAt - now) / 60000)),
      };
    }
    return { ok: false, error: "Limite máximo atingido. Tente novamente em 24 horas.", cooldownMinutes: RATE_HARD_COOLDOWN_MINUTES };
  }

  // Soft limit: 5 códigos em 10 minutos → bloqueia 30 min
  const softWindow = new Date(now - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const softCount = db.prepare(
    "SELECT COUNT(*) as c FROM verification_codes WHERE email = ? AND purpose = 'email_verification' AND created_at > ?"
  ).get(email, softWindow) as { c: number };

  if (softCount.c >= RATE_LIMIT) {
    const oldest = db.prepare(
      "SELECT created_at FROM verification_codes WHERE email = ? AND purpose = 'email_verification' AND created_at > ? ORDER BY created_at ASC LIMIT 1"
    ).get(email, softWindow) as { created_at: string } | undefined;

    if (oldest) {
      const unlockAt = new Date(oldest.created_at).getTime() + RATE_COOLDOWN_MINUTES * 60 * 1000;
      return {
        ok: false,
        error: `Muitos códigos solicitados. Tente novamente em ${RATE_COOLDOWN_MINUTES} minutos.`,
        cooldownMinutes: Math.max(0, Math.ceil((unlockAt - now) / 60000)),
      };
    }
    return { ok: false, error: "Muitos códigos solicitados. Aguarde alguns minutos.", cooldownMinutes: RATE_COOLDOWN_MINUTES };
  }

  return { ok: true };
}

/** Cria um codigo de verificacao com rate limit e envia por email */
export async function sendVerificationCode(email: string): Promise<OTPResult> {
  // Verifica rate limit primeiro
  const rateCheck = checkRateLimit(email);
  if (!rateCheck.ok) {
    return rateCheck;
  }

  const db = getDb();
  const code = generateCode();
  const id = randomUUID();
  const expiresAt = getExpiration();

  db.prepare(`
    INSERT INTO verification_codes (id, email, code, expires_at, purpose)
    VALUES (?, ?, ?, ?, 'email_verification')
  `).run(id, email, code, expiresAt);

  const sent = await sendEmail({
    to: email,
    subject: "Código de verificação — Tomo Verso Editora",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-top:0">Verifique seu email</h2>
        <p>Use o código abaixo para confirmar seu email no Tomo Verso Editora:</p>
        <div style="background:#f5f0e8;border-radius:12px;padding:24px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;margin:16px 0">
          ${code}
        </div>
        <p style="color:#666;font-size:14px">
          Código válido por ${CODE_EXPIRY_MINUTES} minutos. Use uma única vez.
        </p>
        <p style="color:#999;font-size:12px">
          Se você não pediu este código, ignore este email.
        </p>
      </div>
    `,
    text: `Seu código de verificação do Tomo Verso Editora é: ${code}. Válido por ${CODE_EXPIRY_MINUTES} minutos.`,
  });

  if (!sent) return { ok: false, error: "Falha ao enviar email. Tente novamente." };
  return { ok: true };
}

/** Verifica se o codigo é valido e marca como usado. Retorna true se ok */
export function checkVerificationCode(email: string, code: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();

  // Busca codigo valido nao expirado e nao usado
  const row = db.prepare(`
    SELECT id FROM verification_codes
    WHERE email = ? AND code = ? AND purpose = 'email_verification'
      AND used_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(email, code, now) as { id: string } | undefined;

  if (!row) return false;

  // Marca como usado
  db.prepare(`UPDATE verification_codes SET used_at = ? WHERE id = ?`).run(now, row.id);

  // Marca email como verificado no usuario
  db.prepare(`UPDATE users SET email_verified = 1 WHERE email = ?`).run(email);

  return true;
}

/** Reenvia codigo (invalida os anteriores) */
export async function resendVerificationCode(email: string): Promise<OTPResult> {
  return sendVerificationCode(email);
}
