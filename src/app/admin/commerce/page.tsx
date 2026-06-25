import { upsertStoreCollectionAction } from "@/lib/actions/commerce-admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { StoreProductForm } from "@/components/admin/store-product-form";
import { StoreProductsTable } from "@/components/admin/store-products-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommerceStats, getStoreCollections, getStoreProducts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminCommercePage() {
  const stats = getCommerceStats();
  const products = getStoreProducts();
  const collections = getStoreCollections();

  return (
    <AdminShell
      eyebrow="commerce foundation"
      title="Catálogo comercial e preparação de vendas"
      description="Monte SKUs, bundles e coleções agora — e depois plugamos checkout/pagamentos sem refazer o admin."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Produtos" value={stats.products} hint={`${stats.activeProducts} ativos`} />
        <AdminStatCard label="Drafts" value={stats.draftProducts} hint="itens ainda não publicados" />
        <AdminStatCard label="Coleções" value={stats.collections} hint={`${stats.featuredProducts} produtos em destaque`} />
        <AdminStatCard label="Baixo estoque" value={stats.lowStock} hint="<= 5 unidades" />
      </section>

      <StoreProductForm />
      <StoreProductsTable rows={products} />

      <Card className="rounded-3xl border-border/50">
        <CardHeader><CardTitle>Coleções da loja</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form action={upsertStoreCollectionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input name="title" placeholder="Título da coleção" className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" required />
            <input name="slug" placeholder="slug" className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" />
            <label className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm"><input type="checkbox" name="is_featured" /> Destacar</label>
            <button className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Salvar coleção</button>
            <textarea name="description" placeholder="Descrição da coleção" className="min-h-24 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm md:col-span-2 xl:col-span-4" />
          </form>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <div key={collection.id} className="rounded-3xl border border-border/50 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">/{collection.slug}</p>
                <h3 className="font-heading text-xl font-bold">{collection.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{collection.description || "Sem descrição ainda."}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
