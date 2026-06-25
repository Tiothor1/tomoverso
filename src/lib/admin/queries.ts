import { getDb } from "../db";
import type { AdminIntegrationRow, SiteSettings, StoreCollectionRow, StoreProductRow } from "./types";

export function getAdminOverview() {
  const db = getDb();
  return {
    users: (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c,
    novels: (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c,
    mangas: (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c,
    chapters: (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c,
    mangaChapters: (db.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c,
    comments: (db.prepare("SELECT COUNT(*) c FROM comments").get() as any).c,
    reports: (db.prepare("SELECT COUNT(*) c FROM reports WHERE status = 'pending'").get() as any).c,
    sessions: (db.prepare("SELECT COUNT(*) c FROM sessions").get() as any).c,
    activeNow: (db.prepare("SELECT COUNT(DISTINCT user_id) c FROM activity_log WHERE created_at > datetime('now', '-1 hour')").get() as any).c,
    hiddenCatalogItems: (db.prepare("SELECT COUNT(*) c FROM catalog_controls WHERE is_hidden = 1").get() as any).c,
    featuredCatalogItems: (db.prepare("SELECT COUNT(*) c FROM catalog_controls WHERE is_featured = 1").get() as any).c,
    storeProducts: (db.prepare("SELECT COUNT(*) c FROM store_products").get() as any).c,
    activeProducts: (db.prepare("SELECT COUNT(*) c FROM store_products WHERE status = 'active'").get() as any).c,
    storefrontCollections: (db.prepare("SELECT COUNT(*) c FROM store_collections").get() as any).c,
    suspendedUsers: (db.prepare("SELECT COUNT(*) c FROM user_access_controls WHERE is_suspended = 1").get() as any).c,
  };
}

export function getRecentAdminActivity(limit = 12) {
  const db = getDb();
  return db.prepare(`
    SELECT al.*, u.display_name, u.username
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT ?
  `).all(limit) as Array<any>;
}

export function getCatalogAdminRows(query = "", limit = 80) {
  const db = getDb();
  const like = `%${query.trim()}%`;
  const novels = db.prepare(`
    SELECT 'novel' as item_type, n.id, n.slug, n.title, n.type as subtype,
           n.cover_local_path, n.cover_url, n.views,
           COALESCE(cc.is_hidden, 0) as is_hidden,
           COALESCE(cc.is_featured, n.is_featured, 0) as is_featured,
           COALESCE(cc.show_on_home, 0) as show_on_home,
           COALESCE(cc.storefront_enabled, 0) as storefront_enabled,
           COALESCE(cc.storefront_label, '') as storefront_label,
           COALESCE(cc.sort_order, 0) as sort_order,
           n.updated_at
    FROM novels n
    LEFT JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
    WHERE (? = '%%' OR n.title LIKE ? OR n.slug LIKE ? OR n.synopsis LIKE ?)
    ORDER BY is_hidden ASC, is_featured DESC, show_on_home DESC, n.updated_at DESC
    LIMIT ?
  `).all(like, like, like, like, limit) as Array<any>;

  const mangas = db.prepare(`
    SELECT 'manga' as item_type, m.id, m.slug, m.title, 'manga' as subtype,
           m.cover_local_path, m.cover_url, 0 as views,
           COALESCE(cc.is_hidden, 0) as is_hidden,
           COALESCE(cc.is_featured, 0) as is_featured,
           COALESCE(cc.show_on_home, 0) as show_on_home,
           COALESCE(cc.storefront_enabled, 0) as storefront_enabled,
           COALESCE(cc.storefront_label, '') as storefront_label,
           COALESCE(cc.sort_order, 0) as sort_order,
           m.updated_at
    FROM mangas m
    LEFT JOIN catalog_controls cc ON cc.item_type='manga' AND cc.item_id = m.id
    WHERE (? = '%%' OR m.title LIKE ? OR m.slug LIKE ? OR m.synopsis LIKE ?)
    ORDER BY is_hidden ASC, is_featured DESC, show_on_home DESC, m.updated_at DESC
    LIMIT ?
  `).all(like, like, like, like, limit) as Array<any>;

  return [...novels, ...mangas].sort((a, b) => {
    if (a.is_hidden !== b.is_hidden) return a.is_hidden - b.is_hidden;
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    if (a.show_on_home !== b.show_on_home) return b.show_on_home - a.show_on_home;
    return String(b.updated_at).localeCompare(String(a.updated_at));
  }).slice(0, limit);
}

export function getUserAdminRows(query = "", limit = 80) {
  const db = getDb();
  const like = `%${query.trim()}%`;
  return db.prepare(`
    SELECT u.id, u.email, u.username, u.display_name, u.role, u.last_login_at, u.created_at,
           COALESCE(ac.is_suspended, 0) as is_suspended,
           ac.suspension_reason
    FROM users u
    LEFT JOIN user_access_controls ac ON ac.user_id = u.id
    WHERE (? = '%%' OR u.email LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)
    ORDER BY is_suspended DESC, u.created_at DESC
    LIMIT ?
  `).all(like, like, like, like, limit) as Array<any>;
}

export function getSiteSettingsRow() {
  const db = getDb();
  return db.prepare("SELECT * FROM site_settings WHERE id = 'default'").get() as SiteSettings | undefined;
}

export function getStoreProducts() {
  const db = getDb();
  return db.prepare(`SELECT * FROM store_products ORDER BY is_featured DESC, updated_at DESC, created_at DESC`).all() as StoreProductRow[];
}

export function getStoreCollections() {
  const db = getDb();
  return db.prepare(`SELECT * FROM store_collections ORDER BY is_featured DESC, updated_at DESC, created_at DESC`).all() as StoreCollectionRow[];
}

export function getCommerceStats() {
  const db = getDb();
  return {
    products: (db.prepare("SELECT COUNT(*) c FROM store_products").get() as any).c,
    activeProducts: (db.prepare("SELECT COUNT(*) c FROM store_products WHERE status = 'active'").get() as any).c,
    draftProducts: (db.prepare("SELECT COUNT(*) c FROM store_products WHERE status = 'draft'").get() as any).c,
    featuredProducts: (db.prepare("SELECT COUNT(*) c FROM store_products WHERE is_featured = 1").get() as any).c,
    collections: (db.prepare("SELECT COUNT(*) c FROM store_collections").get() as any).c,
    lowStock: (db.prepare("SELECT COUNT(*) c FROM store_products WHERE stock_qty <= 5 AND status = 'active'").get() as any).c,
  };
}

export function getVercelIntegration() {
  const db = getDb();
  return db.prepare("SELECT * FROM admin_integrations WHERE provider = 'vercel' LIMIT 1").get() as AdminIntegrationRow | undefined;
}
