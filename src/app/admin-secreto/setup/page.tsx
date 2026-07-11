import { redirect } from "next/navigation";
import { KeyRound, Shield, Smartphone, UserCheck } from "lucide-react";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { ensureAdminAuthTable, generate2FASecret, is2FAEnabled, getAdminCPF, setAdminCPF, enable2FA } from "@/lib/admin/admin-auth";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

async function setup2FAAction(formData: FormData) {
  "use server";
  const user = await getSecretAdminOrRedirect(SP).catch(() => null);
  if (!user) return;
  const cpf = (formData.get("cpf") as string)?.replace(/\D/g, "");
  if (cpf.length !== 11) return;
  setAdminCPF(user.id, cpf);
  redirect(`/${SP}`);
}

export default async function AdminSecretoSetupPage() {
  const secretPath = getAdminSecretPath();
  const adminUser = await getSecretAdminOrRedirect(secretPath);

  try {
    ensureAdminAuthTable();
    const has2FA = is2FAEnabled(adminUser.id);
    const cpf = getAdminCPF(adminUser.id);
    const { base32 } = generate2FASecret(adminUser.id);

    return (
      <AdminHubShell secretPath={secretPath} active="setup" title="Configuração de Segurança" subtitle="2FA + CPF — totalmente opcional" user={adminUser}>
        <div className="max-w-2xl space-y-6">
          {/* CPF */}
          <AdminPanel>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-semibold text-slate-100">CPF do administrador</h3>
            </div>
            {cpf ? (
              <div className="rounded-lg bg-green-950/30 border border-green-800/30 p-3 text-sm text-green-300">
                CPF registrado: <strong className="font-mono">{cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</strong>
              </div>
            ) : (
              <form action={setup2FAAction} className="flex gap-2 max-w-md">
                <Input name="cpf" placeholder="000.000.000-00" maxLength={14} required className="bg-zinc-900 border-white/10 text-slate-200 font-mono" />
                <Button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100 shrink-0">Salvar</Button>
              </form>
            )}
          </AdminPanel>

          {/* 2FA */}
          <AdminPanel>
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-semibold text-slate-100">Autenticação de dois fatores</h3>
            </div>
            {has2FA ? (
              <div className="rounded-lg bg-green-950/30 border border-green-800/30 p-3 text-sm text-green-300">
                2FA ativo via Google Authenticator / Authy
              </div>
            ) : (
              <div className="space-y-3 max-w-md">
                <p className="text-xs text-slate-400">Use um app de autenticação (Google Authenticator, Authy) e insira a chave abaixo manualmente:</p>
                <div className="bg-zinc-950 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 mb-1">Chave secreta (insira manualmente no app):</p>
                    <p className="font-mono text-xs text-slate-300 break-all select-all">{base32}</p>
                  </div>
                </div>
                <form action={async () => {
                  "use server";
                  const u = await getSecretAdminOrRedirect(SP).catch(() => null);
                  if (!u) return;
                  enable2FA(u.id, base32);
                  redirect(`/${SP}`);
                }}>
                  <Button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100">
                    <KeyRound className="h-4 w-4 mr-2" /> Ativar 2FA (já escanei)
                  </Button>
                </form>
              </div>
            )}
          </AdminPanel>
        </div>
      </AdminHubShell>
    );
  } catch (e) {
    return (
      <AdminHubShell secretPath={secretPath} active="setup" title="Configuração de Segurança" subtitle="2FA + CPF" user={adminUser}>
        <div className="p-6 text-sm text-red-400">
          Erro no setup. <a href={`/${secretPath}`} className="underline ml-2 text-cyan-400">Voltar ao painel</a>
        </div>
      </AdminHubShell>
    );
  }
}
