import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronRight,
  DollarSign,
  FileSearch,
  FileText,
  Globe2,
  Home,
  Layers3,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  UploadCloud,
  Users,
  WalletCards,
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
  hint?: string;
  external?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

function navGroups(secretPath: string): NavGroup[] {
  const root = `/${secretPath}`;
  return [
    {
      label: "Central",
      items: [
        { label: "Visão geral", href: root, icon: Home, key: "overview" },
        { label: "Saúde do sistema", href: "/admin/stats", icon: BarChart3, key: "stats", hint: "Admin público" },
      ],
    },
    {
      label: "Obras",
      items: [
        { label: "Novels", href: `${root}/novels`, icon: BookOpen, key: "novels" },
        { label: "Mangás", href: `${root}/mangas`, icon: Layers3, key: "mangas" },
        { label: "Capítulos", href: `${root}/novels`, icon: FileText, key: "chapters", hint: "via obras" },
        { label: "Curadoria", href: "/admin/catalog/curation", icon: Sparkles, key: "curation", hint: "Site" },
      ],
    },
    {
      label: "Comunidade",
      items: [
        { label: "Usuários", href: `${root}/usuarios`, icon: Users, key: "usuarios" },
        { label: "Comentários", href: `${root}/comentarios`, icon: MessageCircle, key: "comentarios" },
        { label: "Denúncias", href: `${root}/moderacao`, icon: Shield, key: "moderacao" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { label: "Vendas e saques", href: `${root}/finance`, icon: DollarSign, key: "finance" },
        { label: "Autores/Sellers", href: "/admin/sellers", icon: WalletCards, key: "sellers", hint: "Admin público" },
        { label: "Loja", href: "/admin/commerce", icon: ShoppingCart, key: "commerce", hint: "Store" },
      ],
    },
    {
      label: "Importações",
      items: [
        { label: "Upload", href: `${root}/upload`, icon: UploadCloud, key: "upload" },
        { label: "Análise", href: `${root}/analise`, icon: FileSearch, key: "analise" },
        { label: "Fila e fontes", href: "/admin/imports", icon: Boxes, key: "imports", hint: "Admin público" },
      ],
    },
    {
      label: "Site e sistema",
      items: [
        { label: "Configurações", href: "/admin/site", icon: Settings, key: "site", hint: "Site principal" },
        { label: "Feed admin", href: `${root}/feed`, icon: Activity, key: "feed", hint: "Moderação" },
        { label: "Integrações", href: "/admin/integrations", icon: Globe2, key: "integrations" },
        { label: "Segurança", href: `${root}/setup`, icon: LockKeyhole, key: "setup" },
      ],
    },
  ];
}

function SidebarContent({ secretPath, active }: { secretPath: string; active: string }) {
  const groups = navGroups(secretPath);
  return (
    <div className="flex min-h-full flex-col">
      <Link href={`/${secretPath}`} className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-950/30">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Tomo Verso</p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/55">Admin Hub</p>
        </div>
      </Link>

      <nav className="space-y-7">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = active === item.key;
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.label}-${item.key}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                      isActive
                        ? "bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-300/20"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-cyan-200" : "text-slate-500 group-hover:text-slate-300")} />
                    <span className="flex-1">{item.label}</span>
                    {item.hint ? <span className="hidden rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-500 xl:inline">{item.hint}</span> : null}
                    {isActive ? <ChevronRight className="h-3 w-3 text-cyan-200" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">Segurança preservada</p>
        <p className="mt-1 leading-relaxed">Link secreto, cookie admin_validated e role admin continuam no mesmo fluxo.</p>
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
  const root = `/${secretPath}`;
  const adminName = user?.display_name || user?.username || "Admin";
  const env = process.env.VERCEL ? "produção" : "local";

  return (
    <div className="min-h-screen bg-[#070812] text-slate-100">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-12%] top-[15%] h-[520px] w-[520px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[30%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:block">
        <SidebarContent secretPath={secretPath} active={active} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070812]/82 px-4 py-4 backdrop-blur-2xl sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <details className="group relative lg:hidden">
                <summary className="list-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 marker:hidden">Menu</summary>
                <div className="absolute left-0 top-12 z-50 max-h-[78vh] w-[88vw] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/50 sm:w-80">
                  <SidebarContent secretPath={secretPath} active={active} />
                </div>
              </details>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-50">{title}</h1>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">Admin OK</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">{env}</span>
                </div>
                {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form action={`${root}/novels`} className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  name="q"
                  placeholder="Buscar obra..."
                  className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.06]"
                />
              </form>
              <div className="flex items-center gap-2">
                <Link href="/" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07]">Site</Link>
                <Link href="/feed" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07]">Feed</Link>
                {actions}
                <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/25 to-violet-300/20 text-xs font-bold text-slate-100">
                    {adminName.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-28 truncate text-xs text-slate-300">{adminName}</span>
                </div>
                <form action={logoutSecretAdmin}>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/15">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
