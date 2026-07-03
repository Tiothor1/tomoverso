import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, generateId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const db = getDb();

    const notifications = db
      .prepare(
        "SELECT id, type, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(user.id);

    const unreadCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0")
        .get(user.id) as { c: number }
    ).c;

    return NextResponse.json({ ok: true, notifications, unread_count: unreadCount });
  } catch (error) {
    console.error("[notifications] GET error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const db = getDb();

    if (body.all === true) {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0").run(user.id);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      const placeholders = body.ids.map(() => "?").join(",");
      db.prepare(
        `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`
      ).run(...body.ids, user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications] POST error:", error);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
