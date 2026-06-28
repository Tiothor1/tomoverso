import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { setNovelPriceAction } from "@/lib/actions/marketplace-actions";
import { formatBRLCents } from "@/lib/marketplace/money";
import { MIN_PAID_WORK_PRICE_CENTS } from "@/lib/marketplace/constants";

export const dynamic = "force-dynamic";

export default async function NovelPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();
  const novel = db.prepare("SELECT * FROM novels WHERE id = ?").get(id) as any;
  if (!novel) notFound();
  if (novel.author_id !== user.id) redirect("/dashboard");

  const seller = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(user.id) as any;
  const isApprovedSeller = seller?.status === "approved";

  const paidWork = db.prepare("SELECT * FROM paid_works WHERE content_type = 'novel' AND content_id = ?").get(id) as any;
  const currentPrice = paidWork?.price_cents || 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao painel
        </Link>
      </Button>

      <div>
        <h1 className="font-heading text-3xl font-bold">Precificação</h1>
        <p className="text-muted-foreground mt-1">{novel.title}</p>
      </div>

      {!isApprovedSeller && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="font-medium">Você ainda não é vendedor aprovado</p>
            <p className="text-sm text-muted-foreground mt-1">Vá em <Link href="/dashboard/seller" className="text-primary underline">Vender obras</Link> e solicite aprovação.</p>
            <Button asChild size="sm" className="mt-3"><Link href="/dashboard/seller">Solicitar aprovação</Link></Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Definir preço de venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={setNovelPriceAction} className="space-y-4">
            <input type="hidden" name="content_type" value="novel" />
            <input type="hidden" name="content_id" value={id} />

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  id="price"
                  name="price_cents"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={currentPrice > 0 ? (currentPrice / 100).toFixed(2) : ""}
                  placeholder="0,00 — Grátis"
                  className="pl-10"
                  disabled={!isApprovedSeller}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Preço mínimo: {formatBRLCents(MIN_PAID_WORK_PRICE_CENTS)}. Deixe 0 para disponibilizar grátis.
              </p>
            </div>

            {currentPrice > 0 && (
              <div className="rounded-xl border border-border/50 p-4 space-y-2 text-sm bg-muted/30">
                <div className="flex justify-between"><span>Preço de venda</span><span className="font-medium">{formatBRLCents(currentPrice)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Comissão Tomoverso (10%)</span><span className="text-amber-400">-{formatBRLCents(Math.floor(currentPrice * 0.1))}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Taxa Mercado Pago</span><span className="text-amber-400">~{formatBRLCents(Math.floor(currentPrice * 0.04))}</span></div>
                <div className="border-t border-border/40 pt-2 flex justify-between font-medium"><span>Você recebe</span><span className="text-emerald-400">{formatBRLCents(Math.floor(currentPrice * 0.86))}</span></div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={!isApprovedSeller}>
                <Check className="h-4 w-4 mr-2" />
                Salvar preço
              </Button>
              {currentPrice > 0 && (
                <Button type="submit" name="price_cents" value="0" variant="outline" disabled={!isApprovedSeller}>
                  Remover da venda
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {currentPrice > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Obra à venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default" className="bg-emerald-500">Disponível</Badge>
              <span>Preço: {formatBRLCents(currentPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Na página da novel, os leitores verão um botão "Comprar por {formatBRLCents(currentPrice)}".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
