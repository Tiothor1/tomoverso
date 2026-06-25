import { setUserRoleAction, setUserSuspensionAction } from "@/lib/actions/user-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsersTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-3xl border-border/50">
      <CardHeader><CardTitle>Controle de usuários</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((user) => (
          <div key={user.id} className="grid gap-4 rounded-3xl border border-border/50 bg-card/60 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-2">
              <div>
                <h3 className="font-heading text-lg font-bold">{user.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{user.username} · {user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">papel: {user.role}</span>
                {user.is_suspended ? <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-400">suspenso</span> : <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-400">ativo</span>}
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">criado {String(user.created_at).slice(0,10)}</span>
              </div>
              {user.suspension_reason ? <p className="text-sm text-muted-foreground">Motivo: {user.suspension_reason}</p> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <form action={setUserRoleAction} className="rounded-2xl border border-border/50 p-3">
                <input type="hidden" name="user_id" value={user.id} />
                <label className="mb-2 block text-sm font-medium">Papel</label>
                <select name="role" defaultValue={user.role} className="mb-3 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
                  <option value="user">Leitor</option>
                  <option value="author">Autor</option>
                  <option value="admin">Admin</option>
                </select>
                <Button className="w-full rounded-xl">Salvar papel</Button>
              </form>
              <form action={setUserSuspensionAction} className="rounded-2xl border border-border/50 p-3">
                <input type="hidden" name="user_id" value={user.id} />
                <label className="mb-2 flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="is_suspended" defaultChecked={!!user.is_suspended} /> Suspender acesso</label>
                <textarea name="suspension_reason" defaultValue={user.suspension_reason || ""} placeholder="motivo interno" className="mb-3 min-h-24 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" />
                <Button variant={user.is_suspended ? "secondary" : "destructive"} className="w-full rounded-xl">Salvar acesso</Button>
              </form>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
