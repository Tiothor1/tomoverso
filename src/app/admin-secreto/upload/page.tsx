import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Search, UploadCloud } from "lucide-react";
import { getDb } from "@/lib/db";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, safeAll, safeCount, tableExists } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { AdminUploadZone } from "@/components/admin-v2/admin-upload-zone";

export const dynamic = "force-dynamic";

type ImportRow = { id: string; status?: string; file_type?: string; file_name?: string; original_name?: string; file_size?: number; detected_title?: string; detected_chapters?: number; error?: string; created_at?: string };

function fileSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminUploadPage() {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const hasQueue = tableExists(db, "import_queue");
    const recentImports = safeAll<ImportRow>(db, `
      SELECT id, status, file_type, file_name, original_name, file_size, detected_title, detected_chapters, error, created_at
      FROM import_queue
      ORDER BY created_at DESC
      LIMIT 12
    `);
    const pending = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status IN ('pending','processing')");
    const completed = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='completed'");
    const errors = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='error'");

    return (
      <AdminHubShell secretPath={secretPath} active="upload" title="Upload e importações" subtitle="Entrada rápida para PDF, TXT, EPUB, DOCX e MD com fila de análise." user={user}>
        {!hasQueue ? (
          <AdminPanel className="border-amber-400/20 bg-amber-950/20">
            <div className="flex gap-3 text-amber-100"><AlertTriangle className="h-5 w-5" /><p>Dados indisponíveis neste ambiente: tabela <code>import_queue</code> não encontrada.</p></div>
          </AdminPanel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Fila ativa</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatInteger(pending)}</p><p className="mt-1 text-sm text-slate-400">pendentes/processando</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Concluídos</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatInteger(completed)}</p><p className="mt-1 text-sm text-slate-400">imports aprovados</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Erros</p><p className="mt-2 text-3xl font-semibold text-rose-100">{formatInteger(errors)}</p><p className="mt-1 text-sm text-slate-400">precisam revisão</p></AdminPanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <AdminHubSection eyebrow="Upload" title="Enviar novo arquivo" description="O upload usa a API existente /api/admin/uploads. Após enviar, o item entra na análise.">
            <AdminPanel>
              <AdminUploadZone redirectTo={`/${secretPath}/analise`} />
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {["PDF", "TXT", "EPUB", "DOCX", "MD"].map((type) => (
                  <div key={type} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400"><FileText className="mr-1 inline h-3.5 w-3.5 text-cyan-300" /> {type} aceito</div>
                ))}
              </div>
            </AdminPanel>
          </AdminHubSection>

          <AdminHubSection eyebrow="Histórico" title="Importações recentes" description="Últimos arquivos enviados, com status visual e caminho para análise.">
            <AdminPanel>
              {recentImports.length === 0 ? (
                <AdminEmptyState icon={UploadCloud} title="Nenhuma importação ainda" description="Envie o primeiro arquivo para alimentar a fila de análise." className="border-0 bg-transparent" />
              ) : (
                <div className="space-y-3">
                  {recentImports.map((item) => (
                    <Link key={item.id} href={`/${secretPath}/analise`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{item.detected_title || item.original_name || item.file_name || item.id}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.file_type?.toUpperCase() || "arquivo"} · {fileSize(item.file_size)} · {item.detected_chapters || 0} capítulos detectados</p>
                          {item.error ? <p className="mt-2 truncate text-xs text-rose-300">{item.error}</p> : null}
                        </div>
                        <AdminStatusBadge tone={item.status === "completed" ? "emerald" : item.status === "error" ? "rose" : item.status === "processing" ? "blue" : "amber"}>{item.status || "pendente"}</AdminStatusBadge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </AdminPanel>
          </AdminHubSection>
        </div>

        <AdminHubSection eyebrow="Fluxo" title="Como isso conecta com o site" description="Upload não publica automaticamente. Ele prepara dados para revisão, aprovação e eventual criação/curadoria pública.">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminPanel><UploadCloud className="h-5 w-5 text-cyan-300" /><h3 className="mt-3 font-semibold text-slate-100">1. Enviar arquivo</h3><p className="mt-2 text-sm text-slate-400">O arquivo é salvo e registrado na fila.</p></AdminPanel>
            <AdminPanel><Search className="h-5 w-5 text-violet-300" /><h3 className="mt-3 font-semibold text-slate-100">2. Analisar</h3><p className="mt-2 text-sm text-slate-400">Título, capítulos e conteúdo ficam disponíveis para revisão.</p></AdminPanel>
            <AdminPanel><CheckCircle2 className="h-5 w-5 text-emerald-300" /><h3 className="mt-3 font-semibold text-slate-100">3. Aprovar/publicar</h3><p className="mt-2 text-sm text-slate-400">A aprovação conecta o conteúdo ao catálogo/curadoria quando o pipeline estiver completo.</p></AdminPanel>
          </div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Upload admin V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
