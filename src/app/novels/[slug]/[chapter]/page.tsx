import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, MessageCircle, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { ChapterActions } from "@/components/reader/chapter-actions";
import { ReaderSettings } from "@/components/reader/reader-settings";
import { mockNovels, mockChapters } from "@/lib/data/mock-novels";

export async function generateStaticParams() {
  const params: { slug: string; chapter: string }[] = [];
  mockNovels.forEach((n) => {
    mockChapters
      .filter((c) => c.novel_id === n.id)
      .forEach((c) => {
        params.push({ slug: n.slug, chapter: String(c.chapter_number) });
      });
  });
  return params;
}

const mockComments = [
  {
    name: "Yuki_Yamato",
    initial: "Y",
    color: "bg-pink-500",
    time: "2 horas atrás",
    text: "Cara, o jeito que você descreveu o caderno me deu arrepios. A ideia de ela encontrar algo que ela mesma criou ANTES de criar é genial.",
  },
  {
    name: "Lari_Otaku",
    initial: "L",
    color: "bg-purple-500",
    time: "5 horas atrás",
    text: "Não consigo parar de ler!! A Arlén é perfeito, o jeito que ele se comunica pelo caderno é tão fofo. Mal posso esperar pelo cap 3.",
  },
  {
    name: "Rafael_Mago",
    initial: "R",
    color: "bg-blue-500",
    time: "1 dia atrás",
    text: "A primeira letra capitular tá funcionando perfeitamente. E esse detalhe do cheiro do papel — é isso que faz LN boa. Continua!",
  },
];

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterNum } = await params;
  const novel = mockNovels.find((n) => n.slug === slug);
  if (!novel) notFound();

  const chapterNumInt = parseInt(chapterNum, 10);
  const chapter = mockChapters
    .filter((c) => c.novel_id === novel.id)
    .find((c) => c.chapter_number === chapterNumInt);
  if (!chapter) notFound();

  const allChapters = mockChapters
    .filter((c) => c.novel_id === novel.id)
    .sort((a, b) => a.chapter_number - b.chapter_number);

  const idx = allChapters.findIndex((c) => c.id === chapter.id);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;

  return (
    <div className="min-h-screen">
      <ReadingProgress />
      <ReaderSettings />

      {/* Header do capítulo */}
      <div className="border-b border-border/40 bg-muted/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" asChild size="sm" className="-ml-2">
              <Link href={`/novels/${novel.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="truncate max-w-[200px]">{novel.title}</span>
              </Link>
            </Button>
            <Badge variant="outline" className="font-mono">
              Cap {chapter.chapter_number} / {allChapters.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <header className="mb-10 space-y-4">
          <Badge className="text-xs">Capítulo {chapter.chapter_number}</Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            {chapter.title}
          </h1>
          <ChapterActions
            chapterId={chapter.id}
            novelSlug={novel.slug}
            chapterNumber={chapter.chapter_number}
            wordCount={chapter.word_count}
            viewCount={chapter.views}
          />
        </header>

        <div className="prose-ln">
          {chapter.content.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Nota do autor (decorativa) */}
        <div className="mt-16 p-6 rounded-lg border border-dashed border-border/60 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {novel.author?.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold">Nota do autor</div>
              <div className="text-xs text-muted-foreground">
                {novel.author?.display_name}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            Esse capítulo foi um dos mais difíceis de escrever até agora. Tinha
            medo de não conseguir passar a sensação de mistério sem entregar
            demais. Se você chegou até aqui, valeu demais. O próximo vai ser
            ainda mais intenso. — {novel.author?.display_name.split(" ")[0]}
          </p>
        </div>
      </article>

      {/* Navegação prev/next */}
      <div className="border-t border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="grid grid-cols-2 gap-3">
            {prev ? (
              <Button variant="outline" asChild className="h-auto py-3 justify-start">
                <Link href={`/novels/${novel.slug}/${prev.chapter_number}`} className="text-left">
                  <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cap {prev.chapter_number} · Anterior
                    </div>
                    <div className="font-medium text-sm truncate">{prev.title}</div>
                  </div>
                </Link>
              </Button>
            ) : (
              <div />
            )}

            {next ? (
              <Button asChild className="h-auto py-3 justify-end text-right">
                <Link href={`/novels/${novel.slug}/${next.chapter_number}`}>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider opacity-80">
                      Cap {next.chapter_number} · Próximo
                    </div>
                    <div className="font-medium text-sm truncate">{next.title}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="h-auto py-3">
                <Link href={`/novels/${novel.slug}`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Voltar à página
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Comentários */}
      <div id="comments" className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-bold">
            Comentários ({mockComments.length})
          </h2>
        </div>

        {/* Form de comentário */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="O que você achou desse capítulo? Sem spoiler pra quem não leu!"
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de comentários */}
        <div className="space-y-3">
          {mockComments.map((c, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className={`${c.color} text-white text-sm`}>
                      {c.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
