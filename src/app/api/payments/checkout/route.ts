import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutPreference, hasMercadoPagoCredentials } from "@/lib/subscriptions";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "login", message: "Faça login primeiro.", redirect: "/auth/login?redirect=/store/plans" }, { status: 401 });
    }

    const formData = await req.formData();
    const planId = formData.get("plan_id") as string;

    if (!planId) {
      return NextResponse.json({ error: "missing_plan", message: "Plano não informado." }, { status: 400 });
    }

    const db = getDb();
    const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1").get(planId) as any;

    if (!plan) {
      return NextResponse.json({ error: "invalid_plan", message: "Plano inválido ou inativo." }, { status: 400 });
    }

    if (!hasMercadoPagoCredentials()) {
      return NextResponse.json({ error: "mp_missing_token", message: "Mercado Pago não configurado. Avise o admin." }, { status: 503 });
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
      return NextResponse.json({ error: "payment_error", message: "Erro ao criar pagamento no Mercado Pago. Tente novamente." }, { status: 502 });
    }

    const subId = randomUUID();
    const now = new Date().toISOString();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

    db.prepare(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, mp_preference_id)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `).run(subId, user.id, planId, now, endDate.toISOString(), pref.preferenceId);

    return NextResponse.json({ ok: true, checkoutUrl: pref.checkoutUrl });
  } catch (err: any) {
    console.error("[checkout] error:", err?.message);
    return NextResponse.json({ error: "server_error", message: "Erro interno do servidor." }, { status: 500 });
  }
}
