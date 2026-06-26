"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, Library, Store, Crown, PenLine, LogIn, Shield, BookText } from "lucide-react";
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

export function MobileMenu({ isLoggedIn, isAdmin, showStore, storeHref, username, publishLabel, publishHref, subBadge }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-background border-l border-border/60 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <span className="font-heading text-lg font-bold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="p-4 space-y-1">
              <MobileLink href="/explore" icon={<BookOpen className="h-4 w-4" />} label="Light Novels" onClose={() => setOpen(false)} />
              <MobileLink href="/manga" icon={<BookText className="h-4 w-4" />} label="Mangás" onClose={() => setOpen(false)} />
              <MobileLink href="/livros" icon={<BookText className="h-4 w-4" />} label="Livros" onClose={() => setOpen(false)} />
              {showStore && <MobileLink href={storeHref} icon={<Store className="h-4 w-4" />} label="Loja" onClose={() => setOpen(false)} />}
              <MobileLink href="/library" icon={<Library className="h-4 w-4" />} label="Estante" onClose={() => setOpen(false)} />
              <MobileLink href="/how-to" icon={<PenLine className="h-4 w-4" />} label="Como criar" onClose={() => setOpen(false)} />
              <MobileLink href="/store/plans" icon={<Crown className="h-4 w-4 text-amber-400" />} label={subBadge ? `Pro · ${subBadge}` : "Pro"} onClose={() => setOpen(false)} />

              <hr className="my-3 border-border/40" />

              {isLoggedIn ? (
                <>
                  <MobileLink href="/dashboard" icon={<PenLine className="h-4 w-4" />} label="Painel" onClose={() => setOpen(false)} />
                  <MobileLink href="/dashboard/novels/new" icon={<PenLine className="h-4 w-4" />} label={publishLabel} onClose={() => setOpen(false)} />
                  {isAdmin && <MobileLink href="/admin" icon={<Shield className="h-4 w-4 text-red-400" />} label="Admin" onClose={() => setOpen(false)} />}
                </>
              ) : (
                <>
                  <MobileLink href="/auth/login" icon={<LogIn className="h-4 w-4" />} label="Entrar" onClose={() => setOpen(false)} />
                  <MobileLink href={publishHref} icon={<PenLine className="h-4 w-4" />} label={publishLabel} onClose={() => setOpen(false)} />
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function MobileLink({ href, icon, label, onClose }: { href: string; icon: React.ReactNode; label: string; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
