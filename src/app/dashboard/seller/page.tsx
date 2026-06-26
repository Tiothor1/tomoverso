import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, ShieldAlert, Store, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getSellerProfile, isSupabaseMarketplaceActive } from "@/lib/marketplace/seller";
import { submitSellerApplicationAction } from "@/lib/actions/seller-actions";
import { MARKETPLACE_SUPPORT_EMAIL, MIN_WITHDRAWAL_CENTS } from "@/lib/marketplace/constants";
import { formatBRLCents } from "@/lib/marketplace/money";

export const dynamic = "force-dynamic";

async function submitSellerApplicationForm(formData: FormData) {
  "use server";
  await submitSellerApplicationAction(formData);
}

const statusCopy: Record<string, { label: string; tone: string; icon: any }> = {
  draft: { label: "Rascunho", tone: "text-muted-foreground", icon: Clock },
  pending: { label: "Aguardando aprovação", tone: "text-amber-400", icon: Clock },
  approved: { label: "Vendedor aprovado", tone: "text-emerald-400", icon: BadgeCheck },
  rejected: { label: "Reprovado", tone: "text-red-400", icon: ShieldAlert },
  suspended: { label: "Suspenso", tone: "text-red-400", icon: ShieldAlert },
};

export default async function SellerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const seller = await getSellerProfile(user.id);
  const status = seller ? statusCopy[seller.status] || statusCopy.pending : null;
  const StatusIcon = status?.icon;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-primary">Marketplace Tomoverso</p>
          <h1 className="font-heading text-3xl font-black tracking-tight md:text-4xl">Área do autor vendedor</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Solicite aprovação para vender obras digitais. No MVP, o saldo é interno e o saque é manual via PIX.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/dashboard"><Store className="mr-2 h-4 w-4" /> Painel do autor</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Comissão Tomoverso</p>
            <p className="mt-1 font-heading text-3xl font-black">10%</p>
            <p className="mt-2 text-xs text-muted-foreground">Taxa Mercado Pago descontada do autor.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Liberação do saldo</p>
            <p className="mt-1 font-heading text-3xl font-black">7 dias</p>
            <p className="mt-2 text-xs text-muted-foreground">Vendas aprovadas entram como pendentes.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saque mínimo</p>
            <p className="mt-1 font-heading text-3xl font-black">{formatBRLCents(MIN_WITHDRAWAL_CENTS)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Pagamento manual por PIX.</p>
          </CardContent>
        </Card>
      </section>

      {seller && status ? (
        <Card className="rounded-3xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {StatusIcon ? <StatusIcon className={`h-5 w-5 ${status.tone}`} /> : null}
              Status: <span className={status.tone}>{status.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nome público</p>
              <p className="mt-1 font-medium">{seller.public_name}</p>
            </div>
            <div className="rounded-2xl border border-border/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PIX para saques</p>
              <p className="mt-1 font-medium">{seller.pix_key_type}: {seller.pix_key}</p>
            </div>
            {seller.rejection_reason ? (
              <div className="md:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                Motivo: {seller.rejection_reason}
              </div>
            ) : null}
            {seller.status === "approved" ? (
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl"><Link href="/dashboard/novels/new">Cadastrar obra</Link></Button>
                <Button asChild variant="outline" className="rounded-2xl"><Link href="/dashboard/wallet"><WalletCards className="mr-2 h-4 w-4" /> Ver saldo</Link></Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {seller?.status !== "approved" ? (
        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>Solicitar aprovação para vender</CardTitle></CardHeader>
          <CardContent>
            <form action={submitSellerApplicationForm} className="grid gap-4 md:grid-cols-2">
              <input name="legal_name" placeholder="Nome legal para pagamento" defaultValue={seller?.legal_name || user.display_name} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" required />
              <input name="public_name" placeholder="Nome público na loja" defaultValue={seller?.public_name || user.display_name} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" required />
              <select name="pix_key_type" defaultValue={seller?.pix_key_type || "email"} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                <option value="email">PIX: e-mail</option>
                <option value="cpf">PIX: CPF</option>
                <option value="cnpj">PIX: CNPJ</option>
                <option value="phone">PIX: telefone</option>
                <option value="random">PIX: chave aleatória</option>
              </select>
              <input name="pix_key" placeholder="Chave PIX para saque" defaultValue={seller?.pix_key || user.email} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm" required />
              <textarea name="message" placeholder="Conte rapidamente que tipo de obra você pretende vender" className="min-h-28 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm md:col-span-2" />
              <textarea name="payout_notes" placeholder="Observações internas sobre pagamento (opcional)" defaultValue={seller?.payout_notes || ""} className="min-h-20 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm md:col-span-2" />
              <Button className="rounded-2xl md:col-span-2">Enviar para aprovação</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Ambiente financeiro: {isSupabaseMarketplaceActive() ? "Supabase configurado" : "dev local sem secrets"}. Suporte: {MARKETPLACE_SUPPORT_EMAIL}.
      </p>
    </main>
  );
}
