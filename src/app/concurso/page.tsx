import Link from "next/link";
import { ArrowRight, CalendarDays, Crown, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Concursos | Tomo Verso Editora",
  description: "Participe dos concursos literários do Tomoverso. Publique sua história original e concorra a prêmios.",
};

interface Contest {
  id: string;
  title: string;
  description: string;
  rules: string;
  prize: string;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
}

export default function ContestsPage() {
  const db = getDb();
  const activeContests = db.prepare(
    "SELECT * FROM contests WHERE is_active = 1 ORDER BY end_date ASC"
  ).all() as Contest[];
  const pastContests = db.prepare(
    "SELECT * FROM contests WHERE is_active = 0 ORDER BY end_date DESC LIMIT 5"
  ).all() as Contest[];

  const hasAny = activeContests.length > 0 || pastContests.length > 0;

  return (
    <main className="aurora-bg">
      <section className="container mx-auto max-w-5xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="neon-badge mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Concursos
          </div>
          <h1 className="font-heading text-4xl font-black tracking-tight md:text-5xl">
            Concursos do <span className="gradient-text">Tomo Verso Editora</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Publique sua história original e concorra a prêmios. Os melhores textos ganham destaque no site e prêmios em dinheiro.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link href={"/dashboard/novels/new"}><Sparkles className="mr-1.5 h-4 w-4" /> Publicar história</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full">
              <Link href={"/how-to"}>Como funciona</Link>
            </Button>
          </div>
        </div>

        {!hasAny && (
          <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="font-heading text-2xl font-bold">Nenhum concurso ativo no momento</h2>
            <p className="mt-2 text-muted-foreground">
              Volte em breve para novos concursos. Enquanto isso, publique sua história para já ir construindo público.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link href={"/dashboard/novels/new"}><Sparkles className="mr-1.5 h-4 w-4" /> Começar a escrever</Link>
            </Button>
          </div>
        )}

        {/* Active contests */}
        {activeContests.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 font-heading text-2xl font-black">
              <span className="gradient-text">Concursos ativos</span>
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activeContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} active />
              ))}
            </div>
          </section>
        )}

        {/* Past contests */}
        {pastContests.length > 0 && (
          <section>
            <h2 className="mb-6 font-heading text-xl font-bold text-muted-foreground">Concursos anteriores</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} active={false} />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-16 text-center">
          <div className="glass-panel rounded-2xl p-8">
            <Crown className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <h2 className="font-heading text-2xl font-bold">Quer patrocinar um concurso?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre em contato para criar um concurso temático no Tomoverso.
            </p>
            <Button variant="outline" asChild className="mt-4 rounded-full">
              <Link href="mailto:suporte@tomoverso.com.br">Falar com a equipe</Link>
            </Button>
          </div>
        </section>
      </section>
    </main>
  );
}

function ContestCard({ contest, active }: { contest: Contest; active: boolean }) {
  const start = new Date(contest.start_date).toLocaleDateString("pt-BR");
  const end = new Date(contest.end_date).toLocaleDateString("pt-BR");
  const now = new Date();
  const endDate = new Date(contest.end_date);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));

  return (
    <Card className={`neon-card overflow-hidden ${active ? "border-primary/30" : "border-border/30 opacity-70"}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl font-bold">{contest.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{contest.description}</CardDescription>
          </div>
          {active && (
            <Badge variant="default" className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              <Sparkles className="mr-1 h-3 w-3" /> Ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="font-semibold text-foreground">{contest.prize}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{start} → {end}</span>
          </div>
          {active && daysLeft > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-primary">{daysLeft} dias</span>
              <span>restantes</span>
            </div>
          )}
        </div>

        {contest.rules && (
          <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-sm text-muted-foreground">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground/60">Regras</p>
            <p className="whitespace-pre-line leading-relaxed">{contest.rules}</p>
          </div>
        )}

        {active && (
          <Button asChild className="w-full rounded-full">
            <Link href={"/dashboard/novels/new"}>
              Participar <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
