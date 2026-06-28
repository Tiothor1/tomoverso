import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, MessageCircle, Trash2, User, BookOpen, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

async function deleteCommentAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const id = formData.get("comment_id") as string;
  if (!id) return;
  const db = getDb();
  db.prepare("UPDATE comments SET content = '[removido por administração]', is_hidden = 1 WHERE id = ?").run(id);
}

export default async function AdminComentariosPage() {
  try {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  const db = getDb();
  const comments = db.prepare(`
    SELECT c.*, u.display_name, u.username, n.title as novel_title, n.slug as novel_slug
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN novels n ON n.id = c.novel_id
    ORDER BY c.created_at DESC
    LIMIT 200
  `).all() as any[];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
          <MessageCircle className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">COMENTÁRIOS ({comments.length})</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        {(comments as any[]).map((c) => (
          <div key={c.id} className={`rounded-xl border ${c.is_hidden ? 'border-red-900/10 bg-gray-950/30 opacity-50' : 'border-red-900/20 bg-gray-900/50'} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-red-400/60 mb-1">
                  <User className="h-3 w-3" />
                  <span className="text-red-300">{c.display_name || "Anônimo"}</span>
                  <span className="text-red-500/30">·</span>
                  <BookOpen className="h-3 w-3" />
                  <Link href={`/novels/${c.novel_slug}`} className="text-red-400 hover:text-red-300 truncate">{c.novel_title || "Desconhecida"}</Link>
                  <span className="text-red-500/30">·</span>
                  <Calendar className="h-3 w-3" />
                  <span>{c.created_at?.slice(0, 10)}</span>
                </div>
                <p className={`text-sm ${c.is_hidden ? 'text-red-400/30 italic' : 'text-red-200'}`}>
                  {c.is_hidden ? '[removido]' : c.content?.slice(0, 300)}
                </p>
                {c.paragraph_number !== null && (
                  <Badge variant="outline" className="text-[10px] border-blue-800/30 text-blue-400 mt-1">Parágrafo #{c.paragraph_number}</Badge>
                )}
              </div>
              <form action={deleteCommentAction}>
                <input type="hidden" name="comment_id" value={c.id} />
                <Button type="submit" size="sm" variant="ghost" className="text-red-500/40 hover:text-red-400 h-7 w-7 p-0" title="Remover comentário">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-center text-red-400/60 py-8">Nenhum comentário ainda.</p>}
      </main>
    </div>
  );
  } catch (e) {
    console.error("Comments admin error:", e);
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-sm">Erro ao carregar comentários. <a href={`/${SP}`} className="underline ml-2">Voltar</a></div>;
  }
}
