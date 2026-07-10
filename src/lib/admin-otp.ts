import { getDb } from "@/lib/db";
import { randomUUID, randomInt } from "crypto";
import { sendEmail } from "@/lib/email";

const CODE_EXPIRY_MINUTES = 5;
const RATE_WINDOW_MINUTES = 10;
const RATE_LIMIT = 5;
const RATE_COOLDOWN_MINUTES = 30;
const RATE_HARD_LIMIT = 10;
const RATE_HARD_WINDOW_MINUTES = 60;
const RATE_HARD_COOLDOWN_MINUTES = 1440; // 24h

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

/** Garante que a tabela de OTP existe */
export function ensureAdminOTPTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_otp (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_admin_otp_lookup ON admin_otp(email, code, expires_at);
    CREATE INDEX IF NOT EXISTS idx_admin_otp_created ON admin_otp(email, created_at);
  `);
}

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  waitMinutes?: number;
}

/** Verifica rate limit */
export function checkOTPRateLimit(email: string): RateLimitResult {
  const db = getDb();
  const now = new Date().toISOString();

  // Hard limit: 10 códigos na última hora → bloqueia 24h
  const hardWindow = new Date(Date.now() - RATE_HARD_WINDOW_MINUTES * 60 * 1000).toISOString();
  const hardCount = db.prepare(
    "SELECT COUNT(*) as c FROM admin_otp WHERE email = ? AND created_at > ?"
  ).get(email, hardWindow) as { c: number };

  if (hardCount.c >= RATE_HARD_LIMIT) {
    return {
      allowed: false,
      reason: `Limite máximo atingido. Tente novamente em 24 horas.`,
      waitMinutes: RATE_HARD_COOLDOWN_MINUTES,
    };
  }

  // Soft limit: 5 códigos em 10 minutos → bloqueia 30 min
  const softWindow = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const softCount = db.prepare(
    "SELECT COUNT(*) as c FROM admin_otp WHERE email = ? AND created_at > ?"
  ).get(email, softWindow) as { c: number };

  if (softCount.c >= RATE_LIMIT) {
    return {
      allowed: false,
      reason: `Muitos códigos solicitados. Tente novamente em ${RATE_COOLDOWN_MINUTES} minutos.`,
      waitMinutes: RATE_COOLDOWN_MINUTES,
    };
  }

  return { allowed: true };
}

/** Gera, salva e envia código OTP para o email do admin */
export async function sendAdminOTP(email: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  ensureAdminOTPTable();

  // Rate limit check
  const rateCheck = checkOTPRateLimit(email);
  if (!rateCheck.allowed) {
    return { ok: false, error: rateCheck.reason };
  }

  const db = getDb();
  const code = generateCode();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Salva no banco
  db.prepare(`
    INSERT INTO admin_otp (id, email, code, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, email, code, expiresAt);

  // Envia email
  const sent = await sendEmail({
    to: email,
    subject: "🔐 Código de acesso — Admin Tomo Verso Editora",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fafafa">
        <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 24px;text-align:center">
            <h1 style="margin:0;color:#e8d5b7;font-size:20px;font-weight:500">📚 Tomo Verso Editora · Admin</h1>
          </div>
          <div style="padding:32px 24px">
            <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a2e">Código de acesso ao admin</h2>
            <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.5">
              Alguém está tentando acessar o painel administrativo. Se foi você, use o código abaixo:
            </p>
            <div style="background:linear-gradient(135deg,#f5f0e8,#efe8dc);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;border:1px solid #e0d5c5">
              <span style="font-family:monospace;font-size:40px;letter-spacing:10px;font-weight:700;color:#1a1a2e">${code}</span>
            </div>
            <div style="background:#fff0f0;border-radius:8px;padding:16px;margin:0 0 24px;border:1px solid #ffdcdc">
              <p style="margin:0 0 4px;color:#c0392b;font-size:13px">⏱ <strong>${CODE_EXPIRY_MINUTES} minutos</strong> de validade · uso único</p>
              <p style="margin:0;color:#c0392b;font-size:13px">⚠️ Se <strong>NÃO</strong> foi você, troque sua senha imediatamente</p>
            </div>
          </div>
          <div style="border-top:1px solid #eee;padding:16px 24px;text-align:center">
            <p style="margin:0;color:#ccc;font-size:11px">
              Tomo Verso Editora · Sua plataforma de histórias
            </p>
          </div>
        </div>
      </div>
    `,
    text: `🔐 Seu código de acesso ao admin Tomo Verso Editora é: ${code}. Válido por ${CODE_EXPIRY_MINUTES} minutos. Se não foi você, troque sua senha imediatamente.`,
  });

  if (!sent) {
    return { ok: false, error: "Não foi possível enviar o email. Verifique se o serviço de email está configurado." };
  }

  return { ok: true };
}

/** Verifica código OTP */
export function verifyAdminOTP(email: string, code: string): boolean {
  ensureAdminOTPTable();
  const db = getDb();
  const now = new Date().toISOString();

  const row = db.prepare(`
    SELECT id FROM admin_otp
    WHERE email = ? AND code = ?
      AND used_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(email, code, now) as { id: string } | undefined;

  if (!row) return false;

  db.prepare("UPDATE admin_otp SET used_at = ? WHERE id = ?").run(now, row.id);
  return true;
}

/** Retorna quantos minutos falta pro cooldown acabar (0 = pode solicitar) */
export function getOTPCooldownMinutes(email: string): number {
  const db = getDb();
  const now = Date.now();

  // Hard check
  const hardWindow = new Date(now - RATE_HARD_WINDOW_MINUTES * 60 * 1000).toISOString();
  const hardCount = db.prepare(
    "SELECT COUNT(*) as c FROM admin_otp WHERE email = ? AND created_at > ?"
  ).get(email, hardWindow) as { c: number };

  if (hardCount.c >= RATE_HARD_LIMIT) {
    const oldestInWindow = db.prepare(
      "SELECT created_at FROM admin_otp WHERE email = ? AND created_at > ? ORDER BY created_at ASC LIMIT 1"
    ).get(email, hardWindow) as { created_at: string } | undefined;

    if (oldestInWindow) {
      const unlockAt = new Date(oldestInWindow.created_at).getTime() + RATE_HARD_COOLDOWN_MINUTES * 60 * 1000;
      return Math.max(0, Math.ceil((unlockAt - now) / 60000));
    }
    return RATE_HARD_COOLDOWN_MINUTES;
  }

  // Soft check
  const softWindow = new Date(now - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const softCount = db.prepare(
    "SELECT COUNT(*) as c FROM admin_otp WHERE email = ? AND created_at > ?"
  ).get(email, softWindow) as { c: number };

  if (softCount.c >= RATE_LIMIT) {
    const oldestInWindow = db.prepare(
      "SELECT created_at FROM admin_otp WHERE email = ? AND created_at > ? ORDER BY created_at ASC LIMIT 1"
    ).get(email, softWindow) as { created_at: string } | undefined;

    if (oldestInWindow) {
      const unlockAt = new Date(oldestInWindow.created_at).getTime() + RATE_COOLDOWN_MINUTES * 60 * 1000;
      return Math.max(0, Math.ceil((unlockAt - now) / 60000));
    }
    return RATE_COOLDOWN_MINUTES;
  }

  return 0;
}
