import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutPreference } from "@/lib/subscriptions";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?redirect=/store/plans", req.url));
  }

  const formData = await req.formData();
  const planId = formData.get("plan_id") as string;

  if (!planId) {
    return NextResponse.redirect(new URL("/store/plans?error=missing_plan", req.url));
  }

  const db = getDb();
  const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1").get(planId) as any;

  if (!plan) {
    return NextResponse.redirect(new URL("/store/plans?error=invalid_plan", req.url));
  }

  // Create Mercado Pago preference
  const pref = await createCheckoutPreference({
    planId: plan.id,
    planName: plan.name,
    priceCents: plan.price_cents,
    interval: plan.interval,
    userId: user.id,
    userEmail: user.email,
  });

  if (!pref) {
    // Fallback: create subscription without actual payment (dev mode)
    // This allows testing without MP credentials
    if (!process.env.MP_ACCESS_TOKEN && !process.env.MP_TEST_ACCESS_TOKEN) {
      const subId = randomUUID();
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

      db.prepare(`
        INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
        VALUES (?, ?, ?, 'active', ?, ?)
      `).run(subId, user.id, planId, now, endDate.toISOString());

      return NextResponse.redirect(new URL("/dashboard/subscription?success=dev", req.url));
    }

    return NextResponse.redirect(new URL("/store/plans?error=payment_error", req.url));
  }

  // Save pending subscription
  const subId = randomUUID();
  const now = new Date().toISOString();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

  db.prepare(`
    INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, mp_preference_id)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `).run(subId, user.id, planId, now, endDate.toISOString(), pref.preferenceId);

  // Redirect to Mercado Pago checkout
  return NextResponse.redirect(pref.checkoutUrl);
}
