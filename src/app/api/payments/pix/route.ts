import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPixPayment } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "login" }, { status: 401 });
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "missing_plan" }, { status: 400 });
    }

    const db = getDb();
    const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1").get(planId) as any;

    if (!plan) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    const pix = await createPixPayment({
      planId: plan.id,
      planName: plan.name,
      priceCents: plan.price_cents,
      interval: plan.interval,
      userId: user.id,
      userEmail: user.email,
      userName: user.display_name,
    });

    if (!pix) {
      return NextResponse.json({ error: "payment_error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...pix });
  } catch (err: any) {
    console.error("[pix-payment] error:", err?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
