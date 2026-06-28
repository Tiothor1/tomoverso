import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Users, Shield, Mail, Ban, Trash2, Search, Calendar, ExternalLink, Edit3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

async function deleteUserAction(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const userId = formData.get("user_id") as string;
  if (!userId || userId === admin.id) return;
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

async function banUserAction(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const userId = formData.get("user_id") as string;
  if (!userId || userId === admin.id) return;
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
  if (!user) return;
  const newRole = user.role === "banned" ? "user" : "banned";
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(newRole, userId);
}

async function updateEmailAction(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const userId = formData.get("user_id") as string;
  const newEmail = (formData.get("email") as string)?.trim();
  if (!userId || !newEmail || !newEmail.includes("@")) return;
  const db = getDb();
  db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, userId);
}

export default async function AdminUsuariosPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  const db = getDb();
  const q = (await props.searchParams)?.q || "";
  const like = `%${q}%`;
  const users = q
    ? db.prepare("SELECT * FROM users WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?) AND email NOT LIKE '%@external.author' ORDER BY created_at DESC LIMIT 100").all(like, like, like)
    : db.prepare("SELECT * FROM users WHERE email NOT LIKE '%@external.author' ORDER BY created_at DESC LIMIT 100").all();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 border-b border-red-900/30 bg-gray-950/95 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
          <Users className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">USUÁRIOS</span>
          <Badge variant="outline" className="text-[10px] border-red-800/30 text-red-400 ml-auto">{users.length} cadastrados</Badge>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <form method="GET" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Buscar por username, email ou nome..." className="bg-gray-900 border-red-900/40 text-red-100 flex-1" />
          <Button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100"><Search className="h-4 w-4 mr-1" />Buscar</Button>
          {q && <Button asChild variant="outline" className="border-red-800/30 text-red-400"><Link href={`/${SP}/usuarios`}>Limpar</Link></Button>}
        </form>
        <div className="space-y-2">
          {(users as any[]).map((u) => (
            <div key={u.id} className={`rounded-xl border ${u.role === 'banned' ? 'border-red-950/50 bg-red-950/10 opacity-60' : 'border-red-900/20 bg-gray-900/50'} p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.role === 'admin' ? 'bg-red-950 text-red-400' : u.role === 'banned' ? 'bg-red-950/30 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                    {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-red-200">{u.display_name}</p>
                      {u.role === 'admin' && <Badge variant="outline" className="text-[10px] border-red-800/30 text-red-400">ADMIN</Badge>}
                      {u.role === 'banned' && <Badge variant="outline" className="text-[10px] border-red-800/30 text-red-500">BANIDO</Badge>}
                      <span className="text-xs text-red-400/40">@{u.username}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-red-400/60 mt-0.5">
                      <form action={updateEmailAction} className="flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="email" name="email" defaultValue={u.email} className="bg-transparent border-b border-red-900/30 text-red-300 text-xs px-1 py-0 w-48 focus:outline-none focus:border-red-400" />
                        <button type="submit" className="text-red-500/40 hover:text-red-400 p-0.5" title="Salvar email"><Edit3 className="h-3 w-3" /></button>
                      </form>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{u.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <form action={banUserAction}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <Button type="submit" size="sm" variant="ghost" className={`h-8 w-8 p-0 ${u.role === 'banned' ? 'text-green-500/60 hover:text-green-400' : 'text-red-500/40 hover:text-red-400'}`} title={u.role === 'banned' ? 'Desbanir' : 'Banir'}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                  {u.role !== 'admin' && (
                    <form action={deleteUserAction}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500/30 hover:text-red-400" title="Excluir usuário" onClick={async (e) => { if (!confirm('Tem certeza? Isso exclui permanentemente o usuário.')) e.preventDefault() }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  )}
                  <Link href={`/authors/${u.username}`} target="_blank" className="text-red-500/30 hover:text-red-400 p-1.5"><ExternalLink className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-red-500/20 mx-auto mb-3" />
              <p className="text-red-400/60">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
