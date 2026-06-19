import Link from "next/link";
import { BookOpen, PenLine, Library, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ColorThemePicker } from "@/components/theme/color-theme-picker";
import { CommandPalette } from "@/components/layout/command-palette";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="relative">
            <BookOpen className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight hidden sm:inline">
            Tomoverso
          </span>
        </Link>

        {/* Command Palette (search) */}
        <div className="flex-1 max-w-md mx-2">
          <CommandPalette />
        </div>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          <Button variant="ghost" asChild>
            <Link href="/explore">Explorar</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/library">
              <Library className="h-4 w-4 mr-1.5" />
              Estante
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/how-to">Como criar</Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ColorThemePicker />
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden md:flex">
            <Link href="/auth/login">Entrar</Link>
          </Button>
          <Button asChild className="hidden sm:flex">
            <Link href="/dashboard">
              <PenLine className="h-4 w-4 mr-2" />
              Painel
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
