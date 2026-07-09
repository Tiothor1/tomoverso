import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    const db = getDb();
    if (action === "release") {
      db.prepare("UPDATE site_config SET value = '1', updated_at = datetime('now') WHERE key = 'launch_released'").run();
      return NextResponse.json({ ok: true, released: true });
    }
    if (action === "block") {
      db.prepare("UPDATE site_config SET value = '0', updated_at = datetime('now') WHERE key = 'launch_released'").run();
      return NextResponse.json({ ok: true, released: false });
    }
    return NextResponse.json({ error: "Ação inválida. Use 'release' ou 'block'." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM site_config WHERE key = 'launch_released'").get() as { value: string } | undefined;
    const target = db.prepare("SELECT value FROM site_config WHERE key = 'launch_target_time'").get() as { value: string } | undefined;
    return NextResponse.json({
      released: row?.value === "1",
      targetTime: target?.value || "2026-07-09T22:00:00-03:00",
    });
  } catch {
    return NextResponse.json({ released: false, targetTime: "2026-07-09T22:00:00-03:00" });
  }
}
