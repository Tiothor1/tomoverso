import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  BookOpen,
  ChevronRight,
  DollarSign,
  FileSearch,
  Headphones,
  Home,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Shield,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminSecretPath } from "@/lib/admin/admin-v2-auth";

async function logoutSecretAdmin() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set("admin_validated", "", { maxAge: 0, path: "/" });
  redirect(`/${getAdminSecretPath()}`);
}

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  key: string;
};
type NavGroup = { label: string; items: NavItem[] };

function navGroups(secretPath: string): NavGroup[] {
  const root = `/${secretPath}`;
  return [
    {
      label: "Central",
      items: [
        { label: "Visão geral", href: root, icon: Home, key: "overview" },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { label: "Novels", href: `${root}/novels`, icon: BookOpen, key: "novels" },
        { label: "Mangás", href: `${root}/mangas`, icon: Layers3, key: "mangas" },
      ],
    },
    {
      label: "Comunidade",
      items: [
        { label: "Usuários", href: `${root}/usuarios`, icon: Users, key: "usuarios" },
        { label: "Comentários", href: `${root}/comentarios`, icon: MessageCircle, key: "comentarios" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { label: "Vendas e saques", href: `${root}/finance`, icon: DollarSign, key: "finance" },
      ],
    },
    {
      label: "Importações",
      items: [
        { label: "Upload", href: `${root}/upload`, icon: UploadCloud, key: "upload" },
        { label: "Análise", href: `${root}/analise`, icon: FileSearch, key: "analise" },
      ],
    },
    {
      label: "Sistema",
      items: [
        { label: "Feed admin", href: `${root}/feed`, icon: Activity, key: "feed" },
        { label: "TomoMusic", href: `${root}/tomomusic`, icon: Headphones, key: "tomomusic" },
        { label: "Segurança", href: `${root}/setup`, icon: LockKeyhole, key: "setup" },
      ],
    },
  ];
}

function SidebarNav({ secretPath, active }: { secretPath: string; active: string }) {
  const groups = navGroups(secretPath);
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href={`/${secretPath}`} className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Shield className="h-[18px] w-[18px]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Tomo Verso</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/50">Admin</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active === item.key;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-cyan-300/10 text-cyan-100"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-cyan-200" : "text-slate-500")} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-cyan-300" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-4 border-t border-white/[0.06] pt-4 text-[11px] text-slate-600">
        <p>Link secreto · Sessão de 30 dias</p>
      </div>
    </div>
  );
}

export function AdminHubShell({
  secretPath,
  active,
  title,
  subtitle,
  user,
  actions,
  children,
}: {
  secretPath: string;
  active: string;
  title: string;
  subtitle?: string;
  user?: { username?: string | null; display_name?: string | null; email?: string | null } | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const adminName = user?.display_name || user?.username || "Admin";
  const env = process.env.VERCEL ? "produção" : "local";

  return (
    <div className="min-h-screen bg-[#070812] text-slate-100">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      {/* Mobile drawer (checkbox hack) */}
      <input type="checkbox" id="admin-drawer" className="peer fixed left-[-9999px]" />
      <label
        htmlFor="admin-drawer"
        className="fixed inset-0 z-40 hidden bg-black/60 backdrop-blur-sm peer-checked:block lg:hidden"
      />
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] -translate-x-full border-r border-white/[0.06] bg-slate-950/95 p-4 backdrop-blur-2xl transition-transform peer-checked:translate-x-0 lg:hidden">
        <div className="mb-4 flex justify-end">
          <label
            htmlFor="admin-drawer"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400"
          >
            <X className="h-4 w-4" />
          </label>
        </div>
        <SidebarNav secretPath={secretPath} active={active} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-white/[0.06] bg-slate-950/90 p-4 lg:flex lg:flex-col">
        <SidebarNav secretPath={secretPath} active={active} />
      </aside>

      {/* Main */}
      <div className="lg:ml-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070812]/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label
                htmlFor="admin-drawer"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </label>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">
                    {title}
                  </h1>
                  <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                    OK
                  </span>
                  <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-400 sm:inline-block">
                    {env}
                  </span>
                </div>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <form action={`/${secretPath}/novels`} className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  name="q"
                  placeholder="Buscar..."
                  className="h-8 w-40 rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-3 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-500 focus:w-56 focus:border-cyan-300/30 focus:bg-white/[0.06]"
                />
              </form>

              {actions}

              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 to-violet-400/20 text-[11px] font-bold text-slate-100">
                  {adminName.slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden max-w-24 truncate text-[13px] text-slate-300 md:inline-block">
                  {adminName}
                </span>
              </div>

              <form action={logoutSecretAdmin}>
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/15 bg-rose-500/8 text-rose-300/70 transition hover:bg-rose-500/15 hover:text-rose-200"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
