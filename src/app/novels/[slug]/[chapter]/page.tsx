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
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface ChapterRow {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  views: number;
  published_at: string;
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter: chapterNum } = await params;
  const db = getDb();
  const novelRow = db.prepare("SELECT id, slug, title, author_id FROM novels WHERE slug = ?").get(slug) as { id: string; slug: string; title: string; author_id: string } | undefined;
  if (!novelRow) notFound();
  const safeNovel = novelRow!;

  const chapterNumInt = parseInt(chapterNum, 10);
  const chapter = db.prepare("SELECT * FROM chapters WHERE novel_id = ? AND chapter_number = ?").get(safeNovel.id, chapterNumInt) as ChapterRow | undefined;
  if (!chapter) notFound();
  const safeChapter = chapter!;

  const allChapters = db.prepare("SELECT id, chapter_number, title FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC").all(safeNovel.id) as { id: string; chapter_number: number; title: string }[];
  const idx = allChapters.findIndex((c) => c.chapter_number === safeChapter.chapter_number);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;

  // Incrementa views
  db.prepare("UPDATE chapters SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(safeChapter.id);
  db.prepare("UPDATE novels SET views = COALESCE(views, 0) + 1 WHERE id = ?").run(safeNovel.id);

  const user = await getCurrentUser();
  const isLiked = user ? !!db.prepare("SELECT 1 FROM likes WHERE user_id = ? AND chapter_id = ?").get(user.id, safeChapter.id) : false;
  const isBookmarked = user ? !!db.prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND chapter_id = ?").get(user.id, safeChapter.id) : false;
  const likesCount = (db.prepare("SELECT COUNT(*) as c FROM likes WHERE chapter_id = ?").get(safeChapter.id) as { c: number }).c;

  // Comentários
  const comments = db.prepare(`
    SELECT c.*, u.display_name, u.username, u.avatar_url
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.chapter_id = ? AND c.is_hidden = 0
    ORDER BY c.created_at DESC LIMIT 50
  `).all(safeChapter.id) as Array<{
    id: string;
    content: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
  }>;

  // Author info
  const author = db.prepare("SELECT display_name FROM users WHERE id = ?").get(safeNovel.author_id) as { display_name: string } | undefined;

  async function postComment(formData: FormData) {
    "use server";
    const currentUser = await getCurrentUser();
    if (!currentUser) return;
    const content = (formData.get("content") as string)?.trim();
    if (!content || content.length < 3) return;
    const dbase = getDb();
    dbase.prepare(
      "INSERT INTO comments (id, novel_id, chapter_id, user_id, content) VALUES (?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), safeNovel.id, safeChapter.id, currentUser.id, content.slice(0, 1000));
    revalidatePath(`/novels/${slug}/${chapterNum}`);
  }

  return (
    <div className="min-h-screen">
      <ReadingProgress />
      <ReaderSettings />

      <div className="border-b border-border/40 bg-muted/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" asChild size="sm" className="-ml-2">
              <Link href={`/novels/${safeNovel.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="truncate max-w-[200px]">{safeNovel.title}</span>
              </Link>
            </Button>
            <Badge variant="outline" className="font-mono">
              Cap {safeChapter.chapter_number} / {allChapters.length}
            </Badge>
          </div>
        </div>
      </div>

      <article className="container mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16">
        <header className="mb-10 md:mb-12 space-y-4 text-center">
          <Badge className="text-xs">Capítulo {safeChapter.chapter_number}</Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            {safeChapter.title}
          </h1>
          <div className="text-xs text-muted-foreground">
            ~{Math.ceil(safeChapter.word_count / 250)} min de leitura
          </div>
        </header>

        <div className="prose-ln mx-auto">
          {safeChapter.content.split(/\n\n+/).map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            return <p key={i}>{trimmed}</p>;
          })}
        </div>

        {author && (
          <div className="mt-16 p-6 rounded-lg border border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {author.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold">Nota do autor</div>
                <div className="text-xs text-muted-foreground">{author.display_name}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              Esse capítulo foi um dos mais difíceis de escrever até agora. Obrigado por ler até aqui. O próximo vai ser ainda mais intenso.
            </p>
          </div>
        )}
      </article>

      <div className="border-t border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="grid grid-cols-2 gap-3">
            {prev ? (
              <Button variant="outline" asChild className="h-auto py-3 justify-start">
                <Link href={`/novels/${safeNovel.slug}/${prev.chapter_number}`} className="text-left">
                  <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cap {prev.chapter_number} · Anterior</div>
                    <div className="font-medium text-sm truncate">{prev.title}</div>
                  </div>
                </Link>
              </Button>
            ) : <div />}

            {next ? (
              <Button asChild className="h-auto py-3 justify-end text-right">
                <Link href={`/novels/${safeNovel.slug}/${next.chapter_number}`}>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider opacity-80">Cap {next.chapter_number} · Próximo</div>
                    <div className="font-medium text-sm truncate">{next.title}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="h-auto py-3">
                <Link href={`/novels/${safeNovel.slug}`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Voltar à página
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div id="comments" className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Comentários ({comments.length})</h2>
        </div>

        {user ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <form action={postComment} className="flex gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea name="content" placeholder="O que você achou desse capítulo?" rows={3} className="resize-none" required minLength={3} maxLength={1000} />
                  <div className="flex justify-end">
                    <Button type="submit">
                      <Send className="h-4 w-4 mr-2" />
                      Comentar
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Faça login pra comentar</p>
              <Button asChild>
                <Link href="/auth/login">Entrar</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            comments.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {c.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/authors/${c.username}`} className="font-medium text-sm hover:text-primary">
                          {c.display_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{c.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
