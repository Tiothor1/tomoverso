/**
 * Lib de assinaturas — Mercado Pago Checkout Pro.
 * Precisa de env vars: MP_ACCESS_TOKEN (produção) ou MP_TEST_ACCESS_TOKEN (sandbox)
 */

import { getDb } from "./db";

const MP_API = "https://api.mercadopago.com";
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MP_TEST_ACCESS_TOKEN || "";
const WEBHOOK_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export interface Plan {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  badge_label: string | null;
  sort_order: number;
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatInterval(interval: string): string {
  return interval === "year" ? "ano" : "m\u00eas";
}

/** Busca planos ativos do banco */
export function getActivePlans(): any[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order`
  ).all() as any[];
}

/** Busca assinatura ativa do usu\u00e1rio */
export function getUserActiveSubscription(db: any, userId: string): (any) | null {
  return db.prepare(`
    SELECT us.*, sp.name AS plan_name, sp.badge_label, sp.role_granted
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC LIMIT 1
  `).get(userId) || null;
}

/** Lista transa\u00e7\u00f5es do usu\u00e1rio */
export function getUserTransactions(userId: string, limit = 10) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  ).all(userId, limit);
}

/** Cria prefer\u00eancia no Mercado Pago e retorna o checkout URL */
export async function createCheckoutPreference(params: {
  planId: string;
  planName: string;
  priceCents: number;
  interval: string;
  userId: string;
  userEmail: string;
}): Promise<{ preferenceId: string; checkoutUrl: string } | null> {
  if (!MP_TOKEN) return null;

  const label = params.interval === "year" ? "anual" : "mensal";
  const title = `Tomoverso ${params.planName} \u2014 ${label}`;

  const body = {
    items: [{
      id: params.planId,
      title,
      description: `Assinatura ${label} do Tomoverso`,
      quantity: 1,
      unit_price: params.priceCents / 100,
      currency_id: "BRL",
    }],
    payer: { email: params.userEmail },
    back_urls: {
      success: `${WEBHOOK_BASE}/dashboard/subscription?mp_success=1`,
      failure: `${WEBHOOK_BASE}/store/plans?mp_failure=1`,
      pending: `${WEBHOOK_BASE}/dashboard/subscription?mp_pending=1`,
    },
    auto_return: "approved",
    external_reference: `${params.userId}:${params.planId}`,
    notification_url: `${WEBHOOK_BASE}/api/payments/mercadopago-webhook`,
    purpose: "subscription",
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[MP] create preference error:", err);
    return null;
  }

  const data = await res.json();
  return {
    preferenceId: data.id,
    checkoutUrl: data.init_point,
  };
}

/** Verifica status de pagamento no Mercado Pago */
export async function checkPaymentStatus(paymentId: string) {
  if (!MP_TOKEN) return null;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { "Authorization": `Bearer ${MP_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}
