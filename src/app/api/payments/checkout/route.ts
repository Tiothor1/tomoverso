import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutPreference, hasMercadoPagoCredentials } from "@/lib/subscriptions";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
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

    if (!hasMercadoPagoCredentials()) {
      return NextResponse.redirect(new URL("/store/plans?error=mp_missing_token", req.url));
    }

    const pref = await createCheckoutPreference({
      planId: plan.id,
      planName: plan.name,
      priceCents: plan.price_cents,
      interval: plan.interval,
      userId: user.id,
      userEmail: user.email,
      userName: user.display_name,
    });

    if (!pref) {
      return NextResponse.redirect(new URL("/store/plans?error=payment_error", req.url));
    }

    const subId = randomUUID();
    const now = new Date().toISOString();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

    db.prepare(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, mp_preference_id)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `).run(subId, user.id, planId, now, endDate.toISOString(), pref.preferenceId);

    // ✅ Retorna HTML com redirect imediato — funciona mesmo com CSP restritivo
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecionando...</title></head><body><script>location.href=${JSON.stringify(pref.checkoutUrl)}</script><noscript><meta http-equiv="refresh" content="0;url=${pref.checkoutUrl}"></noscript><p>Redirecionando para o Mercado Pago...</p></body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (err: any) {
    console.error("[checkout] error:", err?.message);
    return NextResponse.redirect(new URL("/store/plans?error=server_error", req.url));
  }
}
