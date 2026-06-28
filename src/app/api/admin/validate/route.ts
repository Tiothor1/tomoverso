import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { validateAdminLogin, ensureAdminAuthTable } from "@/lib/admin/admin-auth";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  ensureAdminAuthTable();

  try {
    const { userId, cpf, twofaToken } = await req.json();
    if (!userId || !cpf || !twofaToken) {
      return NextResponse.json({ ok: false, error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const result = validateAdminLogin({ userId, cpf, twofaToken });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
