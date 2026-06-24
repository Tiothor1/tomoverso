import Link from "next/link";
import { BookOpen, Heart, Code2, MessageCircle, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30 mt-20">
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative">
                <BookOpen className="h-7 w-7 text-primary" />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              </div>
              <span className="font-heading text-2xl font-bold">Tomoverso</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Onde Light Novels brasileiras ganham vida. Pra autores iniciantes
              e leitores apaixonados.
            </p>
            <div className="flex gap-2 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Code2 className="h-4 w-4" />
              </a>
              <a
                href="https://discord.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Send className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Ler</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-primary transition-colors">Explorar novels</Link></li>
              <li><Link href="/manga" className="hover:text-primary transition-colors">Catálogo de mangás</Link></li>
              <li><Link href="/explore?filter=populares" className="hover:text-primary transition-colors">Populares</Link></li>
              <li><Link href="/explore?filter=recentes" className="hover:text-primary transition-colors">Recentes</Link></li>
              <li><Link href="/explore?filter=destaque" className="hover:text-primary transition-colors">Em destaque</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Escrever</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/how-to" className="hover:text-primary transition-colors">Como criar LN</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Painel do autor</Link></li>
              <li><Link href="/dashboard/novels/new" className="hover:text-primary transition-colors">Nova novel</Link></li>
              <li><Link href="/search" className="hover:text-primary transition-colors">Buscar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Sobre</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sobre" className="hover:text-primary transition-colors">Quem somos</Link></li>
              <li><Link href="/sobre#manifesto" className="hover:text-primary transition-colors">Manifesto</Link></li>
              <li><Link href="/sobre#contato" className="hover:text-primary transition-colors">Contato</Link></li>
              <li><Link href="/termos" className="hover:text-primary transition-colors">Termos</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="bg-border/40" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Tomoverso. Feito com <Heart className="inline h-3 w-3 text-red-500 fill-red-500" /> no Brasil.</div>
          <div className="flex items-center gap-4 text-xs">
            <span>Status: <span className="text-emerald-400">● Online</span></span>
            <span>v0.1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
