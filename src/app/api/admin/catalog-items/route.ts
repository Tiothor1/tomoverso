import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 403 });
  }

  const db = getDb();

  // Novels
  const novels = db.prepare(`
    SELECT n.id, n.slug, n.title, 'novel' as item_type, n.id as item_id,
           COALESCE(cc.is_original, 0) as is_original,
           cc.curation_label,
           u.display_name as author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND COALESCE(c.word_count, 0) > 30) as chapter_count
    FROM novels n
    LEFT JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
    LEFT JOIN users u ON u.id = n.author_id
    ORDER BY n.updated_at DESC
    LIMIT 200
  `).all();

  // Mangas
  const mangas = db.prepare(`
    SELECT m.id, m.slug, m.title, 'manga' as item_type, m.id as item_id,
           COALESCE(cc.is_original, 0) as is_original,
           cc.curation_label,
           NULL as author_name,
           (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id) as chapter_count
    FROM mangas m
    LEFT JOIN catalog_controls cc ON cc.item_type='manga' AND cc.item_id = m.id
    ORDER BY m.updated_at DESC
    LIMIT 200
  `).all();

  // Merge and sort by is_original desc, then by title
  const items = [...(novels as any[]), ...(mangas as any[])].sort((a, b) => {
    if (a.is_original !== b.is_original) return b.is_original - a.is_original;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  return NextResponse.json({ ok: true, items });
}
