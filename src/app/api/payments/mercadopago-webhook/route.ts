import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/subscriptions";

/**
 * Webhook do Mercado Pago.
 * Configure no painel do MP:
 * https://SEU-DOMINIO/api/payments/mercadopago-webhook
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const type = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");

    if (type && type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id || body.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const payment = await checkPaymentStatus(String(paymentId));
    if (!payment) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    const db = getDb();
    const extRef = String(payment.external_reference || "");
    const [refUserId, refPlanId] = extRef.split(":");
    const userId = payment.metadata?.user_id || refUserId;
    const planId = payment.metadata?.plan_id || refPlanId;
    const mpStatus = payment.status || "pending";
    const mpStatusDetail = payment.status_detail || "";
    const payerEmail = payment.payer?.email || "";
    const paymentMethod = payment.payment_type_id || payment.payment_method_id || "";
    const amount = Math.round(Number(payment.transaction_amount || 0) * 100);
    const txStatus = mpStatus === "approved" ? "approved" : mpStatus === "rejected" ? "rejected" : "pending";

    const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ?").get(planId) as any;

    db.prepare(`
      INSERT INTO payment_transactions (id, user_id, plan_name, amount_cents, currency, payment_method, mp_payment_id, mp_status, mp_status_detail, status)
      VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId || null,
      plan?.name || "Plano",
      amount,
      paymentMethod,
      String(paymentId),
      mpStatus,
      mpStatusDetail,
      txStatus
    );

    if (mpStatus === "approved" && userId && planId && plan) {
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

      const existingSub = db.prepare(`
        SELECT id FROM user_subscriptions
        WHERE user_id = ? AND plan_id = ? AND status IN ('active', 'trialing', 'past_due', 'pending')
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, planId) as any;

      if (existingSub) {
        db.prepare(`
          UPDATE user_subscriptions
          SET status = 'active', mp_payment_id = ?, mp_payer_email = ?, current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, updated_at = datetime('now')
          WHERE id = ?
        `).run(String(paymentId), payerEmail, now, endDate.toISOString(), existingSub.id);
      } else {
        db.prepare(`
          INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, mp_payment_id, mp_payer_email)
          VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
        `).run(crypto.randomUUID(), userId, planId, now, endDate.toISOString(), String(paymentId), payerEmail);
      }

      if (plan.role_granted === "author") {
        db.prepare("UPDATE users SET role = 'author' WHERE id = ? AND role = 'user'").run(userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[MP webhook error]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");
  if (!paymentId) return NextResponse.json({ ok: true });

  return POST(new NextRequest(req.url, {
    method: "POST",
    body: JSON.stringify({ type: "payment", data: { id: paymentId } }),
    headers: { "Content-Type": "application/json" },
  }));
}
