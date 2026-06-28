import Link from "next/link";
import { BookOpen, Heart, Code2, MessageCircle, Send, Store } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getSiteConfig } from "@/lib/site-config";

export async function Footer() {
  const config = getSiteConfig();

  return (
    <footer className="mt-20 border-t border-border/40 bg-card/30">
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 space-y-3 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative">
                <BookOpen className="h-7 w-7 text-primary" />
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              </div>
              <span className="font-heading text-2xl font-bold">{config.site_name}</span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">{config.footer_tagline}</p>
            <div className="flex gap-2 pt-2">
                {config.github_url ? <a href={config.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Code2 className="h-4 w-4" /></a> : null}
                {config.discord_url ? <a href={config.discord_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="h-4 w-4" /></a> : null}
                {config.telegram_url ? <a href={config.telegram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Send className="h-4 w-4" /></a> : null}
              </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold">Ler</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-primary transition-colors">Explorar novels</Link></li>
              <li><Link href="/manga" className="hover:text-primary transition-colors">Catálogo de mangás</Link></li>
              {config.storefront_enabled ? <li><Link href={config.storefront_href} className="hover:text-primary transition-colors">Loja editorial</Link></li> : null}
              <li><Link href="/explore?filter=populares" className="hover:text-primary transition-colors">Populares</Link></li>
              <li><Link href="/explore?filter=recentes" className="hover:text-primary transition-colors">Recentes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold">Criar</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/how-to" className="hover:text-primary transition-colors">Como criar LN</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Painel do autor</Link></li>
              <li><Link href={config.publish_cta_href} className="hover:text-primary transition-colors">{config.publish_cta_label}</Link></li>
              <li><Link href="/search" className="hover:text-primary transition-colors">Buscar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold">Projeto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sobre" className="hover:text-primary transition-colors">Quem somos</Link></li>
              {config.storefront_enabled ? <li><Link href={config.storefront_href} className="hover:text-primary transition-colors"><Store className="mr-1 inline h-3 w-3" /> Loja</Link></li> : null}
              <li><a href={`mailto:${config.support_email}`} className="hover:text-primary transition-colors">{config.support_email}</a></li>
              <li><Link href="/termos" className="hover:text-primary transition-colors">Termos</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="bg-border/40" />

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-sm text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} {config.site_name}. Feito com <Heart className="inline h-3 w-3 fill-red-500 text-red-500" /> no Brasil.</div>
          <div className="flex items-center gap-4 text-xs">
            <span>Status: <span className="text-emerald-400">● Online</span></span>
            <span>v0.2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
