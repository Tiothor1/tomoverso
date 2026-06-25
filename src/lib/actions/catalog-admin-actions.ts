"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { adminLog, requireAdminUser, touchPublicRoutes } from "./_admin-utils";

export async function saveCatalogControlAction(formData: FormData) {
  const user = await requireAdminUser();
  const db = getDb();
  const itemType = String(formData.get("item_type") || "").trim();
  const itemId = String(formData.get("item_id") || "").trim();

  if (!itemType || !itemId) return;

  const payload = {
    is_hidden: formData.get("is_hidden") ? 1 : 0,
    is_featured: formData.get("is_featured") ? 1 : 0,
    show_on_home: formData.get("show_on_home") ? 1 : 0,
    storefront_enabled: formData.get("storefront_enabled") ? 1 : 0,
    storefront_label: String(formData.get("storefront_label") || "").trim() || null,
    sort_order: Number(formData.get("sort_order") || 0) || 0,
  };

  const existing = db.prepare("SELECT id FROM catalog_controls WHERE item_type=? AND item_id=?").get(itemType, itemId) as { id: string } | undefined;
  if (existing) {
    db.prepare(`
      UPDATE catalog_controls
      SET is_hidden=?, is_featured=?, show_on_home=?, storefront_enabled=?, storefront_label=?, sort_order=?, updated_at=datetime('now')
      WHERE id=?
    `).run(payload.is_hidden, payload.is_featured, payload.show_on_home, payload.storefront_enabled, payload.storefront_label, payload.sort_order, existing.id);
  } else {
    db.prepare(`
      INSERT INTO catalog_controls (id, item_type, item_id, is_hidden, is_featured, show_on_home, storefront_enabled, storefront_label, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), itemType, itemId, payload.is_hidden, payload.is_featured, payload.show_on_home, payload.storefront_enabled, payload.storefront_label, payload.sort_order);
  }

  if (itemType === "novel") {
    db.prepare("UPDATE novels SET is_featured = ?, updated_at = datetime('now') WHERE id = ?").run(payload.is_featured, itemId);
  }

  adminLog(user.id, "save_catalog_control", itemType, itemId, payload);
  touchPublicRoutes();
  revalidatePath("/admin/catalog");
  revalidatePath("/admin");
}
