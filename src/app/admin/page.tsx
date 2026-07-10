import Link from "next/link";
import { Activity, BadgeCheck, BookOpen, Boxes, Globe, Package2, PlugZap, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, getRecentAdminActivity, getVercelIntegration } from "@/lib/admin/queries";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return (
      <AdminShell
        eyebrow="acesso negado"
        title="Sem permissão"
        description="Você precisa ser administrador para acessar esta área."
      >
        <p className="text-sm text-muted-foreground">Faça login com uma conta de administrador.</p>
      </AdminShell>
    );
  }
  const overview = getAdminOverview();
  const activity = getRecentAdminActivity();
  const vercel = getVercelIntegration();

  return (
    <AdminShell
      eyebrow="controle central"
      title="Painel do Tomo Verso"
      description="Controle o site, catálogo, usuários, importações e loja."
      actions={
        <>
          <Button asChild size="sm" className="rounded-lg"><Link href="/admin/site">Configurar site</Link></Button>
          <Button variant="outline" size="sm" asChild className="rounded-lg"><Link href="/admin/commerce">Abrir commerce</Link></Button>
        </>
      }
    >
      {/* Stat cards — responsive auto-fit grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Novels" value={overview.novels} icon={<BookOpen className="h-4 w-4" />} hint={`${overview.featuredCatalogItems} itens em destaque`} />
        <AdminStatCard label="Mangás" value={overview.mangas} icon={<Boxes className="h-4 w-4" />} hint={`${overview.hiddenCatalogItems} itens ocultos`} />
        <AdminStatCard label="Usuários" value={overview.users} icon={<Users className="h-4 w-4" />} hint={`${overview.suspendedUsers} suspensos`} />
        <AdminStatCard label="Produtos" value={overview.storeProducts} icon={<Package2 className="h-4 w-4" />} hint={`${overview.activeProducts} ativos na loja`} />
      </section>

      {/* Bottom section — full width flexible */}
      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-xl border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base">Atividade recente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activity.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/40 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.action}</p>
                  <p className="text-xs text-muted-foreground">{row.display_name || row.username || "Sistema"} · {row.target_type || "geral"}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[11px]">{String(row.created_at).replace("T", " ").slice(0, 16)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">Saúde operacional</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {[
                ["Capítulos de novel", overview.chapters],
                ["Capítulos de mangá", overview.mangaChapters],
                ["Comentários", overview.comments],
                ["Relatórios pendentes", overview.reports],
                ["Ativos na última hora", overview.activeNow],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-lg bg-muted/60 px-3.5 py-2">
                  <span>{label}</span>
                  <strong className="text-foreground">{String(value)}</strong>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-base">Integrações</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg bg-muted/60 px-3.5 py-2.5">
                <p className="mb-0.5 flex items-center gap-2 font-medium"><PlugZap className="h-3.5 w-3.5 text-primary" /> Vercel</p>
                <p className="text-xs text-muted-foreground">Projeto: {vercel?.project_name || "não configurado"}</p>
                <p className="text-xs text-muted-foreground">URL: {vercel?.production_url || "—"}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="outline" size="sm" asChild className="rounded-lg"><Link href="/admin/integrations"><Globe className="mr-1.5 h-3.5 w-3.5" /> Integrações</Link></Button>
                <Button variant="outline" size="sm" asChild className="rounded-lg"><Link href="/admin/imports"><Activity className="mr-1.5 h-3.5 w-3.5" /> Importações</Link></Button>
                <Button variant="outline" size="sm" asChild className="rounded-lg"><Link href="/admin/catalog/curation"><BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> Curadoria</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminShell>
  );
}
