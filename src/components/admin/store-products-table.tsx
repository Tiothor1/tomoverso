import { upsertStoreProductAction } from "@/lib/actions/commerce-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format((cents || 0) / 100);
}

export function StoreProductsTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="pb-3"><CardTitle className="text-base">Produtos cadastrados</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <form key={row.id} action={upsertStoreProductAction} className="rounded-lg border border-border/50 bg-card/60 p-3.5">
            <input type="hidden" name="id" value={row.id} />
            <div className="flex flex-wrap gap-3">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {row.cover_local_path || row.cover_url ? (
                  <img src={row.cover_local_path || row.cover_url} alt={row.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">sem capa</div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input name="title" defaultValue={row.title} className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm font-medium" />
                <div className="flex flex-wrap gap-1.5">
                  <input name="slug" defaultValue={row.slug} className="flex-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm min-w-0" />
                  <input name="sku" defaultValue={row.sku || ""} placeholder="SKU" className="w-24 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
                  <input name="source_slug" placeholder="slug obra" className="w-28 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
                </div>
                <textarea name="description" defaultValue={row.description} className="min-h-20 w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
              </div>
              <div className="flex shrink-0 flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Preço</p>
                  <p className="font-bold">{formatMoney(row.price_cents)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Estoque</p>
                  <p className="font-bold">{row.stock_qty}</p>
                </div>
                <Button size="sm" className="rounded-lg">Salvar</Button>
              </div>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
