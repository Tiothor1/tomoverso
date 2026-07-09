"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  BookText,
  Compass,
  Crown,
  Headphones,
  Home,
  Library,
  LogIn,
  Menu,
  PenLine,
  Search,
  Shield,
  Sparkles,
  Store,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePreferencesPanel } from "@/components/layout/site-preferences-menu";
import { useTranslate } from "@/components/i18n/language-provider";

interface MobileMenuProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
  showStore: boolean;
  storeHref: string;
  username?: string;
  publishLabel: string;
  publishHref: string;
  hasActiveSubscription: boolean;
  subBadge?: string | null;
}

export function MobileMenu({
  isLoggedIn,
  isAdmin,
  showStore,
  storeHref,
  username,
  publishLabel,
  publishHref,
  hasActiveSubscription,
  subBadge,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const t = useTranslate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full hover:bg-primary/10 hover:text-primary lg:hidden"
        aria-label={t("nav.more")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
              <button
                type="button"
                aria-label={t("common.close")}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={close}
              />

              <aside className="absolute right-0 top-0 flex h-dvh w-[min(92vw,24rem)] flex-col overflow-hidden border-l border-border bg-background/98 shadow-2xl shadow-black/45 backdrop-blur-xl">
                <header className="relative shrink-0 overflow-hidden border-b border-border/60 px-5 py-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,.14),transparent_34%)]" />
                  <div className="relative flex items-center gap-3 pr-11">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 id={titleId} className="font-heading text-xl font-black leading-tight tracking-tight">
                        {t("common.app_name")}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {isLoggedIn && username ? `Olá, ${username}` : t("common.tagline")}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.close")}
                    className="absolute right-3 top-3 rounded-full"
                    onClick={close}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <section aria-label="Links principais" className="grid grid-cols-2 gap-2">
                    <MobileTile href="/" icon={Home} label="Início" onClose={close} />
                    <MobileTile href="/feed" icon={Sparkles} label="Feed" accent="violet" onClose={close} />
                    <MobileTile href="/explore" icon={Compass} label="Catálogo" onClose={close} />
                    <MobileTile href="/tomomusic" icon={Headphones} label="TomoMusic" accent="amber" onClose={close} />
                    <MobileTile href={publishHref} icon={PenLine} label="Publicar" accent="primary" onClose={close} />
                    <MobileTile href="/autor-plus" icon={Crown} label="Autor+" accent="amber" onClose={close} />
                    {showStore ? <MobileTile href={storeHref} icon={Store} label="Loja" onClose={close} /> : null}
                    {!isLoggedIn ? <MobileTile href="/auth/login" icon={LogIn} label="Entrar" accent="primary" onClose={close} /> : null}
                  </section>

                  <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  <section aria-label={t("nav.more")}>
                    <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t("nav.more")}</p>
                    <nav className="grid gap-1">
                      <MobileRow href="/search" icon={Search} label="Buscar obras" onClose={close} />
                      <MobileRow href="/explore" icon={BookOpen} label="Light novels" onClose={close} />
                      <MobileRow href="/manga" icon={BookText} label="Mangás e manhwas" onClose={close} />
                      <MobileRow href="/tomomusic" icon={Headphones} label="TomoMusic" accent="amber" onClose={close} />
                      <MobileRow href="/livros" icon={BookText} label="Livros" onClose={close} />
                      <MobileRow href="/library" icon={Library} label="Minha estante" onClose={close} />
                      <MobileRow href="/store/plans" icon={Crown} label={subBadge ? `Planos Pro · ${subBadge}` : "Planos Pro"} accent="amber" onClose={close} />
                      <MobileRow href="/how-to" icon={PenLine} label="Como publicar" onClose={close} />
                      <MobileRow href="/concurso" icon={Trophy} label="Concursos" accent="amber" onClose={close} />
                      {isLoggedIn ? <MobileRow href="/notifications" icon={Bell} label="Notificações" onClose={close} /> : null}
                      {isLoggedIn ? <MobileRow href="/dashboard" icon={Sparkles} label="Painel" accent="violet" onClose={close} /> : null}
                    </nav>
                  </section>

                  <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  <MobilePreferencesPanel hasActiveSubscription={hasActiveSubscription} />
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

type MobileItemProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClose: () => void;
  accent?: "primary" | "amber" | "violet" | "red";
};

const accentClasses = {
  primary: "bg-primary/12 text-primary ring-primary/20",
  amber: "bg-amber-400/12 text-amber-400 ring-amber-400/20",
  violet: "bg-violet-400/12 text-violet-300 ring-violet-400/20",
  red: "bg-red-400/12 text-red-400 ring-red-400/20",
};

function MobileTile({ href, icon: Icon, label, onClose, accent = "primary" }: MobileItemProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="group flex min-h-24 flex-col justify-between rounded-3xl border border-border/60 bg-card/70 p-4 text-sm font-black text-foreground shadow-sm transition hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105 ${accentClasses[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

function MobileRow({ href, icon: Icon, label, onClose, accent = "primary" }: MobileItemProps) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-foreground/90 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClasses[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}
