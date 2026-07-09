import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { bundledVndbVisualNovels } from "@/lib/data/bundled-vndb-visual-novels";

function getDbDir(): string {
  // Na VPS/Docker, DB_DIR aponta para um volume persistente (/data).
  // Na Vercel, o filesystem é read-only fora de /tmp.
  if (process.env.DB_DIR) {
    return process.env.DB_DIR;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "/tmp/tomoverso";
  }
  return path.join(process.cwd(), "data");
}

const DB_DIR = getDbDir();
const DB_PATH = path.join(DB_DIR, "tomoverso.db");

// Em produção (Vercel): o caminho bundled é o "seed" commitado no repo
// (data/tomoverso.seed.db). Em dev: não tem seed, usa o DB local.
const SEED_PATH = (process.env.VERCEL || process.env.NODE_ENV === "production")
  ? path.join(process.cwd(), "data", "tomoverso.seed.db")
  : "";

declare global {
  // eslint-disable-next-line no-var
  var __tomoverso_db: Database.Database | undefined;
}

function createDb() {
  if (!existsSync(DB_DIR)) {
    try {
      mkdirSync(DB_DIR, { recursive: true });
    } catch (e) {
      // ignore em ambiente read-only
    }
  }

  // Em produção (Vercel), se /tmp/tomoverso.db não existe (cold start),
  // tenta copiar do seed (binário ou .gz comprimido).
  if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !existsSync(DB_PATH)) {
    if (SEED_PATH && existsSync(SEED_PATH)) {
      // Verifica se seed é LFS pointer (muito pequeno pra ser DB real)
      const seedStat = statSync(SEED_PATH);
      if (seedStat.size > 1024) {
        // Seed real
        try {
          console.log(`[db] Cold start: copying seed ${SEED_PATH} → ${DB_PATH}`);
          copyFileSync(SEED_PATH, DB_PATH);
        } catch (e) {
          console.error("[db] Seed copy failed:", e);
        }
      }
    }
    // Fallback: tenta .gz comprimido
    const gzPath = SEED_PATH + ".gz";
    if (!existsSync(DB_PATH) && existsSync(gzPath)) {
      try {
        console.log(`[db] Cold start: decompressing ${gzPath} → ${DB_PATH}`);
        const raw = gunzipSync(readFileSync(gzPath));
        writeFileSync(DB_PATH, raw);
        console.log(`[db] Decompressed ${(raw.length / 1024 / 1024).toFixed(0)}MB`);
      } catch (e) {
        console.error("[db] Gzip decompress failed:", e);
      }
    }
    if (!existsSync(DB_PATH)) {
      console.warn(`[db] No seed file — will auto-seed with empty DB`);
    }
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    -- Tabela de controle de migrations (idempotente)
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'author')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      preferred_locale TEXT DEFAULT 'pt-BR',
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- Novels (com type='visual-novel' + colunas de origem)
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      alternative_titles TEXT DEFAULT '[]',
      synopsis TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      cover_source_url TEXT,
      cover_local_path TEXT,
      author_id TEXT NOT NULL,
      source TEXT,
      source_id TEXT,
      source_url TEXT,
      type TEXT NOT NULL DEFAULT 'light-novel' CHECK (type IN ('light-novel', 'web-novel', 'short', 'visual-novel')),
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),
      genres TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      views INTEGER NOT NULL DEFAULT 0,
      rating_sum INTEGER NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      external_score REAL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
    CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author_id);
    CREATE INDEX IF NOT EXISTS idx_novels_featured ON novels(is_featured);
    CREATE INDEX IF NOT EXISTS idx_novels_source ON novels(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_novels_last_synced ON novels(last_synced_at);
    CREATE INDEX IF NOT EXISTS idx_novels_external_score ON novels(external_score);

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      volume_id TEXT,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, chapter_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_volume ON chapters(volume_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id TEXT,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_novel ON comments(novel_id);

    CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, novel_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('novel', 'chapter', 'comment', 'user')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Tabelas de ingestão (catálogo externo)
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('api', 'scrape')),
      base_url TEXT,
      rate_limit_per_sec REAL NOT NULL DEFAULT 1.0,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      last_run_status TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_links (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      external_url TEXT,
      match_confidence REAL NOT NULL DEFAULT 1.0,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source_id, external_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_source_links_novel ON source_links(novel_id);
    CREATE INDEX IF NOT EXISTS idx_source_links_source ON source_links(source_id, external_id);

    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      volume_number REAL NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
      chapter_count INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, volume_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_novel ON volumes(novel_id);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('genre', 'tag', 'theme')),
      source TEXT,
      external_id TEXT,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

    CREATE TABLE IF NOT EXISTS novel_tags (
      novel_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (novel_id, tag_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      source_name TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('initial', 'weekly', 'daily', 'manual')),
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      duration_ms INTEGER,
      items_found INTEGER NOT NULL DEFAULT 0,
      items_imported INTEGER NOT NULL DEFAULT 0,
      items_updated INTEGER NOT NULL DEFAULT 0,
      items_skipped INTEGER NOT NULL DEFAULT 0,
      items_failed INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON sync_runs(source_id);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs(status);

    CREATE TABLE IF NOT EXISTS sync_errors (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      external_id TEXT,
      error_type TEXT,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES sync_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sync_errors_run ON sync_errors(run_id);

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL,
      site_tagline TEXT NOT NULL,
      hero_badge TEXT NOT NULL,
      hero_title TEXT NOT NULL,
      hero_highlight TEXT NOT NULL,
      hero_description TEXT NOT NULL,
      primary_cta_label TEXT NOT NULL,
      primary_cta_href TEXT NOT NULL,
      secondary_cta_label TEXT NOT NULL,
      secondary_cta_href TEXT NOT NULL,
      publish_cta_label TEXT NOT NULL,
      publish_cta_href TEXT NOT NULL,
      footer_tagline TEXT NOT NULL,
      support_email TEXT NOT NULL,
      github_url TEXT,
      discord_url TEXT,
      telegram_url TEXT,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      maintenance_message TEXT NOT NULL DEFAULT '',
      storefront_enabled INTEGER NOT NULL DEFAULT 0,
      storefront_title TEXT NOT NULL DEFAULT 'Loja',
      storefront_description TEXT NOT NULL DEFAULT '',
      storefront_href TEXT NOT NULL DEFAULT '/store',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catalog_controls (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL CHECK (item_type IN ('novel', 'manga')),
      item_id TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      show_on_home INTEGER NOT NULL DEFAULT 0,
      storefront_enabled INTEGER NOT NULL DEFAULT 0,
      storefront_label TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_controls_lookup ON catalog_controls(item_type, item_id);
    CREATE INDEX IF NOT EXISTS idx_catalog_controls_home ON catalog_controls(item_type, show_on_home, is_featured, is_hidden);

    CREATE TABLE IF NOT EXISTS user_access_controls (
      user_id TEXT PRIMARY KEY,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      suspension_reason TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_integrations (
      provider TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      project_id TEXT,
      project_name TEXT,
      team_id TEXT,
      production_url TEXT,
      access_token TEXT,
      token_hint TEXT,
      status_json TEXT,
      last_checked_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      product_type TEXT NOT NULL CHECK (product_type IN ('book', 'manga', 'bundle', 'merch', 'digital')),
      source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'novel', 'manga')),
      source_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
      price_cents INTEGER NOT NULL DEFAULT 0,
      compare_at_cents INTEGER,
      currency TEXT NOT NULL DEFAULT 'BRL',
      stock_qty INTEGER NOT NULL DEFAULT 0,
      sku TEXT,
      cover_url TEXT,
      cover_local_path TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_store_products_status ON store_products(status, is_featured, updated_at);
    CREATE INDEX IF NOT EXISTS idx_store_products_source ON store_products(source_type, source_id);

    CREATE TABLE IF NOT EXISTS store_collections (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_collection_items (
      collection_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (collection_id, product_id),
      FOREIGN KEY (collection_id) REFERENCES store_collections(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_store_collection_items_sort ON store_collection_items(collection_id, sort_order);

    -- Planos de assinatura
    
    -- Site launch / maintenance config
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO site_config (key, value) VALUES ('launch_released', '0');
    INSERT OR IGNORE INTO site_config (key, value) VALUES ('site_title', 'Tomo Verso Editora');
    INSERT OR IGNORE INTO site_config (key, value) VALUES ('launch_target_time', '2026-07-09T22:00:00-03:00');
    INSERT OR IGNORE INTO site_config (key, value) VALUES ('promo_deadline', '2026-07-11T12:00:00-03:00');

CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
      features TEXT NOT NULL DEFAULT '[]',
      role_granted TEXT NOT NULL DEFAULT 'subscriber',
      badge_label TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'canceled', 'expired', 'past_due', 'trialing')),
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      mp_preference_id TEXT,
      mp_preapproval_id TEXT,
      mp_payment_id TEXT,
      mp_payer_email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      subscription_id TEXT,
      plan_name TEXT,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      payment_method TEXT,
      mp_payment_id TEXT,
      mp_status TEXT,
      mp_status_detail TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_mp ON payment_transactions(mp_payment_id);

    -- Marketplace MVP: seller approval + finance ledger bridge.
    -- Supabase Postgres is the durable target; these local tables keep dev/build working without secrets.
    CREATE TABLE IF NOT EXISTS seller_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'suspended')),
      legal_name TEXT NOT NULL,
      public_name TEXT NOT NULL,
      pix_key_type TEXT NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
      pix_key TEXT NOT NULL,
      payout_notes TEXT DEFAULT '',
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status, created_at);

    CREATE TABLE IF NOT EXISTS seller_applications (
      id TEXT PRIMARY KEY,
      seller_id TEXT,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
      message TEXT DEFAULT '',
      reviewed_by TEXT,
      reviewed_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seller_applications_user ON seller_applications(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status, created_at);

    CREATE TABLE IF NOT EXISTS platform_fee_rules (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      fee_basis_points INTEGER NOT NULL DEFAULT 1000,
      min_withdrawal_cents INTEGER NOT NULL DEFAULT 5000,
      settlement_delay_days INTEGER NOT NULL DEFAULT 7,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO platform_fee_rules (id, label, fee_basis_points, min_withdrawal_cents, settlement_delay_days, is_active)
    VALUES ('default', 'Tomo Verso Editora Marketplace MVP', 1000, 5000, 7, 1);

    CREATE TABLE IF NOT EXISTS paid_works (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL CHECK (content_type IN ('novel', 'book', 'manga')),
      content_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 490),
      currency TEXT NOT NULL DEFAULT 'BRL',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
      approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (content_type, content_id),
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_paid_works_status ON paid_works(status, approval_status, created_at);
    CREATE INDEX IF NOT EXISTS idx_paid_works_seller ON paid_works(seller_id, created_at);

    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id TEXT PRIMARY KEY,
      order_code TEXT UNIQUE NOT NULL,
      buyer_id TEXT NOT NULL,
      checkout_type TEXT NOT NULL DEFAULT 'work_purchase' CHECK (checkout_type IN ('work_purchase', 'subscription')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback')),
      gross_amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BRL',
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      provider_preference_id TEXT,
      provider_payment_id TEXT,
      external_reference TEXT UNIQUE,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON marketplace_orders(buyer_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status, created_at);

    CREATE TABLE IF NOT EXISTS marketplace_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      paid_work_id TEXT,
      seller_id TEXT,
      content_type TEXT NOT NULL CHECK (content_type IN ('novel', 'book', 'manga', 'subscription')),
      content_id TEXT NOT NULL,
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      gross_amount_cents INTEGER NOT NULL DEFAULT 0,
      platform_fee_basis_points INTEGER NOT NULL DEFAULT 1000,
      platform_fee_amount_cents INTEGER NOT NULL DEFAULT 0,
      mp_fee_amount_cents INTEGER NOT NULL DEFAULT 0,
      author_net_amount_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_work_id) REFERENCES paid_works(id) ON DELETE SET NULL,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      order_id TEXT,
      paid_work_id TEXT,
      content_type TEXT NOT NULL CHECK (content_type IN ('novel', 'book', 'manga')),
      content_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'refunded', 'revoked')),
      granted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (buyer_id, content_type, content_id),
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL,
      FOREIGN KEY (paid_work_id) REFERENCES paid_works(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_purchases_content ON purchases(content_type, content_id, status);

    CREATE TABLE IF NOT EXISTS marketplace_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      buyer_id TEXT,
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      provider_payment_id TEXT UNIQUE,
      provider_preference_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback')),
      status_detail TEXT,
      payment_method TEXT,
      gross_amount_cents INTEGER NOT NULL DEFAULT 0,
      mp_fee_amount_cents INTEGER NOT NULL DEFAULT 0,
      net_received_cents INTEGER,
      raw_payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_sales (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_item_id TEXT,
      paid_work_id TEXT,
      content_type TEXT NOT NULL CHECK (content_type IN ('novel', 'book', 'manga')),
      content_id TEXT NOT NULL,
      gross_amount_cents INTEGER NOT NULL,
      mp_fee_amount_cents INTEGER NOT NULL DEFAULT 0,
      platform_fee_basis_points INTEGER NOT NULL DEFAULT 1000,
      platform_fee_amount_cents INTEGER NOT NULL,
      author_net_amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'refunded', 'chargeback')),
      available_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES marketplace_order_items(id) ON DELETE SET NULL,
      FOREIGN KEY (paid_work_id) REFERENCES paid_works(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_sales_seller ON marketplace_sales(seller_id, status, created_at);

    CREATE TABLE IF NOT EXISTS wallet_balances (
      seller_id TEXT PRIMARY KEY,
      pending_cents INTEGER NOT NULL DEFAULT 0,
      available_cents INTEGER NOT NULL DEFAULT 0,
      withdrawn_cents INTEGER NOT NULL DEFAULT 0,
      blocked_cents INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      sale_id TEXT,
      withdrawal_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('sale_pending', 'release_available', 'withdrawal_requested', 'withdrawal_paid', 'withdrawal_rejected', 'refund', 'chargeback', 'adjustment')),
      amount_cents INTEGER NOT NULL,
      balance_bucket TEXT NOT NULL CHECK (balance_bucket IN ('pending', 'available', 'withdrawn', 'blocked')),
      description TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES marketplace_sales(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_seller ON wallet_transactions(seller_id, created_at);

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 5000),
      pix_key_type TEXT NOT NULL,
      pix_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      paid_at TEXT,
      rejection_reason TEXT,
      admin_notes TEXT,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at);

    CREATE TABLE IF NOT EXISTS platform_fees (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      sale_id TEXT,
      seller_id TEXT,
      amount_cents INTEGER NOT NULL,
      fee_basis_points INTEGER NOT NULL DEFAULT 1000,
      status TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('pending', 'earned', 'refunded', 'chargeback')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL,
      FOREIGN KEY (sale_id) REFERENCES marketplace_sales(id) ON DELETE SET NULL,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS content_access_grants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK (content_type IN ('novel', 'book', 'manga')),
      content_id TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('purchase', 'subscription', 'admin', 'author_owner')),
      purchase_id TEXT,
      starts_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, content_type, content_id, source),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_content_access_user ON content_access_grants(user_id, content_type, content_id);

    -- Seed planos padrao: publicar continua gratis; planos pagos vendem vantagem criativa/profissional.
    INSERT OR IGNORE INTO subscription_plans (id, name, description, price_cents, interval, features, role_granted, badge_label, sort_order)
    VALUES
      ('leitor-monthly', 'Leitor', 'Leitura mais confortavel, sem anuncios e com badge de apoiador.', 990, 'month', '["Zero anuncios no site inteiro","Badge Leitor em comentarios","Tema sepia para leitura","Suporte via e-mail prioritario"]', 'subscriber', 'Leitor', 1),
      ('pro-monthly', 'Pro Leitor', 'Experiencia premium de leitura por um preco mais acessivel.', 1490, 'month', '["Zero anuncios no site inteiro","Badge Pro em comentarios e perfil","Baixar capitulos em .txt para ler offline","Modo leitura premium","Cores exclusivas","Comentario com destaque","Suporte prioritario"]', 'subscriber', 'Pro', 2),
      ('pro-yearly', 'Pro Leitor Anual', 'Tudo do Pro Leitor com 3 meses gratis. Pague 9 meses e leve 12.', 13410, 'year', '["Todos os beneficios do Pro Leitor","3 meses gratis","Equivale a R$ 11,18 por mes"]', 'subscriber', 'Pro', 3),
      ('author-monthly', 'Autor+', 'Ferramentas profissionais para criar, polir e divulgar obras. Publicar continua gratis para todos.', 1990, 'month', '["Central de ideias para premissas, personagens, poderes e arcos","Assistente editorial para titulo, sinopse, tags e gancho","Pack de assets com capas, banners, divisorias, fichas e prompts","Trilhas guiadas para criar sua primeira obra","Estatisticas avancadas de autor","Perfil premium com selo Autor+","Destaque leve de descoberta sem bloquear autores gratuitos"]', 'author', 'Autor+', 4),
      ('author-yearly', 'Autor+ Anual', '12 meses de Autor+ com 3 meses gratis. Pague 9 meses e use o ano inteiro.', 17910, 'year', '["Todos os beneficios do Autor+","3 meses gratis no anual","12 meses de Central de Ideias, Assistente Editorial e Assets","Melhor custo-beneficio para autores recorrentes"]', 'author', 'Autor+', 5);

    UPDATE subscription_plans SET name = 'Pro Leitor', description = 'Experiencia premium de leitura por um preco mais acessivel.', price_cents = 1490, badge_label = 'Pro', role_granted = 'subscriber', features = '["Zero anuncios no site inteiro","Badge Pro em comentarios e perfil","Baixar capitulos em .txt para ler offline","Modo leitura premium","Cores exclusivas","Comentario com destaque","Suporte prioritario"]', sort_order = 2 WHERE id = 'pro-monthly';
    UPDATE subscription_plans SET name = 'Pro Leitor Anual', description = 'Tudo do Pro Leitor com 3 meses gratis. Pague 9 meses e leve 12.', price_cents = 13410, badge_label = 'Pro', role_granted = 'subscriber', features = '["Todos os beneficios do Pro Leitor","3 meses gratis","Equivale a R$ 11,18 por mes"]', sort_order = 3 WHERE id = 'pro-yearly';
    UPDATE subscription_plans SET description = 'Ferramentas profissionais para criar, polir e divulgar obras. Publicar continua gratis para todos.', name = 'Autor+', price_cents = 1990, badge_label = 'Autor+', role_granted = 'author', features = '["Central de ideias para premissas, personagens, poderes e arcos","Assistente editorial para titulo, sinopse, tags e gancho","Pack de assets com capas, banners, divisorias, fichas e prompts","Trilhas guiadas para criar sua primeira obra","Estatisticas avancadas de autor","Perfil premium com selo Autor+","Destaque leve de descoberta sem bloquear autores gratuitos"]', sort_order = 4 WHERE id = 'author-monthly';
    INSERT OR IGNORE INTO subscription_plans (id, name, description, price_cents, interval, features, role_granted, badge_label, sort_order) VALUES ('author-yearly', 'Autor+ Anual', '12 meses de Autor+ com 3 meses gratis. Pague 9 meses e use o ano inteiro.', 17910, 'year', '["Todos os beneficios do Autor+","3 meses gratis no anual","12 meses de Central de Ideias, Assistente Editorial e Assets","Melhor custo-beneficio para autores recorrentes"]', 'author', 'Autor+', 5);
    UPDATE subscription_plans SET name = 'Autor+ Anual', description = '12 meses de Autor+ com 3 meses gratis. Pague 9 meses e use o ano inteiro.', price_cents = 17910, interval = 'year', badge_label = 'Autor+', role_granted = 'author', features = '["Todos os beneficios do Autor+","3 meses gratis no anual","12 meses de Central de Ideias, Assistente Editorial e Assets","Melhor custo-beneficio para autores recorrentes"]', sort_order = 5, is_active = 1 WHERE id = 'author-yearly';
    UPDATE subscription_plans SET features = REPLACE(features, 'Obras ilimitadas', 'Publicacao gratuita ja e ilimitada') WHERE id IN ('pro-monthly','pro-yearly','author-monthly','author-yearly');

    -- Codigos de verificacao de email
    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'email_verification' CHECK (purpose IN ('email_verification', 'password_reset')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, code);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

    -- Livros
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      synopsis TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      cover_local_path TEXT,
      genres TEXT NOT NULL DEFAULT '[]',
      pages INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'pt-BR',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
    CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);

    -- Contests (concursos literários)
    CREATE TABLE IF NOT EXISTS contests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      prize TEXT NOT NULL DEFAULT '',
      rules TEXT NOT NULL DEFAULT '',
      work_type TEXT NOT NULL DEFAULT 'novel' CHECK (work_type IN ('novel', 'manga')),
      banner_url TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      max_submissions_per_user INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_contests_active ON contests(is_active, start_date, end_date);

    CREATE TABLE IF NOT EXISTS contest_submissions (
      id TEXT PRIMARY KEY,
      contest_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      work_type TEXT NOT NULL CHECK (work_type IN ('novel', 'manga')),
      work_id TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (contest_id, user_id, work_type, work_id),
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest ON contest_submissions(contest_id);
    CREATE INDEX IF NOT EXISTS idx_contest_submissions_user ON contest_submissions(user_id, contest_id);

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
  `);

  migrateUserSubscriptionsPendingStatus(db);
  applyBundledCentralNovelCovers(db);
  applyBundledVndbVisualNovels(db);

  // Migration v2: is_original e curation_label
  const v2 = db.prepare("SELECT applied_at FROM migrations WHERE name = 'v2_content_curation'").get() as any;
  if (!v2) {
    try {
      db.exec("ALTER TABLE catalog_controls ADD COLUMN is_original INTEGER NOT NULL DEFAULT 0");
    } catch {}
    try {
      db.exec("ALTER TABLE catalog_controls ADD COLUMN curation_label TEXT");
    } catch {}
    try {
      db.exec("ALTER TABLE novels ADD COLUMN is_original INTEGER NOT NULL DEFAULT 0");
    } catch {}
    try {
      db.exec("ALTER TABLE mangas ADD COLUMN is_original INTEGER NOT NULL DEFAULT 0");
    } catch {}
    db.prepare("INSERT OR IGNORE INTO migrations (name) VALUES ('v2_content_curation')").run();
  }

  const settingsRow = db.prepare("SELECT id FROM site_settings WHERE id = 'default'").get() as { id: string } | undefined;
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO site_settings (
        id, site_name, site_tagline, hero_badge, hero_title, hero_highlight, hero_description,
        primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
        publish_cta_label, publish_cta_href, footer_tagline, support_email, github_url,
        discord_url, telegram_url, maintenance_mode, maintenance_message,
        storefront_enabled, storefront_title, storefront_description, storefront_href
      ) VALUES (
        'default', 'Tomo Verso Editora', 'onde histórias ganham vida.', 'Catálogo BR com leitura real', 'Tomo Verso Editora', 'onde histórias ganham vida.',
        'Catálogo brasileiro com leitor por páginas, busca rápida e conteúdo que realmente dá pra ler.',
        'Ler mangás', '/manga', 'Explorar novels', '/explore', 'Publicar', '/auth/signup',
        'Onde Light Novels brasileiras ganham vida. Pra autores iniciantes e leitores apaixonados.',
        'contato@tomoverso.com', NULL, NULL, NULL, 0,
        'Estamos fazendo ajustes no painel e na loja. Algumas áreas podem mudar ao longo do dia.',
        1, 'Loja Tomo Verso Editora',
        'Prepare o catálogo para vender livros, mangás, bundles e edições digitais a partir do mesmo painel.',
        '/store'
      )
    `).run();
  }

  const vercelIntegration = db.prepare("SELECT provider FROM admin_integrations WHERE provider = 'vercel'").get() as { provider: string } | undefined;
  if (!vercelIntegration) {
    db.prepare(`INSERT INTO admin_integrations (provider, label) VALUES ('vercel', 'Vercel')`).run();
  }

  // Migration: add preferred_locale to users if missing (SQLite ALTER TABLE is idempotent via try/catch)
  try {
    db.exec("ALTER TABLE users ADD COLUMN preferred_locale TEXT DEFAULT 'pt-BR'");
  } catch {
    // Column already exists — safe to ignore
  }

  // Auto-seed se banco vazio (em produção, na primeira vez)
  if (process.env.SEED !== "false" && (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c === 0) {
    try {
      seedDatabase(db);
    } catch (e) {
      console.error("Seed error:", e);
    }
  }

  return db;
}

function migrateUserSubscriptionsPendingStatus(db: Database.Database) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_subscriptions'").get() as { sql?: string } | undefined;
  if (!row?.sql || row.sql.includes("'pending'")) return;

  console.log("[db] Migrating user_subscriptions status CHECK to include pending");
  db.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE IF NOT EXISTS user_subscriptions_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'canceled', 'expired', 'past_due', 'trialing')),
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      mp_preference_id TEXT,
      mp_preapproval_id TEXT,
      mp_payment_id TEXT,
      mp_payer_email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );
    INSERT INTO user_subscriptions_new (
      id, user_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, mp_preference_id, mp_preapproval_id, mp_payment_id, mp_payer_email, created_at, updated_at
    )
    SELECT id, user_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, mp_preference_id, NULL, mp_payment_id, mp_payer_email, created_at, updated_at
    FROM user_subscriptions;
    DROP TABLE user_subscriptions;
    ALTER TABLE user_subscriptions_new RENAME TO user_subscriptions;
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
    PRAGMA foreign_keys=ON;
  `);
}

function applyBundledCentralNovelCovers(db: Database.Database) {
  const covers: Array<[string, string, string]> = [
    ["cn-a-returners-magic-should-be-special", "/uploads/novels/centralnovel/cn-a-returners-magic-should-be-special-cover.webp", "https://centralnovel.com/wp-content/uploads/2022/07/A-Returners-Magic-Should-Be-Special-CAPA-CENTRAL.png"],
    ["cn-a-will-eternal-20230516", "/uploads/novels/centralnovel/cn-a-will-eternal-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/07/A-Will-Eternal-capa-central.png"],
    ["cn-against-the-gods-20230516", "/uploads/novels/centralnovel/cn-against-the-gods-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/06/Against-the-Gods-capa-central.png"],
    ["cn-ancient-godly-monarch-20230928", "/uploads/novels/centralnovel/cn-ancient-godly-monarch-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/11/Ancient-Godly-Monarch-CAPA-CENTRAL.png"],
    ["cn-battle-through-the-heavens-20230516", "/uploads/novels/centralnovel/cn-battle-through-the-heavens-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/07/Battle-Through-the-Heavens-capa-central.png"],
    ["cn-birth-of-the-demonic-sword-20230928", "/uploads/novels/centralnovel/cn-birth-of-the-demonic-sword-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/07/Birth-of-the-Demonic-Sword-capa-central.png"],
    ["cn-bringing-the-farm-to-live-in-another-world-20230928", "/uploads/novels/centralnovel/cn-bringing-the-farm-to-live-in-another-world-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/11/Bringing-The-Farm-To-Live-In-Another-World-capa-central.png"],
    ["cn-classroom-of-the-elite", "/uploads/novels/centralnovel/cn-classroom-of-the-elite-cover.webp", "https://centralnovel.com/wp-content/uploads/2026/04/Classroom-of-the-Elite-capa-central.png"],
    ["cn-coiling-dragon-20230516", "/uploads/novels/centralnovel/cn-coiling-dragon-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/07/Coiling-Dragon-capa-central.png"],
    ["cn-commanding-wind-and-cloud-20230928", "/uploads/novels/centralnovel/cn-commanding-wind-and-cloud-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/11/Commanding-Wind-and-Cloud-capa-central.png"],
    ["cn-cult-of-the-sacred-runes", "/uploads/novels/centralnovel/cn-cult-of-the-sacred-runes-cover.webp", "https://centralnovel.com/wp-content/uploads/2022/10/Cult-of-the-Sacred-Runes-CAPA-CENTRAL.png"],
    ["cn-demon-king", "/uploads/novels/centralnovel/cn-demon-king-cover.webp", "https://centralnovel.com/wp-content/uploads/2024/08/Demon-King-CAPA-CENTRAL.png"],
    ["cn-dual-cultivation-20230516", "/uploads/novels/centralnovel/cn-dual-cultivation-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2022/06/Dual-Cultivation-capa-central.png"],
    ["cn-king-of-gods-20240505", "/uploads/novels/centralnovel/cn-king-of-gods-20240505-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/06/King-of-Gods-capa-central.png"],
    ["cn-lord-of-mysteries-20240505", "/uploads/novels/centralnovel/cn-lord-of-mysteries-20240505-cover.webp", "https://centralnovel.com/wp-content/uploads/2023/04/Lord-of-Mysteries-capa-central.png"],
    ["cn-martial-world-20230928", "/uploads/novels/centralnovel/cn-martial-world-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/06/Martial-World-capa-central.png"],
    ["cn-overgeared-20230516", "/uploads/novels/centralnovel/cn-overgeared-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/06/Overgeared-CAPA-CENTRAL.png"],
    ["cn-release-that-witch-20230516", "/uploads/novels/centralnovel/cn-release-that-witch-20230516-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/06/Release-that-Witch-capa-central.png"],
    ["cn-shadow-slave-20230928", "/uploads/novels/centralnovel/cn-shadow-slave-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2023/03/Shadow-Slave-capa-central.png"],
    ["cn-supreme-magus-20230928", "/uploads/novels/centralnovel/cn-supreme-magus-20230928-cover.webp", "https://centralnovel.com/wp-content/uploads/2021/07/Supreme-Magus-capa-central.png"],
    ["cn-yahari-ore-no-seishun-love-comedy-wa-machigatteiru", "/uploads/novels/centralnovel/cn-yahari-ore-no-seishun-love-comedy-wa-machigatteiru-cover.webp", "https://centralnovel.com/wp-content/uploads/2026/06/Yahari-Ore-no-Seishun-Love-Comedy-wa-Machigatteiru-capa-central.png"],
    ["cn-yuusha-party-wo-oidasareta-kiyoubinbou", "/uploads/novels/centralnovel/cn-yuusha-party-wo-oidasareta-kiyoubinbou-cover.webp", "https://centralnovel.com/wp-content/uploads/2026/06/Yuusha-Party-wo-Oidasareta-Kiyoubinbou-capa-central.png"],
  ];

  const update = db.prepare(`
    UPDATE novels
    SET cover_url = ?, cover_local_path = ?, cover_source_url = ?, updated_at = datetime('now')
    WHERE slug = ?
      AND (cover_local_path IS NULL OR trim(cover_local_path) = '' OR cover_local_path LIKE '%.svg' OR cover_local_path LIKE '%placeholder%')
      AND (cover_url IS NULL OR trim(cover_url) = '' OR cover_url LIKE '%.svg' OR cover_url LIKE '%placeholder%')
  `);

  const tx = db.transaction(() => {
    for (const [slug, localPath, sourceUrl] of covers) {
      update.run(localPath, localPath, sourceUrl, slug);
    }
    const junk = db.prepare("SELECT id FROM novels WHERE slug = 'cn-list-mode'").get() as { id: string } | undefined;
    if (junk) {
      db.prepare(`
        INSERT OR IGNORE INTO catalog_controls (id, item_type, item_id, is_hidden, updated_at)
        VALUES ('hide-cn-list-mode', 'novel', ?, 1, datetime('now'))
      `).run(junk.id);
      db.prepare(`
        UPDATE catalog_controls
        SET is_hidden = 1, updated_at = datetime('now')
        WHERE item_type = 'novel' AND item_id = ?
      `).run(junk.id);
    }
  });

  tx();
}

function applyBundledVndbVisualNovels(db: Database.Database) {
  if (bundledVndbVisualNovels.length === 0) return;

  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
  if (!admin) return;

  let source = db.prepare("SELECT id FROM sources WHERE name = 'vndb'").get() as { id: string } | undefined;
  if (!source) {
    db.prepare(`
      INSERT INTO sources (id, name, display_name, type, base_url, rate_limit_per_sec, enabled, config)
      VALUES ('source-vndb', 'vndb', 'Visual Novel Database', 'api', 'https://api.vndb.org/kana', 5, 1, '{"source":"https://api.vndb.org/kana"}')
    `).run();
    source = { id: 'source-vndb' };
  }

  const insertNovel = db.prepare(`
    INSERT OR IGNORE INTO novels (
      id, slug, title, alternative_titles, synopsis,
      cover_url, cover_source_url, cover_local_path,
      author_id, source, source_id, source_url,
      type, status, genres, tags,
      external_score, is_featured, is_approved,
      last_synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'vndb', ?, ?, 'visual-novel', ?, ?, ?, ?, 0, 1, datetime('now'), ?, datetime('now'))
  `);
  const updateNovel = db.prepare(`
    UPDATE novels
    SET cover_url = ?, cover_local_path = ?, cover_source_url = ?, updated_at = datetime('now')
    WHERE source = 'vndb' AND source_id = ?
      AND (cover_local_path IS NULL OR trim(cover_local_path) = '' OR cover_local_path NOT LIKE '/uploads/novels/vndb/%')
  `);
  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO source_links (id, novel_id, source_id, external_id, external_url, match_confidence, last_synced_at)
    VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))
  `);

  const tx = db.transaction(() => {
    for (const vn of bundledVndbVisualNovels) {
      insertNovel.run(
        vn.id,
        vn.slug,
        vn.title,
        JSON.stringify(vn.alternativeTitles),
        vn.synopsis.slice(0, 5000),
        vn.coverLocalPath,
        vn.coverSourceUrl,
        vn.coverLocalPath,
        admin.id,
        vn.sourceId,
        vn.sourceUrl,
        vn.status,
        JSON.stringify(vn.genres),
        JSON.stringify(vn.tags),
        vn.externalScore,
        vn.createdAt
      );
      updateNovel.run(vn.coverLocalPath, vn.coverLocalPath, vn.coverSourceUrl, vn.sourceId);
      insertLink.run(`vndb-${vn.sourceId}`, vn.id, source!.id, vn.sourceId, vn.sourceUrl);
    }
  });

  tx();
}

function seedDatabase(db: Database.Database) {
  const { hashPassword } = require("./auth-helpers");
  const now = new Date().toISOString();
  const fabioId = "fabio-texeira-2026";

  // Cria admin
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name, role, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    fabioId,
    "fabio@tomoverso.com",
    "fabio_tx",
    hashPassword("tomoverso2026"),
    "Fábio Teixeira",
    "admin",
    "Criador do Tomoverso. Escritor de Light Novels."
  );

  // Novels
  const novels = [
    {
      id: "o-que-eu-desenhei-existe",
      slug: "o-que-eu-desenhei-existe",
      title: "O Que Eu Desenhei, Existe",
      alt: ["OQEDE"],
      synopsis: "Yumi, 23 anos, é uma desenhista brasileira que nunca conseguiu publicar um mangá. Sobrevive de freela e tem um caderno velho, herdado da avó, onde desde os 12 anos desenhou um mundo inteiro de fantasia. Um dia, ela descobre que o que ela desenha com a mão esquerda vira real numa dimensão espelho — e que já existem pessoas lá idênticas aos personagens que ela inventou quando era criança. O reino que ela criou está em guerra civil. O vilão que ela desenhou está ganhando. E o herói que ela idealizou como 'interesse amoroso ideal' aos 14 anos está lá, esperando alguém que nunca veio. Yumi nunca terminou a história. E agora, o que ela fizer no caderno decide o destino de um mundo cheio de gente que ela mesma inventou.",
      genres: ["Fantasia", "Drama", "Slice of Life", "Sobrenatural"],
      tags: ["isekai-reverso", "criador-como-protagonista", "meta-narrativa", "romance-lento"],
      featured: 1,
    },
    {
      id: "dublador-de-almas",
      slug: "dublador-de-almas",
      title: "Dublador de Almas",
      alt: [],
      synopsis: "Diego, dublador brasileiro de anime, morre e acorda num mundo medieval em guerra — onde sua habilidade de imitar qualquer voz é a arma mais poderosa que existe.",
      genres: ["Fantasia", "Comédia", "Ação", "Isekai"],
      tags: ["dublador", "comédia", "meta-humor"],
      featured: 1,
    },
    {
      id: "sistema-ultima-posicao",
      slug: "sistema-ultima-posicao",
      title: "Sistema: Última Posição",
      alt: [],
      synopsis: "Kai é o único caçador preso no rank mais baixo por uma década. Até que copia, sem querer, a habilidade do monstro mais forte que existe.",
      genres: ["Ação", "Sistema", "Fantasia"],
      tags: ["underdog", "revenge", "level-up"],
      featured: 1,
    },
  ];

  const insertNovel = db.prepare(`
    INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, genres, tags, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of novels) {
    insertNovel.run(
      n.id, n.slug, n.title, JSON.stringify(n.alt), n.synopsis,
      `/covers/${n.slug}.jpg`, fabioId, "light-novel", "ongoing",
      JSON.stringify(n.genres), JSON.stringify(n.tags), n.featured
    );
  }

  // Capítulos
  const insertChapter = db.prepare(`
    INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertChapter.run(
    "oqede-cap-1", "o-que-eu-desenhei-existe", 1, "O Caderno da Avó",
    `O caderno estava dentro de uma caixa de sapatos, no fundo do armário da avó, embrulhado em três camadas de plástico-bolha e uma carta que ninguém tinha aberto em vinte e três anos.

Yumi só foi encontrá-lo porque o apartamento novo era pequeno demais pra guardar mais do que o essencial — e a mãe tinha jogado a caixa no canto da sala com um "cuida disso quando puder, filha, eu não tenho espaço emocional pra mais um objeto da tua avó" que era simultaneamente um favor e um sumiço.

O caderno tinha capa de couro falso, gasto nos cantos, e uma presilha de metal que não fechava mais. Na primeira página, uma caligrafia inclinada e redonda que Yumi não reconhecia de nenhum parente:

*"Para quem encontrar: isto não é meu. Mas é de alguém. Toma cuidado."*

Abaixo, com outra caneta, num garrancho de criança:

*"Pra mim mesma — se eu esquecer. NÃO ESQUECE."*

Yumi riu sozinha, no chão do apartamento, com uma caixa de pizza vazia do lado e a luz do corredor entrando pela porta entreaberta. A avó sempre foi dramática.

E na última página, uma única frase, na mesma caligrafia inclinada da primeira:

*"Você vai entender quando chegar lá."*

Quando acordou, o caderno estava embaixo do travesseiro. E na última página em branco, onde antes não tinha nada, agora tinha um desenho que ela não tinha feito:

Um rosto. Olhando pra ela.

Era o rosto do herói que ela tinha inventado aos 14. O interesse amoroso ideal, loiro, olhos azuis, sorriso torto, com uma cicatriz fina cortando a sobrancelha esquerda.

Ela lembrava do nome dele. Tinha dado um nome a ele, anos atrás.

Arlén.`,
    1850, now
  );
}

export function getDb(): Database.Database {
  if (!global.__tomoverso_db) {
    global.__tomoverso_db = createDb();
  }
  return global.__tomoverso_db;
}
