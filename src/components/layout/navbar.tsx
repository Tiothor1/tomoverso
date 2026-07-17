import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavbarMoreMenu } from "@/components/layout/site-preferences-menu";
import { SubscriberCookieSync } from "@/components/auth/subscriber-cookie-sync";
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
        <div className="container mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          <Link href="/" className="group flex min-w-0 flex-shrink-0 items-center gap-2" aria-label="Tomo Verso Editora início">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-heading text-base font-black leading-none tracking-tight text-foreground">
                {config.site_name}
              </span>
            </span>
          </Link>

          <nav className="ml-auto flex shrink-0 items-center gap-1.5" aria-label="Navegação principal">
            <NavbarMoreMenu
              showStore={!!config.storefront_enabled}
              storeHref={storeHref}
              publishHref={publishHref}
              publishLabel={publishLabel}
              hasActiveSubscription={!!sub}
              subBadge={sub?.badge_label || null}
              isLoggedIn={!!user}
            />
            <Button asChild variant="ghost" className="h-9 rounded-full border border-primary/30 bg-primary/10 px-3 text-sm font-bold text-primary hover:bg-primary/15 hover:text-primary">
              <Link href="/store/plans">Planos</Link>
            </Button>
          </nav>
        </div>
      </header>
    </>
  );
}
