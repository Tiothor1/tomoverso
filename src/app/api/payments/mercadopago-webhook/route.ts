import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/subscriptions";

function parseMercadoPagoSignature(signature: string | null) {
  if (!signature) return null;
  return Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  })) as { ts?: string; v1?: string };
}

function safeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function validateMercadoPagoWebhookSignature(req: NextRequest, paymentId?: string | null) {
  const secret = process.env.MP_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET_TEST;
  if (!secret) return true;

  const signature = parseMercadoPagoSignature(req.headers.get("x-signature"));
  const requestId = req.headers.get("x-request-id");
  if (!signature?.ts || !signature.v1 || !requestId || !paymentId) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${signature.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqualHex(expected, signature.v1);
}

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

    if (!validateMercadoPagoWebhookSignature(req, String(paymentId))) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const payment = await checkPaymentStatus(String(paymentId));
    if (!payment) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    const db = getDb();
    const extRef = String(payment.external_reference || "");
    const mpStatus = payment.status || "pending";
    const mpStatusDetail = payment.status_detail || "";
    const payerEmail = payment.payer?.email || "";
    const paymentMethod = payment.payment_type_id || payment.payment_method_id || "";
    const amount = Math.round(Number(payment.transaction_amount || 0) * 100);
    const txStatus = mpStatus === "approved" ? "approved" : mpStatus === "rejected" ? "rejected" : "pending";
    const userId = payment.metadata?.user_id || "";

    // ── ONE-TIME WORK PURCHASE ──────────────────────────
    if (extRef.startsWith("work:")) {
      const [, paidWorkId, workUserId] = extRef.split(":");
      const workUserId2 = userId || workUserId;

      if (mpStatus === "approved" && workUserId2 && paidWorkId) {
        const work = db.prepare("SELECT * FROM paid_works WHERE id = ?").get(paidWorkId) as any;
        if (work) {
          // Cria purchase
          const purchaseId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO purchases (id, buyer_id, order_id, paid_work_id, content_type, content_id, price_cents, status)
            VALUES (?, ?, NULL, ?, ?, ?, ?, 'active')
          `).run(purchaseId, workUserId2, paidWorkId, work.content_type, work.content_id, work.price_cents);

          // Atualiza pedido
          const order = db.prepare("SELECT id FROM marketplace_orders WHERE buyer_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(workUserId2) as any;
          if (order) {
            db.prepare("UPDATE marketplace_orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(order.id);
            db.prepare("UPDATE marketplace_payments SET status = 'approved', provider_payment_id = ? WHERE order_id = ?").run(String(paymentId), order.id);
          }

          // Adiciona ao saldo do vendedor
          const wallet = db.prepare("SELECT * FROM wallet_balances WHERE seller_id = ?").get(work.seller_id) as any;
          if (wallet) {
            db.prepare("UPDATE wallet_balances SET pending_cents = pending_cents + ? WHERE seller_id = ?").run(work.author_net_cents || Math.floor(work.price_cents * 0.86), work.seller_id);
          } else {
            db.prepare("INSERT INTO wallet_balances (seller_id, pending_cents, available_cents) VALUES (?, ?, 0)").run(work.seller_id, work.author_net_cents || Math.floor(work.price_cents * 0.86));
          }

          db.prepare("INSERT INTO wallet_transactions (id, seller_id, type, amount_cents, description) VALUES (?, ?, 'sale_pending', ?, ?)")
            .run(crypto.randomUUID(), work.seller_id, work.author_net_cents || Math.floor(work.price_cents * 0.86), `Venda: ${work.title} (aguardando 7 dias para liberação)`);
        }
      }

      await db.prepare(`
        INSERT INTO payment_transactions (id, user_id, plan_name, amount_cents, currency, payment_method, mp_payment_id, mp_status, mp_status_detail, status)
        VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), workUserId2 || null, `Compra obra`, amount, paymentMethod, String(paymentId), mpStatus, mpStatusDetail, txStatus);

      return NextResponse.json({ received: true });
    }

    // ── SUBSCRIPTION ────────────────────────────────────
    const [refUserId, refPlanId] = extRef.split(":");
    const userId2 = payment.metadata?.user_id || refUserId;
    const planId = payment.metadata?.plan_id || refPlanId;
    const plan = db.prepare("SELECT * FROM subscription_plans WHERE id = ?").get(planId) as any;

    db.prepare(`
      INSERT INTO payment_transactions (id, user_id, plan_name, amount_cents, currency, payment_method, mp_payment_id, mp_status, mp_status_detail, status)
      VALUES (?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId2 || null,
      plan?.name || "Plano",
      amount,
      paymentMethod,
      String(paymentId),
      mpStatus,
      mpStatusDetail,
      txStatus
    );

    if (mpStatus === "approved" && userId2 && planId && plan) {
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (plan.interval === "year" ? 12 : 1));

      const existingSub = db.prepare(`
        SELECT id FROM user_subscriptions
        WHERE user_id = ? AND plan_id = ? AND status IN ('active', 'trialing', 'past_due', 'pending')
        ORDER BY created_at DESC LIMIT 1
      `).get(userId2, planId) as any;

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
        `).run(crypto.randomUUID(), userId2, planId, now, endDate.toISOString(), String(paymentId), payerEmail);
      }

      if (plan.role_granted === "author") {
        db.prepare("UPDATE users SET role = 'author' WHERE id = ? AND role = 'user'").run(userId2);
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
