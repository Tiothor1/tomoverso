import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Shield, Smartphone, KeyRound, UserCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdminAuthTable, generate2FASecret, is2FAEnabled, getAdminCPF, setAdminCPF, enable2FA } from "@/lib/admin/admin-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

async function setup2FAAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const cpf = (formData.get("cpf") as string)?.replace(/\D/g, "");
  if (cpf.length !== 11) return;
  setAdminCPF(user.id, cpf);
  redirect(`/${SP}`);
}

export default async function AdminSecretoSetupPage() {
  try {
  const cookieStore = await cookies();
  const validated = cookieStore.get("admin_validated");
  if (!validated || validated.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  ensureAdminAuthTable();
  const has2FA = is2FAEnabled(user.id);
  const cpf = getAdminCPF(user.id);
  const { base32, otpauth_url } = generate2FASecret(user.id);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Card className="w-full max-w-lg border-red-900/30 bg-gray-950/90 shadow-2xl shadow-red-900/20">
        <CardHeader className="text-center">
          <Shield className="h-10 w-10 text-red-400 mx-auto mb-2" />
          <CardTitle className="text-xl text-red-100">Configuração de Segurança</CardTitle>
          <p className="text-xs text-red-400/60 mt-1">2FA + CPF — totalmente opcional</p>
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
                2FA ativo via Google Authenticator / Authy
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-950 border border-red-900/30 p-4 space-y-3">
                  <p className="text-xs text-red-300">Escaneie o QR Code ou insira a chave manualmente no seu app de autenticação:</p>
                  <div className="bg-white rounded-lg p-2 inline-block mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={otpauth_url} alt="QR Code 2FA" className="w-48 h-48" />
                  </div>
                  <div className="bg-gray-950 rounded-lg p-3">
                    <p className="text-[10px] text-red-400/60 mb-1">Ou insira manualmente:</p>
                    <p className="font-mono text-xs text-red-200 break-all select-all">{base32}</p>
                  </div>
                </div>
                <form action={async () => {
                  "use server";
                  const u = await getCurrentUser();
                  if (!u || u.role !== "admin") return;
                  enable2FA(u.id, base32);
                  redirect(`/${SP}`);
                }}>
                  <Button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100">
                    <KeyRound className="h-4 w-4 mr-2" /> Ativar 2FA (já escanei)
                  </Button>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  } catch (e) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-sm">Erro no setup. <a href={`/${SP}`} className="underline ml-2">Voltar</a></div>;
  }
}
