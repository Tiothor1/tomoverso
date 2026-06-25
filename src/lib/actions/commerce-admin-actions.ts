"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { adminLog, requireAdminUser, touchPublicRoutes } from "./_admin-utils";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function upsertStoreProductAction(formData: FormData) {
  const admin = await requireAdminUser();
  const db = getDb();

  const id = String(formData.get("id") || "").trim() || crypto.randomUUID();
  const sourceType = String(formData.get("source_type") || "manual").trim() as "manual" | "novel" | "manga";
  const sourceSlug = String(formData.get("source_slug") || "").trim();
  let sourceId: string | null = null;
  let derivedTitle = "";
  let derivedCover: string | null = null;

  if (sourceType === "novel" && sourceSlug) {
    const row = db.prepare("SELECT id, title, cover_url, cover_local_path FROM novels WHERE slug = ?").get(sourceSlug) as any;
    if (row) {
      sourceId = row.id;
      derivedTitle = row.title;
      derivedCover = row.cover_local_path || row.cover_url || null;
    }
  }
  if (sourceType === "manga" && sourceSlug) {
    const row = db.prepare("SELECT id, title, cover_url, cover_local_path FROM mangas WHERE slug = ?").get(sourceSlug) as any;
    if (row) {
      sourceId = row.id;
      derivedTitle = row.title;
      derivedCover = row.cover_local_path || row.cover_url || null;
    }
  }

  const title = String(formData.get("title") || derivedTitle || "").trim();
  const slug = slugify(String(formData.get("slug") || title || sourceSlug || id));
  const description = String(formData.get("description") || "").trim();
  const productType = String(formData.get("product_type") || "book").trim();
  const status = String(formData.get("status") || "draft").trim();
  const priceCents = Number(formData.get("price_cents") || 0) || 0;
  const compareAtCentsRaw = String(formData.get("compare_at_cents") || "").trim();
  const compareAtCents = compareAtCentsRaw ? Number(compareAtCentsRaw) || 0 : null;
  const stockQty = Number(formData.get("stock_qty") || 0) || 0;
  const sku = String(formData.get("sku") || "").trim() || null;
  const isFeatured = formData.get("is_featured") ? 1 : 0;

  if (!title) return;

  const existing = db.prepare("SELECT id FROM store_products WHERE id = ?").get(id) as { id: string } | undefined;
  if (existing) {
    db.prepare(`
      UPDATE store_products
      SET slug=?, title=?, description=?, product_type=?, source_type=?, source_id=?, status=?, price_cents=?, compare_at_cents=?, stock_qty=?, sku=?, cover_local_path=?, cover_url=?, is_featured=?, updated_at=datetime('now')
      WHERE id=?
    `).run(slug, title, description, productType, sourceType, sourceId, status, priceCents, compareAtCents, stockQty, sku, derivedCover, derivedCover, isFeatured, id);
  } else {
    db.prepare(`
      INSERT INTO store_products (id, slug, title, description, product_type, source_type, source_id, status, price_cents, compare_at_cents, stock_qty, sku, cover_local_path, cover_url, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, slug, title, description, productType, sourceType, sourceId, status, priceCents, compareAtCents, stockQty, sku, derivedCover, derivedCover, isFeatured);
  }

  adminLog(admin.id, "upsert_store_product", "store_product", id, { slug, title, productType, sourceType, sourceSlug, status });
  revalidatePath("/admin/commerce");
  touchPublicRoutes();
}

export async function upsertStoreCollectionAction(formData: FormData) {
  const admin = await requireAdminUser();
  const db = getDb();
  const id = String(formData.get("id") || "").trim() || crypto.randomUUID();
  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title || id));
  const description = String(formData.get("description") || "").trim();
  const isFeatured = formData.get("is_featured") ? 1 : 0;

  if (!title) return;

  const existing = db.prepare("SELECT id FROM store_collections WHERE id = ?").get(id) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE store_collections SET slug=?, title=?, description=?, is_featured=?, updated_at=datetime('now') WHERE id=?").run(slug, title, description, isFeatured, id);
  } else {
    db.prepare("INSERT INTO store_collections (id, slug, title, description, is_featured) VALUES (?, ?, ?, ?, ?)").run(id, slug, title, description, isFeatured);
  }

  adminLog(admin.id, "upsert_store_collection", "store_collection", id, { slug, title, isFeatured });
  revalidatePath("/admin/commerce");
  revalidatePath("/store");
}
