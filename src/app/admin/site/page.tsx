import { AdminShell } from "@/components/admin/admin-shell";
import { SiteConfigForm } from "@/components/admin/site-config-form";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const settings = getSiteConfig();

  return (
    <AdminShell
      eyebrow="site principal"
      title="Configuração pública do Tomo Verso Editora"
      description="Tudo aqui impacta a home, navbar, footer, aviso operacional e teaser da loja."
    >
      <SiteConfigForm settings={settings} />
    </AdminShell>
  );
}
