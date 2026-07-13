import Link from "next/link";
import { Ban, Calendar, ExternalLink, Mail, Search, Shield, Trash2, UserCheck, Users } from "lucide-react";
import { getDb } from "@/lib/db";
import { deleteUserV2Action, toggleUserBanV2Action, updateUserEmailV2Action, updateUserRoleV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, normalizeStatusLabel, readSearchParams, safeAll, safeCount, statusTone } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  is_suspended?: number | null;
  suspension_reason?: string | null;
  comments_count?: number;
  sessions_count?: number;
};

function initials(user: UserRow) {
  return (user.display_name || user.username || user.email || "?").slice(0, 1).toUpperCase();
}

function userStatus(user: UserRow) {
  if (user.role === "banned" || user.is_suspended) return "banned";
  return user.role || "user";
}

export default async function AdminUsuariosPage(props: { searchParams?: Promise<{ q?: string; role?: string; status?: string }> | { q?: string; role?: string; status?: string } }) {
  const secretPath = getAdminSecretPath();
  const adminUser = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const role = (sp.role || "").trim();
    const status = (sp.status || "").trim();

    const conditions = ["u.email NOT LIKE '%@external.author'"];
    const params: unknown[] = [];
    if (q) {
      conditions.push("(u.username LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (role) {
      conditions.push("u.role = ?");
      params.push(role);
    }
    if (status === "banned") conditions.push("(u.role = 'banned' OR COALESCE(ac.is_suspended, 0) = 1)");
    if (status === "active") conditions.push("u.role != 'banned' AND COALESCE(ac.is_suspended, 0) = 0");

    const users = safeAll<UserRow>(db, `
      SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.role, u.created_at, u.last_login_at,
             COALESCE(ac.is_suspended, 0) as is_suspended, ac.suspension_reason,
             (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as comments_count,
             (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > datetime('now')) as sessions_count
      FROM users u
      LEFT JOIN user_access_controls ac ON ac.user_id = u.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY CASE WHEN u.role='admin' THEN 0 WHEN u.role='banned' THEN 1 ELSE 2 END, u.created_at DESC
      LIMIT 140
    `, ...params);

    const totalAdmins = safeCount(db, "SELECT COUNT(*) AS c FROM users WHERE role='admin'");
    const totalBanned = safeCount(db, "SELECT COUNT(*) AS c FROM users WHERE role='banned'");
    const activeSessions = users.reduce((acc, user) => acc + Number(user.sessions_count || 0), 0);

    return (
      <AdminHubShell secretPath={secretPath} active="usuarios" title="Usuários" subtitle="Controle de comunidade, perfis, e-mails, sessões e bloqueios." user={adminUser}>
        <div className="grid gap-4 md:grid-cols-4">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Listados</p><p className="mt-2 text-3xl font-semibold text-slate-50">{formatInteger(users.length)}</p><p className="mt-1 text-sm text-slate-400">sem autores externos</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Admins</p><p className="mt-2 text-3xl font-semibold text-violet-100">{formatInteger(totalAdmins)}</p><p className="mt-1 text-sm text-slate-400">contas protegidas</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Banidos</p><p className="mt-2 text-3xl font-semibold text-rose-100">{formatInteger(totalBanned)}</p><p className="mt-1 text-sm text-slate-400">sem sessões ativas</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Sessões</p><p className="mt-2 text-3xl font-semibold text-cyan-100">{formatInteger(activeSessions)}</p><p className="mt-1 text-sm text-slate-400">nesta listagem</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Buscar usuários" description="Autores externos importados são ocultados automaticamente da lista principal.">
          <AdminPanel>
            <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_170px_170px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Username, e-mail ou nome..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="role" defaultValue={role} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todas roles</option>
                <option value="admin">Admin</option>
                <option value="reader">Leitor</option>
                <option value="user">Usuário</option>
                <option value="author">Autor</option>
                <option value="banned">Banido</option>
              </select>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todo status</option>
                <option value="active">Ativos</option>
                <option value="banned">Banidos/suspensos</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">Buscar</button>
                {(q || role || status) && <Link href={`/${secretPath}/usuarios`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}
              </div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Comunidade" title="Lista de usuários" description="Edição de e-mail inline, badges de role/status e confirmação antes de banir/excluir.">
          {users.length === 0 ? (
            <AdminEmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste os filtros ou aguarde novos cadastros no site." />
          ) : (
            <AdminPanel className="overflow-hidden p-0">
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <tr><th className="px-5 py-4">Usuário</th><th className="px-5 py-4">E-mail</th><th className="px-5 py-4">Role/status</th><th className="px-5 py-4">Atividade</th><th className="px-5 py-4">Criado</th><th className="px-5 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((user) => {
                      const statusValue = userStatus(user);
                      const isProtected = user.role === "admin" || user.id === adminUser.id;
                      return (
                        <tr key={user.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border text-sm font-bold ${user.role === "admin" ? "border-violet-300/20 bg-violet-300/10 text-violet-100" : statusValue === "banned" ? "border-rose-300/20 bg-rose-500/10 text-rose-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>
                                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(user)}
                              </div>
                              <div className="min-w-0"><p className="truncate font-medium text-slate-100">{user.display_name || user.username || "Sem nome"}</p><p className="mt-1 truncate text-xs text-slate-500">@{user.username || "sem-username"}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <form action={updateUserEmailV2Action} className="flex items-center gap-2">
                              <input type="hidden" name="user_id" value={user.id} />
                              <Mail className="h-3.5 w-3.5 text-slate-500" />
                              <input name="email" type="email" defaultValue={user.email} disabled={user.email?.endsWith("@external.author")} className="w-64 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/40 disabled:opacity-40" />
                              <button type="submit" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/15">Salvar</button>
                            </form>
                          </td>
                          <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><AdminStatusBadge tone={statusTone(user.role)}>{normalizeStatusLabel(user.role)}</AdminStatusBadge>{statusValue === "banned" ? <AdminStatusBadge tone="rose">bloqueado</AdminStatusBadge> : <AdminStatusBadge tone="emerald">ativo</AdminStatusBadge>}</div></td>
                          <td className="px-5 py-4 text-slate-300">{formatInteger(Number(user.comments_count || 0))} comentários · {formatInteger(Number(user.sessions_count || 0))} sessões</td>
                          <td className="px-5 py-4 text-slate-400"><Calendar className="mr-1 inline h-3.5 w-3.5" /> {user.created_at?.slice(0, 10) || "—"}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {user.username ? <Link href={`/authors/${user.username}`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]"><ExternalLink className="h-3.5 w-3.5" /> Perfil</Link> : null}
                              {!isProtected && <form action={updateUserRoleV2Action} className="inline-flex items-center gap-1"><input type="hidden" name="user_id" value={user.id} /><select name="role" defaultValue={user.role || "user"} className="rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/40"><option value="user">Normal</option><option value="reader">Leitor</option><option value="author">Autor</option></select><button type="submit" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-2 py-2 text-xs text-cyan-100 hover:bg-cyan-300/15">Salvar</button></form>}
                              {!isProtected && <form action={toggleUserBanV2Action}><input type="hidden" name="user_id" value={user.id} /><ConfirmSubmitButton variant={statusValue === "banned" ? "success" : "warning"} message={statusValue === "banned" ? `Desbanir ${user.display_name || user.email}?` : `Banir ${user.display_name || user.email} e encerrar sessões?`}><Ban className="h-3.5 w-3.5" /> {statusValue === "banned" ? "Desbanir" : "Banir"}</ConfirmSubmitButton></form>}
                              {!isProtected && <form action={deleteUserV2Action}><input type="hidden" name="user_id" value={user.id} /><ConfirmSubmitButton variant="danger" message={`Excluir permanentemente o usuário ${user.display_name || user.email}?`}><Trash2 className="h-3.5 w-3.5" /> Excluir</ConfirmSubmitButton></form>}
                              {isProtected && <AdminStatusBadge tone="violet"><Shield className="mr-1 h-3 w-3" /> protegido</AdminStatusBadge>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 xl:hidden">
                {users.map((user) => {
                  const statusValue = userStatus(user);
                  const isProtected = user.role === "admin" || user.id === adminUser.id;
                  return (
                    <div key={user.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 font-bold text-cyan-100">{initials(user)}</div>
                        <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-slate-100">{user.display_name || user.username || user.email}</h3><p className="truncate text-xs text-slate-500">{user.email}</p><div className="mt-2 flex flex-wrap gap-2"><AdminStatusBadge tone={statusTone(user.role)}>{normalizeStatusLabel(user.role)}</AdminStatusBadge>{statusValue === "banned" && <AdminStatusBadge tone="rose">bloqueado</AdminStatusBadge>}</div></div>
                      </div>
                      <form action={updateUserEmailV2Action} className="mt-4 flex gap-2"><input type="hidden" name="user_id" value={user.id} /><input name="email" type="email" defaultValue={user.email} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none" /><button type="submit" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">Salvar</button></form>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {user.username ? <Link href={`/authors/${user.username}`} target="_blank" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200">Perfil</Link> : null}
                        {!isProtected && <form action={updateUserRoleV2Action} className="inline-flex items-center gap-1"><input type="hidden" name="user_id" value={user.id} /><select name="role" defaultValue={user.role || "user"} className="rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-200 outline-none"><option value="user">Normal</option><option value="reader">Leitor</option><option value="author">Autor</option></select><button type="submit" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-2 py-2 text-xs text-cyan-100">Salvar</button></form>}
                        {!isProtected && <form action={toggleUserBanV2Action}><input type="hidden" name="user_id" value={user.id} /><ConfirmSubmitButton variant={statusValue === "banned" ? "success" : "warning"} message={statusValue === "banned" ? `Desbanir ${user.display_name || user.email}?` : `Banir ${user.display_name || user.email}?`}><Ban className="h-3.5 w-3.5" /> {statusValue === "banned" ? "Desbanir" : "Banir"}</ConfirmSubmitButton></form>}
                        {!isProtected && <form action={deleteUserV2Action}><input type="hidden" name="user_id" value={user.id} /><ConfirmSubmitButton variant="danger" message={`Excluir permanentemente o usuário ${user.display_name || user.email}?`}><Trash2 className="h-3.5 w-3.5" /> Excluir</ConfirmSubmitButton></form>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminPanel>
          )}
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Admin users V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
