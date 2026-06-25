"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChartNoAxesCombined, Globe, LibraryBig, Package2, PlugZap, Shield, Users2, WandSparkles } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/defaults";

const iconMap = {
  overview: ChartNoAxesCombined,
  site: Globe,
  catalog: LibraryBig,
  users: Users2,
  commerce: Package2,
  integrations: PlugZap,
  imports: Boxes,
  stats: WandSparkles,
} as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-24 space-y-4">
      <div className="rounded-3xl border border-border/50 bg-card/80 p-4 shadow-xl shadow-black/5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/12 p-2 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold leading-none">Admin</p>
            <p className="text-xs text-muted-foreground">Controle central do Tomoverso</p>
          </div>
        </div>
        <nav className="space-y-1.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.section];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
