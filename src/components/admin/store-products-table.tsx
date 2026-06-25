import { upsertStoreProductAction } from "@/lib/actions/commerce-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format((cents || 0) / 100);
}

export function StoreProductsTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-3xl border-border/50">
      <CardHeader><CardTitle>Produtos cadastrados</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <form key={row.id} action={upsertStoreProductAction} className="grid gap-3 rounded-3xl border border-border/50 bg-card/60 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <input type="hidden" name="id" value={row.id} />
            <div className="space-y-2">
              <div className="flex items-start gap-4">
                <div className="h-24 w-16 overflow-hidden rounded-2xl bg-muted">{row.cover_local_path || row.cover_url ? <img src={row.cover_local_path || row.cover_url} alt={row.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">sem capa</div>}</div>
                <div className="min-w-0 flex-1">
                  <input name="title" defaultValue={row.title} className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-medium" />
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input name="slug" defaultValue={row.slug} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                    <input name="sku" defaultValue={row.sku || ""} placeholder="SKU" className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                    <input name="source_slug" placeholder="slug vinculado" className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
              <textarea name="description" defaultValue={row.description} className="min-h-24 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-2">
                <select name="product_type" defaultValue={row.product_type} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"><option value="book">Livro</option><option value="manga">Mangá</option><option value="bundle">Bundle</option><option value="merch">Merch</option><option value="digital">Digital</option></select>
                <select name="source_type" defaultValue={row.source_type} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"><option value="manual">Manual</option><option value="novel">Novel</option><option value="manga">Mangá</option></select>
                <select name="status" defaultValue={row.status} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"><option value="draft">Draft</option><option value="active">Ativo</option><option value="archived">Arquivado</option></select>
                <input type="number" name="stock_qty" defaultValue={row.stock_qty} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                <input type="number" name="price_cents" defaultValue={row.price_cents} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                <input type="number" name="compare_at_cents" defaultValue={row.compare_at_cents || ""} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={!!row.is_featured} /> Destacar produto</label>
              <div className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">Preço atual: <span className="font-semibold text-foreground">{formatMoney(row.price_cents, row.currency)}</span></div>
              <Button className="rounded-2xl">Salvar produto</Button>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
