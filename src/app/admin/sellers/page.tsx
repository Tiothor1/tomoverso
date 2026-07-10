import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listSellersForAdmin } from "@/lib/marketplace/seller";
import { reviewSellerApplicationAction } from "@/lib/actions/seller-actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Reprovado",
  suspended: "Suspenso",
  draft: "Rascunho",
};

export default async function AdminSellersPage() {
  const sellers = await listSellersForAdmin();
  const pending = sellers.filter((s) => s.status === "pending").length;
  const approved = sellers.filter((s) => s.status === "approved").length;

  return (
    <AdminShell
      eyebrow="marketplace"
      title="Autores vendedores"
      description="Aprove autores antes que eles possam vender obras pagas. Saques são manuais via PIX no MVP."
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Solicitações pendentes</p><p className="mt-1 font-heading text-2xl font-black">{pending}</p></CardContent></Card>
        <Card className="rounded-xl border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vendedores aprovados</p><p className="mt-1 font-heading text-2xl font-black">{approved}</p></CardContent></Card>
        <Card className="rounded-xl border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Comissão padrão</p><p className="mt-1 font-heading text-2xl font-black">10%</p></CardContent></Card>
      </section>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base">Fila de aprovação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sellers.map((seller) => (
            <div key={seller.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/50 bg-card/60 p-3.5">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-bold">{seller.display_name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{statusLabel[seller.status] || seller.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">@{seller.username} · {seller.email}</p>
                {seller.pix_key ? <p className="text-xs text-muted-foreground">PIX: {seller.pix_key}</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={reviewSellerApplicationAction} className="flex gap-1">
                  <input type="hidden" name="sellerId" value={seller.id} />
                  <input type="hidden" name="action" value="approve" />
                  <Button size="sm" variant="outline" className="rounded-md text-xs">Aprovar</Button>
                </form>
                <form action={reviewSellerApplicationAction} className="flex gap-1">
                  <input type="hidden" name="sellerId" value={seller.id} />
                  <input type="hidden" name="action" value="reject" />
                  <Button size="sm" variant="outline" className="rounded-md text-xs text-red-400">Rejeitar</Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
