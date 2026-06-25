import type { SiteSettings } from "./types";

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, "created_at" | "updated_at"> = {
  id: "default",
  site_name: "Tomoverso",
  site_tagline: "onde histórias ganham vida.",
  hero_badge: "Catálogo BR com leitura real",
  hero_title: "Tomoverso",
  hero_highlight: "onde histórias ganham vida.",
  hero_description: "Catálogo brasileiro com leitor por páginas, busca rápida e conteúdo que realmente dá pra ler.",
  primary_cta_label: "Ler mangás",
  primary_cta_href: "/manga",
  secondary_cta_label: "Explorar novels",
  secondary_cta_href: "/explore",
  publish_cta_label: "Publicar",
  publish_cta_href: "/auth/signup",
  footer_tagline: "Onde Light Novels brasileiras ganham vida. Pra autores iniciantes e leitores apaixonados.",
  support_email: "contato@tomoverso.com",
  github_url: null,
  discord_url: null,
  telegram_url: null,
  maintenance_mode: 0,
  maintenance_message: "Estamos fazendo ajustes no painel e na loja. Algumas áreas podem mudar ao longo do dia.",
  storefront_enabled: 1,
  storefront_title: "Loja Tomoverso",
  storefront_description: "Prepare o catálogo para vender livros, mangás, bundles e edições digitais a partir do mesmo painel.",
  storefront_href: "/store",
};

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Visão geral", section: "overview" },
  { href: "/admin/site", label: "Site principal", section: "site" },
  { href: "/admin/catalog", label: "Catálogo", section: "catalog" },
  { href: "/admin/users", label: "Usuários", section: "users" },
  { href: "/admin/commerce", label: "Commerce", section: "commerce" },
  { href: "/admin/integrations", label: "Integrações", section: "integrations" },
  { href: "/admin/imports", label: "Importações", section: "imports" },
  { href: "/admin/stats", label: "Estatísticas", section: "stats" },
] as const;
