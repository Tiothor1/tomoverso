import Link from "next/link";
import { BookOpen, Crown, Library, PenLine, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ColorThemePicker } from "@/components/theme/color-theme-picker";
import { HeaderSearch } from "@/components/layout/header-search";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { UserMenu } from "@/components/auth/user-menu";
import { SubscriberCookieSync } from "@/components/auth/subscriber-cookie-sync";
import { LangSelector } from "@/components/layout/novel-lang-selector";
import { getCurrentUser } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { getDb } from "@/lib/db";
import { getUserActiveSubscription } from "@/lib/subscriptions";

export async function Navbar() {
  const user = await getCurrentUser();
  const config = getSiteConfig();
  const db = getDb();
  const sub = user ? getUserActiveSubscription(db, user.id) : null;

  return (
    <>
      <SubscriberCookieSync active={!!sub} />
      {config.maintenance_mode ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
          {config.maintenance_message}
        </div>
      ) : null}
      <header className="site-navbar sticky top-0 z-50 w-full border-b border-primary/15 bg-background/72 shadow-[0_8px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="container mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="group flex flex-shrink-0 items-center gap-2">
            <div className="relative">
              <BookOpen className="neon-icon-pop relative z-10 h-7 w-7 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 rounded-full bg-primary/35 blur-xl" />
            </div>
            <div className="hidden sm:block">
              <span className="gradient-text block font-heading text-2xl font-black leading-none tracking-tight">{config.site_name}</span>
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{config.site_tagline}</span>
            </div>
          </Link>

          <div className="mx-2 hidden max-w-md flex-1 md:block">
            <HeaderSearch />
          </div>

          <nav className="hidden items-center gap-1 2xl:flex">
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10">
              <Link href="/feed" className="text-fuchsia-400 hover:text-fuchsia-300">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Feed
              </Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary"><Link href="/explore">Light Novels</Link></Button>
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary"><Link href="/manga">Mangás</Link></Button>
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary"><Link href="/livros">Livros</Link></Button>
            {config.storefront_enabled ? (
              <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary">
                <Link href={config.storefront_href}>
                  <Store className="mr-1.5 h-4 w-4" />
                  Loja
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary">
              <Link href="/library">
                <Library className="mr-1.5 h-4 w-4" />
                Estante
              </Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-full hover:bg-primary/10 hover:text-primary"><Link href="/how-to">Como criar</Link></Button>
            {sub ? (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.15)]">
                <Crown className="h-3 w-3" />
                {sub.badge_label || "Pro"}
              </span>
            ) : (
              <Button variant="ghost" asChild className="rounded-full hover:bg-amber-400/10">
                <Link href="/store/plans" className="text-amber-400 hover:text-amber-300">
                  <Crown className="mr-1 h-4 w-4" />
                  Pro
                </Link>
              </Button>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <MobileMenu
              isLoggedIn={!!user}
              isAdmin={user?.role === "admin"}
              showStore={!!config.storefront_enabled}
              storeHref={config.storefront_href || "/store"}
              username={user?.username}
              publishLabel={config.publish_cta_label}
              publishHref={config.publish_cta_href}
              subBadge={sub?.badge_label || null}
            />
            <LangSelector />
            <ColorThemePicker />
            <ThemeToggle />
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
              <>
                <Button variant="ghost" asChild className="hidden rounded-full hover:bg-primary/10 hover:text-primary md:flex"><Link href="/auth/login">Entrar</Link></Button>
                <Button asChild className="neon-button hidden rounded-full sm:flex"><Link href={config.publish_cta_href}><PenLine className="mr-2 h-4 w-4" />{config.publish_cta_label}</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
