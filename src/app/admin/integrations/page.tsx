import { AdminShell } from "@/components/admin/admin-shell";
import { VercelIntegrationCard } from "@/components/admin/vercel-integration-card";
import { getVercelIntegration } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const integration = getVercelIntegration();

  return (
    <AdminShell
      eyebrow="integrações"
      title="Conectores externos do projeto"
      description="Hoje a prioridade é Vercel: salvar metadados, testar conexão e deixar o painel pronto para acompanhar deploy/infra do site principal."
    >
      <VercelIntegrationCard integration={integration} />
    </AdminShell>
  );
}
