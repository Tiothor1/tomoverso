import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, MessageCircle, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { PremiumReaderControls } from "@/components/reader/premium-controls";
import { ChapterActions } from "@/components/reader/chapter-actions";
import { ParagraphComments } from "@/components/reader/paragraph-comments";
import { ParagraphToggle } from "@/components/reader/paragraph-toggle";
import { ChapterAd, InterChapterAd } from "@/components/ads/inline-ad";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, readableNovelChapterSql } from "@/lib/public-catalog";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/** Remove junk text de importação/paginação e notas técnicas do conteúdo */
function cleanChapterContent(text: string): string {
  return text
    // Remove "CAPÍTULO MUITO LONGO" e avisos similares
    .replace(/^\[CAPÍTULO MUITO LONGO.*?\]\s*/gmi, "")
    .replace(/^\[.*?\d+(?:\.\d+)?[kK]?[bB].*?\]\s*/gmi, "")
    // Remove "49.253 chars", "842+ linhas", etc.
    .replace(/^\d+[+-]?\s*linhas?\s*.*$/gmi, "")
    .replace(/^\d+(?:\.\d+)?\s*(?:chars|caracteres|palavras|words).*$/gmi, "")
    // Remove "Nota do autor", "Mensagem do autor", "Author's Note"
    .replace(/^Nota do autor:?.*$/gmi, "")
    .replace(/^Mensagem do autor:?.*$/gmi, "")
    .replace(/^Author'?s?\s*Note:?.*$/gmi, "")
    // Remove linhas de asteriscos/separadores (***, ---, etc) — mas só linhas solitárias
    .replace(/^\s*[\*\-_=]{3,}\s*$/gm, "")
    // Remove linhas de "extraído via browser" etc
    .replace(/^[-–—].*?(?:extraído|browser|via).*$/gmi, "")
    // Remove metadados de tradução (Tradução: X, Revisão: Y)
    .replace(/^Tradução:.*$/gmi, "")
    .replace(/^Revisão:.*$/gmi, "")
    // Limpa espaços extras
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

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
  const novelRow = db.prepare(`SELECT id, slug, title, author_id FROM novels WHERE slug = ? AND ${publicReadableNovelSql("novels")}`).get(slug) as { id: string; slug: string; title: string; author_id: string } | undefined;
  if (!novelRow) notFound();
  const safeNovel = novelRow!;

  const chapterNumInt = parseInt(chapterNum, 10);
  const chapter = db.prepare(`SELECT * FROM chapters WHERE novel_id = ? AND chapter_number = ? AND ${readableNovelChapterSql("chapters")}`).get(safeNovel.id, chapterNumInt) as ChapterRow | undefined;
  if (!chapter) notFound();
  const safeChapter = chapter!;

  const allChapters = db.prepare(`SELECT id, chapter_number, title FROM chapters WHERE novel_id = ? AND ${readableNovelChapterSql("chapters")} ORDER BY chapter_number ASC`).all(safeNovel.id) as { id: string; chapter_number: number; title: string }[];
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

  // Assinatura do usuario logado
  const userSub = user ? db.prepare(`
    SELECT us.status, sp.badge_label, sp.name AS plan_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing')
    LIMIT 1
  `).get(user.id) as { status: string; badge_label: string; plan_name: string } | undefined : null;

  // Comentários com badge
  const comments = db.prepare(`
    SELECT c.*, u.display_name, u.username, u.avatar_url,
      sp.badge_label AS comment_badge,
      CASE WHEN us.status IN ('active', 'trialing') THEN 1 ELSE 0 END AS is_subscriber
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status IN ('active', 'trialing')
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE c.chapter_id = ? AND c.is_hidden = 0
    ORDER BY is_subscriber DESC, c.created_at DESC LIMIT 50
  `).all(safeChapter.id) as Array<{
    id: string;
    content: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    comment_badge: string | null;
    is_subscriber: number;
  }>;

  // Comentários por parágrafo
  const paragraphCommentsRaw = db.prepare(`
    SELECT c.id, c.content, c.paragraph_number, c.created_at,
           u.display_name, u.username, u.avatar_url,
           sp.badge_label AS comment_badge,
           CASE WHEN us.status IN ('active', 'trialing') THEN 1 ELSE 0 END AS is_subscriber
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status IN ('active', 'trialing')
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE c.chapter_id = ? AND c.is_hidden = 0 AND c.paragraph_number IS NOT NULL
    ORDER BY c.created_at DESC
  `).all(safeChapter.id) as Array<{
    id: string;
    content: string;
    paragraph_number: number;
    created_at: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    comment_badge: string | null;
    is_subscriber: number;
  }>;

  // Agrupa por parágrafo
  const paragraphCommentsMap = new Map<number, typeof paragraphCommentsRaw>();
  for (const pc of paragraphCommentsRaw) {
    const arr = paragraphCommentsMap.get(pc.paragraph_number) || [];
    arr.push(pc as any);
    paragraphCommentsMap.set(pc.paragraph_number, arr);
  }


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
              Cap {idx + 1} / {allChapters.length}
            </Badge>
            <ParagraphToggle />
          </div>
        </div>
      </div>

      <article className="mx-auto py-12 md:py-16">
        <header className="mb-10 md:mb-12 space-y-4 text-center">
          <Badge className="text-xs">Capítulo {safeChapter.chapter_number}</Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            {safeChapter.title}
          </h1>
          <div className="text-xs text-muted-foreground">
            ~{Math.ceil(safeChapter.word_count / 250)} min de leitura
          </div>
        </header>

        <ChapterAd chapterNumber={safeChapter.chapter_number} />

        <div className="prose-ln mx-auto">
          {cleanChapterContent(safeChapter.content).split(/\n\n+/).map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imageMatch) {
              const [, alt, src] = imageMatch;
              return (
                <figure key={i} className="not-prose mx-auto my-12 w-fit max-w-full overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl shadow-black/20">
                  <img
                    src={src}
                    alt={alt || safeChapter.title}
                    className="mx-auto block h-auto max-h-[calc(100vh-7rem)] max-w-full object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  {alt ? <figcaption className="max-w-[min(100%,42rem)] px-4 py-3 text-center text-xs text-muted-foreground">{alt}</figcaption> : null}
                </figure>
              );
            }
            const paraComments = paragraphCommentsMap.get(i + 1) || [];
            return (
              <p key={i} className="group relative">
                {trimmed}
                <ParagraphComments
                  paragraphIndex={i}
                  chapterId={safeChapter.id}
                  novelId={safeNovel.id}
                  novelSlug={safeNovel.slug}
                  chapterNumber={safeChapter.chapter_number}
                  comments={paraComments as any}
                  isLoggedIn={!!user}
                />
              </p>
            );
          })}
        </div>
      </article>

      <PremiumReaderControls />

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
                  Voltar à p&#225;gina
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border/30 bg-card/50">
          <div className="container mx-auto max-w-3xl px-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <ChapterActions
                chapterId={safeChapter.id}
                novelSlug={safeNovel.slug}
                chapterNumber={safeChapter.chapter_number}
                wordCount={safeChapter.word_count}
                viewCount={safeChapter.views}
              />
              {userSub ? (
                <a
                  href={`/api/chapters/${safeChapter.id}/download`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Baixar .txt
                </a>
              ) : (
                <Link
                  href="/store/plans"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm font-medium text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Assine p/ baixar
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <InterChapterAd chapterNumber={safeChapter.chapter_number} interval={2} />

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
              <Card key={c.id} className={c.is_subscriber ? "border-amber-500/30 bg-amber-500/5" : ""}>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className={`${c.is_subscriber ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"} text-sm`}>
                        {c.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={`/authors/${c.username}`} className="font-medium text-sm hover:text-primary">
                          {c.display_name}
                        </Link>
                        {c.comment_badge && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            c.comment_badge === "Autor Verificado"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {c.comment_badge === "Autor Verificado" ? "✓" : "👑"} {c.comment_badge}
                          </span>
                        )}
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
