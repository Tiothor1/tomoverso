import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Upload, FileText, Check, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

export default async function AdminUploadPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  try {

    const db = getDb();
    const recentImports = db.prepare("SELECT * FROM import_queue ORDER BY created_at DESC LIMIT 10").all() as any[];

    return (
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
            <Upload className="h-5 w-5 text-red-400" />
            <span className="font-mono text-sm text-red-300">IMPORTAR CONTEÚDO</span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-red-200 text-base">Upload de arquivo</CardTitle>
              <p className="text-xs text-red-400/60">Formatos aceitos: PDF, TXT, EPUB, DOCX, MD</p>
            </CardHeader>
            <CardContent>
              <form action="/api/admin/uploads" method="POST" encType="multipart/form-data" className="space-y-4" id="upload-form">
                <div className="border-2 border-dashed border-red-900/30 rounded-xl p-8 text-center hover:border-red-700/50 transition-colors">
                  <FileText className="h-10 w-10 text-red-500/40 mx-auto mb-3" />
                  <p className="text-sm text-red-300 mb-1">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-xs text-red-400/40">Máximo: 50MB</p>
                  <input type="file" name="file" required accept=".pdf,.txt,.epub,.docx,.md" className="mt-4 text-sm text-red-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-900 file:text-red-100 file:text-sm file:cursor-pointer hover:file:bg-red-800" />
                </div>
                <Button type="submit" className="w-full bg-red-900 hover:bg-red-800 text-red-100" id="submit-btn">
                  <Upload className="h-4 w-4 mr-2" /> Enviar para análise
                </Button>
              </form>
            </CardContent>
          </Card>

          {recentImports.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-red-300">Importações recentes</h3>
              {recentImports.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-red-900/20 bg-gray-900/50 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-red-400" />
                    <div className="min-w-0">
                      <p className="text-sm text-red-200 truncate">{item.detected_title || item.original_name || item.file_name}</p>
                      <p className="text-xs text-red-400/60">{item.file_type?.toUpperCase()} · {(item.file_size / 1024).toFixed(0)}KB{item.detected_chapters > 0 && ` · ${item.detected_chapters} capítulos`}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${item.status === 'completed' ? 'border-green-800/30 text-green-400' : item.status === 'error' ? 'border-red-800/30 text-red-400' : 'border-amber-800/30 text-amber-400'}`}>
                    {item.status === 'completed' ? 'Pronto' : item.status === 'error' ? 'Erro' : 'Análise'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </main>
        <script dangerouslySetInnerHTML={{
          __html: `document.getElementById('upload-form')?.addEventListener('submit',function(){var b=document.getElementById('submit-btn');b.disabled=true;b.innerHTML='<span class=\"flex items-center gap-2\"><svg class=\"animate-spin h-4 w-4\" viewBox=\"0 0 24 24\"><circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\" fill=\"none\"/><path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"/></svg> Enviando...</span>';});`
        }} />
      </div>
    );
  } catch (e) {
    console.error("Upload admin error:", e);
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-sm">Erro ao carregar upload. <a href={`/${SP}`} className="underline ml-2">Voltar</a></div>;
  }
}
