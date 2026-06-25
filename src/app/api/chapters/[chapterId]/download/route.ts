import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Login necessário", { status: 401 });

  const db = getDb();

  // Verifica assinatura ativa
  const sub = db.prepare(`
    SELECT us.status FROM user_subscriptions us
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing') LIMIT 1
  `).get(user.id) as { status: string } | undefined;

  if (!sub) {
    return new NextResponse("Assine o Tomoverso Pro para baixar capítulos", { status: 403 });
  }

  // Busca capítulo
  const chapter = db.prepare(`
    SELECT c.*, n.title AS novel_title, n.slug AS novel_slug
    FROM chapters c JOIN novels n ON n.id = c.novel_id
    WHERE c.id = ?
  `).get(chapterId) as { title: string; content: string; chapter_number: number; novel_title: string; novel_slug: string } | undefined;

  if (!chapter) return new NextResponse("Capítulo não encontrado", { status: 404 });

  // Remove junk do conteúdo
  const clean = chapter.content
    .replace(/^\[CAPÍTULO MUITO LONGO.*?\]\s*/gmi, "")
    .replace(/^Nota do autor:?.*$/gmi, "")
    .replace(/^Author'?s?\s*Note:?.*$/gmi, "")
    .replace(/\n{4,}/g, "\n\n")
    .trim();

  const text = `${chapter.novel_title}\n\nCapítulo ${chapter.chapter_number}: ${chapter.title}\n\n${clean}\n\n---\nBaixado de Tomoverso (tomoverso.vercel.app)`;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${chapter.novel_slug}-cap-${chapter.chapter_number}.txt"`,
    },
  });
}
