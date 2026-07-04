import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAuthorPlusStatus } from "@/lib/author-plus";
import { AuthorPlusWorkspace } from "@/components/author-plus/author-plus-workspace";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Central Autor+ — Tomo Verso",
};

type WorkStat = { title: string; views: number; chapter_count: number };

export default async function DashboardAuthorPlusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const db = getDb();
  const status = getAuthorPlusStatus(db, user.id);
  const works = db.prepare(`
    SELECT n.title, n.views,
      (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapter_count
    FROM novels n
    WHERE n.author_id = ?
    ORDER BY n.views DESC, n.created_at DESC
  `).all(user.id) as WorkStat[];
  const totalWorks = works.length;
  const totalViews = works.reduce((acc, item) => acc + Number(item.views || 0), 0);
  const totalChapters = works.reduce((acc, item) => acc + Number(item.chapter_count || 0), 0);
  const topWork = works[0] || null;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">&larr; Voltar ao painel</Link>
        {!status.active && (
          <Button asChild className="rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300">
            <Link href="/store/plans"><Lock className="mr-2 h-4 w-4" />Desbloquear Autor+</Link>
          </Button>
        )}
      </div>
      <AuthorPlusWorkspace
        isAuthorPlus={status.active}
        userName={user.display_name?.split(" ")?.[0] || user.username}
        totalWorks={totalWorks}
        totalViews={totalViews}
        totalChapters={totalChapters}
        topWork={topWork}
      />
    </main>
  );
}
