"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { MARKETPLACE_FEE_BASIS_POINTS, MIN_PAID_WORK_PRICE_CENTS } from "@/lib/marketplace/constants";
import { calculateMarketplaceSplit } from "@/lib/marketplace/money";

// ── Precificação ──────────────────────────────────────────

const pricingSchema = z.object({
  content_type: z.enum(["novel", "book", "manga"]),
  content_id: z.string().min(1),
  price_cents: z.coerce.number().int().min(0).max(9999900),
});

export async function setNovelPriceAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const parsed = pricingSchema.safeParse({
    content_type: formData.get("content_type"),
    content_id: formData.get("content_id"),
    price_cents: formData.get("price_cents") || "0",
  });
  if (!parsed.success) return;

  const db = getDb();
  const { content_type, content_id, price_cents } = parsed.data;

  // Verifica se é dono da obra
  const novel = db.prepare("SELECT author_id, title FROM novels WHERE id = ?").get(content_id) as any;
  if (!novel || novel.author_id !== user.id) return;

  // Verifica se é vendedor aprovado
  const seller = db.prepare("SELECT id FROM seller_profiles WHERE user_id = ? AND status = 'approved'").get(user.id) as any;
  if (!seller && price_cents > 0) return;

  if (price_cents > 0 && price_cents < MIN_PAID_WORK_PRICE_CENTS) return;

  const existing = db.prepare("SELECT id FROM paid_works WHERE content_type = ? AND content_id = ?").get(content_type, content_id) as any;
  const sellerId = seller?.id || null;

  if (price_cents === 0) {
    if (existing) db.prepare("DELETE FROM paid_works WHERE id = ?").run(existing.id);
  } else if (existing) {
    db.prepare("UPDATE paid_works SET price_cents = ?, updated_at = datetime('now') WHERE id = ?").run(price_cents, existing.id);
  } else {
    const split = calculateMarketplaceSplit({ grossCents: price_cents });
    db.prepare(`
      INSERT INTO paid_works (id, content_type, content_id, seller_id, title, price_cents, author_net_cents, platform_fee_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), content_type, content_id, sellerId, novel.title, price_cents, split.authorNetCents, split.platformFeeCents);
  }

  revalidatePath(`/dashboard/novels/${content_id}`);
  revalidatePath(`/novels/${novel.slug || content_id}`);
}

// ── Checkout / Compra ─────────────────────────────────────

const checkoutSchema = z.object({
  paid_work_id: z.string().min(1),
  buyer_cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  buyer_email: z.string().email("Email inválido"),
  buyer_zip: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  buyer_street: z.string().min(3, "Endereço muito curto"),
  buyer_number: z.string().min(1, "Número é obrigatório"),
  buyer_neighborhood: z.string().min(2, "Bairro é obrigatório"),
  buyer_city: z.string().min(2, "Cidade é obrigatória"),
  buyer_state: z.string().length(2, "UF deve ter 2 letras"),
});

function validateCPF(cpf: string): boolean {
  const digits = cpf.split("").map(Number);
  if (digits.length !== 11 || digits.every(d => d === digits[0])) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== digits[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === digits[10];
}

export async function createPurchaseCheckoutAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const parsed = checkoutSchema.safeParse({
    paid_work_id: formData.get("paid_work_id"),
    buyer_cpf: (formData.get("buyer_cpf") as string)?.replace(/\D/g, ""),
    buyer_email: formData.get("buyer_email"),
    buyer_zip: (formData.get("buyer_zip") as string)?.replace(/\D/g, ""),
    buyer_street: formData.get("buyer_street"),
    buyer_number: formData.get("buyer_number"),
    buyer_neighborhood: formData.get("buyer_neighborhood"),
    buyer_city: formData.get("buyer_city"),
    buyer_state: formData.get("buyer_state"),
  });
  if (!parsed.success) return;

  if (!validateCPF(parsed.data.buyer_cpf)) return;

  const db = getDb();

  const work = db.prepare(`
    SELECT pw.*, CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END as already_purchased
    FROM paid_works pw
    LEFT JOIN purchases p ON p.paid_work_id = pw.id AND p.buyer_id = ?
    WHERE pw.id = ?
  `).get(user.id, parsed.data.paid_work_id) as any;
  if (!work || work.already_purchased) redirect(`/novels/${work?.content_id || ""}`);

  // Cria pedido
  const orderId = randomUUID();
  const orderCode = "PED-" + Date.now().toString(36).toUpperCase();

  db.prepare(`
    INSERT INTO marketplace_orders (id, order_code, buyer_id, checkout_type, status, total_cents, buyer_document, buyer_email, buyer_zip, buyer_street, buyer_number, buyer_neighborhood, buyer_city, buyer_state)
    VALUES (?, ?, ?, 'work_purchase', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, orderCode, user.id, work.price_cents, parsed.data.buyer_cpf, parsed.data.buyer_email,
    parsed.data.buyer_zip, parsed.data.buyer_street, parsed.data.buyer_number, parsed.data.buyer_neighborhood,
    parsed.data.buyer_city, parsed.data.buyer_state);

  db.prepare(`
    INSERT INTO marketplace_order_items (id, order_id, paid_work_id, seller_id, content_type, item_title, unit_price_cents, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(randomUUID(), orderId, work.id, work.seller_id, work.content_type, work.title, work.price_cents);

  // Tenta Mercado Pago
  const { createCheckoutPreference, hasMercadoPagoCredentials } = await import("@/lib/subscriptions");

  if (hasMercadoPagoCredentials()) {
    const pref = await createCheckoutPreference({
      planId: work.id,
      planName: work.title,
      priceCents: work.price_cents,
      interval: "month" as any,
      userId: user.id,
      userEmail: parsed.data.buyer_email,
      userName: user.display_name,
      isOneTime: true,
    });

    if (pref) {
      db.prepare(`
        INSERT INTO marketplace_payments (id, order_id, buyer_id, provider, provider_preference_id, status, amount_cents)
        VALUES (?, ?, ?, 'mercadopago', ?, 'pending', ?)
      `).run(randomUUID(), orderId, user.id, pref.preferenceId, work.price_cents);

      redirect(pref.checkoutUrl);
    }
  }

  // Fallback: sem MP, redireciona pra library
  redirect("/library?purchase=pending");
}

// ── Saque ────────────────────────────────────────────────

const withdrawalSchema = z.object({
  amount_cents: z.coerce.number().int().min(5000, "Saque mínimo: R$ 50,00").max(999999999),
});

export async function requestWithdrawalAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const parsed = withdrawalSchema.safeParse({ amount_cents: formData.get("amount_cents") });
  if (!parsed.success) return;

  const db = getDb();
  const seller = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ? AND status = 'approved'").get(user.id) as any;
  if (!seller) return;

  const wallet = db.prepare("SELECT * FROM wallet_balances WHERE seller_id = ?").get(seller.id) as any;
  if (!wallet || wallet.available_cents < parsed.data.amount_cents) return;

  const id = randomUUID();
  db.prepare(`
    INSERT INTO withdrawal_requests (id, seller_id, amount_cents, pix_key_type, pix_key, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(id, seller.id, parsed.data.amount_cents, seller.pix_key_type, seller.pix_key);

  // Debita do saldo disponível
  db.prepare("UPDATE wallet_balances SET available_cents = available_cents - ?, withdrawn_cents = withdrawn_cents + ? WHERE seller_id = ?")
    .run(parsed.data.amount_cents, parsed.data.amount_cents, seller.id);

  db.prepare("INSERT INTO wallet_transactions (id, seller_id, withdrawal_id, type, amount_cents, description) VALUES (?, ?, ?, 'withdrawal_requested', ?, ?)")
    .run(randomUUID(), seller.id, id, parsed.data.amount_cents, `Saque solicitado: R$ ${(parsed.data.amount_cents / 100).toFixed(2)} via ${seller.pix_key_type}`);

  revalidatePath("/dashboard/wallet");
}

// ── Admin: Confirmar saque ───────────────────────────────

export async function adminConfirmWithdrawalAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;

  const withdrawalId = formData.get("withdrawal_id") as string;
  if (!withdrawalId) return;

  const db = getDb();
  const wr = db.prepare("SELECT * FROM withdrawal_requests WHERE id = ? AND status = 'pending'").get(withdrawalId) as any;
  if (!wr) return;

  db.prepare("UPDATE withdrawal_requests SET status = 'paid', approved_by = ?, approved_at = datetime('now') WHERE id = ?")
    .run(user.id, withdrawalId);

  revalidatePath("/admin/finance");
}
