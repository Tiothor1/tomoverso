import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ locale: null });
    const db = getDb();
    const pref = db.prepare("SELECT preferred_locale FROM users WHERE id = ?").get(user.id) as { preferred_locale: string } | undefined;
    return NextResponse.json({ locale: pref?.preferred_locale ? normalizeLocale(pref.preferred_locale) : null });
  } catch {
    return NextResponse.json({ locale: null });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const { locale } = await req.json();
    const normalized = normalizeLocale(locale);
    const db = getDb();
    db.prepare("UPDATE users SET preferred_locale = ? WHERE id = ?").run(normalized, user.id);
    return NextResponse.json({ ok: true, locale: normalized });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
