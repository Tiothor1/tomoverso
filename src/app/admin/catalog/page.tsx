import { AdminShell } from "@/components/admin/admin-shell";
import { CatalogTable } from "@/components/admin/catalog-table";
import { getCatalogAdminRows } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = getCatalogAdminRows(q, 80);

  return (
    <AdminShell
      eyebrow="catálogo"
      title="Controle editorial de novels e mangás"
      description="Defina o que aparece, o que ganha destaque, o que entra na home e o que já pode participar da futura loja."
    >
      <form className="rounded-lg border border-border/50 bg-card/70 p-3">
        <input name="q" defaultValue={q} placeholder="Buscar por título, slug ou sinopse..." className="w-full rounded-lg border border-border/60 bg-background px-3.5 py-2.5 text-sm" />
      </form>
      <CatalogTable rows={rows} />
    </AdminShell>
  );
}
