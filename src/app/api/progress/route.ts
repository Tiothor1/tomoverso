import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/auth";

// POST /api/progress — atualiza progresso de leitura
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chapterId, novelId, progress } = await req.json();
  if (!chapterId || !novelId || typeof progress !== "number") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO reading_progress (user_id, chapter_id, novel_id, progress, last_read_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, chapter_id) DO UPDATE SET
       progress = excluded.progress,
       last_read_at = excluded.last_read_at`
  ).run(user.id, chapterId, novelId, Math.max(0, Math.min(100, Math.floor(progress))));

  return NextResponse.json({ ok: true });
}
