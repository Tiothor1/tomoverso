import { AdminShell } from "@/components/admin/admin-shell";
import { UsersTable } from "@/components/admin/users-table";
import { getUserAdminRows } from "@/lib/admin/queries";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const { q = "" } = await searchParams;
  const rows = getUserAdminRows(q, 80);

  return (
    <AdminShell
      eyebrow="usuários"
      title="Papéis, acesso e moderação"
      description="Promova autores, mantenha leitores ativos e corte acesso quando precisar sem desmontar o resto do sistema."
    >
      <form className="rounded-lg border border-border/50 bg-card/70 p-3">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, @username ou email..." className="w-full rounded-lg border border-border/60 bg-background px-3.5 py-2.5 text-sm" />
      </form>
      <UsersTable rows={rows} />
    </AdminShell>
  );
}
