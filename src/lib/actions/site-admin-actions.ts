"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { adminLog, requireAdminUser, touchPublicRoutes } from "./_admin-utils";

export async function updateSiteConfigAction(formData: FormData) {
  const user = await requireAdminUser();
  const db = getDb();

  const data = {
    site_name: String(formData.get("site_name") || "Tomo Verso Editora").trim(),
    site_tagline: String(formData.get("site_tagline") || "").trim(),
    hero_badge: String(formData.get("hero_badge") || "").trim(),
    hero_title: String(formData.get("hero_title") || "").trim(),
    hero_highlight: String(formData.get("hero_highlight") || "").trim(),
    hero_description: String(formData.get("hero_description") || "").trim(),
    primary_cta_label: String(formData.get("primary_cta_label") || "").trim(),
    primary_cta_href: String(formData.get("primary_cta_href") || "/manga").trim(),
    secondary_cta_label: String(formData.get("secondary_cta_label") || "").trim(),
    secondary_cta_href: String(formData.get("secondary_cta_href") || "/explore").trim(),
    publish_cta_label: String(formData.get("publish_cta_label") || "").trim(),
    publish_cta_href: String(formData.get("publish_cta_href") || "/auth/signup").trim(),
    footer_tagline: String(formData.get("footer_tagline") || "").trim(),
    support_email: String(formData.get("support_email") || "").trim(),
    github_url: String(formData.get("github_url") || "").trim() || null,
    discord_url: String(formData.get("discord_url") || "").trim() || null,
    telegram_url: String(formData.get("telegram_url") || "").trim() || null,
    maintenance_mode: formData.get("maintenance_mode") ? 1 : 0,
    maintenance_message: String(formData.get("maintenance_message") || "").trim(),
    storefront_enabled: formData.get("storefront_enabled") ? 1 : 0,
    storefront_title: String(formData.get("storefront_title") || "").trim(),
    storefront_description: String(formData.get("storefront_description") || "").trim(),
    storefront_href: String(formData.get("storefront_href") || "/store").trim(),
  };

  db.prepare(`
    UPDATE site_settings SET
      site_name=?, site_tagline=?, hero_badge=?, hero_title=?, hero_highlight=?, hero_description=?,
      primary_cta_label=?, primary_cta_href=?, secondary_cta_label=?, secondary_cta_href=?,
      publish_cta_label=?, publish_cta_href=?, footer_tagline=?, support_email=?, github_url=?,
      discord_url=?, telegram_url=?, maintenance_mode=?, maintenance_message=?,
      storefront_enabled=?, storefront_title=?, storefront_description=?, storefront_href=?,
      updated_at=datetime('now')
    WHERE id='default'
  `).run(
    data.site_name, data.site_tagline, data.hero_badge, data.hero_title, data.hero_highlight, data.hero_description,
    data.primary_cta_label, data.primary_cta_href, data.secondary_cta_label, data.secondary_cta_href,
    data.publish_cta_label, data.publish_cta_href, data.footer_tagline, data.support_email, data.github_url,
    data.discord_url, data.telegram_url, data.maintenance_mode, data.maintenance_message,
    data.storefront_enabled, data.storefront_title, data.storefront_description, data.storefront_href,
  );

  adminLog(user.id, "update_site_settings", "site_settings", "default", data);
  touchPublicRoutes();
  revalidatePath("/admin/site");
  revalidatePath("/admin");
}
