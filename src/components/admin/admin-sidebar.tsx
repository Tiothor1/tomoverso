"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChartNoAxesCombined,
  Globe,
  LibraryBig,
  Package2,
  PlugZap,
  Shield,
  Users2,
  WandSparkles,
} from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/defaults";

const iconMap = {
  overview: ChartNoAxesCombined,
  site: Globe,
  catalog: LibraryBig,
  users: Users2,
  sellers: Users2,
  commerce: Package2,
  integrations: PlugZap,
  imports: Boxes,
  stats: WandSparkles,
} as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[240px] shrink-0 flex-col border-r border-border/50 bg-card/95">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3.5">
        <div className="rounded-lg bg-primary/12 p-1.5 text-primary">
          <Shield className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold leading-tight">Admin</p>
          <p className="truncate text-[11px] text-muted-foreground">Tomo Verso Editora</p>
        </div>
      </div>

      {/* Nav — scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.section];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
