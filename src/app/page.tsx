export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel/novel-card";
import { getDb } from "@/lib/db";
import { HeroSection } from "@/components/landing/hero-section";

interface NovelRow {
  id: string; slug: string; title: string; alternative_titles: string;
  synopsis: string; cover_url: string; author_id: string;
  type: "light-novel" | "web-novel" | "short" | "visual-novel";
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  genres: string; tags: string; views: number;
  rating_sum: number; rating_count: number; is_featured: number;
  created_at: string;
}

function parseNovel(r: NovelRow) {
  return {
    ...r,
    alternative_titles: JSON.parse(r.alternative_titles || "[]"),
    genres: JSON.parse(r.genres || "[]"),
    tags: JSON.parse(r.tags || "[]"),
    rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
    chapter_count: 0, is_featured: !!r.is_featured, is_approved: true, updated_at: r.created_at,
  };
}

export default function HomePage() {
  const db = getDb();
  const topNovels = (db.prepare("SELECT * FROM novels ORDER BY created_at DESC LIMIT 12").all() as NovelRow[]).map(parseNovel);
  const featured = topNovels.filter((n) => n.is_featured);
  const top3 = featured.slice(0, 3);

  return (
    <div className="min-h-screen">
      <HeroSection />

      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Curadoria do dono
            </Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Em destaque</h2>
            <p className="text-muted-foreground mt-1">Selecionadas com carinho. Comece por aqui.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/explore">Ver tudo <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>

        {top3.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {top3.map((novel) => (
              <NovelCard key={novel.id} novel={novel as any} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border/40 rounded-2xl">
            <p>Nenhuma novel publicada ainda. <Link href="/auth/signup" className="text-primary">Seja o primeiro!</Link></p>
          </div>
        )}
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Adicionadas recentemente</h2>
            <p className="text-muted-foreground mt-1">As últimas novidades do nosso catálogo.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/explore">Ver todas <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {topNovels.map((novel) => (
            <NovelCard key={novel.id} novel={novel as any} variant="compact" />
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-primary/5 p-8 md:p-12">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Sua história tá esperando ser contada.</h2>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            Milhares de leitores estão procurando a próxima LN que vai virar obsessão. Pode ser a sua.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">Criar conta grátis <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
