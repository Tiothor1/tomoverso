import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { item_type, item_id, is_original, curation_label } = body;

  if (!item_type || !item_id) {
    return NextResponse.json({ ok: false, error: "item_type e item_id são obrigatórios" }, { status: 400 });
  }

  if (!["novel", "manga"].includes(item_type)) {
    return NextResponse.json({ ok: false, error: "item_type inválido" }, { status: 400 });
  }

  const db = getDb();
  const id = `${item_type}-${item_id}`;

  // Upsert
  const existing = db.prepare("SELECT id FROM catalog_controls WHERE item_type = ? AND item_id = ?").get(item_type, item_id) as any;

  if (existing) {
    const updates: string[] = [];
    const params: any[] = [];

    if (is_original !== undefined) {
      updates.push("is_original = ?");
      params.push(is_original ? 1 : 0);
    }
    if (curation_label !== undefined) {
      updates.push("curation_label = ?");
      params.push(curation_label || null);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(item_type, item_id);
      db.prepare(`UPDATE catalog_controls SET ${updates.join(", ")} WHERE item_type = ? AND item_id = ?`).run(...params);
    }
  } else {
    db.prepare(`
      INSERT INTO catalog_controls (id, item_type, item_id, is_original, curation_label, is_hidden, is_featured, show_on_home, sort_order)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0)
    `).run(id, item_type, item_id, is_original ? 1 : 0, curation_label || null);
  }

  return NextResponse.json({ ok: true });
}
