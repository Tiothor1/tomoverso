export interface SiteSettings {
  id: string;
  site_name: string;
  site_tagline: string;
  hero_badge: string;
  hero_title: string;
  hero_highlight: string;
  hero_description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  publish_cta_label: string;
  publish_cta_href: string;
  footer_tagline: string;
  support_email: string;
  github_url: string | null;
  discord_url: string | null;
  telegram_url: string | null;
  maintenance_mode: number;
  maintenance_message: string;
  storefront_enabled: number;
  storefront_title: string;
  storefront_description: string;
  storefront_href: string;
  created_at?: string;
  updated_at?: string;
}

export interface CatalogControlRow {
  id: string;
  item_type: "novel" | "manga";
  item_id: string;
  is_hidden: number;
  is_featured: number;
  show_on_home: number;
  storefront_enabled: number;
  storefront_label: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserAccessControlRow {
  user_id: string;
  is_suspended: number;
  suspension_reason: string | null;
  updated_at?: string;
}

export interface AdminIntegrationRow {
  provider: string;
  label: string;
  project_id: string | null;
  project_name: string | null;
  team_id: string | null;
  production_url: string | null;
  access_token: string | null;
  token_hint: string | null;
  status_json: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  product_type: "book" | "manga" | "bundle" | "merch" | "digital";
  source_type: "manual" | "novel" | "manga";
  source_id: string | null;
  status: "draft" | "active" | "archived";
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  stock_qty: number;
  sku: string | null;
  cover_url: string | null;
  cover_local_path: string | null;
  is_featured: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreCollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_featured: number;
  created_at?: string;
  updated_at?: string;
}
