import { getDb } from "./db";
import { DEFAULT_SITE_SETTINGS } from "./admin/defaults";
import type { CatalogControlRow, SiteSettings } from "./admin/types";

function ensureSiteSettingsRow() {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM site_settings WHERE id = 'default'").get() as { id: string } | undefined;
  if (existing) return;
  db.prepare(`
    INSERT INTO site_settings (
      id, site_name, site_tagline, hero_badge, hero_title, hero_highlight, hero_description,
      primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
      publish_cta_label, publish_cta_href, footer_tagline, support_email, github_url,
      discord_url, telegram_url, maintenance_mode, maintenance_message,
      storefront_enabled, storefront_title, storefront_description, storefront_href
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEFAULT_SITE_SETTINGS.id,
    DEFAULT_SITE_SETTINGS.site_name,
    DEFAULT_SITE_SETTINGS.site_tagline,
    DEFAULT_SITE_SETTINGS.hero_badge,
    DEFAULT_SITE_SETTINGS.hero_title,
    DEFAULT_SITE_SETTINGS.hero_highlight,
    DEFAULT_SITE_SETTINGS.hero_description,
    DEFAULT_SITE_SETTINGS.primary_cta_label,
    DEFAULT_SITE_SETTINGS.primary_cta_href,
    DEFAULT_SITE_SETTINGS.secondary_cta_label,
    DEFAULT_SITE_SETTINGS.secondary_cta_href,
    DEFAULT_SITE_SETTINGS.publish_cta_label,
    DEFAULT_SITE_SETTINGS.publish_cta_href,
    DEFAULT_SITE_SETTINGS.footer_tagline,
    DEFAULT_SITE_SETTINGS.support_email,
    DEFAULT_SITE_SETTINGS.github_url,
    DEFAULT_SITE_SETTINGS.discord_url,
    DEFAULT_SITE_SETTINGS.telegram_url,
    DEFAULT_SITE_SETTINGS.maintenance_mode,
    DEFAULT_SITE_SETTINGS.maintenance_message,
    DEFAULT_SITE_SETTINGS.storefront_enabled,
    DEFAULT_SITE_SETTINGS.storefront_title,
    DEFAULT_SITE_SETTINGS.storefront_description,
    DEFAULT_SITE_SETTINGS.storefront_href,
  );
}

export function getSiteConfig(): SiteSettings {
  ensureSiteSettingsRow();
  const db = getDb();
  const row = db.prepare("SELECT * FROM site_settings WHERE id = 'default'").get() as SiteSettings | undefined;
  return row || { ...DEFAULT_SITE_SETTINGS };
}

export function getCatalogControl(itemType: "novel" | "manga", itemId: string): CatalogControlRow | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM catalog_controls WHERE item_type = ? AND item_id = ?"
  ).get(itemType, itemId) as CatalogControlRow | undefined;
  return row || null;
}

export function isCatalogHidden(itemType: "novel" | "manga", itemId: string): boolean {
  const row = getCatalogControl(itemType, itemId);
  return !!row?.is_hidden;
}
