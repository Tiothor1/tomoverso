import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelPreapproval } from "@/lib/subscriptions";

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
    // Cancela no Mercado Pago se tiver preapproval recorrente
    if (sub.mp_preapproval_id) {
      await cancelPreapproval(sub.mp_preapproval_id).catch((err) =>
        console.error("[cancel] failed to cancel MP preapproval:", err)
      );
    }

    db.prepare(`
      UPDATE user_subscriptions SET status = 'canceled', cancel_at_period_end = 1, updated_at = datetime('now') WHERE id = ?
    `).run(sub.id);
  }

  return NextResponse.redirect(new URL("/dashboard/subscription?canceled=1", req.url));
}
