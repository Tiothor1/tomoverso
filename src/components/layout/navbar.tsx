import Link from "next/link";
import { BookOpen, PenLine, Library, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ColorThemePicker } from "@/components/theme/color-theme-picker";
import { HeaderSearch } from "@/components/layout/header-search";
import { UserMenu } from "@/components/auth/user-menu";
import { getCurrentUser } from "@/lib/auth";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="relative">
            <BookOpen className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight hidden sm:inline">
            Tomoverso
          </span>
        </Link>

        <div className="hidden flex-1 md:block max-w-md mx-2">
          <HeaderSearch />
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          <Button variant="ghost" asChild>
            <Link href="/explore">Light Novels</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/manga">Mangás</Link>
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
          {user?.role === "admin" && (
            <Button variant="ghost" asChild>
              <Link href="/admin" className="text-red-400">
                <Shield className="h-4 w-4 mr-1.5" />
                Admin
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/search" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
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
              <Button variant="ghost" asChild className="hidden md:flex">
                <Link href="/auth/login">Entrar</Link>
              </Button>
              <Button asChild className="hidden sm:flex">
                <Link href="/auth/signup">
                  <PenLine className="h-4 w-4 mr-2" />
                  Começar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
