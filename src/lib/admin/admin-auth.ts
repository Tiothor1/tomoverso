import crypto from "crypto";
import speakeasy from "speakeasy";
import { getDb } from "../db";

// ── DB migration ────────────────────────────────────────────

export function ensureAdminAuthTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_auth (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      twofa_secret TEXT,
      admin_cpf TEXT,
      login_count INTEGER DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── 2FA ─────────────────────────────────────────────────────

export function generate2FASecret(userId: string) {
  const secret = speakeasy.generateSecret({
    name: `Tomoverso Admin (${userId})`,
    issuer: "Tomoverso Admin",
  });
  return { base32: secret.base32, otpauth_url: secret.otpauth_url };
}

export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export function is2FAEnabled(userId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT twofa_secret FROM admin_auth WHERE user_id = ?").get(userId) as any;
  return !!row?.twofa_secret;
}

export function enable2FA(userId: string, secret: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO admin_auth (id, user_id, twofa_secret, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET twofa_secret = excluded.twofa_secret, updated_at = datetime('now')
  `).run(crypto.randomUUID(), userId, secret);
}

// ── Admin CPF ───────────────────────────────────────────────

export function getAdminCPF(userId: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT admin_cpf FROM admin_auth WHERE user_id = ?").get(userId) as any;
  return row?.admin_cpf || null;
}

export function setAdminCPF(userId: string, cpf: string) {
  const db = getDb();
  const cleanCpf = cpf.replace(/\D/g, "");
  db.prepare(`
    INSERT INTO admin_auth (id, user_id, admin_cpf, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET admin_cpf = excluded.admin_cpf, updated_at = datetime('now')
  `).run(crypto.randomUUID(), userId, cleanCpf);
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "").split("").map(Number);
  if (digits.length !== 11 || digits.every(d => d === digits[0])) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== digits[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === digits[10];
}

// ── Secret Path ─────────────────────────────────────────────

const FALLBACK_PATH = "adm1n-c0ntr0l-40d9bd082a1266429a6f341f-c0ntr0l-2026";

export function getAdminSecretPath(): string {
  return process.env.ADMIN_SECRET_PATH || FALLBACK_PATH;
}

export function isAdminPath(pathname: string): boolean {
  const secret = getAdminSecretPath();
  return pathname === `/${secret}` || pathname.startsWith(`/${secret}/`);
}

// ── Full admin login validation ─────────────────────────────

export function validateAdminLogin(params: {
  cpf: string;
  twofaToken: string;
  userId: string;
}): { ok: boolean; error?: string } {
  const db = getDb();
  const auth = db.prepare("SELECT * FROM admin_auth WHERE user_id = ?").get(params.userId) as any;

  if (!auth) return { ok: false, error: "Acesso admin não configurado." };
  if (!auth.twofa_secret) return { ok: false, error: "2FA não configurado em sua conta." };
  if (!auth.admin_cpf) return { ok: false, error: "CPF não registrado em sua conta." };

  if (!validateCPF(params.cpf)) return { ok: false, error: "CPF inválido." };
  if (params.cpf.replace(/\D/g, "") !== auth.admin_cpf) return { ok: false, error: "CPF não confere com o registrado." };

  if (!verify2FAToken(auth.twofa_secret, params.twofaToken)) {
    return { ok: false, error: "Código 2FA inválido ou expirado." };
  }

  db.prepare("UPDATE admin_auth SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE user_id = ?").run(params.userId);

  return { ok: true };
}
