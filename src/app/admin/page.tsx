import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, BookOpen, MessageCircle, Flag, Activity, Shield, Eye, Ban, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUser, generateId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Painel Admin — Tomoverso",
};

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  author_id: string;
  author_name: string;
  status: string;
  views: number;
  is_featured: number;
  created_at: string;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");

  const db = getDb();

  // Stats
  const stats = {
    users: (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c,
    novels: (db.prepare("SELECT COUNT(*) as c FROM novels").get() as { c: number }).c,
    chapters: (db.prepare("SELECT COUNT(*) as c FROM chapters").get() as { c: number }).c,
    comments: (db.prepare("SELECT COUNT(*) as c FROM comments").get() as { c: number }).c,
    reports: (db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'").get() as { c: number }).c,
    sessions: (db.prepare("SELECT COUNT(*) as c FROM sessions").get() as { c: number }).c,
    activeNow: (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM activity_log WHERE created_at > datetime('now', '-1 hour')").get() as { c: number }).c,
    logins: (db.prepare("SELECT COUNT(*) as c FROM activity_log WHERE action = 'login'").get() as { c: number }).c,
  };

  // Lista de TODOS os usuários
  const allUsers = db.prepare(`
    SELECT id, email, username, display_name, role, last_login_at, created_at
    FROM users ORDER BY created_at DESC LIMIT 50
  `).all() as UserRow[];

  // Novels
  const allNovels = db.prepare(`
    SELECT n.id, n.slug, n.title, n.author_id, u.display_name as author_name,
           n.status, n.views, n.is_featured, n.created_at
    FROM novels n
    JOIN users u ON u.id = n.author_id
    ORDER BY n.created_at DESC LIMIT 30
  `).all() as NovelRow[];

  // Atividade recente
  const activity = db.prepare(`
    SELECT al.*, u.display_name, u.username
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC LIMIT 30
  `).all() as Array<{
    id: string;
    user_id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    display_name: string | null;
    username: string | null;
    created_at: string;
  }>;

  // Reports pendentes
  const reports = db.prepare(`
    SELECT r.*, u.display_name as reporter_name
    FROM reports r
    JOIN users u ON u.id = r.reporter_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC LIMIT 20
  `).all() as Array<{
    id: string;
    reporter_name: string;
    target_type: string;
    target_id: string;
    reason: string;
    created_at: string;
  }>;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="destructive" className="mb-2">
            <Shield className="h-3 w-3 mr-1" />
            Painel Admin
          </Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Controle total</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, novels, comentários e reports
          </p>
        </div>
      </div>

      {/* Stats globais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Usuários", value: stats.users, icon: Users, color: "text-blue-500" },
          { label: "Novels", value: stats.novels, icon: BookOpen, color: "text-emerald-500" },
          { label: "Capítulos", value: stats.chapters, icon: BookOpen, color: "text-purple-500" },
          { label: "Comentários", value: stats.comments, icon: MessageCircle, color: "text-pink-500" },
          { label: "Sessões ativas (total)", value: stats.sessions, icon: Activity, color: "text-cyan-500" },
          { label: "Online (1h)", value: stats.activeNow, icon: Activity, color: "text-green-400" },
          { label: "Total logins", value: stats.logins, icon: Activity, color: "text-amber-500" },
          { label: "Reports pendentes", value: stats.reports, icon: Flag, color: "text-red-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
              <div className="text-2xl font-heading font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Usuários ({stats.users})
          </TabsTrigger>
          <TabsTrigger value="novels">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Novels ({stats.novels})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Atividade
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Flag className="h-3.5 w-3.5 mr-1.5" />
            Reports ({stats.reports})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Usuários */}
        <TabsContent value="users" className="mt-6 space-y-2">
          {allUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum usuário ainda
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allUsers.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={user.id} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Novels */}
        <TabsContent value="novels" className="mt-6 space-y-2">
          {allNovels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma novel ainda
              </CardContent>
            </Card>
          ) : (
            allNovels.map((n) => (
              <Card key={n.id}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/novels/${n.slug}`} className="font-semibold hover:text-primary truncate">
                        {n.title}
                      </Link>
                      {n.is_featured ? <Badge className="text-[10px]">Destaque</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      por @{n.author_name} · {n.views} views · {new Date(n.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <form action={async () => {
                    "use server";
                    const dbase = getDb();
                    dbase.prepare("UPDATE novels SET is_featured = ? WHERE id = ?").run(n.is_featured ? 0 : 1, n.id);
                    dbase.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(generateId(), user.id, "feature_novel", "novel", n.id);
                    revalidatePath("/admin");
                    revalidatePath("/");
                  }}>
                    <Button size="sm" variant="outline" type="submit">
                      {n.is_featured ? "Tirar destaque" : "Destacar"}
                    </Button>
                  </form>
                  <form action={async () => {
                    "use server";
                    const dbase = getDb();
                    dbase.prepare("DELETE FROM novels WHERE id = ?").run(n.id);
                    dbase.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(generateId(), user.id, "delete_novel", "novel", n.id);
                    revalidatePath("/admin");
                  }}>
                    <Button size="sm" variant="ghost" type="submit" className="text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab: Atividade */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {activity.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">Sem atividade</div>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <div className="text-xs text-muted-foreground w-32 flex-shrink-0">
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{a.display_name || "Anônimo"}</span>{" "}
                        <span className="text-muted-foreground">
                          {a.action === "login" ? "fez login" :
                            a.action === "logout" ? "saiu" :
                            a.action === "signup" ? "criou conta" :
                            a.action === "feature_novel" ? "destacou uma novel" :
                            a.action === "delete_novel" ? "deletou uma novel" :
                            a.action}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Reports */}
        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                Sem reports pendentes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Flag className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{r.reporter_name}</span> reportou um{" "}
                          <Badge variant="outline" className="text-[10px]">{r.target_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <form action={async () => {
                        "use server";
                        const dbase = getDb();
                        dbase.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(r.id);
                        revalidatePath("/admin");
                      }}>
                        <Button size="sm" variant="outline" type="submit">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Resolver
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserRow({ user: u, currentUserId }: { user: UserRow; currentUserId: string }) {
  const initials = u.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function changeRole(formData: FormData) {
    "use server";
    const newRole = formData.get("role") as string;
    const dbase = getDb();
    dbase.prepare("UPDATE users SET role = ? WHERE id = ?").run(newRole, u.id);
    dbase.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?)").run(generateId(), currentUserId, "change_role", "user", u.id, JSON.stringify({ from: u.role, to: newRole }));
    revalidatePath("/admin");
  }

  async function deleteUser() {
    "use server";
    if (u.id === currentUserId) return;
    const dbase = getDb();
    dbase.prepare("DELETE FROM users WHERE id = ?").run(u.id);
    dbase.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)").run(generateId(), currentUserId, "delete_user", "user", u.id);
    revalidatePath("/admin");
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{u.display_name}</span>
              <span className="text-xs text-muted-foreground">@{u.username}</span>
              {u.role === "admin" && <Badge variant="destructive" className="text-[10px]">Admin</Badge>}
              {u.role === "author" && <Badge variant="default" className="text-[10px]">Autor</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {u.email} · {u.last_login_at ? `último login: ${new Date(u.last_login_at).toLocaleString("pt-BR")}` : "nunca logou"} · criou em {new Date(u.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <form action={changeRole} className="flex items-center gap-1">
            <select
              name="role"
              defaultValue={u.role}
              className="h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              <option value="user">User</option>
              <option value="author">Autor</option>
              <option value="admin">Admin</option>
            </select>
            <Button size="sm" variant="outline" type="submit">
              Salvar
            </Button>
          </form>
          {u.id !== currentUserId && (
            <form action={deleteUser}>
              <Button size="sm" variant="ghost" type="submit" className="text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
