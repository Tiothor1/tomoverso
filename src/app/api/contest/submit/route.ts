import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuário não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const contestId = body?.contest_id as string | undefined;
    const workType = body?.work_type as string | undefined;
    const workId = body?.work_id as string | undefined;
    const notes = (body?.notes as string | undefined)?.trim() || "";

    if (!contestId || !workType || !workId) {
      return NextResponse.json({ ok: false, error: "Campos obrigatórios: contest_id, work_type, work_id" }, { status: 400 });
    }

    if (!["novel", "manga"].includes(workType)) {
      return NextResponse.json({ ok: false, error: "Tipo de obra inválido" }, { status: 400 });
    }

    const db = getDb();

    // Check contest exists and is active
    const contest = db.prepare("SELECT id, is_active, end_date FROM contests WHERE id = ?").get(contestId) as any;
    if (!contest) {
      return NextResponse.json({ ok: false, error: "Concurso não encontrado" }, { status: 404 });
    }
    if (!contest.is_active) {
      return NextResponse.json({ ok: false, error: "Concurso não está mais ativo" }, { status: 400 });
    }
    if (new Date(contest.end_date) < new Date()) {
      return NextResponse.json({ ok: false, error: "Concurso já encerrou" }, { status: 400 });
    }

    // Check work exists and belongs to user
    if (workType === "novel") {
      const novel = db.prepare("SELECT id, author_id FROM novels WHERE id = ?").get(workId) as any;
      if (!novel) return NextResponse.json({ ok: false, error: "Obra não encontrada" }, { status: 404 });
      if (novel.author_id !== user.id && user.role !== "admin") {
        return NextResponse.json({ ok: false, error: "Você não é o autor dessa obra" }, { status: 403 });
      }
    } else {
      const manga = db.prepare("SELECT id FROM mangas WHERE id = ?").get(workId) as any;
      if (!manga) return NextResponse.json({ ok: false, error: "Obra não encontrada" }, { status: 404 });
    }

    // Check not already submitted
    const existing = db.prepare(
      "SELECT id FROM contest_submissions WHERE contest_id = ? AND user_id = ? AND work_type = ? AND work_id = ?"
    ).get(contestId, user.id, workType, workId) as any;
    if (existing) {
      return NextResponse.json({ ok: false, error: "Você já inscreveu esta obra neste concurso" }, { status: 409 });
    }

    const { randomUUID } = await import("crypto");
    const submissionId = randomUUID();
    db.prepare(
      "INSERT INTO contest_submissions (id, contest_id, user_id, work_type, work_id, notes) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(submissionId, contestId, user.id, workType, workId, notes);

    return NextResponse.json({
      ok: true,
      submission_id: submissionId,
      message: "Inscrição realizada com sucesso!",
    });
  } catch (error: any) {
    console.error("[contest/submit]", error);
    return NextResponse.json({ ok: false, error: error?.message || "Erro interno" }, { status: 500 });
  }
}
