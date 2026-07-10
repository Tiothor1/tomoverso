import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const { title, type, description, reason } = await req.json();
    if (!title || !title.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
    if (!["anime","novel","manga","manhwa","other"].includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO content_suggestions (id, user_id, title, type, description, reason) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, user?.id || null, title.trim(), type, description?.trim() || "", reason?.trim() || "");

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user = await getCurrentUser().catch(() => null);
    const db = getDb();
    const filter = url.searchParams.get("filter") || "all";
    const isAdmin = user?.role === "admin";

    let where = "";
    const params: unknown[] = [];
    if (!isAdmin || filter === "mine") {
      if (!user) return NextResponse.json({ suggestions: [], error: "Login needed" });
      where = "WHERE s.user_id = ?";
      params.push(user.id);
    } else if (filter === "pending") {
      where = "WHERE s.status = 'pending'";
    } else if (filter === "accepted") {
      where = "WHERE s.status = 'accepted'";
    } else if (filter === "rejected") {
      where = "WHERE s.status = 'rejected'";
    }

    const rows = db.prepare(`
      SELECT s.*, u.username, u.display_name
      FROM content_suggestions s
      LEFT JOIN users u ON u.id = s.user_id
      ${where}
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all(...params);

    return NextResponse.json({ suggestions: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
