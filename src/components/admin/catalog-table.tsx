import { saveCatalogControlAction } from "@/lib/actions/catalog-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CatalogTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-3xl border-border/50">
      <CardHeader>
        <CardTitle>Controle de catálogo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const cover = row.cover_local_path || row.cover_url || "";
          return (
            <form key={`${row.item_type}-${row.id}`} action={saveCatalogControlAction} className="grid gap-4 rounded-3xl border border-border/50 bg-card/60 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <input type="hidden" name="item_type" value={row.item_type} />
              <input type="hidden" name="item_id" value={row.id} />
              <div className="flex gap-4">
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
                  {cover ? <img src={cover} alt={row.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">sem capa</div>}
                </div>
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{row.item_type} · {row.subtype}</p>
                    <h3 className="font-heading text-lg font-bold leading-tight">{row.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">/{row.slug}</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_hidden" defaultChecked={!!row.is_hidden} /> Ocultar</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={!!row.is_featured} /> Destaque</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_on_home" defaultChecked={!!row.show_on_home} /> Home</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="storefront_enabled" defaultChecked={!!row.storefront_enabled} /> Loja</label>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 xl:w-[270px]">
                <label className="text-sm">Badge loja<input className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" name="storefront_label" defaultValue={row.storefront_label || ""} /></label>
                <label className="text-sm">Prioridade<input className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" type="number" name="sort_order" defaultValue={row.sort_order || 0} /></label>
                <Button className="rounded-2xl">Salvar item</Button>
              </div>
            </form>
          );
        })}
      </CardContent>
    </Card>
  );
}
