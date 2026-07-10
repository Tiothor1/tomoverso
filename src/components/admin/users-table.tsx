import { setUserRoleAction, setUserSuspensionAction } from "@/lib/actions/user-admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsersTable({ rows }: { rows: Array<any> }) {
  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="pb-3"><CardTitle className="text-base">Controle de usuários</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((user) => (
          <div key={user.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border/50 bg-card/60 p-3.5">
            <div className="min-w-0 space-y-1.5">
              <div>
                <h3 className="font-heading text-base font-bold">{user.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{user.username} · {user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">papel: {user.role}</span>
                {user.is_suspended ? <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-400">suspenso</span> : <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-400">ativo</span>}
                <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">criado {String(user.created_at).slice(0,10)}</span>
              </div>
              {user.suspension_reason ? <p className="text-sm text-muted-foreground">Motivo: {user.suspension_reason}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <form action={setUserRoleAction} className="flex items-end gap-2 rounded-lg border border-border/50 p-2">
                <input type="hidden" name="user_id" value={user.id} />
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Papel</label>
                  <select name="role" defaultValue={user.role} className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm">
                    <option value="user">Leitor</option>
                    <option value="author">Autor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button size="sm" className="rounded-md">Alterar</Button>
              </form>
              <form action={setUserSuspensionAction} className="flex items-end gap-2 rounded-lg border border-border/50 p-2">
                <input type="hidden" name="user_id" value={user.id} />
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{user.is_suspended ? "Reativar" : "Suspender"}</label>
                  {!user.is_suspended ? (
                    <input name="reason" placeholder="Motivo..." className="w-32 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm" />
                  ) : (
                    <input type="hidden" name="unsuspend" value="1" />
                  )}
                </div>
                <Button size="sm" variant={user.is_suspended ? "outline" : "destructive"} className="rounded-md">
                  {user.is_suspended ? "Reativar" : "Suspender"}
                </Button>
              </form>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
