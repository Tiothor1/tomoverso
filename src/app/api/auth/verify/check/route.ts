import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode } from "@/lib/verify-email";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Email e código são obrigatórios" });
  }

  const valid = checkVerificationCode(email, code);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Código inválido ou expirado" });
  }

  return NextResponse.json({ ok: true });
}
