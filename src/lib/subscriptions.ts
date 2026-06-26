/**
 * Lib de assinaturas — Mercado Pago Checkout Pro.
 * Produção: defina MP_ACCESS_TOKEN no Vercel.
 * Alternativa: MP_CLIENT_ID + MP_CLIENT_SECRET para gerar token via /oauth/token.
 */

import { getDb } from "./db";

const MP_API = "https://api.mercadopago.com";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
let cachedOauthToken: { token: string; expiresAt: number } | null = null;

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
  return interval === "year" ? "ano" : "mês";
}

export function hasMercadoPagoCredentials(): boolean {
  return !!(process.env.MP_ACCESS_TOKEN || process.env.MP_TEST_ACCESS_TOKEN || (process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET));
}

export async function getMercadoPagoAccessToken(): Promise<string | null> {
  const directToken = process.env.MP_ACCESS_TOKEN || process.env.MP_TEST_ACCESS_TOKEN;
  if (directToken) return directToken;

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedOauthToken && cachedOauthToken.expiresAt > Date.now() + 60_000) {
    return cachedOauthToken.token;
  }

  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      test_token: process.env.MP_TEST_MODE === "true" ? "true" : "false",
    }),
  });

  if (!res.ok) {
    console.error("[MP] oauth/token error:", await res.text());
    return null;
  }

  const data = await res.json();
  if (!data?.access_token) return null;

  cachedOauthToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000,
  };
  return cachedOauthToken.token;
}

/** Busca planos ativos do banco */
export function getActivePlans(): any[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order`
  ).all() as any[];
}

/** Busca assinatura ativa do usuário */
export function getUserActiveSubscription(db: any, userId: string): (any) | null {
  return db.prepare(`
    SELECT us.*, sp.name AS plan_name, sp.badge_label, sp.role_granted
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC LIMIT 1
  `).get(userId) || null;
}

/** Lista transações do usuário */
export function getUserTransactions(userId: string, limit = 10) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  ).all(userId, limit);
}

/** Cria preferência no Mercado Pago e retorna o checkout URL */
export async function createCheckoutPreference(params: {
  planId: string;
  planName: string;
  priceCents: number;
  interval: string;
  userId: string;
  userEmail: string;
  userName?: string;
}): Promise<{ preferenceId: string; checkoutUrl: string } | null> {
  const token = await getMercadoPagoAccessToken();
  if (!token) return null;

  const label = params.interval === "year" ? "anual" : "mensal";
  const title = `Tomoverso ${params.planName} — ${label}`;

  const body = {
    auto_return: "approved",
    back_urls: {
      success: `${SITE_URL}/dashboard/subscription?mp_success=1`,
      failure: `${SITE_URL}/store/plans?mp_failure=1`,
      pending: `${SITE_URL}/dashboard/subscription?mp_pending=1`,
    },
    statement_descriptor: "TOMOVERSO",
    binary_mode: false,
    external_reference: `${params.userId}:${params.planId}`,
    items: [{
      id: params.planId,
      title,
      description: `Assinatura ${label} do Tomoverso`,
      quantity: 1,
      unit_price: params.priceCents / 100,
      currency_id: "BRL",
      category_id: "digital_goods",
    }],
    payer: {
      email: params.userEmail,
      name: params.userName || undefined,
    },
    payment_methods: {
      excluded_payment_types: [],
      excluded_payment_methods: [],
      installments: 12,
    },
    metadata: {
      user_id: params.userId,
      plan_id: params.planId,
      plan_interval: params.interval,
    },
    notification_url: `${SITE_URL}/api/payments/mercadopago-webhook`,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("[MP] create preference error:", await res.text());
    return null;
  }

  const data = await res.json();
  return {
    preferenceId: data.id,
    checkoutUrl: data.init_point || data.sandbox_init_point,
  };
}

/** Verifica status de pagamento no Mercado Pago */
export async function checkPaymentStatus(paymentId: string) {
  const token = await getMercadoPagoAccessToken();
  if (!token) return null;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
