import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, normalizeLogin } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Credenciais obrigatórias" }, { status: 400 });
    }

    const db = getDb();
    const normalized = normalizeLogin(login);
    const user = db.prepare(
      "SELECT * FROM users WHERE (email = ? OR username = ?) AND role = 'admin'"
    ).get(normalized, normalized) as any;

    if (!user) {
      return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 });
    }

    // Cria sessão no banco
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(sessionId, user.id, sessionId, expiresAt, req.headers.get("x-forwarded-for") || "", req.headers.get("user-agent") || "");

    // Cria token JWT
    const token = await createSessionToken({ userId: user.id, sessionId });

    // Retorna userId e define cookie de sessão no response
    const response = NextResponse.json({ ok: true, userId: user.id, username: user.username });
    response.cookies.set("tomoverso-session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
