import { getDb } from "./db";
import { randomUUID, randomInt } from "crypto";
import { sendEmail } from "./email";

const CODE_EXPIRY_MINUTES = 10;

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

function getExpiration(): string {
  const d = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  return d.toISOString();
}

/** Cria um codigo de verificacao e envia por email */
export async function sendVerificationCode(email: string): Promise<boolean> {
  const db = getDb();
  const code = generateCode();
  const id = randomUUID();
  const expiresAt = getExpiration();

  db.prepare(`
    INSERT INTO verification_codes (id, email, code, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, email, code, expiresAt);

  const sent = await sendEmail({
    to: email,
    subject: "Código de verificação — Tomoverso",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-top:0">Verifique seu email</h2>
        <p>Use o código abaixo para confirmar seu email no Tomoverso:</p>
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
    text: `Seu código de verificação do Tomoverso é: ${code}. Válido por ${CODE_EXPIRY_MINUTES} minutos.`,
  });

  return sent;
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
export async function resendVerificationCode(email: string): Promise<boolean> {
  return sendVerificationCode(email);
}
