import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie, normalizeLogin } from "@/lib/auth";

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

    // Só retorna userId — o login real (cookie) é feito depois do 2FA + CPF
    return NextResponse.json({ ok: true, userId: user.id, username: user.username });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
