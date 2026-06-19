import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterId } = await params;
  const { content } = await req.json();
  if (!content || content.trim().length < 3) {
    return NextResponse.json({ error: "Comentário muito curto" }, { status: 400 });
  }

  const db = getDb();
  const chapter = db.prepare("SELECT novel_id FROM chapters WHERE id = ?").get(chapterId) as { novel_id: string } | undefined;
  if (!chapter) {
    return NextResponse.json({ error: "Capítulo não existe" }, { status: 404 });
  }

  const id = generateId();
  db.prepare(
    "INSERT INTO comments (id, novel_id, chapter_id, user_id, content) VALUES (?, ?, ?, ?, ?)"
  ).run(id, chapter.novel_id, chapterId, user.id, content.trim().slice(0, 1000));

  return NextResponse.json({ id, ok: true });
}
