export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Globe2,
  LibraryBig,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { readableTitle } from "@/lib/display-title";

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  alternative_titles: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path?: string | null;
  author_id: string;
  author_name?: string | null;
  type: "light-novel" | "web-novel" | "short" | "visual-novel";
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  genres: string;
  tags: string;
  views: number;
  rating_sum: number;
  rating_count: number;
  is_featured: number;
  chapter_count: number;
  created_at: string;
}

interface MangaRow {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  cover_url: string | null;
  cover_local_path: string | null;
  author: string | null;
  chapter_count: number;
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function tableExists(db: ReturnType<typeof getDb>, name: string) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function getCover(row: { cover_local_path?: string | null; cover_url?: string | null }) {
  return row.cover_local_path || row.cover_url || "";
}

function titleFor(row: Pick<NovelRow, "title" | "alternative_titles" | "type" | "slug">) {
  return readableTitle({
    title: row.title,
    alternative_titles: row.alternative_titles,
    type: row.type,
    slug: row.slug,
  });
}

function isPresentable(row: Pick<NovelRow, "title" | "alternative_titles" | "type" | "slug">) {
  const title = titleFor(row);
  return title !== "WebNovel japonesa" && title !== "Light Novel japonesa" && !/^\d+$/.test(title);
}

function compact(text: string | null | undefined, size = 140) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > size ? `${clean.slice(0, size)}...` : clean;
}

export default function HomePage() {
  const db = getDb();

  const stats = {
    novels: (db.prepare("SELECT COUNT(*) AS c FROM novels WHERE type != 'visual-novel'").get() as { c: number }).c,
    readable: (db.prepare("SELECT COUNT(DISTINCT novel_id) AS c FROM chapters").get() as { c: number }).c,
    manga: tableExists(db, "mangas")
      ? (db.prepare("SELECT COUNT(*) AS c FROM mangas").get() as { c: number }).c
      : 0,
    mangaChapters: tableExists(db, "manga_chapters")
      ? (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters").get() as { c: number }).c
      : 0,
  };

  const featured = (db.prepare(`
    SELECT n.*, u.display_name AS author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapter_count
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.type != 'visual-novel'
    ORDER BY n.is_featured DESC, n.views DESC, n.created_at DESC
    LIMIT 30
  `).all() as NovelRow[]).filter(isPresentable).slice(0, 6);

  const lightNovels = (db.prepare(`
    SELECT n.*, u.display_name AS author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapter_count
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.type = 'light-novel'
    ORDER BY n.created_at DESC
    LIMIT 30
  `).all() as NovelRow[]).filter(isPresentable).slice(0, 8);

  const webNovels = (db.prepare(`
    SELECT n.*, u.display_name AS author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapter_count
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.type = 'web-novel'
    ORDER BY n.created_at DESC
    LIMIT 30
  `).all() as NovelRow[]).filter(isPresentable).slice(0, 8);

  const mangas = tableExists(db, "mangas")
    ? (db.prepare(`
        SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author,
               (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) AS chapter_count
        FROM mangas m
        ORDER BY m.updated_at DESC
        LIMIT 8
      `).all() as MangaRow[])
    : [];

  const hero = featured[0];
  const heroGenres = hero ? safeJsonArray(hero.genres).slice(0, 3) : [];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(180,120,62,0.16),transparent_32rem),radial-gradient(circle_at_top_right,rgba(120,80,180,0.10),transparent_26rem)]">
      <section className="container mx-auto max-w-7xl px-4 pb-10 pt-10 md:pb-16 md:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Light novels, webnovels e mangás em um só lugar
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-5xl font-black tracking-tight md:text-7xl">
                Tomoverso
                <span className="block text-primary">feito para ler.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Um catálogo brasileiro com busca rápida, leitor confortável e espaço para autores publicarem histórias sem burocracia.
              </p>
            </div>

            <form action="/search" className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                placeholder="Procure por Record, isekai, sistema, autor, capítulo..."
                className="h-16 w-full rounded-2xl border border-border/60 bg-card/90 pl-13 pr-32 text-base shadow-2xl shadow-black/10 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 md:text-lg"
              />
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl px-5">
                Buscar
              </Button>
            </form>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={stats.readable} label="obras legíveis" />
              <Stat value={stats.manga} label="mangás" />
              <Stat value={stats.mangaChapters} label="caps mangá" />
              <Stat value={stats.novels} label="novels" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/explore">Explorar novels <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/manga">Ler mangás</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/auth/signup"><PenLine className="mr-2 h-4 w-4" /> Publicar</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[480px]">
            <div className="absolute inset-0 rounded-[2.5rem] border border-border/50 bg-card/70 shadow-2xl shadow-black/10 backdrop-blur" />
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-secondary/30 blur-3xl" />

            {hero ? (
              <Link href={`/novels/${hero.slug}`} className="group absolute inset-4 grid overflow-hidden rounded-[2rem] border border-border/50 bg-background/80 md:grid-cols-[0.9fr_1.1fr]">
                <div className="relative min-h-[270px] overflow-hidden bg-muted">
                  {getCover(hero) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getCover(hero)} alt={titleFor(hero)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <Badge className="absolute left-4 top-4">Destaque</Badge>
                </div>
                <div className="flex flex-col justify-end gap-4 p-5 md:p-7">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.24em] text-primary">comece por aqui</p>
                    <h2 className="font-heading text-3xl font-black leading-tight md:text-4xl">{titleFor(hero)}</h2>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {compact(hero.synopsis, 260)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {heroGenres.map((genre) => <Badge key={genre} variant="secondary">{genre}</Badge>)}
                    <Badge variant="outline">{hero.chapter_count || 0} caps</Badge>
                  </div>
                  <div className="inline-flex items-center gap-2 font-semibold text-primary">
                    Abrir obra <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="absolute inset-4 flex items-center justify-center rounded-[2rem] border border-dashed border-border/60 text-muted-foreground">
                Publique a primeira obra do Tomoverso
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={LibraryBig} title="Catálogo organizado" text="Novels, webnovels, mangás e capítulos com busca agrupada." />
          <Feature icon={Flame} title="Leitor melhorado" text="Mangá em modo página, tela cheia e marcador salvo." />
          <Feature icon={PenLine} title="Autores primeiro" text="Cadastro e login funcionais para publicar pelo painel." />
        </div>
      </section>

      <Shelf
        eyebrow="Curadoria"
        title="Em destaque"
        href="/explore"
        icon={TrendingUp}
        items={featured.slice(0, 6).map((n) => ({
          href: `/novels/${n.slug}`,
          title: titleFor(n),
          subtitle: n.author_name || (n.type === "web-novel" ? "WebNovel" : "Light Novel"),
          image: getCover(n),
          meta: `${n.chapter_count || 0} capítulos`,
          tags: safeJsonArray(n.genres).slice(0, 2),
        }))}
      />

      <Shelf
        eyebrow="Catálogo"
        title="Light Novels"
        href="/explore?type=light-novel"
        icon={BookOpen}
        items={lightNovels.map((n) => ({
          href: `/novels/${n.slug}`,
          title: titleFor(n),
          subtitle: n.author_name || "Light Novel",
          image: getCover(n),
          meta: `${n.chapter_count || 0} capítulos`,
          tags: safeJsonArray(n.genres).slice(0, 2),
        }))}
      />

      {webNovels.length > 0 && (
        <Shelf
          eyebrow="Online"
          title="WebNovels"
          href="/explore?type=web-novel"
          icon={Globe2}
          items={webNovels.map((n) => ({
            href: `/novels/${n.slug}`,
            title: titleFor(n),
            subtitle: n.author_name || "WebNovel",
            image: getCover(n),
            meta: `${n.chapter_count || 0} capítulos`,
            tags: safeJsonArray(n.genres).slice(0, 2),
          }))}
        />
      )}

      {mangas.length > 0 && (
        <Shelf
          eyebrow="Mangás"
          title="Mangás recentes"
          href="/manga"
          icon={Sparkles}
          items={mangas.map((m) => ({
            href: `/manga/${m.slug}`,
            title: m.title,
            subtitle: m.author || "Mangá",
            image: getCover(m),
            meta: `${m.chapter_count || 0} capítulos`,
            tags: [],
          }))}
          posterRatio="aspect-[2/3]"
        />
      )}

      <section className="container mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="rounded-[2rem] border border-primary/20 bg-primary/10 p-8 shadow-xl shadow-primary/5 md:p-12">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="font-heading text-3xl font-black md:text-4xl">Sua história pode entrar aqui.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Crie conta, publique capítulos e transforme sua LN em uma obra com página, leitores e catálogo próprio.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/auth/signup">Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/how-to">Ver como publicar</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="font-heading text-2xl font-black">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return (
    <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur">
      <CardContent className="flex gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-heading font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Shelf({
  eyebrow,
  title,
  href,
  icon: Icon,
  items,
  posterRatio = "aspect-[3/4]",
}: {
  eyebrow: string;
  title: string;
  href: string;
  icon: typeof BookOpen;
  posterRatio?: string;
  items: Array<{ href: string; title: string; subtitle: string; image: string; meta: string; tags: string[] }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="container mx-auto max-w-7xl px-4 py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">
            <Icon className="h-4 w-4" /> {eyebrow}
          </div>
          <h2 className="font-heading text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
        </div>
        <Button variant="ghost" asChild>
          <Link href={href}>Ver tudo <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="group block">
            <article className="h-full overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              <div className={`${posterRatio} overflow-hidden bg-muted`}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/20 p-3 text-center text-xs text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <h3 className="line-clamp-2 min-h-[2.5rem] font-heading text-sm font-bold leading-tight group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
                <p className="border-t border-border/40 pt-2 text-xs text-muted-foreground">{item.meta}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
