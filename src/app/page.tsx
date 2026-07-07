export const revalidate = 120;

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Feather,
  LibraryBig,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NovelTitle } from "@/components/novel/novel-title";
import { hasCjk } from "@/lib/display-title";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { publicReadableNovelSql, publicVisibleMangaSql } from "@/lib/public-catalog";
import { CurationBadge, OriginalBadge } from "@/components/badges/content-badges";
import { proxyImageUrl } from "@/lib/manga/image-proxy";
import { cookies } from "next/headers";
import { getLocaleFromCookies, createTranslator } from "@/lib/i18n/server-t";

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_jp: string | null;
  alternative_titles: string | null;
  synopsis: string | null;
  cover_url: string | null;
  cover_local_path: string | null;
  type: string | null;
  genres: string | null;
  chapter_count?: number;
  views?: number;
  is_original?: number;
  curation_label?: string | null;
}

interface MangaRow {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author?: string | null;
  chapter_count: number;
  page_count?: number;
  is_original?: number;
  curation_label?: string | null;
}

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function getCover(row: { cover_local_path?: string | null; cover_url?: string | null }) {
  const src = row.cover_local_path || row.cover_url || "";
  return src ? proxyImageUrl(src) : "";
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

type CurationLabel = "em_alta" | "novidade_br" | "autor_revelacao";

function asCurationLabel(label: string | null | undefined): CurationLabel | null {
  return label === "em_alta" || label === "novidade_br" || label === "autor_revelacao" ? label : null;
}

function TextCover({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(196,181,253,.26),transparent_34%),linear-gradient(145deg,rgba(30,27,75,.92),rgba(17,24,39,.96))] p-4 text-center ${className}`}>
      <span className="font-heading text-sm font-black leading-tight text-white/82">{title}</span>
    </div>
  );
}

function CoverImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  if (!src) return <TextCover title={alt} className={className} />;
  return <img src={src} alt={alt} loading="eager" className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] ${className}`} />;
}

export default async function HomePage() {
  let stats = { novels: 0, mangas: 0, chapters: 0, pages: 0, users: 0 };
  let featuredNovels: NovelRow[] = [];
  let recentNovels: NovelRow[] = [];
  let hotMangas: MangaRow[] = [];
  let originalNovels: NovelRow[] = [];
  let originalMangas: MangaRow[] = [];
  const user = await getCurrentUser().catch(() => null);
  const publishHref = user ? "/dashboard/novels/new" : "/auth/signup";
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore.get("novel_lang")?.value || null);
  const t = createTranslator(locale);

  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");

    stats = {
      novels: Number((db.prepare(`SELECT COUNT(*) AS c FROM novels n WHERE ${publicReadableNovelSql("n")}`).get() as any)?.c || 0),
      mangas: Number((db.prepare(`SELECT COUNT(*) AS c FROM mangas m WHERE ${publicVisibleMangaSql("m")}`).get() as any)?.c || 0),
      chapters: Number((db.prepare("SELECT COUNT(*) AS c FROM chapters WHERE coalesce(content, '') <> ''").get() as any)?.c || 0)
        + Number((db.prepare("SELECT COUNT(*) AS c FROM manga_chapters ch WHERE EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')").get() as any)?.c || 0),
      pages: Number((db.prepare("SELECT COUNT(*) AS c FROM manga_pages WHERE coalesce(image_url, local_path, '') <> ''").get() as any)?.c || 0),
      users: Number((db.prepare("SELECT COUNT(*) AS c FROM users WHERE email NOT LIKE '%@external.author'").get() as any)?.c || 0),
    };

    featuredNovels = (db.prepare(`
      SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles,
             n.synopsis, n.cover_url, n.cover_local_path, n.type, n.genres, n.views,
             COALESCE(cc.is_original, 0) AS is_original,
             cc.curation_label,
             (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND coalesce(c.content, '') <> '') AS chapter_count
      FROM novels n
      LEFT JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
      WHERE ${publicReadableNovelSql("n")}
      ORDER BY COALESCE(cc.show_on_home, 0) DESC, COALESCE(cc.is_featured, n.is_featured, 0) DESC, n.views DESC, n.updated_at DESC
      LIMIT 18
    `).all() as NovelRow[]).filter((n) => !hasCjk(n.title)).slice(0, 5);

    recentNovels = (db.prepare(`
      SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles,
             n.synopsis, n.cover_url, n.cover_local_path, n.type, n.genres, n.views,
             COALESCE(cc.is_original, 0) AS is_original,
             cc.curation_label,
             (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND coalesce(c.content, '') <> '') AS chapter_count
      FROM novels n
      LEFT JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
      WHERE ${publicReadableNovelSql("n")}
      ORDER BY n.updated_at DESC
      LIMIT 20
    `).all() as NovelRow[]).filter((n) => !hasCjk(n.title)).slice(0, 6);

    hotMangas = db.prepare(`
      SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path, m.author,
             COALESCE(cc.is_original, 0) AS is_original,
             cc.curation_label,
             (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')) AS chapter_count,
             (SELECT COUNT(*) FROM manga_pages p JOIN manga_chapters ch ON ch.id = p.chapter_id WHERE ch.manga_id = m.id AND coalesce(p.image_url, p.local_path, '') <> '') AS page_count
      FROM mangas m
      LEFT JOIN catalog_controls cc ON cc.item_type='manga' AND cc.item_id = m.id
      WHERE ${publicVisibleMangaSql("m")}
      ORDER BY COALESCE(cc.show_on_home, 0) DESC, COALESCE(cc.is_featured, 0) DESC, chapter_count DESC
      LIMIT 8
    `).all() as MangaRow[];

    originalNovels = (db.prepare(`
      SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles,
             n.synopsis, n.cover_url, n.cover_local_path, n.type, n.genres, n.views,
             COALESCE(cc.is_original, 0) AS is_original,
             cc.curation_label,
             (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND coalesce(c.content, '') <> '') AS chapter_count
      FROM novels n
      INNER JOIN catalog_controls cc ON cc.item_type='novel' AND cc.item_id = n.id
      WHERE ${publicReadableNovelSql("n")} AND COALESCE(cc.is_original, 0) = 1
      ORDER BY COALESCE(cc.show_on_home, 0) DESC, n.updated_at DESC
      LIMIT 8
    `).all() as NovelRow[]).filter((n) => !hasCjk(n.title)).slice(0, 4);

    originalMangas = db.prepare(`
      SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path, m.author,
             COALESCE(cc.is_original, 0) AS is_original,
             cc.curation_label,
             (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')) AS chapter_count
      FROM mangas m
      INNER JOIN catalog_controls cc ON cc.item_type='manga' AND cc.item_id = m.id
      WHERE ${publicVisibleMangaSql("m")} AND COALESCE(cc.is_original, 0) = 1
      ORDER BY m.updated_at DESC
      LIMIT 4
    `).all() as MangaRow[];
  } catch (err: any) {
    console.error("Home page error:", err?.message, err?.stack?.slice(0, 500));
  }

  const heroStory = featuredNovels[0];
  const secondaryHero = featuredNovels.slice(1, 4);
  const originals = [...originalNovels, ...originalMangas];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in oklch,var(--primary) 16%,transparent),transparent_34%),radial-gradient(circle_at_85%_8%,color-mix(in oklch,var(--primary) 12%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in oklch,var(--background) 60%,transparent),var(--background)_42%,color-mix(in oklch,var(--background) 95%,transparent))] dark:bg-[radial-gradient(circle_at_top_left,color-mix(in oklch,var(--primary) 20%,transparent),transparent_34%),radial-gradient(circle_at_85%_8%,color-mix(in oklch,var(--primary) 12%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in oklch,var(--background) 80%,transparent),color-mix(in oklch,var(--background) 50%,transparent)_44%,transparent)]">
      {/* Hero */}
      <section className="relative border-b border-border/50">
        <div className="container relative mx-auto grid max-w-7xl gap-5 px-4 py-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:py-12">
          <div className="space-y-5">
            <Badge className="rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1 text-xs text-violet-700 shadow-sm dark:text-violet-200">
              <Sparkles className="mr-2 h-3 w-3" /> {t("home.hero_badge")}
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-heading text-4xl font-black tracking-[-0.045em] text-foreground md:text-5xl lg:text-6xl">
                {t("home.hero_title")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {t("home.hero_subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="default" asChild className="h-10 rounded-full bg-violet-700 px-5 text-sm text-white shadow-[0_12px_30px_rgba(109,40,217,.22)] hover:bg-violet-800">
                <Link href="/explore">{t("home.cta_explore")} <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
              </Button>
              <Button size="default" variant="outline" asChild className="h-10 rounded-full border-border/70 bg-background/70 px-5 text-sm backdrop-blur">
                <Link href={publishHref}><PenLine className="mr-2 h-3.5 w-3.5" /> {user ? t("home.cta_publish_logged") : t("home.cta_publish")}</Link>
              </Button>
            </div>

            <form action="/search" className="relative max-w-xl rounded-2xl border border-border/70 bg-background/75 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,.06)] backdrop-blur-xl dark:bg-white/[0.04]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
              <input
                name="q"
                placeholder={t("home.search_placeholder")}
                className="h-10 w-full rounded-xl bg-transparent pl-10 pr-24 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-xl bg-foreground px-4 text-xs font-bold text-background transition hover:opacity-90">
                {t("home.search_button")}
              </button>
            </form>

            <div className="grid max-w-lg grid-cols-3 gap-2 pt-1">
              <StatCard value={compactNumber(stats.mangas)} label={t("home.stats_mangas")} />
              <StatCard value={compactNumber(stats.novels)} label={t("home.stats_novels")} />
              <StatCard value={compactNumber(stats.chapters)} label={t("home.stats_chapters")} />
            </div>
          </div>

          <HeroRanking mangas={hotMangas.slice(0, 5)} novels={featuredNovels.slice(0, 2)} t={t} />
        </div>
      </section>

      {/* What is Tomo Verso */}
      <section className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{t("home.what_is_label")}</p>
            <h2 className="mt-3 max-w-xl font-heading text-2xl font-black tracking-tight md:text-4xl">
              {t("home.what_is_title")}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AudienceCard icon={BookOpen} title={t("home.for_readers_title")} text={t("home.for_readers_text")} />
            <AudienceCard icon={Feather} title={t("home.for_authors_title")} text={t("home.for_authors_text")} />
            <AudienceCard icon={ShieldCheck} title={t("home.curation_title")} text={t("home.curation_text")} />
            <AudienceCard icon={Users} title={t("home.community_title")} text={t("home.community_text")} />
          </div>
        </div>
      </section>

      {/* Featured works */}
      <section className="container mx-auto max-w-7xl px-4 pb-12">
        <SectionHeader eyebrow={t("home.highlights_label")} title={t("home.highlights_title")} text={t("home.highlights_text")} href="/explore" t={t} />
        <div className="grid gap-4 md:grid-cols-[1.1fr_.9fr]">
          <FeaturedStory novel={heroStory} t={t} />
          <div className="grid gap-3">
            {secondaryHero.map((novel) => <MiniNovel key={novel.id} novel={novel} />)}
          </div>
        </div>
      </section>

      {/* Hot mangas */}
      <section className="border-y border-border/60 bg-muted/25 py-12 dark:bg-white/[0.025]">
        <div className="container mx-auto max-w-7xl px-4">
          <SectionHeader eyebrow={t("home.hot_mangas_label")} title={t("home.hot_mangas_title")} text={t("home.hot_mangas_text")} href="/manga" t={t} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {hotMangas.slice(0, 8).map((manga) => <MangaTile key={manga.id} manga={manga} />)}
          </div>
        </div>
      </section>

      {/* Recent novels */}
      <section className="container mx-auto max-w-7xl px-4 py-12">
        <SectionHeader eyebrow={t("home.recent_novels_label")} title={t("home.recent_novels_title")} text={t("home.recent_novels_text")} href="/explore?sort=updated" t={t} />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentNovels.map((novel) => <RecentNovel key={novel.id} novel={novel} />)}
        </div>
      </section>

      {/* Originals */}
      <section className="container mx-auto max-w-7xl px-4 pb-12">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,.10),rgba(124,58,237,.08),rgba(14,165,233,.08))] p-6 shadow-[0_24px_90px_rgba(15,23,42,.08)] md:p-8 dark:bg-white/[0.035]">
          <SectionHeader eyebrow={t("home.originals_label")} title={t("home.originals_title")} text={t("home.originals_text")} href="/how-to" compact t={t} />
          {originals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {originalNovels.map((novel) => <OriginalNovel key={novel.id} novel={novel} />)}
              {originalMangas.map((manga) => <MangaTile key={manga.id} manga={manga} compact />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-500/25 bg-background/55 p-8 text-center">
              <p className="font-heading text-xl font-black">{t("home.originals_empty_title")}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {t("home.originals_empty_text")}
              </p>
              <Button asChild className="mt-4 rounded-full"><Link href={publishHref}>{user ? "Publicar minha obra" : "Publicar minha história"}</Link></Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#15111f] p-8 text-center text-white shadow-[0_30px_110px_rgba(15,23,42,.24)] md:p-10">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(168,85,247,.35),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.22),transparent_28%)]" />
          <div className="relative mx-auto max-w-3xl space-y-4">
            <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10"><LibraryBig className="mr-2 h-3.5 w-3.5" /> {t("home.cta_final_badge")}</Badge>
            <h2 className="font-heading text-2xl font-black tracking-tight md:text-4xl">{t("home.cta_final_title")}</h2>
            <p className="mx-auto max-w-2xl text-sm text-white/70">
              {t("home.cta_final_text")}
            </p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="default" asChild className="h-10 rounded-full bg-white px-6 text-sm text-slate-950 hover:bg-white/90">
                <Link href={user ? "/dashboard" : "/auth/signup"}>{user ? t("home.cta_final_dashboard") : t("home.cta_final_signup")} <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
              </Button>
              <Button size="default" variant="outline" asChild className="h-10 rounded-full border-white/20 bg-white/5 px-6 text-sm text-white hover:bg-white/10 hover:text-white">
                <Link href="/explore"><Bookmark className="mr-2 h-3.5 w-3.5" /> {t("home.cta_explore")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroRanking({ mangas, novels, t: tFn }: { mangas: MangaRow[]; novels: NovelRow[]; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const ranking = [
    ...mangas.map((item) => ({
      key: `manga-${item.id}`,
      href: `/manga/${item.slug}`,
      title: item.title,
      meta: `${item.chapter_count || 0} capítulos`,
      cover: getCover(item),
      kind: "Mangá/Manhwa",
    })),
    ...novels.map((item) => ({
      key: `novel-${item.id}`,
      href: `/novels/${item.slug}`,
      title: item.title,
      meta: `${item.chapter_count || 0} capítulos`,
      cover: getCover(item),
      kind: "Novel",
    })),
  ].slice(0, 5);

  if (ranking.length === 0) {
    return (
      <aside className="rounded-[2rem] border border-border/70 bg-background/65 p-6 shadow-[0_24px_80px_rgba(15,23,42,.10)] backdrop-blur-xl dark:bg-white/[0.035]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">Descoberta</p>
        <h2 className="mt-2 font-heading text-2xl font-black">Abra o catálogo e encontre sua próxima leitura.</h2>
        <Button asChild className="mt-5 rounded-full"><Link href="/explore">Ver catálogo</Link></Button>
      </aside>
    );
  }

  return (
    <aside className="rounded-[2rem] border border-border/70 bg-background/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,.12)] backdrop-blur-xl dark:bg-white/[0.04]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
            <Trophy className="h-3.5 w-3.5" /> {tFn("home.ranking_title")}
          </p>
          <h2 className="mt-1 font-heading text-2xl font-black tracking-tight">{tFn("home.ranking_title")}</h2>
        </div>
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <Link href="/explore?popular=1">{tFn("common.see_all")}</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {ranking.map((item, index) => (
          <Link key={item.key} href={item.href} className="group flex items-center gap-3 rounded-2xl border border-transparent p-2 transition hover:border-primary/20 hover:bg-primary/7">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
              {index + 1}
            </div>
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
              <CoverImage src={item.cover} alt={item.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-black leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-300">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.kind} · {item.meta}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-primary/6 p-4 text-sm text-muted-foreground">
        {tFn("home.ranking_tip")}
      </div>
    </aside>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-center shadow-sm backdrop-blur dark:bg-white/[0.04]">
      <div className="font-heading text-xl font-black tracking-tight">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}

function AudienceCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="border-border/70 bg-background/75 shadow-sm backdrop-blur dark:bg-white/[0.035]">
      <CardContent className="p-4">
        <Icon className="mb-3 h-5 w-5 text-violet-600 dark:text-violet-300" />
        <h3 className="font-heading text-base font-black">{title}</h3>
        <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ eyebrow, title, text, href, compact = false, t: tFn }: { eyebrow: string; title: string; text: string; href?: string; compact?: boolean; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className={`mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${compact ? "mb-5" : ""}`}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
      {href ? (
        <Button variant="ghost" asChild className="w-fit rounded-full hover:text-violet-600 dark:hover:text-violet-300">
          <Link href={href}>{tFn("common.see_all")} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      ) : null}
    </div>
  );
}

function FeaturedStory({ novel, t: tFn }: { novel?: NovelRow; t: (key: string, vars?: Record<string, string | number>) => string }) {
  if (!novel) return null;
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-border/70 bg-background/80 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur dark:bg-white/[0.035]">
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="aspect-[3/4] bg-muted md:aspect-auto md:min-h-[320px]">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <CardContent className="flex flex-col justify-between p-5 md:p-6">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {asCurationLabel(novel.curation_label) ? <CurationBadge label={asCurationLabel(novel.curation_label)!} /> : novel.is_original ? <OriginalBadge /> : <Badge variant="secondary" className="rounded-full">Destaque editorial</Badge>}
              </div>
              <h3 className="font-heading text-2xl font-black tracking-tight md:text-3xl"><NovelTitle novel={novel as any} /></h3>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{novel.synopsis}</p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">{novel.chapter_count || 0} capítulos</span>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-300">{tFn("common.read_now")} →</span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

function MiniNovel({ novel }: { novel: NovelRow }) {
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="overflow-hidden border-border/70 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.035]">
        <CardContent className="flex gap-3 p-3">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-heading text-sm font-black group-hover:text-violet-600 dark:group-hover:text-violet-300"><NovelTitle novel={novel as any} /></h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{novel.synopsis}</p>
            <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{novel.chapter_count || 0} capítulos</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MangaTile({ manga, compact = false }: { manga: MangaRow; compact?: boolean }) {
  return (
    <Link href={`/manga/${manga.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-border/70 bg-background/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-white/[0.035]">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <CoverImage src={getCover(manga)} alt={manga.title} />
          <div className="absolute inset-x-0 top-0 flex justify-between p-2">
            {asCurationLabel(manga.curation_label) ? <CurationBadge label={asCurationLabel(manga.curation_label)!} size="sm" /> : manga.is_original ? <OriginalBadge size="sm" /> : <span className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">Em alta</span>}
          </div>
        </div>
        <CardContent className={compact ? "p-2.5" : "p-3"}>
          <h3 className="line-clamp-2 font-heading text-xs font-black leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-300">{manga.title}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{manga.chapter_count} capítulos</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentNovel({ novel }: { novel: NovelRow }) {
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="h-full border-border/70 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.035]">
        <CardContent className="flex gap-2.5 p-2.5">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap gap-1">
              {safeJsonArray(novel.genres).slice(0, 2).map((genre) => <Badge key={genre} variant="secondary" className="rounded-full text-[9px] px-1.5 py-0">{genre}</Badge>)}
            </div>
            <h3 className="line-clamp-2 font-heading text-xs font-black leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-300"><NovelTitle novel={novel as any} /></h3>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{novel.synopsis}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function OriginalNovel({ novel }: { novel: NovelRow }) {
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-emerald-500/20 bg-background/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-white/[0.035]">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <CoverImage src={getCover(novel)} alt={novel.title} />
          <div className="absolute left-2 top-2">{asCurationLabel(novel.curation_label) ? <CurationBadge label={asCurationLabel(novel.curation_label)!} size="sm" /> : <OriginalBadge size="sm" />}</div>
        </div>
        <CardContent className="p-2.5">
          <h3 className="line-clamp-2 font-heading text-xs font-black leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-300"><NovelTitle novel={novel as any} /></h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{novel.chapter_count || 0} capítulos</p>
        </CardContent>
      </Card>
    </Link>
  );
}
