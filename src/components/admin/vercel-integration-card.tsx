import { refreshVercelIntegrationAction, saveVercelIntegrationAction } from "@/lib/actions/integration-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VercelIntegrationCard({ integration }: { integration: any }) {
  let status: any = null;
  try { status = integration?.status_json ? JSON.parse(integration.status_json) : null; } catch {}

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <Card className="rounded-3xl border-border/50">
        <CardHeader><CardTitle>Conexão Vercel</CardTitle></CardHeader>
        <CardContent>
          <form action={saveVercelIntegrationAction} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">Token de API<input name="access_token" placeholder="cole aqui se quiser salvar/atualizar" className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2" /></label>
            <label className="text-sm">Project ID<input name="project_id" defaultValue={integration?.project_id || ""} className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2" /></label>
            <label className="text-sm">Project name<input name="project_name" defaultValue={integration?.project_name || ""} className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2" /></label>
            <label className="text-sm">Team ID<input name="team_id" defaultValue={integration?.team_id || ""} className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2" /></label>
            <label className="text-sm">Production URL<input name="production_url" defaultValue={integration?.production_url || ""} className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2" /></label>
            <div className="md:col-span-2 flex flex-wrap gap-3"><Button className="rounded-2xl">Salvar integração</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-3xl border-border/50">
        <CardHeader><CardTitle>Status e leitura rápida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-muted/60 p-4 text-sm">
            <p><strong>Token salvo:</strong> {integration?.token_hint || "não"}</p>
            <p><strong>Projeto:</strong> {integration?.project_name || "—"}</p>
            <p><strong>Project ID:</strong> {integration?.project_id || "—"}</p>
            <p><strong>URL:</strong> {integration?.production_url || "—"}</p>
            <p><strong>Última checagem:</strong> {integration?.last_checked_at || "—"}</p>
          </div>
          {status ? (
            <div className={`rounded-2xl border p-4 text-sm ${status.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
              <p className="font-semibold">{status.message}</p>
              {status.project?.name ? <p>Projeto: {status.project.name}</p> : null}
              {status.deployment?.url ? <p>Deploy: {status.deployment.url}</p> : null}
            </div>
          ) : null}
          {integration?.last_error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{integration.last_error}</div> : null}
          <form action={refreshVercelIntegrationAction}><Button variant="outline" className="w-full rounded-2xl">Testar / atualizar status</Button></form>
        </CardContent>
      </Card>
    </div>
  );
}
