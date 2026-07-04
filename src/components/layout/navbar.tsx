import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, Compass, Crown, Home, PenLine, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavbarMoreMenu } from "@/components/layout/site-preferences-menu";
import { UserMenu } from "@/components/auth/user-menu";
import { SubscriberCookieSync } from "@/components/auth/subscriber-cookie-sync";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getCurrentUser } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getDb } from "@/lib/db";
import { getUserActiveSubscription } from "@/lib/subscriptions";

export async function Navbar() {
  const user = await getCurrentUser();
  const config = getSiteConfig();
  const db = getDb();
  const sub = user ? getUserActiveSubscription(db, user.id) : null;
  const storeHref = config.storefront_href || "/store";
  const publishHref = user ? "/dashboard/novels/new" : (config.publish_cta_href || "/auth/signup");
  const publishLabel = user ? "Publicar" : config.publish_cta_label;

  return (
    <>
      <SubscriberCookieSync active={!!sub} />
      {config.maintenance_mode ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
          {config.maintenance_message}
        </div>
      ) : null}
      <header className="site-navbar sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 shadow-sm backdrop-blur-xl">
        <div className="container mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="group flex min-w-0 flex-shrink-0 items-center gap-2" aria-label="Tomo Verso Editora início">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-heading text-lg font-black leading-none tracking-tight text-foreground xl:text-xl">
                {config.site_name}
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground xl:block">
                {config.site_tagline}
              </span>
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            <NavLink href="/">
              <Home className="mr-1.5 h-4 w-4" />
              Início
            </NavLink>
            <NavLink href="/feed" tone="accent">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Feed
            </NavLink>
            <NavLink href="/explore">
              <Compass className="mr-1.5 h-4 w-4" />
              Catálogo
            </NavLink>
            <NavLink href={publishHref}>
              <PenLine className="mr-1.5 h-4 w-4" />
              Publicar
            </NavLink>
            <NavLink href="/autor-plus" tone="accent">
              <Crown className="mr-1.5 h-4 w-4" />
              Autor+
            </NavLink>
            {config.storefront_enabled ? (
              <NavLink href={storeHref}>
                <Store className="mr-1.5 h-4 w-4" />
                Loja
              </NavLink>
            ) : null}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <NavbarMoreMenu
              showStore={!!config.storefront_enabled}
              storeHref={storeHref}
              publishHref={publishHref}
              publishLabel={publishLabel}
              subBadge={sub?.badge_label || null}
            />

            {user && <NotificationBell />}

            {user ? (
              <UserMenu
                user={{
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url || undefined,
                  role: user.role,
                }}
              />
            ) : (
              <Button asChild className="rounded-full px-4 font-bold shadow-sm">
                <Link href="/auth/login">Entrar</Link>
              </Button>
            )}

            <MobileMenu
              isLoggedIn={!!user}
              isAdmin={user?.role === "admin"}
              showStore={!!config.storefront_enabled}
              storeHref={storeHref}
              username={user?.username}
              publishLabel={publishLabel}
              publishHref={publishHref}
              subBadge={sub?.badge_label || null}
            />
          </div>
        </div>
      </header>
    </>
  );
}

function NavLink({ href, children, tone = "default" }: { href: string; children: ReactNode; tone?: "default" | "accent" }) {
  return (
    <Button
      variant="ghost"
      asChild
      className={
        tone === "accent"
          ? "rounded-full px-3 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          : "rounded-full px-3 font-semibold text-foreground/82 hover:bg-muted hover:text-foreground"
      }
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
