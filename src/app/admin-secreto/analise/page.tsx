import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, FileText, Check, X, AlertTriangle, Upload, Trash2, Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

async function deleteImportAction(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const id = formData.get("import_id") as string;
  if (!id) return;
  const db = getDb();
  db.prepare("DELETE FROM import_queue WHERE id = ?").run(id);
}

async function markCompletedAction(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const id = formData.get("import_id") as string;
  if (!id) return;
  const db = getDb();
  db.prepare("UPDATE import_queue SET status = 'completed', processed_at = datetime('now') WHERE id = ?").run(id);
}

export default async function AdminAnalisePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  const db = getDb();
  const items = db.prepare("SELECT * FROM import_queue ORDER BY created_at DESC LIMIT 50").all() as any[];
  const pending = items.filter(i => i.status === 'pending');
  const processing = items.filter(i => i.status === 'processing');
  const completed = items.filter(i => i.status === 'completed');
  const errors = items.filter(i => i.status === 'error');

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
          <FileText className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">ANÁLISE DE IMPORTAÇÕES</span>
          <Badge variant="outline" className="text-[10px] border-amber-800/30 text-amber-400 ml-auto">{pending.length} pendentes</Badge>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Aguardando análise ({pending.length})
            </h3>
            <div className="space-y-3">
              {pending.map((item: any) => (
                <Card key={item.id} className="border-amber-900/30 bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-amber-400 shrink-0" />
                          <p className="text-sm font-medium text-red-200">{item.detected_title || item.original_name || item.file_name}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-red-400/60">
                          <span>Arquivo: {item.original_name || item.file_name}</span>
                          <span>Tamanho: {(item.file_size / 1024).toFixed(0)} KB</span>
                          <span>Formato: {item.file_type?.toUpperCase()}</span>
                          <span>Capítulos: {item.detected_chapters || "não detectado"}</span>
                        </div>
                        {item.extracted_content && (
                          <details className="mt-2">
                            <summary className="text-xs text-red-500/60 cursor-pointer hover:text-red-400">Prévia do conteúdo</summary>
                            <pre className="mt-2 text-xs text-red-400/60 bg-gray-950 rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">{item.extracted_content?.slice(0, 2000)}</pre>
                          </details>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <form action={markCompletedAction}>
                          <input type="hidden" name="import_id" value={item.id} />
                          <Button type="submit" size="sm" className="bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs h-8">
                            <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                          </Button>
                        </form>
                        <form action={deleteImportAction}>
                          <input type="hidden" name="import_id" value={item.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-500/40 hover:text-red-400 h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-green-400 mb-3">Processados ({completed.length})</h3>
            <div className="space-y-2">
              {completed.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-green-900/20 bg-gray-900/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-red-300 truncate">{item.detected_title || item.original_name || item.file_name}</p>
                      <p className="text-[10px] text-red-400/40">{item.processed_at?.slice(0, 16)}</p>
                    </div>
                  </div>
                  <form action={deleteImportAction}>
                    <input type="hidden" name="import_id" value={item.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-red-500/30 hover:text-red-400 h-7 w-7 p-0"><Trash2 className="h-3 w-3" /></Button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <Upload className="h-12 w-12 text-red-500/20 mx-auto mb-4" />
            <p className="text-red-400/60 mb-1">Nenhuma importação ainda</p>
            <p className="text-xs text-red-400/40">Faça upload de arquivos em "Importar conteúdo"</p>
            <Button asChild className="mt-4 bg-red-900 hover:bg-red-800 text-red-100">
              <Link href={`/${SP}/upload`}><Upload className="h-4 w-4 mr-2" /> Importar agora</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
