import { upsertStoreProductAction } from "@/lib/actions/commerce-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StoreProductForm() {
  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="pb-3"><CardTitle className="text-base">Novo produto / SKU</CardTitle></CardHeader>
      <CardContent>
        <form action={upsertStoreProductAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm">Título<input name="title" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" required /></label>
          <label className="text-sm">Slug<input name="slug" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" /></label>
          <label className="text-sm">SKU<input name="sku" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" /></label>
          <label className="text-sm">Tipo<select name="product_type" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"><option value="book">Livro</option><option value="manga">Mangá</option><option value="bundle">Bundle</option><option value="merch">Merch</option><option value="digital">Digital</option></select></label>
          <label className="text-sm">Origem<select name="source_type" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"><option value="manual">Manual</option><option value="novel">Novel</option><option value="manga">Mangá</option></select></label>
          <label className="text-sm">Slug da obra<input name="source_slug" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" /></label>
          <label className="text-sm">Preço (centavos)<input type="number" name="price_cents" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" defaultValue={0} /></label>
          <label className="text-sm">Preço comparativo<input type="number" name="compare_at_cents" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" /></label>
          <label className="text-sm">Estoque<input type="number" name="stock_qty" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" defaultValue={0} /></label>
          <label className="text-sm">Status<select name="status" className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"><option value="draft">Draft</option><option value="active">Ativo</option><option value="archived">Arquivado</option></select></label>
          <label className="flex items-center gap-2 text-sm pt-7"><input type="checkbox" name="is_featured" /> Em destaque</label>
          <label className="text-sm md:col-span-2 xl:col-span-3">Descrição<textarea name="description" className="mt-1 min-h-24 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm" /></label>
          <div className="md:col-span-2 xl:col-span-3 flex justify-end"><Button size="sm" className="rounded-lg px-5">Salvar produto</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
