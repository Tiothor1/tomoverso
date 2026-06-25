import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/subscriptions";

/**
 * Webhook do Mercado Pago.
 * Chamado pelo MP quando um pagamento é atualizado.
 * Configurar no dashboard do MP: URL + /api/payments/mercadopago-webhook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;
    
    // Só processamos pagamentos
    if (type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    // Busca status do pagamento na API do MP
    const payment = await checkPaymentStatus(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    const db = getDb();
    const extRef = payment.external_reference || "";
    const [userId, planId] = extRef.split(":");
    const mpStatus = payment.status;
    const mpStatusDetail = payment.status_detail;
    const payerEmail = payment.payer?.email || "";
    const paymentMethod = payment.payment_type_id || "";
    const amount = Math.round(parseFloat(payment.transaction_amount || "0") * 100);

    // Salva transação
    const plan = db.prepare("SELECT name FROM subscription_plans WHERE id = ?").get(planId) as any;

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
      mpStatus === "approved" ? "approved" : mpStatus === "rejected" ? "rejected" : "pending"
    );

    // Se aprovado, atualiza assinatura
    if (mpStatus === "approved" && userId && planId) {
      const existingSub = db.prepare(
        "SELECT id FROM user_subscriptions WHERE user_id = ? AND plan_id = ? AND status IN ('active', 'trialing', 'past_due', 'pending') ORDER BY created_at DESC LIMIT 1"
      ).get(userId, planId) as any;

      if (existingSub) {
        const now = new Date().toISOString();
        const endDate = new Date();
        const planRow = db.prepare("SELECT interval FROM subscription_plans WHERE id = ?").get(planId) as any;
        endDate.setMonth(endDate.getMonth() + (planRow?.interval === "year" ? 12 : 1));

        db.prepare(`
          UPDATE user_subscriptions
          SET status = 'active', mp_payment_id = ?, mp_payer_email = ?, current_period_start = ?, current_period_end = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(String(paymentId), payerEmail, now, endDate.toISOString(), existingSub.id);

        // Se o plano concede role 'author', atualiza o usuário
        if (plan?.name?.includes("Autor")) {
          db.prepare("UPDATE users SET role = 'author' WHERE id = ? AND role = 'user'").run(userId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[MP webhook error]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// MP envia webhooks via GET também (verificação)
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true });
}
