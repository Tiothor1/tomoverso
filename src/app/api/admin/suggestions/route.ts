import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { suggestionId, action, notes } = await req.json();
    if (!suggestionId || !["accept","reject"].includes(action)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const db = getDb();
    const status = action === "accept" ? "accepted" : "rejected";
    db.prepare(
      "UPDATE content_suggestions SET status = ?, admin_notes = ?, decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(status, notes || "", user.id, suggestionId);

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
