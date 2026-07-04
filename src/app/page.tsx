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
import { publicReadableNovelSql, publicVisibleMangaSql } from "@/lib/public-catalog";
import { CurationBadge, OriginalBadge } from "@/components/badges/content-badges";
import { proxyImageUrl } from "@/lib/manga/image-proxy";

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

export default function HomePage() {
  let stats = { novels: 0, mangas: 0, chapters: 0, pages: 0, users: 0 };
  let featuredNovels: NovelRow[] = [];
  let recentNovels: NovelRow[] = [];
  let hotMangas: MangaRow[] = [];
  let originalNovels: NovelRow[] = [];
  let originalMangas: MangaRow[] = [];

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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.13),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,rgba(250,247,255,.92),rgba(255,255,255,1)_42%,rgba(250,250,252,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,#0b0712,#0f0b17_44%,#09070d)]">
      {/* Hero */}
      <section className="relative border-b border-border/50">
        <div className="container relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:py-24">
          <div className="space-y-7">
            <Badge className="rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-violet-700 shadow-sm dark:text-violet-200">
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Editora digital brasileira para leitores e autores
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-heading text-5xl font-black tracking-[-0.055em] text-foreground md:text-7xl lg:text-8xl">
                Histórias que parecem feitas para virar vício.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                Leia mangás, manhwas e light novels em português — e publique sua própria história em uma plataforma editorial feita para descobrir novos autores.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 rounded-full bg-violet-700 px-6 text-white shadow-[0_18px_50px_rgba(109,40,217,.25)] hover:bg-violet-800">
                <Link href="/explore">Começar a ler <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-full border-border/70 bg-background/70 px-6 backdrop-blur">
                <Link href="/auth/signup"><PenLine className="mr-2 h-4 w-4" /> Publicar minha história</Link>
              </Button>
            </div>

            <form action="/search" className="relative max-w-2xl rounded-3xl border border-border/70 bg-background/75 p-2 shadow-[0_20px_70px_rgba(15,23,42,.08)] backdrop-blur-xl dark:bg-white/[0.04]">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-500" />
              <input
                name="q"
                placeholder="Buscar obra, capítulo, autor..."
                className="h-12 w-full rounded-2xl bg-transparent pl-12 pr-28 text-base outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="absolute right-3 top-1/2 h-10 -translate-y-1/2 rounded-2xl bg-foreground px-5 text-sm font-bold text-background transition hover:opacity-90">
                Buscar
              </button>
            </form>

            <div className="grid max-w-2xl grid-cols-3 gap-3 pt-2">
              <StatCard value={compactNumber(stats.mangas)} label="mangás" />
              <StatCard value={compactNumber(stats.novels)} label="novels" />
              <StatCard value={compactNumber(stats.chapters)} label="capítulos" />
            </div>
          </div>

          <HeroRanking mangas={hotMangas.slice(0, 5)} novels={featuredNovels.slice(0, 2)} />
        </div>
      </section>

      {/* What is Tomo Verso */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">O que é</p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-black tracking-tight md:text-5xl">
              Uma ponte entre leitores famintos e autores que querem ser descobertos.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AudienceCard icon={BookOpen} title="Para leitores" text="Catálogo direto ao ponto: mangás, manhwas e novels com capítulos para ler agora, sem tela vazia e sem enrolação." />
            <AudienceCard icon={Feather} title="Para autores" text="Um espaço para publicar histórias originais, organizar capítulos, criar leitores e crescer com uma marca editorial brasileira." />
            <AudienceCard icon={ShieldCheck} title="Curadoria editorial" text="A home destaca obras com leitura disponível, originais e séries com maior fôlego. Menos ruído, mais descoberta." />
            <AudienceCard icon={Users} title="Comunidade viva" text="Feed, comentários, biblioteca e páginas de autor tornam a leitura uma experiência social — não só um arquivo de capítulos." />
          </div>
        </div>
      </section>

      {/* Featured works */}
      <section className="container mx-auto max-w-7xl px-4 pb-16">
        <SectionHeader eyebrow="Destaques" title="Obras em destaque" text="Uma vitrine editorial para começar por onde o catálogo já está mais forte." href="/explore" />
        <div className="grid gap-4 md:grid-cols-[1.25fr_.75fr]">
          <FeaturedStory novel={heroStory} />
          <div className="grid gap-3">
            {secondaryHero.map((novel) => <MiniNovel key={novel.id} novel={novel} />)}
          </div>
        </div>
      </section>

      {/* Hot mangas */}
      <section className="border-y border-border/60 bg-muted/25 py-16 dark:bg-white/[0.025]">
        <div className="container mx-auto max-w-7xl px-4">
          <SectionHeader eyebrow="Leitura rápida" title="Mangás em alta" text="Capítulos longos, leitura vertical e séries para maratonar no celular." href="/manga" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {hotMangas.slice(0, 8).map((manga) => <MangaTile key={manga.id} manga={manga} />)}
          </div>
        </div>
      </section>

      {/* Recent novels */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <SectionHeader eyebrow="Novas páginas" title="Novels recentes" text="Histórias para acompanhar capítulo a capítulo — do romance ao sistema, da fantasia ao drama." href="/explore?sort=updated" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentNovels.map((novel) => <RecentNovel key={novel.id} novel={novel} />)}
        </div>
      </section>

      {/* Originals */}
      <section className="container mx-auto max-w-7xl px-4 pb-16">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,.10),rgba(124,58,237,.08),rgba(14,165,233,.08))] p-6 shadow-[0_24px_90px_rgba(15,23,42,.08)] md:p-8 dark:bg-white/[0.035]">
          <SectionHeader eyebrow="Editora" title="Originais da Tomo Verso" text="A missão principal: transformar leitores em fãs de autores brasileiros." href="/how-to" compact />
          {originals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {originalNovels.map((novel) => <OriginalNovel key={novel.id} novel={novel} />)}
              {originalMangas.map((manga) => <MangaTile key={manga.id} manga={manga} compact />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-500/25 bg-background/55 p-8 text-center">
              <p className="font-heading text-2xl font-black">Sua história pode ocupar este espaço.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                A vitrine de originais é reservada para obras brasileiras publicadas no Tomo Verso Editora.
              </p>
              <Button asChild className="mt-5 rounded-full"><Link href="/auth/signup">Publicar minha história</Link></Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto max-w-5xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#15111f] p-8 text-center text-white shadow-[0_30px_110px_rgba(15,23,42,.24)] md:p-12">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(168,85,247,.35),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.22),transparent_28%)]" />
          <div className="relative mx-auto max-w-3xl space-y-5">
            <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10"><LibraryBig className="mr-2 h-3.5 w-3.5" /> Biblioteca + editora + comunidade</Badge>
            <h2 className="font-heading text-3xl font-black tracking-tight md:text-5xl">Entre para o Tomo Verso antes da próxima grande história nascer.</h2>
            <p className="mx-auto max-w-2xl text-white/70">
              Crie sua conta para salvar leituras, acompanhar capítulos, comentar e publicar suas próprias obras quando estiver pronto.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 rounded-full bg-white px-7 text-slate-950 hover:bg-white/90">
                <Link href="/auth/signup">Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-full border-white/20 bg-white/5 px-7 text-white hover:bg-white/10 hover:text-white">
                <Link href="/explore"><Bookmark className="mr-2 h-4 w-4" /> Começar a ler</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroRanking({ mangas, novels }: { mangas: MangaRow[]; novels: NovelRow[] }) {
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
            <Trophy className="h-3.5 w-3.5" /> Ranking
          </p>
          <h2 className="mt-1 font-heading text-2xl font-black tracking-tight">O que a galera está lendo</h2>
        </div>
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <Link href="/explore?popular=1">Ver tudo</Link>
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
        Quer algo rápido? Comece pelo ranking ou use a busca para achar título, autor ou gênero.
      </div>
    </aside>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/70 p-4 text-center shadow-sm backdrop-blur dark:bg-white/[0.04]">
      <div className="font-heading text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}

function AudienceCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="border-border/70 bg-background/75 shadow-sm backdrop-blur dark:bg-white/[0.035]">
      <CardContent className="p-5">
        <Icon className="mb-4 h-7 w-7 text-violet-600 dark:text-violet-300" />
        <h3 className="font-heading text-lg font-black">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ eyebrow, title, text, href, compact = false }: { eyebrow: string; title: string; text: string; href?: string; compact?: boolean }) {
  return (
    <div className={`mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${compact ? "mb-6" : ""}`}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{text}</p>
      </div>
      {href ? (
        <Button variant="ghost" asChild className="w-fit rounded-full hover:text-violet-600 dark:hover:text-violet-300">
          <Link href={href}>Ver mais <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      ) : null}
    </div>
  );
}

function FeaturedStory({ novel }: { novel?: NovelRow }) {
  if (!novel) return null;
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="h-full overflow-hidden border-border/70 bg-background/80 shadow-[0_24px_90px_rgba(15,23,42,.10)] backdrop-blur dark:bg-white/[0.035]">
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="aspect-[3/4] bg-muted md:aspect-auto md:min-h-[380px]">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <CardContent className="flex flex-col justify-between p-6 md:p-8">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {asCurationLabel(novel.curation_label) ? <CurationBadge label={asCurationLabel(novel.curation_label)!} /> : novel.is_original ? <OriginalBadge /> : <Badge variant="secondary" className="rounded-full">Destaque editorial</Badge>}
              </div>
              <h3 className="font-heading text-3xl font-black tracking-tight md:text-4xl"><NovelTitle novel={novel as any} /></h3>
              <p className="mt-4 line-clamp-5 text-sm leading-7 text-muted-foreground md:text-base">{novel.synopsis}</p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
              <span className="text-sm text-muted-foreground">{novel.chapter_count || 0} capítulos</span>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-300">Ler agora →</span>
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
        <CardContent className="flex gap-4 p-4">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-heading text-base font-black group-hover:text-violet-600 dark:group-hover:text-violet-300"><NovelTitle novel={novel as any} /></h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{novel.synopsis}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">{novel.chapter_count || 0} capítulos</p>
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
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <CoverImage src={getCover(manga)} alt={manga.title} />
          <div className="absolute inset-x-0 top-0 flex justify-between p-2">
            {asCurationLabel(manga.curation_label) ? <CurationBadge label={asCurationLabel(manga.curation_label)!} size="sm" /> : manga.is_original ? <OriginalBadge size="sm" /> : <span className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">Em alta</span>}
          </div>
        </div>
        <CardContent className={compact ? "p-3" : "p-4"}>
          <h3 className="line-clamp-2 font-heading text-sm font-black leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-300 md:text-base">{manga.title}</h3>
          <p className="mt-2 text-xs text-muted-foreground">{manga.chapter_count} capítulos</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentNovel({ novel }: { novel: NovelRow }) {
  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="h-full border-border/70 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.035]">
        <CardContent className="flex gap-4 p-4">
          <div className="h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
            <CoverImage src={getCover(novel)} alt={novel.title} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-1">
              {safeJsonArray(novel.genres).slice(0, 2).map((genre) => <Badge key={genre} variant="secondary" className="rounded-full text-[10px]">{genre}</Badge>)}
            </div>
            <h3 className="line-clamp-2 font-heading text-lg font-black leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-300"><NovelTitle novel={novel as any} /></h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{novel.synopsis}</p>
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
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <CoverImage src={getCover(novel)} alt={novel.title} />
          <div className="absolute left-2 top-2">{asCurationLabel(novel.curation_label) ? <CurationBadge label={asCurationLabel(novel.curation_label)!} size="sm" /> : <OriginalBadge size="sm" />}</div>
        </div>
        <CardContent className="p-3">
          <h3 className="line-clamp-2 font-heading text-sm font-black leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-300"><NovelTitle novel={novel as any} /></h3>
          <p className="mt-1 text-xs text-muted-foreground">{novel.chapter_count || 0} capítulos</p>
        </CardContent>
      </Card>
    </Link>
  );
}
