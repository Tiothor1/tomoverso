import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Users, Shield, Mail, Calendar, Ban, CheckCircle, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

export default async function AdminUsuarioPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  const db = getDb();
  const q = (await props.searchParams)?.q || "";
  const users = q
    ? db.prepare("SELECT * FROM users WHERE username LIKE ? OR email LIKE ? OR display_name LIKE ? ORDER BY created_at DESC LIMIT 100").all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 100").all();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href={`/${SP}`} className="text-red-400 hover:text-red-300"><ArrowLeft className="h-5 w-5" /></Link>
          <Users className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">USUÁRIOS ({users.length})</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <form method="GET" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Buscar por username, email ou nome..." className="bg-gray-900 border-red-900/40 text-red-100" />
          <Button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100"><Search className="h-4 w-4" /></Button>
        </form>
        <div className="space-y-2">
          {(users as any[]).map((u) => (
            <div key={u.id} className="rounded-xl border border-red-900/20 bg-gray-900/50 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-red-950 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                  {u.display_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-200 truncate">{u.display_name} {u.role === 'admin' && <Badge variant="outline" className="text-[10px] border-red-800/30 text-red-400 ml-1">ADMIN</Badge>}</p>
                  <p className="text-xs text-red-400/60 truncate">@{u.username} · {u.email}</p>
                </div>
              </div>
              <div className="text-right shrink-0 text-xs text-red-400/40">
                <p>{u.role}</p>
                <p>{u.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-red-400/60 py-8">Nenhum usuário encontrado.</p>}
        </div>
      </main>
    </div>
  );
}
