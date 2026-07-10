import { saveCatalogControlAction } from "@/lib/actions/catalog-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CatalogTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Controle de catálogo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const cover = row.cover_local_path || row.cover_url || "";
          return (
            <form key={`${row.item_type}-${row.id}`} action={saveCatalogControlAction} className="flex flex-wrap items-start gap-4 rounded-lg border border-border/50 bg-card/60 p-3.5">
              <input type="hidden" name="item_type" value={row.item_type} />
              <input type="hidden" name="item_id" value={row.id} />
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {cover ? <img src={cover} alt={row.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">sem capa</div>}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{row.item_type} · {row.subtype}</p>
                    <h3 className="font-heading text-base font-bold leading-tight">{row.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">/{row.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="is_hidden" defaultChecked={!!row.is_hidden} /> Ocultar</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="is_featured" defaultChecked={!!row.is_featured} /> Destaque</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="show_on_home" defaultChecked={!!row.show_on_home} /> Home</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="storefront_enabled" defaultChecked={!!row.storefront_enabled} /> Loja</label>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-end gap-2">
                <label className="text-sm">
                  Badge
                  <input className="mt-0.5 block w-28 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" name="storefront_label" defaultValue={row.storefront_label || ""} />
                </label>
                <label className="text-sm">
                  Prioridade
                  <input className="mt-0.5 block w-20 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" type="number" name="sort_order" defaultValue={row.sort_order || 0} />
                </label>
                <Button size="sm" className="rounded-lg">Salvar</Button>
              </div>
            </form>
          );
        })}
      </CardContent>
    </Card>
  );
}
