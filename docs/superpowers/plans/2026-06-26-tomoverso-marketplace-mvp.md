# Tomoverso Marketplace MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Tomoverso into a paid-content platform with MVP subscriptions, one-time digital work sales, internal author wallet, manual PIX withdrawals, and admin financial control.

**Architecture:** Move the financial system from ephemeral SQLite/Vercel `/tmp` to durable Supabase Postgres. Keep Mercado Pago Checkout Pro for MVP payments; use Tomoverso's Mercado Pago account, credit the author's internal wallet after approved webhook, and let admins pay withdrawals manually by PIX. Use server-side access checks for every paid/premium content route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/Storage, Mercado Pago Checkout Pro, Vercel preview for sandbox testing.

## Global Constraints

- Banco: Supabase.
- Marketplace MVP: saldo interno + saque manual.
- Comissão Tomoverso: 10%.
- Taxa Mercado Pago: descontada do autor.
- Saque mínimo: R$ 50,00.
- Saque inicial: manual por PIX.
- Autores precisam aprovação para vender.
- Obras pagas precisam aprovação admin.
- Assinatura recorrente automática: não no MVP.
- Ambiente de teste: Vercel Preview.
- Nunca liberar plano/compra como pago sem webhook/verificação real do Mercado Pago.
- Nunca calcular preço, comissão, saldo ou permissão financeira no frontend.
- Não gravar tokens/chaves no repositório.

---

## Required User Inputs Before Execution

- `SUPABASE_DATABASE_URL` or `DATABASE_URL` for Supabase Postgres.
- Supabase Storage config, if file uploads will be included in this phase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET`
- Mercado Pago test credentials for preview only:
  - `MP_ACCESS_TOKEN_TEST`
  - `NEXT_PUBLIC_MP_PUBLIC_KEY_TEST`
  - webhook secret/signature value if enabled in Mercado Pago panel.
- Vercel token with permission to manage project env vars, or confirmation to use the existing token already provided.
- Support/legal data:
  - support email
  - marketplace terms text or permission to draft MVP terms
  - refund policy
  - payout policy text: pending period, manual review, PIX only.

## File Structure

### Existing files to modify
- `src/lib/db.ts` — temporary bridge until Supabase migration is complete; stop relying on `/tmp` for financial tables.
- `src/lib/subscriptions.ts` — split plan checkout from marketplace product checkout.
- `src/app/api/payments/checkout/route.ts` — keep subscription checkout only or route by `checkout_type`.
- `src/app/api/payments/mercadopago-webhook/route.ts` — convert to generic payment webhook dispatcher.
- `src/app/store/page.tsx` — add buy buttons and product access status.
- `src/app/library/page.tsx` — add purchased works.
- `src/app/dashboard/page.tsx` — add author sales/wallet summary.
- `src/app/admin/commerce/page.tsx` — add order/sales/admin financial cards.
- `src/lib/actions/novel-actions.ts` — add paid-work fields and approval rules.
- `src/lib/actions/chapter-actions.ts` — protect premium/paid chapter publication rules.

### New files to create
- `src/lib/supabase/server.ts` — Supabase DB/server helpers.
- `src/lib/commerce/money.ts` — centavos helpers and commission math.
- `src/lib/commerce/access.ts` — `canAccessContent()` central access guard.
- `src/lib/commerce/checkout.ts` — create Mercado Pago preferences for products and subscriptions.
- `src/lib/commerce/orders.ts` — create/update orders, purchases, sales and wallet transactions.
- `src/lib/commerce/wallet.ts` — balance and withdrawal operations.
- `src/app/api/marketplace/checkout/route.ts` — one-time work purchase checkout.
- `src/app/api/marketplace/webhook/route.ts` — optional alias or dispatcher to generic MP webhook.
- `src/app/dashboard/wallet/page.tsx` — author wallet and withdrawal page.
- `src/app/dashboard/sales/page.tsx` — author sales history.
- `src/app/dashboard/seller/page.tsx` — seller onboarding/profile/PIX key.
- `src/app/admin/finance/page.tsx` — admin orders, sales, fees, balances.
- `src/app/admin/withdrawals/page.tsx` — admin manual withdrawal approval.
- `src/app/account/purchases/page.tsx` — buyer purchases.
- `src/app/api/content/access/[type]/[id]/route.ts` — diagnostic access endpoint for tests.
- `supabase/migrations/0001_finance_core.sql` — finance schema.
- `supabase/migrations/0002_content_access.sql` — content access and paid work flags.
- `docs/marketplace-mvp.md` — business rules and operations guide.

---

## Task 1: Supabase migration foundation

**Files:**
- Create: `supabase/migrations/0001_finance_core.sql`
- Create: `src/lib/supabase/server.ts`
- Modify: `.env.example`

**Produces:** Durable Postgres tables and server-side Supabase connection helper.

- [ ] Add Supabase env keys to `.env.example` without real values.
- [ ] Create migrations table set for finance entities.
- [ ] Run migration in Supabase test project.
- [ ] Verify tables exist using Supabase SQL editor or CLI.
- [ ] Commit: `chore: add supabase finance migration foundation`

## Task 2: Financial schema

**Files:**
- Modify: `supabase/migrations/0001_finance_core.sql`

**Tables:**
- `seller_profiles`
- `orders`
- `order_items`
- `purchases`
- `payments`
- `sales`
- `wallet_balances`
- `wallet_transactions`
- `withdrawal_requests`
- `platform_fee_rules`
- `content_access_grants`

**Key rules:**
- Money stored in integer cents.
- Platform fee percent defaults to `1000` basis points = 10%.
- Withdrawal minimum is `5000` cents.
- Sales use status: `pending`, `available`, `withdrawn`, `refunded`, `chargeback`.
- Wallet transactions are append-only.

- [ ] Write migration.
- [ ] Add indexes on buyer, seller, content, payment provider ids, status, created_at.
- [ ] Add unique constraints preventing duplicate approved purchase per buyer/content.
- [ ] Verify migration applies cleanly.
- [ ] Commit: `feat: add marketplace finance schema`

## Task 3: Seller onboarding and approval

**Files:**
- Create: `src/app/dashboard/seller/page.tsx`
- Create: `src/lib/actions/seller-actions.ts`
- Create: `src/app/admin/sellers/page.tsx`
- Modify: `src/components/layout/navbar.tsx`

**Rules:**
- User can request seller profile.
- Seller must provide PIX key and display legal payout name.
- Status starts as `pending`.
- Admin can approve/reject.
- Only approved sellers can sell paid works.

- [ ] Implement seller request action.
- [ ] Implement admin approval action.
- [ ] Add dashboard links.
- [ ] Verify non-approved seller cannot enable paid sale.
- [ ] Commit: `feat: add seller onboarding and approval`

## Task 4: Paid work metadata and approval

**Files:**
- Modify: `src/lib/actions/novel-actions.ts`
- Modify: `src/app/dashboard/novels/new/new-novel-form.tsx`
- Create/Modify: novel edit form if missing.
- Modify: `src/app/admin/catalog/page.tsx`

**Rules:**
- Work pricing is server-validated.
- Paid work status requires admin approval.
- Minimum price initially configurable, recommended R$ 4,90.
- Free work remains unchanged.

- [ ] Add paid metadata fields to content model/migration.
- [ ] Validate seller is approved before paid publish.
- [ ] Add admin paid approval controls.
- [ ] Verify direct form manipulation cannot set invalid price/status.
- [ ] Commit: `feat: add paid work metadata and approval`

## Task 5: Access control core

**Files:**
- Create: `src/lib/commerce/access.ts`
- Modify: `src/app/novels/[slug]/[chapter]/page.tsx`
- Modify: `src/app/livros/[slug]/ler/page.tsx`
- Modify: manga reader only if paid manga is enabled in MVP.

**Access types:**
- Free content.
- Premium subscription content.
- Paid one-time content.
- Purchased content.
- Own author content.
- Admin content.

- [ ] Implement `canAccessContent(userId, contentType, contentId)`.
- [ ] Apply guard in server reader pages.
- [ ] Show paywall instead of content when blocked.
- [ ] Verify direct URL access is blocked.
- [ ] Commit: `feat: add server-side paid content access guard`

## Task 6: Marketplace checkout

**Files:**
- Create: `src/lib/commerce/money.ts`
- Create: `src/lib/commerce/checkout.ts`
- Create: `src/app/api/marketplace/checkout/route.ts`
- Modify: `src/app/store/page.tsx`

**Rules:**
- Buyer must be logged in.
- Price read from database only.
- Author cannot buy own work.
- Checkout creates order as `pending`.
- Mercado Pago preference includes `external_reference` and metadata.
- Tomoverso commission 10% stored at order time.

- [ ] Implement commission calculation: gross, MP fee pending estimate/null, platform fee 10%, author net after MP fee when known.
- [ ] Create Mercado Pago Checkout Pro preference.
- [ ] Redirect buyer to MP checkout.
- [ ] Verify missing MP token blocks checkout safely.
- [ ] Commit: `feat: add marketplace checkout`

## Task 7: Webhook dispatcher and payment finalization

**Files:**
- Modify: `src/app/api/payments/mercadopago-webhook/route.ts`
- Create: `src/lib/commerce/orders.ts`

**Rules:**
- Respond 200/201 quickly after parsing valid events.
- Query Mercado Pago `GET /v1/payments/{id}` before finalizing.
- Approved subscription activates subscription.
- Approved marketplace order grants access and credits seller pending wallet.
- Rejected/cancelled updates order without access.
- Duplicate webhooks are idempotent.

- [ ] Implement generic payment type detection from metadata.
- [ ] Implement idempotent approved handler.
- [ ] Insert `payments`, `purchases`, `sales`, `wallet_transactions`.
- [ ] Update `wallet_balances.pending_cents`.
- [ ] Commit: `feat: finalize marketplace payments from webhook`

## Task 8: Buyer purchases/library

**Files:**
- Create: `src/app/account/purchases/page.tsx`
- Modify: `src/app/library/page.tsx`
- Modify: `src/components/auth/user-menu.tsx`

**Rules:**
- Buyer sees approved purchases.
- Purchased works link to reader.
- Pending/rejected purchases visible with status.

- [ ] Add purchases tab/card.
- [ ] Add user menu link.
- [ ] Verify purchase library only shows current user's purchases.
- [ ] Commit: `feat: add purchased works library`

## Task 9: Author wallet and sales dashboard

**Files:**
- Create: `src/app/dashboard/wallet/page.tsx`
- Create: `src/app/dashboard/sales/page.tsx`
- Create: `src/lib/commerce/wallet.ts`

**Rules:**
- Show pending, available, withdrawn and blocked balances.
- Show sale gross, MP fee, Tomoverso fee, author net.
- Withdrawal request allowed only when available balance >= R$ 50,00.

- [ ] Implement wallet queries.
- [ ] Implement withdrawal request action.
- [ ] Verify user cannot request more than available.
- [ ] Commit: `feat: add author wallet and sales dashboard`

## Task 10: Admin finance and withdrawals

**Files:**
- Create: `src/app/admin/finance/page.tsx`
- Create: `src/app/admin/withdrawals/page.tsx`
- Create: `src/lib/actions/finance-admin-actions.ts`

**Rules:**
- Admin sees all orders, payments, commissions, seller balances.
- Admin approves/rejects/marks withdrawal paid.
- Marking paid creates ledger transaction and decreases available balance.

- [ ] Implement finance overview.
- [ ] Implement withdrawal approval/rejection/payment actions.
- [ ] Verify non-admin cannot access routes/actions.
- [ ] Commit: `feat: add admin finance and withdrawal controls`

## Task 11: Subscription MVP hardening

**Files:**
- Modify: `src/lib/subscriptions.ts`
- Modify: `src/app/api/payments/checkout/route.ts`
- Modify: `src/app/dashboard/subscription/page.tsx`

**Rules:**
- MVP does not auto-renew.
- Plan activation still depends on approved webhook.
- Expired subscriptions no longer grant premium access.
- Payment history is visible.

- [ ] Make non-recurring subscription copy clear in UI.
- [ ] Add expiry guard.
- [ ] Verify premium content blocks after expiration.
- [ ] Commit: `fix: harden subscription mvp access`

## Task 12: Preview environment and end-to-end tests

**Files:**
- Modify: Vercel preview env only.
- Create: `docs/marketplace-mvp.md`

**Required tests:**
- User signup/login.
- Seller request and admin approval.
- Paid work request and admin approval.
- Subscription checkout pending/approved.
- Marketplace purchase pending/approved.
- Purchase library access.
- Author pending wallet credit.
- Withdrawal request and admin paid status.
- Direct URL blocked for unpaid user.

- [ ] Configure Supabase test database.
- [ ] Configure Mercado Pago test credentials in Vercel Preview only.
- [ ] Deploy preview branch.
- [ ] Run manual test flows with Mercado Pago test buyer.
- [ ] Record results in docs.
- [ ] Commit: `docs: add marketplace mvp operating guide`

---

## Execution Checkpoints

1. Stop after Task 2 if Supabase schema/design needs changes.
2. Stop after Task 5 to verify paid-content access before money moves.
3. Stop after Task 7 to verify webhook/payment correctness.
4. Stop after Task 12 before production credentials are added.

## Not in MVP

- Automatic recurring subscriptions.
- Automatic author payout through Mercado Pago or bank API.
- Multi-vendor OAuth split payment.
- Tax invoice automation.
- EPUB/PDF DRM.
- Chargeback automation beyond ledger reversal hooks.
