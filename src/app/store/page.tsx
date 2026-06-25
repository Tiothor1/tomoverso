import Link from "next/link";
import { ArrowRight, Package2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format((cents || 0) / 100);
}

export default function StorePage() {
  const settings = getSiteConfig();
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM store_products WHERE status = 'active' ORDER BY is_featured DESC, updated_at DESC`).all() as Array<any>;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <section className="mb-8 rounded-[2rem] border border-border/50 bg-gradient-to-br from-card to-primary/5 p-6">
        <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">Commerce preview</Badge>
        <h1 className="font-heading text-4xl font-black tracking-tight md:text-5xl">{settings.storefront_title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{settings.storefront_description}</p>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-border/60 bg-card/60 p-10 text-center">
          <Package2 className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="font-heading text-2xl font-bold">A loja está pronta pra receber produtos</h2>
          <p className="mt-2 text-muted-foreground">Cadastre SKUs no admin e publique quando quiser abrir a fase comercial.</p>
          <div className="mt-4"><Button asChild className="rounded-2xl"><Link href="/explore">Voltar ao catálogo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => {
            const cover = row.cover_local_path || row.cover_url || "";
            return (
              <Card key={row.id} className="overflow-hidden rounded-3xl border-border/50 bg-card/80">
                <div className="aspect-[2/3] bg-muted">{cover ? <img src={cover} alt={row.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">sem capa</div>}</div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={row.is_featured ? "default" : "secondary"}>{row.product_type}</Badge>
                    <span className="text-xs text-muted-foreground">estoque {row.stock_qty}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold leading-tight">{row.title}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{row.description || "Produto editorial pronto para a futura fase comercial."}</p>
                  <div className="pt-2 text-xl font-black">{formatMoney(row.price_cents, row.currency)}</div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
