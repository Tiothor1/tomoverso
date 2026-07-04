"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Download, FileText, Lock, PenLine, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authorPlusAssets, authorPlusTrails } from "@/lib/author-plus-content";

type Props = {
  isAuthorPlus: boolean;
  userName?: string;
  totalViews?: number;
  totalChapters?: number;
  totalWorks?: number;
  topWork?: { title: string; views: number; chapter_count: number } | null;
};

const genres = ["fantasia sombria", "romance escolar", "ação sobrenatural", "regressão", "isekai", "mistério", "sistema de evolução"];
const archetypes = ["protagonista desacreditado", "herdeira escondida", "vilão cansado", "caçador rank E", "autora presa na própria obra", "exorcista novato"];
const conflicts = ["precisa vencer sem revelar seu segredo", "recebe uma segunda chance depois de morrer", "é acusado injustamente", "descobre que o sistema mente", "tem sete dias para impedir uma tragédia", "precisa proteger quem deveria odiar"];

function pick(list: string[], seed: string, offset = 0) {
  const code = Array.from(seed || "tomoverso").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + offset * 17;
  return list[Math.abs(code) % list.length];
}

function buildIdea(input: string, locked: boolean) {
  const base = input.trim() || "uma novel brasileira com clima de manhwa";
  const genre = pick(genres, base, 1);
  const hero = pick(archetypes, base, 2);
  const conflict = pick(conflicts, base, 3);
  const title = `${base.split(" ").slice(0, 3).join(" ") || "Crônicas"}: O Último Capítulo`;
  const chapters = [
    "Comece com uma cena de perda ou humilhação, sem explicar o mundo inteiro.",
    "Mostre uma pequena vitória com custo alto.",
    "Apresente a regra principal do poder/sistema.",
    "Crie um aliado que parece útil, mas esconde interesse próprio.",
    "Feche com uma escolha impossível e uma promessa de virada.",
  ];
  const extra = locked ? [
    "Arco 1: sobrevivência e descoberta da regra secreta.",
    "Arco 2: o protagonista usa a regra contra alguém mais forte.",
    "Arco 3: a vitória revela um inimigo maior dentro da própria instituição.",
  ] : ["Assine o Autor+ para desbloquear arcos completos, tags e prompts de capa."];
  return { title, genre, hero, conflict, chapters, extra };
}

function improveSynopsis(text: string, locked: boolean) {
  const raw = text.trim();
  if (!raw) return "Cole sua sinopse para receber uma versão mais vendável.";
  const short = raw.replace(/\s+/g, " ").slice(0, 260);
  const hook = `Quando tudo que conhece desmorona, ${short.charAt(0).toLowerCase()}${short.slice(1)}`;
  if (!locked) {
    return `${hook}\n\nPreview grátis: sua sinopse precisa começar com conflito, promessa e consequência. Autor+ desbloqueia versão completa com tags, título e gancho.`;
  }
  return `${hook}\n\nVersão editorial:\nEm um mundo onde cada escolha cobra um preço, o protagonista precisa transformar fraqueza em estratégia antes que seu segredo seja usado contra ele. Entre alianças instáveis, inimigos que conhecem suas falhas e uma verdade que muda tudo, cada capítulo deve terminar com uma pergunta: até onde ele vai para continuar vivo?\n\nTags recomendadas: evolução, segredo, fantasia, vingança, protagonista estratégico.\nGancho do cap. 1: termine revelando que a primeira vitória ativou uma consequência impossível de desfazer.`;
}

function LockedNote({ isAuthorPlus }: { isAuthorPlus: boolean }) {
  if (isAuthorPlus) return null;
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-bold"><Lock className="h-4 w-4" /> Preview grátis</div>
      <p className="mt-1 text-amber-100/80">Você vê uma amostra funcional. Autor+ libera respostas completas, downloads e trilhas avançadas.</p>
      <Button asChild size="sm" className="mt-3 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300"><Link href="/store/plans">Virar Autor+</Link></Button>
    </div>
  );
}

export function AuthorPlusWorkspace({ isAuthorPlus, userName, totalViews = 0, totalChapters = 0, totalWorks = 0, topWork }: Props) {
  const [ideaInput, setIdeaInput] = useState("fantasia sombria com protagonista fraco que evolui");
  const [synopsis, setSynopsis] = useState("Um jovem sem talento descobre que a menor habilidade do mundo pode quebrar as regras do reino.");
  const idea = useMemo(() => buildIdea(ideaInput, isAuthorPlus), [ideaInput, isAuthorPlus]);
  const editorial = useMemo(() => improveSynopsis(synopsis, isAuthorPlus), [synopsis, isAuthorPlus]);

  const downloadAsset = async (assetId: string) => {
    const res = await fetch(`/api/author-plus/assets/${assetId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("x-asset-filename") || `${assetId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,.96),rgba(30,41,59,.82))] p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="rounded-full bg-amber-400 text-amber-950 hover:bg-amber-400">Tomo Verso Autor+</Badge>
            <h1 className="font-heading text-3xl font-black tracking-tight md:text-5xl">Central profissional do autor</h1>
            <p className="text-white/74 md:text-lg">{userName ? `${userName}, ` : ""}publique grátis sempre. O Autor+ existe para transformar ideia solta em obra com cara de editora.</p>
          </div>
          <div className="grid min-w-[260px] grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-center backdrop-blur">
            <div><div className="text-2xl font-black">{totalWorks}</div><div className="text-[11px] text-white/60">obras</div></div>
            <div><div className="text-2xl font-black">{totalChapters}</div><div className="text-[11px] text-white/60">caps</div></div>
            <div><div className="text-2xl font-black">{totalViews.toLocaleString("pt-BR")}</div><div className="text-[11px] text-white/60">leituras</div></div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="ideas" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start gap-2 bg-muted/40 p-2">
          <TabsTrigger value="ideas" className="px-3 py-2">Ideias</TabsTrigger>
          <TabsTrigger value="editorial" className="px-3 py-2">Assistente</TabsTrigger>
          <TabsTrigger value="assets" className="px-3 py-2">Assets</TabsTrigger>
          <TabsTrigger value="trails" className="px-3 py-2">Trilhas</TabsTrigger>
          <TabsTrigger value="stats" className="px-3 py-2">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas" className="space-y-4">
          <LockedNote isAuthorPlus={isAuthorPlus} />
          <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Kit de ideias</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={ideaInput} onChange={(e)=>setIdeaInput(e.target.value)} placeholder="Ex: regressão, academia mágica..." /><p className="text-sm text-muted-foreground">Digite uma vibe. O Autor+ monta premissa, arco, capítulos e tags.</p></CardContent></Card>
            <Card className="border-primary/30"><CardContent className="space-y-4 p-6"><div><p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Título provisório</p><h3 className="font-heading text-2xl font-bold">{idea.title}</h3></div><div className="grid gap-3 sm:grid-cols-3"><Badge variant="secondary">{idea.genre}</Badge><Badge variant="secondary">{idea.hero}</Badge><Badge variant="secondary">{idea.conflict}</Badge></div><div><p className="font-bold">Primeiros capítulos</p><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{idea.chapters.map((c,i)=><li key={c} className="flex gap-2"><span className="font-bold text-primary">{i+1}.</span>{c}</li>)}</ul></div><div className="rounded-xl bg-muted/50 p-4 text-sm"><p className="font-bold">Arcos e bônus</p>{idea.extra.map((x)=><p key={x} className="mt-1 text-muted-foreground">{x}</p>)}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="editorial" className="space-y-4">
          <LockedNote isAuthorPlus={isAuthorPlus} />
          <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-primary" /> Sua sinopse</CardTitle></CardHeader><CardContent><Textarea className="min-h-56" value={synopsis} onChange={(e)=>setSynopsis(e.target.value)} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Revisão vendável</CardTitle></CardHeader><CardContent><pre className="whitespace-pre-wrap rounded-2xl bg-muted/45 p-4 text-sm leading-relaxed text-muted-foreground">{editorial}</pre></CardContent></Card></div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <LockedNote isAuthorPlus={isAuthorPlus} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{authorPlusAssets.map((asset)=><Card key={asset.id} className={!isAuthorPlus ? "opacity-90" : ""}><CardHeader><Badge className="w-fit" variant="secondary">{asset.type} · {asset.format}</Badge><CardTitle>{asset.title}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{asset.description}</p><Button className="w-full rounded-xl" variant={isAuthorPlus ? "default" : "outline"} onClick={()=>downloadAsset(asset.id)} disabled={!isAuthorPlus}>{isAuthorPlus ? <Download className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{isAuthorPlus ? "Baixar asset" : "Desbloquear no Autor+"}</Button></CardContent></Card>)}</div>
        </TabsContent>

        <TabsContent value="trails" className="space-y-4">
          <LockedNote isAuthorPlus={isAuthorPlus} />
          <div className="grid gap-4 md:grid-cols-2">{authorPlusTrails.map((trail, idx)=><Card key={trail.id} className={idx > 0 && !isAuthorPlus ? "opacity-75" : ""}><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> {trail.title}</CardTitle><Badge variant="outline">{trail.time}</Badge></div></CardHeader><CardContent className="space-y-3">{trail.steps.map((s,i)=><div key={s} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span>{i+1}. {s}</span></div>)}{idx > 0 && !isAuthorPlus ? <Button asChild className="w-full rounded-xl"><Link href="/store/plans"><Lock className="mr-2 h-4 w-4" />Desbloquear trilha</Link></Button> : <Button asChild variant="outline" className="w-full rounded-xl"><Link href="/dashboard/novels/new">Aplicar em uma obra <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</CardContent></Card>)}</div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <LockedNote isAuthorPlus={isAuthorPlus} />
          <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Obra com mais leitura</p><p className="mt-2 font-heading text-xl font-bold">{topWork?.title || "Ainda sem dados"}</p><p className="text-sm text-muted-foreground">{topWork ? `${topWork.views} leituras · ${topWork.chapter_count} caps` : "Publique capítulos para gerar relatório."}</p></CardContent></Card><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Ritmo recomendado</p><p className="mt-2 font-heading text-xl font-bold">2 caps/semana</p><p className="text-sm text-muted-foreground">Terça e sexta tendem a criar hábito de leitura.</p></CardContent></Card><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Próxima ação</p><p className="mt-2 font-heading text-xl font-bold">Gancho final</p><p className="text-sm text-muted-foreground">Capítulo curto + promessa clara aumenta retorno.</p></CardContent></Card></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
