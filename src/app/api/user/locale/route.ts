import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ locale: null });
    const db = getDb();
    const pref = db.prepare("SELECT preferred_locale FROM users WHERE id = ?").get(user.id) as { preferred_locale: string } | undefined;
    return NextResponse.json({ locale: pref?.preferred_locale || null });
  } catch {
    return NextResponse.json({ locale: null });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false });
    const { locale } = await req.json();
    const db = getDb();
    db.prepare("UPDATE users SET preferred_locale = ? WHERE id = ?").run(locale, user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
