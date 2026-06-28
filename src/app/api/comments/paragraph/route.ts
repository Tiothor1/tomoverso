import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { novelId, chapterId, paragraphNumber, content } = await req.json();
  if (!novelId || !chapterId || paragraphNumber == null || !content?.trim()) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const db = getDb();

  // Verifica se o capítulo existe
  const chapter = db.prepare("SELECT 1 FROM chapters WHERE id = ?").get(chapterId) as any;
  if (!chapter) {
    return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO comments (id, novel_id, chapter_id, user_id, content, paragraph_number) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, novelId, chapterId, user.id, content.trim().slice(0, 500), paragraphNumber);

  const comment = db.prepare(`
    SELECT c.id, c.content, c.created_at, c.paragraph_number,
           u.display_name, u.username, u.avatar_url,
           sp.badge_label AS comment_badge,
           CASE WHEN us.status IN ('active', 'trialing') THEN 1 ELSE 0 END AS is_subscriber
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status IN ('active', 'trialing')
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE c.id = ?
  `).get(id) as any;

  revalidatePath(`/novels/${chapterId}`);

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    display_name: comment.display_name,
    username: comment.username,
    avatar_url: comment.avatar_url,
    comment_badge: comment.comment_badge,
    is_subscriber: comment.is_subscriber,
  });
}
