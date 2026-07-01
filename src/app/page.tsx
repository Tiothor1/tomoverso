export const revalidate = 120;

import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Search, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NovelTitle } from "@/components/novel/novel-title";
import { hasCjk } from "@/lib/display-title";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, publicVisibleMangaSql } from "@/lib/public-catalog";
import { getSiteConfig } from "@/lib/site-config";

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_jp: string | null;
  alternative_titles: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path?: string | null;
  type: string;
  genres: string;
}

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function getCover(r: { cover_local_path?: string | null; cover_url?: string | null }) {
  return r.cover_local_path || r.cover_url || "";
}

export default function HomePage() {
  const config = getSiteConfig();
  let stats = { novels: 0, mangas: 0, chapters: 0 };
  let topMangas: any[] = [];
  let novels: NovelRow[] = [];
  let storeProducts: any[] = [];

  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");

    stats = {
      novels: (db.prepare(`SELECT COUNT(*) AS c FROM novels n WHERE ${publicReadableNovelSql("n")}`).get() as any).c,
      mangas: (db.prepare(`SELECT COUNT(*) AS c FROM mangas m WHERE ${publicVisibleMangaSql("m")}`).get() as any).c,
      chapters: (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters ch WHERE EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')").get() as any).c,
    };

    topMangas = db.prepare(`
      SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path,
             COALESCE(cc.is_featured, 0) as is_featured,
             COALESCE(cc.show_on_home, 0) as show_on_home,
             (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')) AS chapter_count
      FROM mangas m
      LEFT JOIN catalog_controls cc ON cc.item_type='manga' AND cc.item_id = m.id
      WHERE ${publicVisibleMangaSql("m")}
      ORDER BY show_on_home DESC, is_featured DESC, chapter_count DESC
      LIMIT 5
    `).all() as any[];

    novels = (db.prepare(`
      SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles, n.cover_url, n.cover_local_path,
             n.type, n.genres, COALESCE(cc.is_featured, n.is_featured, 0) as admin_featured, COALESCE(cc.show_on_home, 0) as show_on_home
      FROM novels n
      LEFT JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
      WHERE ${publicReadableNovelSql("n")}
      ORDER BY show_on_home DESC, admin_featured DESC, n.views DESC
      LIMIT 12
    `).all() as NovelRow[]).filter((n) => !hasCjk(n.title)).slice(0, 6);

    if (config.storefront_enabled) {
      storeProducts = db.prepare(`
        SELECT id, slug, title, description, price_cents, currency, cover_local_path, cover_url, is_featured
        FROM store_products
        WHERE status = 'active'
        ORDER BY is_featured DESC, updated_at DESC
        LIMIT 4
      `).all() as any[];
    }
  } catch (err: any) {
    console.error("Home page error:", err?.message, err?.stack?.slice(0, 500));
  }

  return (
    <main className="aurora-bg">
      <section className="container mx-auto max-w-7xl px-4 pb-16 pt-16 md:pt-24">
        <div className="reveal-up mx-auto max-w-4xl space-y-6 text-center">
          <div className="neon-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="neon-icon-pop h-4 w-4" />
            {config.hero_badge} · {stats.novels} LNs · {stats.mangas} mangás · {stats.chapters.toLocaleString("pt-BR")} capítulos
          </div>
          <h1 className="font-heading text-5xl font-black tracking-tight md:text-7xl">
            {config.hero_title}
            <span className="gradient-text block">{config.hero_highlight}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{config.hero_description}</p>
          <form action="/search" className="glass-panel relative mx-auto max-w-2xl rounded-2xl p-1.5">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/80" />
            <input
              name="q"
              placeholder="Pesquisar mangá, novel, capítulo..."
              className="h-14 w-full rounded-xl border border-border/40 bg-background/55 pl-12 pr-28 text-base shadow-inner outline-none transition focus:border-primary/55 focus:ring-4 focus:ring-primary/15 md:pr-36"
            />
            <button type="submit" className="neon-button absolute right-3 top-1/2 h-10 -translate-y-1/2 cursor-pointer rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">Buscar</button>
          </form>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" asChild className="neon-button"><Link href={config.primary_cta_href}>{config.primary_cta_label} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild className="glass-panel"><Link href={config.secondary_cta_href}>{config.secondary_cta_label}</Link></Button>
            <Button variant="ghost" asChild className="hover:text-primary"><Link href={config.publish_cta_href}><PenLine className="mr-2 h-4 w-4" /> {config.publish_cta_label}</Link></Button>
          </div>
        </div>
      </section>

      {topMangas.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-black"><span className="gradient-text">Mangás</span></h2>
            <Button variant="ghost" asChild className="hover:text-primary"><Link href="/manga">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {topMangas.map((m) => (
              <Link key={m.id} href={`/manga/${m.slug}`} className="group block">
                <Card className="neon-card overflow-hidden">
                  <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                    <img src={getCover(m)} alt={m.title} loading="lazy" className="story-cover h-full w-full object-cover" />
                    <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                      <span className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-fuchsia-100 backdrop-blur">Em alta</span>
                    </div>
                  </div>
                  <CardContent className="space-y-1 p-2.5">
                    <h3 className="line-clamp-2 font-heading text-sm font-bold leading-tight group-hover:text-primary">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">{m.chapter_count} capítulos</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {novels.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-black"><span className="gradient-text">Light Novels</span></h2>
            <Button variant="ghost" asChild className="hover:text-primary"><Link href="/explore">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {novels.map((n) => (
              <Link key={n.id} href={`/novels/${n.slug}`} className="group block">
                <Card className="neon-card h-full overflow-hidden">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {getCover(n) ? (
                      <img src={getCover(n)} alt={n.title} loading="lazy" className="story-cover h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-fuchsia-500/10 to-cyan-500/10 p-3 text-center text-xs text-muted-foreground">
                        <NovelTitle novel={n} />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-1 p-2.5">
                    <NovelTitle novel={n} as="h3" className="line-clamp-2 font-heading text-xs font-bold leading-tight group-hover:text-primary" />
                    <div className="flex flex-wrap gap-1">
                      {safeJsonArray(n.genres).slice(0, 2).map((g) => (
                        <span key={g} className="neon-badge rounded-full px-1.5 py-0.5 text-[9px] text-muted-foreground">{g}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {config.storefront_enabled ? (
        <section className="container mx-auto max-w-7xl px-4 py-8">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="secondary" className="neon-badge mb-3 rounded-full px-3 py-1">Loja editorial</Badge>
                <h2 className="font-heading text-2xl font-black md:text-3xl">{config.storefront_title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{config.storefront_description}</p>
              </div>
              <Button asChild className="neon-button rounded-2xl"><Link href={config.storefront_href}><ShoppingBag className="mr-2 h-4 w-4" /> Abrir loja</Link></Button>
            </div>
            {storeProducts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {storeProducts.map((product) => (
                  <Card key={product.id} className="neon-card overflow-hidden">
                    <div className="aspect-[2/3] overflow-hidden bg-muted">
                      {getCover(product) ? <img src={getCover(product)} alt={product.title} className="story-cover h-full w-full object-cover" /> : null}
                    </div>
                    <CardContent className="space-y-2 p-4">
                      <h3 className="font-heading text-lg font-bold leading-tight">{product.title}</h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{product.description || "Produto editorial pronto para venda futura."}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-6">
          <BookOpen className="neon-icon-pop mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Publique sua história</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crie conta e publique capítulos. Grátis.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button asChild className="neon-button"><Link href={config.publish_cta_href}>Criar conta <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="outline" asChild className="glass-panel"><Link href="/how-to">Como funciona</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
