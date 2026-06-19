import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel/novel-card";
import { mockNovels } from "@/lib/data/mock-novels";
import { HeroSection } from "@/components/landing/hero-section";
import { TrendingTags } from "@/components/landing/trending-tags";
import { Testimonials } from "@/components/landing/testimonials";
import { Newsletter } from "@/components/landing/newsletter";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function HomePage() {
  const featured = mockNovels.filter((n) => n.is_featured);
  const top3 = featured.slice(0, 3);
  const restFeatured = featured.slice(3);

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* EM DESTAQUE - top 3 com layout especial */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Curadoria do dono
            </Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Em destaque
            </h2>
            <p className="text-muted-foreground mt-1">
              Selecionadas com carinho. Comece por aqui.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/explore">
              Ver tudo <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {top3.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>

        {restFeatured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            {restFeatured.map((novel) => (
              <NovelCard key={novel.id} novel={novel} variant="compact" />
            ))}
          </div>
        )}
      </section>

      <TrendingTags />

      {/* POR ONDE COMEÇAR */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Comece por aqui
            </h2>
            <p className="text-muted-foreground mt-1">
              Novels perfeitas pra quem tá chegando agora.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {mockNovels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} variant="horizontal" />
          ))}
        </div>
      </section>

      <Testimonials />

      <HowItWorks />

      <Newsletter />

      {/* CTA FINAL */}
      <section className="container mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-primary/5 p-8 md:p-12">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Sua história tá esperando ser contada.
          </h2>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            Milhares de leitores estão procurando a próxima LN que vai virar obsessão.
            Pode ser a sua.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Criar conta grátis <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
