import { refreshVercelIntegrationAction, saveVercelIntegrationAction } from "@/lib/actions/integration-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VercelIntegrationCard({ integration }: { integration: any }) {
  let status: any = null;
  try { status = integration?.status_json ? JSON.parse(integration.status_json) : null; } catch {}

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="rounded-xl border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base">Conexão Vercel</CardTitle></CardHeader>
        <CardContent>
          <form action={saveVercelIntegrationAction} className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              Token de API
              <input name="access_token" placeholder="cole aqui se quiser salvar/atualizar" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Project ID
              <input name="project_id" defaultValue={integration?.project_id || ""} className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Project name
              <input name="project_name" defaultValue={integration?.project_name || ""} className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Team ID
              <input name="team_id" defaultValue={integration?.team_id || ""} className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Production URL
              <input name="production_url" defaultValue={integration?.production_url || ""} className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Button size="sm" className="rounded-lg">Salvar integração</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p><strong>Token salvo:</strong> {integration?.token_hint || "não"}</p>
            <p><strong>Projeto:</strong> {integration?.project_name || "—"}</p>
            <p><strong>Project ID:</strong> {integration?.project_id || "—"}</p>
            <p><strong>URL:</strong> {integration?.production_url || "—"}</p>
            <p><strong>Última checagem:</strong> {integration?.last_checked_at || "—"}</p>
          </div>
          {status ? (
            <div className={`rounded-lg border p-3 text-sm ${status.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
              <p className="font-semibold">{status.message}</p>
              {status.project?.name ? <p>Projeto: {status.project.name}</p> : null}
              {status.deployment?.url ? <p>Deploy: {status.deployment.url}</p> : null}
            </div>
          ) : null}
          {integration?.last_error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">{integration.last_error}</div>
          ) : null}
          <form action={refreshVercelIntegrationAction}>
            <Button variant="outline" size="sm" className="w-full rounded-lg">Testar / atualizar status</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
