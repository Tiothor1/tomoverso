-- Tomoverso Marketplace MVP — Supabase finance and seller schema
-- Rules: internal balance + manual PIX withdrawal; 10% Tomoverso fee; MP fee paid by author.

create extension if not exists pgcrypto;

-- Profiles mirror Supabase auth.users and hold app role data.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text default '',
  role text not null default 'user' check (role in ('user', 'author', 'admin')),
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_fee_rules (
  id text primary key,
  label text not null,
  fee_basis_points integer not null default 1000 check (fee_basis_points >= 0 and fee_basis_points <= 5000),
  min_withdrawal_cents integer not null default 5000 check (min_withdrawal_cents >= 0),
  settlement_delay_days integer not null default 7 check (settlement_delay_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_fee_rules (id, label, fee_basis_points, min_withdrawal_cents, settlement_delay_days, is_active)
values ('default', 'Tomoverso Marketplace MVP', 1000, 5000, 7, true)
on conflict (id) do update set
  fee_basis_points = excluded.fee_basis_points,
  min_withdrawal_cents = excluded.min_withdrawal_cents,
  settlement_delay_days = excluded.settlement_delay_days,
  updated_at = now();

-- Private bucket for covers/images. Runtime helper also creates it if missing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tomoverso', 'tomoverso', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  legal_name text not null,
  public_name text not null,
  pix_key_type text not null check (pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key text not null,
  payout_notes text default '',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seller_profiles_status on public.seller_profiles(status, created_at desc);

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.seller_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_seller_applications_status on public.seller_applications(status, created_at desc);
create index if not exists idx_seller_applications_user on public.seller_applications(user_id, created_at desc);

create table if not exists public.paid_works (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('novel', 'book', 'manga')),
  content_id text not null,
  seller_id uuid not null references public.seller_profiles(id),
  title text not null,
  price_cents integer not null check (price_cents >= 490),
  currency text not null default 'BRL',
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);
create index if not exists idx_paid_works_status on public.paid_works(status, approval_status, created_at desc);
create index if not exists idx_paid_works_seller on public.paid_works(seller_id, created_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  buyer_id uuid not null references public.profiles(id),
  checkout_type text not null default 'work_purchase' check (checkout_type in ('work_purchase', 'subscription')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback')),
  gross_amount_cents integer not null check (gross_amount_cents >= 0),
  currency text not null default 'BRL',
  provider text not null default 'mercadopago',
  provider_preference_id text,
  provider_payment_id text,
  external_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists idx_orders_buyer on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status, created_at desc);
create index if not exists idx_orders_provider_payment on public.orders(provider_payment_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  paid_work_id uuid references public.paid_works(id),
  seller_id uuid references public.seller_profiles(id),
  content_type text not null check (content_type in ('novel', 'book', 'manga', 'subscription')),
  content_id text not null,
  title text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  gross_amount_cents integer not null check (gross_amount_cents >= 0),
  platform_fee_basis_points integer not null default 1000,
  platform_fee_amount_cents integer not null default 0,
  mp_fee_amount_cents integer not null default 0,
  author_net_amount_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_seller on public.order_items(seller_id, created_at desc);
create index if not exists idx_order_items_content on public.order_items(content_type, content_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  buyer_id uuid references public.profiles(id),
  provider text not null default 'mercadopago',
  provider_payment_id text unique,
  provider_preference_id text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback')),
  status_detail text,
  payment_method text,
  gross_amount_cents integer not null default 0,
  mp_fee_amount_cents integer not null default 0,
  net_received_cents integer,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status, created_at desc);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  paid_work_id uuid references public.paid_works(id),
  content_type text not null check (content_type in ('novel', 'book', 'manga')),
  content_id text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'refunded', 'revoked')),
  granted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (buyer_id, content_type, content_id)
);
create index if not exists idx_purchases_buyer on public.purchases(buyer_id, created_at desc);
create index if not exists idx_purchases_content on public.purchases(content_type, content_id, status);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id),
  buyer_id uuid not null references public.profiles(id),
  order_id uuid not null references public.orders(id),
  order_item_id uuid references public.order_items(id),
  paid_work_id uuid references public.paid_works(id),
  content_type text not null check (content_type in ('novel', 'book', 'manga')),
  content_id text not null,
  gross_amount_cents integer not null,
  mp_fee_amount_cents integer not null default 0,
  platform_fee_basis_points integer not null default 1000,
  platform_fee_amount_cents integer not null,
  author_net_amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'available', 'withdrawn', 'refunded', 'chargeback')),
  available_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sales_seller_status on public.sales(seller_id, status, created_at desc);
create index if not exists idx_sales_order on public.sales(order_id);

create table if not exists public.wallet_balances (
  seller_id uuid primary key references public.seller_profiles(id) on delete cascade,
  pending_cents integer not null default 0,
  available_cents integer not null default 0,
  withdrawn_cents integer not null default 0,
  blocked_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id),
  sale_id uuid references public.sales(id),
  withdrawal_id uuid,
  type text not null check (type in ('sale_pending', 'release_available', 'withdrawal_requested', 'withdrawal_paid', 'withdrawal_rejected', 'refund', 'chargeback', 'adjustment')),
  amount_cents integer not null,
  balance_bucket text not null check (balance_bucket in ('pending', 'available', 'withdrawn', 'blocked')),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_transactions_seller on public.wallet_transactions(seller_id, created_at desc);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id),
  amount_cents integer not null check (amount_cents >= 5000),
  pix_key_type text not null,
  pix_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  admin_notes text
);
create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status, requested_at desc);
create index if not exists idx_withdrawal_requests_seller on public.withdrawal_requests(seller_id, requested_at desc);

create table if not exists public.platform_fees (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  sale_id uuid references public.sales(id),
  seller_id uuid references public.seller_profiles(id),
  amount_cents integer not null,
  fee_basis_points integer not null default 1000,
  status text not null default 'earned' check (status in ('pending', 'earned', 'refunded', 'chargeback')),
  created_at timestamptz not null default now()
);
create index if not exists idx_platform_fees_created on public.platform_fees(created_at desc);

create table if not exists public.content_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  content_type text not null check (content_type in ('novel', 'book', 'manga')),
  content_id text not null,
  source text not null check (source in ('purchase', 'subscription', 'admin', 'author_owner')),
  purchase_id uuid references public.purchases(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id, source)
);
create index if not exists idx_content_access_user on public.content_access_grants(user_id, content_type, content_id);
create index if not exists idx_content_access_content on public.content_access_grants(content_type, content_id);

-- MVP RLS: enable everywhere. Public client can only read/write its own rows; admin/server uses service role.
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_applications enable row level security;
alter table public.paid_works enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.purchases enable row level security;
alter table public.sales enable row level security;
alter table public.wallet_balances enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.platform_fees enable row level security;
alter table public.content_access_grants enable row level security;

-- Simple user-facing policies. Service role bypasses these for admin/payment webhooks.
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "seller read own" on public.seller_profiles;
create policy "seller read own" on public.seller_profiles for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "seller update own draft" on public.seller_profiles;
create policy "seller update own draft" on public.seller_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and status in ('draft', 'pending'));

drop policy if exists "seller applications read own" on public.seller_applications;
create policy "seller applications read own" on public.seller_applications for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "paid works public approved" on public.paid_works;
create policy "paid works public approved" on public.paid_works for select to anon, authenticated using (status = 'approved' and approval_status = 'approved');

drop policy if exists "paid works seller read own" on public.paid_works;
create policy "paid works seller read own" on public.paid_works for select to authenticated using (
  exists (select 1 from public.seller_profiles s where s.id = paid_works.seller_id and s.user_id = (select auth.uid()))
);

drop policy if exists "orders buyer read own" on public.orders;
create policy "orders buyer read own" on public.orders for select to authenticated using ((select auth.uid()) = buyer_id);

drop policy if exists "purchases buyer read own" on public.purchases;
create policy "purchases buyer read own" on public.purchases for select to authenticated using ((select auth.uid()) = buyer_id);

drop policy if exists "access grants read own" on public.content_access_grants;
create policy "access grants read own" on public.content_access_grants for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "wallet balances seller read own" on public.wallet_balances;
create policy "wallet balances seller read own" on public.wallet_balances for select to authenticated using (
  exists (select 1 from public.seller_profiles s where s.id = wallet_balances.seller_id and s.user_id = (select auth.uid()))
);

drop policy if exists "wallet tx seller read own" on public.wallet_transactions;
create policy "wallet tx seller read own" on public.wallet_transactions for select to authenticated using (
  exists (select 1 from public.seller_profiles s where s.id = wallet_transactions.seller_id and s.user_id = (select auth.uid()))
);
