import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/auth";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, turnstileToken } = body;

    const antiBot = await verifyTurnstileToken(
      turnstileToken,
      req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
    );
    if (!antiBot.ok) {
      return NextResponse.json({ error: antiBot.error }, { status: 403 });
    }

    // Validação básica
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "E-mail inválido" },
        { status: 400 }
      );
    }

    if (typeof subject !== "string" || subject.trim().length < 3) {
      return NextResponse.json(
        { error: "Assunto deve ter pelo menos 3 caracteres" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Mensagem deve ter pelo menos 10 caracteres" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Cria a tabela se não existir
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const id = generateId();
    db.prepare(
      `INSERT INTO contact_messages (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)`
    ).run(id, name.trim(), email.trim(), subject.trim(), message.trim());

    return NextResponse.json({ success: true, message: "Mensagem enviada com sucesso!" });
  } catch (error) {
    console.error("[contact] Error:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar mensagem" },
      { status: 500 }
    );
  }
}
