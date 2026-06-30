"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookOpen,
  BookText,
  Crown,
  Library,
  LogIn,
  Menu,
  PenLine,
  Shield,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
  showStore: boolean;
  storeHref: string;
  username?: string;
  publishLabel: string;
  publishHref: string;
  subBadge?: string | null;
}

const mainLinks = [
  { href: "/feed", icon: Sparkles, label: "Feed" },
  { href: "/explore", icon: BookOpen, label: "Light Novels" },
  { href: "/manga", icon: BookText, label: "Mangás" },
  { href: "/livros", icon: BookText, label: "Livros" },
  { href: "/library", icon: Library, label: "Estante" },
  { href: "/how-to", icon: PenLine, label: "Como criar" },
];

export function MobileMenu({
  isLoggedIn,
  isAdmin,
  showStore,
  storeHref,
  username,
  publishLabel,
  publishHref,
  subBadge,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

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

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full hover:bg-primary/10 hover:text-primary 2xl:hidden"
        aria-label="Abrir menu"
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
                aria-label="Fechar menu"
                className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />

              <aside className="glass-panel absolute right-0 top-0 flex h-dvh w-[min(90vw,22rem)] flex-col overflow-hidden border-l border-primary/25 bg-background/95 shadow-2xl shadow-black/60">
                <header className="relative shrink-0 overflow-hidden border-b border-border/50 px-4 py-4">
                  <div className="pointer-events-none absolute -right-12 -top-16 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 left-4 h-28 w-28 rounded-full bg-amber-400/15 blur-3xl" />

                  <div className="relative flex items-center gap-3 pr-11">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 shadow-[0_0_24px_rgba(168,85,247,0.22)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 id={titleId} className="font-heading text-xl font-black leading-tight tracking-tight">
                        Menu
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {isLoggedIn && username ? `Olá, ${username}` : "Tudo do Tomoverso aqui"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar menu"
                    className="absolute right-3 top-3"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </header>

                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <section className="grid grid-cols-2 gap-2">
                    <MobileLink href="/store/plans" icon={Crown} label={subBadge ? `Pro · ${subBadge}` : "Planos Pro"} accent="amber" onClose={() => setOpen(false)} compact />
                    {showStore ? (
                      <MobileLink href={storeHref} icon={Store} label="Loja" accent="violet" onClose={() => setOpen(false)} compact />
                    ) : (
                      <MobileLink href={publishHref} icon={PenLine} label={publishLabel} accent="primary" onClose={() => setOpen(false)} compact />
                    )}
                  </section>

                  <nav className="mt-3 grid gap-1" aria-label="Menu principal mobile">
                    {mainLinks.map((item) => (
                      <MobileLink key={item.href} href={item.href} icon={item.icon} label={item.label} onClose={() => setOpen(false)} />
                    ))}
                  </nav>

                  <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  <nav className="grid gap-1" aria-label="Área do usuário mobile">
                    {isLoggedIn ? (
                      <>
                        <MobileLink href="/dashboard" icon={Sparkles} label="Painel" accent="violet" onClose={() => setOpen(false)} />
                        <MobileLink href="/dashboard/novels/new" icon={PenLine} label={publishLabel} accent="primary" onClose={() => setOpen(false)} />
                        {isAdmin ? <MobileLink href="/admin" icon={Shield} label="Admin" accent="red" onClose={() => setOpen(false)} /> : null}
                      </>
                    ) : (
                      <>
                        <MobileLink href="/auth/login" icon={LogIn} label="Entrar" onClose={() => setOpen(false)} />
                        <MobileLink href={publishHref} icon={PenLine} label={publishLabel} accent="primary" onClose={() => setOpen(false)} />
                      </>
                    )}
                  </nav>
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

type MobileLinkProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClose: () => void;
  accent?: "primary" | "amber" | "violet" | "red";
  compact?: boolean;
};

function MobileLink({ href, icon: Icon, label, onClose, accent = "primary", compact = false }: MobileLinkProps) {
  const accentClass = {
    primary: "bg-primary/12 text-primary ring-primary/20",
    amber: "bg-amber-400/12 text-amber-400 ring-amber-400/20",
    violet: "bg-violet-400/12 text-violet-300 ring-violet-400/20",
    red: "bg-red-400/12 text-red-400 ring-red-400/20",
  }[accent];

  return (
    <Link
      href={href}
      onClick={onClose}
      className={
        compact
          ? "neon-card group flex min-h-20 flex-col items-start justify-between rounded-2xl border border-border/50 bg-card/60 p-3 text-sm font-bold text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          : "group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-foreground/90 transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      }
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-110 ${accentClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className={compact ? "leading-tight" : "min-w-0 flex-1 truncate"}>{label}</span>
    </Link>
  );
}
