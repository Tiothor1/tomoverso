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
              <a href="https://wa.me/5511999999999?text=Olá!%20Preciso%20de%20ajuda%20no%20Tomoverso" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-emerald-500 transition-colors" title="Suporte via WhatsApp">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
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
