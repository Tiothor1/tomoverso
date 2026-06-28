import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Shield, Smartphone, KeyRound, UserCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdminAuthTable, generate2FASecret, is2FAEnabled, getAdminCPF } from "@/lib/admin/admin-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

async function setup2FAAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;

  const cpf = (formData.get("cpf") as string)?.replace(/\D/g, "");
  if (cpf.length !== 11) return;

  const { setAdminCPF, enable2FA, generate2FASecret } = await import("@/lib/admin/admin-auth");
  ensureAdminAuthTable();

  setAdminCPF(user.id, cpf);

  // Re-grava o path para redirect
  const secretPath = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";
  redirect(`/${secretPath}`);
}

export default async function AdminSecretoSetupPage() {
  ensureAdminAuthTable();

  const cookieStore = await cookies();
  const validated = cookieStore.get("admin_validated");
  if (!validated || validated.value !== "1") {
    const secretPath = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";
    redirect(`/${secretPath}`);
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") {
    const secretPath = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";
    redirect(`/${secretPath}`);
  }

  const has2FA = is2FAEnabled(user.id);
  const cpf = getAdminCPF(user.id);

  // Gera secret 2FA
  const { base32, otpauth_url } = generate2FASecret(user.id);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Card className="w-full max-w-lg border-red-900/30 bg-gray-950/90 shadow-2xl shadow-red-900/20">
        <CardHeader className="text-center">
          <Shield className="h-10 w-10 text-red-400 mx-auto mb-2" />
          <CardTitle className="text-xl text-red-100">Configuração de Segurança</CardTitle>
          <p className="text-xs text-red-400/60 mt-1">2FA + CPF obrigatórios para acesso ao painel</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CPF */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-red-200 flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> CPF do administrador
            </h3>
            {cpf ? (
              <div className="rounded-lg bg-green-950/30 border border-green-800/30 p-3 text-sm text-green-300">
                CPF registrado: <strong className="font-mono">{cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</strong>
              </div>
            ) : (
              <form action={setup2FAAction} className="flex gap-2">
                <Input name="cpf" placeholder="000.000.000-00" maxLength={14} required className="bg-gray-900 border-red-900/40 text-red-100 font-mono" />
                <Button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100 shrink-0">Salvar</Button>
              </form>
            )}
          </div>

          {/* 2FA */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-red-200 flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Autenticação de dois fatores
            </h3>
            {has2FA ? (
              <div className="rounded-lg bg-green-950/30 border border-green-800/30 p-3 text-sm text-green-300">
                2FA ativo ✅
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-red-400/70">Escaneie o QR Code abaixo com o Google Authenticator:</p>
                <div className="flex justify-center">
                  {/*eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpauth_url || "")}`}
                    alt="QR Code 2FA"
                    className="rounded-lg border border-red-900/30"
                  />
                </div>
                <div className="rounded-lg bg-gray-900 border border-red-900/20 p-3">
                  <p className="text-xs text-red-400/60 mb-1">Ou copie a chave manualmente:</p>
                  <code className="text-xs text-red-300 break-all font-mono">{base32}</code>
                </div>
                <form action={async () => {
                  "use server";
                  const { enable2FA, generate2FASecret } = await import("@/lib/admin/admin-auth");
                  const user2 = await getCurrentUser();
                  if (!user2 || user2.role !== "admin") return;
                  const { base32: sec } = generate2FASecret(user2.id);
                  enable2FA(user2.id, sec);
                  const sp = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";
                  redirect(`/${sp}/setup`);
                }}>
                  <Button type="submit" size="sm" className="w-full bg-red-900 hover:bg-red-800 text-red-100">
                    <KeyRound className="h-3 w-3 mr-1" />
                    Já escaneiei — Ativar 2FA
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="flex justify-between border-t border-red-900/20 pt-4">
            {cpf && has2FA ? (
              <div className="text-sm text-green-400">Configuração completa ✅</div>
            ) : (
              <div className="text-sm text-amber-400">Complete todas as etapas acima</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
