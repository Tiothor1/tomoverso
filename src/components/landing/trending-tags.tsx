import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const trending = [
  { name: "Sistema", count: 234, hot: true },
  { name: "Isekai", count: 189, hot: true },
  { name: "Cultivo", count: 156 },
  { name: "Romance", count: 312, hot: true },
  { name: "Ação", count: 278 },
  { name: "Fantasia", count: 401, hot: true },
  { name: "Comédia", count: 198 },
  { name: "Drama", count: 245 },
  { name: "Slice of Life", count: 134 },
  { name: "Mistério", count: 89 },
  { name: "Horror", count: 67 },
  { name: "Sobrenatural", count: 112 },
];

export function TrendingTags() {
  return (
    <section className="container mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Em alta essa semana</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {trending.map((t, i) => (
          <Link
            key={t.name}
            href={`/explore?genre=${encodeURIComponent(t.name)}`}
            className="group"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <Badge
              variant="outline"
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/10 hover:border-primary/50 hover:scale-105 transition-all"
            >
              {t.hot && <span className="mr-1.5">🔥</span>}
              {t.name}
              <span className="ml-2 text-xs text-muted-foreground">
                {t.count}
              </span>
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
