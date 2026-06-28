import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, DollarSign, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatBRLCents } from "@/lib/marketplace/money";
import { createPurchaseCheckoutAction } from "@/lib/actions/marketplace-actions";

export const dynamic = "force-dynamic";

export default async function ComprarNovelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirect=/novels/${slug}/comprar`);

  const db = getDb();
  const novel = db.prepare("SELECT * FROM novels WHERE slug = ?").get(slug) as any;
  if (!novel) notFound();

  const paidWork = db.prepare("SELECT * FROM paid_works WHERE content_type = 'novel' AND content_id = ? AND price_cents > 0").get(novel.id) as any;
  if (!paidWork) redirect(`/novels/${slug}`);

  // Verifica se já comprou
  const hasPurchased = !!db.prepare("SELECT 1 FROM purchases WHERE buyer_id = ? AND content_type = 'novel' AND content_id = ?").get(user.id, novel.id);
  if (hasPurchased) redirect(`/novels/${slug}`);

  const isOwnNovel = novel.author_id === user.id;
  if (isOwnNovel) redirect(`/novels/${slug}`);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href={`/novels/${slug}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para {novel.title}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Finalizar compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-muted/30 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{novel.title}</p>
              <p className="text-sm text-muted-foreground">Acesso completo a todos os capítulos</p>
            </div>
            <p className="text-2xl font-heading font-bold">{formatBRLCents(Math.floor(paidWork.price_cents))}</p>
          </div>

          <form action={createPurchaseCheckoutAction} className="space-y-4">
            <input type="hidden" name="paid_work_id" value={paidWork.id} />

            <div className="space-y-3">
              <h3 className="font-medium text-sm">Dados para nota fiscal</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="buyer_cpf">CPF *</Label>
                  <Input id="buyer_cpf" name="buyer_cpf" placeholder="000.000.000-00" required maxLength={14} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="buyer_email">Email *</Label>
                  <Input id="buyer_email" name="buyer_email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <Label htmlFor="buyer_zip">CEP *</Label>
                  <Input id="buyer_zip" name="buyer_zip" placeholder="00000-000" required maxLength={9} />
                </div>
                <div className="md:col-span-1" />
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <Label htmlFor="buyer_street">Rua *</Label>
                  <Input id="buyer_street" name="buyer_street" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="buyer_number">Número *</Label>
                  <Input id="buyer_number" name="buyer_number" required />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <Label htmlFor="buyer_neighborhood">Bairro *</Label>
                  <Input id="buyer_neighborhood" name="buyer_neighborhood" required />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label htmlFor="buyer_city">Cidade *</Label>
                  <Input id="buyer_city" name="buyer_city" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="buyer_state">UF *</Label>
                  <Input id="buyer_state" name="buyer_state" maxLength={2} placeholder="SP" required />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">Pagamento 100% seguro via Mercado Pago</p>
                <p className="mt-1">Você será redirecionado para pagar via PIX. Após a confirmação, o acesso será liberado automaticamente.</p>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Pagar {formatBRLCents(Math.floor(paidWork.price_cents))} via PIX
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
