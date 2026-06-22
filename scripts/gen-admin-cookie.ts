/**
 * Gera um cookie de sessão válido pra admin (fabio_tx).
 * Uso: debugging do painel admin via browser/curl.
 */

import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { SignJWT } from "jose";
import * as path from "path";

async function main() {
  const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"));

  const user = db.prepare(`SELECT * FROM users WHERE username = 'fabio_tx'`).get() as any;
  if (!user) {
    console.error("Admin fabio_tx não encontrado no DB");
    process.exit(1);
  }

  // Cria uma sessão no DB
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, user.id, sessionId, expiresAt);

  // Gera o JWT
  const secret = process.env.AUTH_SECRET || "tomoverso-dev-secret-change-in-production-min-32-chars";
  const JWT_SECRET = new TextEncoder().encode(secret);

  const token = await new SignJWT({ userId: user.id, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  console.log("# Cookie de admin gerado:");
  console.log("Cookie value:");
  console.log(token);
  console.log("\n# Header completo para usar com curl:");
  console.log(`Cookie: tomoverso-session=${token}`);

  db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
