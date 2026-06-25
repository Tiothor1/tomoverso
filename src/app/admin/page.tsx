import Link from "next/link";
import { Activity, BookOpen, Boxes, Globe, Package2, PlugZap, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, getRecentAdminActivity, getVercelIntegration } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const overview = getAdminOverview();
  const activity = getRecentAdminActivity();
  const vercel = getVercelIntegration();

  return (
    <AdminShell
      eyebrow="controle central"
      title="Painel administrativo do Tomoverso"
      description="Um único lugar pra controlar o site público, o catálogo, usuários, operações de importação e a preparação da loja."
      actions={
        <>
          <Button asChild className="rounded-2xl"><Link href="/admin/site">Configurar site</Link></Button>
          <Button variant="outline" asChild className="rounded-2xl"><Link href="/admin/commerce">Abrir commerce</Link></Button>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Novels" value={overview.novels} icon={<BookOpen className="h-4 w-4" />} hint={`${overview.featuredCatalogItems} itens em destaque`} />
        <AdminStatCard label="Mangás" value={overview.mangas} icon={<Boxes className="h-4 w-4" />} hint={`${overview.hiddenCatalogItems} itens ocultos`} />
        <AdminStatCard label="Usuários" value={overview.users} icon={<Users className="h-4 w-4" />} hint={`${overview.suspendedUsers} suspensos`} />
        <AdminStatCard label="Produtos" value={overview.storeProducts} icon={<Package2 className="h-4 w-4" />} hint={`${overview.activeProducts} ativos na loja`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>Atividade recente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activity.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/40 p-3">
                <div>
                  <p className="font-medium">{row.action}</p>
                  <p className="text-sm text-muted-foreground">{row.display_name || row.username || "Sistema"} · {row.target_type || "geral"}</p>
                </div>
                <Badge variant="secondary">{String(row.created_at).replace("T", " ").slice(0, 16)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50">
            <CardHeader><CardTitle>Saúde operacional</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span>Capítulos de novel</span><strong className="text-foreground">{overview.chapters}</strong></div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span>Capítulos de mangá</span><strong className="text-foreground">{overview.mangaChapters}</strong></div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span>Comentários</span><strong className="text-foreground">{overview.comments}</strong></div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span>Relatórios pendentes</span><strong className="text-foreground">{overview.reports}</strong></div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-3"><span>Ativos na última hora</span><strong className="text-foreground">{overview.activeNow}</strong></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border/50">
            <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="mb-1 flex items-center gap-2 font-medium"><PlugZap className="h-4 w-4 text-primary" /> Vercel</p>
                <p className="text-muted-foreground">Projeto: {vercel?.project_name || "não configurado"}</p>
                <p className="text-muted-foreground">URL: {vercel?.production_url || "—"}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" asChild className="rounded-2xl"><Link href="/admin/integrations"><Globe className="mr-2 h-4 w-4" /> Integrações</Link></Button>
                <Button variant="outline" asChild className="rounded-2xl"><Link href="/admin/imports"><Activity className="mr-2 h-4 w-4" /> Importações</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminShell>
  );
}
