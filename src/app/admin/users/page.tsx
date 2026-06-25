import { AdminShell } from "@/components/admin/admin-shell";
import { UsersTable } from "@/components/admin/users-table";
import { getUserAdminRows } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = getUserAdminRows(q, 80);

  return (
    <AdminShell
      eyebrow="usuários"
      title="Papéis, acesso e moderação"
      description="Promova autores, mantenha leitores ativos e corte acesso quando precisar sem desmontar o resto do sistema."
    >
      <form className="rounded-3xl border border-border/50 bg-card/70 p-4">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, @username ou email..." className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" />
      </form>
      <UsersTable rows={rows} />
    </AdminShell>
  );
}
