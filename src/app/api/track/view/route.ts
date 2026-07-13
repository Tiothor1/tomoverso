import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clean(str: unknown, max = 255): string {
  if (typeof str !== "string") return "";
  return str.slice(0, max).replace(/[\x00-\x1f]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const visitorId = clean(body.visitor_id, 64);
    if (!visitorId) return NextResponse.json({ ok: false });

    const pageType = clean(body.page_type, 32);
    const pageId = clean(body.page_id, 64);
    const pageUrl = clean(body.page_url, 512);
    const referrer = clean(body.referrer, 512);
    const timeOnPage = typeof body.time_on_page === "number" ? Math.min(body.time_on_page, 3600) : 0;

    // Check if this visitor viewed this page in the last 5 minutes (dedup)
    const recent = db.prepare(`
      SELECT id FROM page_views
      WHERE visitor_id = ? AND page_url = ? AND created_at > datetime('now', '-5 minutes')
      LIMIT 1
    `).get(visitorId, pageUrl) as { id: string } | undefined;

    if (recent) {
      // Update time_on_page instead of inserting duplicate
      if (timeOnPage > 0) {
        db.prepare(`UPDATE page_views SET time_on_page = max(time_on_page, ?) WHERE id = ?`).run(timeOnPage, recent.id);
      }
      return NextResponse.json({ ok: true, deduped: true });
    }

    // Insert new view
    db.prepare(`
      INSERT INTO page_views (id, visitor_id, page_type, page_id, page_url, referrer, user_agent, screen_width, screen_height, time_on_page)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      visitorId,
      pageType,
      pageId || null,
      pageUrl,
      referrer || null,
      clean(req.headers.get("user-agent"), 512) || null,
      typeof body.sw === "number" ? body.sw : null,
      typeof body.sh === "number" ? body.sh : null,
      timeOnPage,
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[tracking] error:", e?.message);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
