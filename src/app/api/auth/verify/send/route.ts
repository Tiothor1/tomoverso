import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendVerificationCode } from "@/lib/verify-email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido" });
  }

  // Verifica se o email existe e não está verificado
  const db = getDb();
  const user = db.prepare("SELECT email_verified FROM users WHERE email = ?").get(email) as { email_verified: number } | undefined;
  if (!user) {
    return NextResponse.json({ ok: false, error: "Email não encontrado" });
  }
  if (user.email_verified) {
    return NextResponse.json({ ok: false, error: "Email já verificado" });
  }

  const result = await sendVerificationCode(email);
  return NextResponse.json(result);
}
