import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Activity, Search, Bookmark } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

export default async function AdminMangasPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  const db = getDb();
  const q = (await props.searchParams)?.q || "";
  const mangas = q
    ? db.prepare("SELECT * FROM mangas WHERE title LIKE ? OR slug LIKE ? ORDER BY updated_at DESC LIMIT 100").all(`%${q}%`, `%${q}%`)
    : db.prepare("SELECT * FROM mangas ORDER BY updated_at DESC LIMIT 100").all();

  const chapterCounts = db.prepare("SELECT manga_id, COUNT(*) c FROM manga_chapters GROUP BY manga_id").all() as any[];
  const ccMap = Object.fromEntries(chapterCounts.map((r: any) => [r.manga_id, r.c]));

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
          <Activity className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">MANGÁS ({mangas.length})</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <form method="GET" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Buscar..." className="bg-gray-900 border-red-900/40 text-red-100" />
          <Button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100"><Search className="h-4 w-4" /></Button>
        </form>
        <div className="space-y-2">
          {(mangas as any[]).map((m) => (
            <div key={m.id} className="rounded-xl border border-red-900/20 bg-gray-900/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-red-200 truncate">{m.title}</p>
                    <Badge variant="outline" className="text-[10px] border-red-800/30 text-red-400 shrink-0">{m.status || "?"}</Badge>
                  </div>
                  <p className="text-xs text-red-400/60 mt-0.5">
                    {m.author || "Autor desconhecido"} · {ccMap[m.id] || 0} caps · {m.slug}
                  </p>
                </div>
                <div className="text-right shrink-0 text-xs text-red-400/40">
                  <p>{m.updated_at?.slice(0, 10)}</p>
                </div>
              </div>
            </div>
          ))}
          {mangas.length === 0 && <p className="text-center text-red-400/60 py-8">Nenhum mangá encontrado.</p>}
        </div>
      </main>
    </div>
  );
}
