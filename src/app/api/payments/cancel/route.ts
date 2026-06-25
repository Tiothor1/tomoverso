import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const db = getDb();
  const sub = db.prepare(`
    SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id) as any;

  if (sub) {
    db.prepare(`
      UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now') WHERE id = ?
    `).run(sub.id);
  }

  return NextResponse.redirect(new URL("/dashboard/subscription?canceled=1", req.url));
}
