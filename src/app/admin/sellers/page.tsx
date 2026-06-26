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
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-border/50"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Solicitações pendentes</p><p className="mt-1 font-heading text-3xl font-black">{pending}</p></CardContent></Card>
        <Card className="rounded-3xl border-border/50"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Vendedores aprovados</p><p className="mt-1 font-heading text-3xl font-black">{approved}</p></CardContent></Card>
        <Card className="rounded-3xl border-border/50"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Comissão padrão</p><p className="mt-1 font-heading text-3xl font-black">10%</p></CardContent></Card>
      </section>

      <Card className="rounded-3xl border-border/50">
        <CardHeader><CardTitle>Fila de aprovação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sellers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Nenhum autor vendedor solicitou aprovação ainda.</div>
          ) : sellers.map((seller) => (
            <div key={seller.id} className="grid gap-4 rounded-3xl border border-border/50 bg-card/60 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-2">
                <div>
                  <h3 className="font-heading text-lg font-bold">{seller.public_name}</h3>
                  <p className="text-sm text-muted-foreground">@{seller.username || "usuario"} · {seller.email || "sem email"}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{statusLabel[seller.status] || seller.status}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">PIX {seller.pix_key_type}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">criado {String(seller.created_at).slice(0,10)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Nome legal: {seller.legal_name}</p>
                {seller.rejection_reason ? <p className="text-sm text-red-300">Motivo: {seller.rejection_reason}</p> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <form action={reviewSellerApplicationAction}>
                  <input type="hidden" name="seller_id" value={seller.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Button className="w-full rounded-xl" disabled={seller.status === "approved"}>Aprovar</Button>
                </form>
                <form action={reviewSellerApplicationAction} className="md:col-span-2 space-y-2">
                  <input type="hidden" name="seller_id" value={seller.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input name="rejection_reason" placeholder="motivo da reprovação" className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                  <Button variant="destructive" className="w-full rounded-xl" disabled={seller.status === "rejected"}>Reprovar</Button>
                </form>
                <form action={reviewSellerApplicationAction} className="md:col-span-3">
                  <input type="hidden" name="seller_id" value={seller.id} />
                  <input type="hidden" name="decision" value="suspend" />
                  <Button variant="outline" className="w-full rounded-xl" disabled={seller.status === "suspended"}>Suspender vendedor</Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
