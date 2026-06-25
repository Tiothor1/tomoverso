import { updateSiteConfigAction } from "@/lib/actions/site-admin-actions";
import type { SiteSettings } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SiteConfigForm({ settings }: { settings: SiteSettings }) {
  return (
    <form action={updateSiteConfigAction} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>Hero e posicionamento</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label htmlFor="hero_badge">Badge</Label><Input id="hero_badge" name="hero_badge" defaultValue={settings.hero_badge} /></div>
            <div className="space-y-2"><Label htmlFor="site_name">Nome do site</Label><Input id="site_name" name="site_name" defaultValue={settings.site_name} /></div>
            <div className="space-y-2"><Label htmlFor="site_tagline">Tagline curta</Label><Input id="site_tagline" name="site_tagline" defaultValue={settings.site_tagline} /></div>
            <div className="space-y-2"><Label htmlFor="hero_title">Título principal</Label><Input id="hero_title" name="hero_title" defaultValue={settings.hero_title} /></div>
            <div className="space-y-2"><Label htmlFor="hero_highlight">Linha em destaque</Label><Input id="hero_highlight" name="hero_highlight" defaultValue={settings.hero_highlight} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="hero_description">Descrição</Label><Textarea id="hero_description" name="hero_description" rows={4} defaultValue={settings.hero_description} /></div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>CTAs do site</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="primary_cta_label">CTA principal</Label><Input id="primary_cta_label" name="primary_cta_label" defaultValue={settings.primary_cta_label} /></div>
            <div className="space-y-2"><Label htmlFor="primary_cta_href">Link principal</Label><Input id="primary_cta_href" name="primary_cta_href" defaultValue={settings.primary_cta_href} /></div>
            <div className="space-y-2"><Label htmlFor="secondary_cta_label">CTA secundário</Label><Input id="secondary_cta_label" name="secondary_cta_label" defaultValue={settings.secondary_cta_label} /></div>
            <div className="space-y-2"><Label htmlFor="secondary_cta_href">Link secundário</Label><Input id="secondary_cta_href" name="secondary_cta_href" defaultValue={settings.secondary_cta_href} /></div>
            <div className="space-y-2"><Label htmlFor="publish_cta_label">CTA publicar</Label><Input id="publish_cta_label" name="publish_cta_label" defaultValue={settings.publish_cta_label} /></div>
            <div className="space-y-2"><Label htmlFor="publish_cta_href">Link publicar</Label><Input id="publish_cta_href" name="publish_cta_href" defaultValue={settings.publish_cta_href} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>Rodapé e contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="footer_tagline">Texto do rodapé</Label><Textarea id="footer_tagline" name="footer_tagline" rows={4} defaultValue={settings.footer_tagline} /></div>
            <div className="space-y-2"><Label htmlFor="support_email">E-mail</Label><Input id="support_email" name="support_email" defaultValue={settings.support_email} /></div>
            <div className="space-y-2"><Label htmlFor="github_url">GitHub</Label><Input id="github_url" name="github_url" defaultValue={settings.github_url || ""} /></div>
            <div className="space-y-2"><Label htmlFor="discord_url">Discord</Label><Input id="discord_url" name="discord_url" defaultValue={settings.discord_url || ""} /></div>
            <div className="space-y-2"><Label htmlFor="telegram_url">Telegram</Label><Input id="telegram_url" name="telegram_url" defaultValue={settings.telegram_url || ""} /></div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/50">
          <CardHeader><CardTitle>Operação e loja</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 rounded-2xl border border-border/50 p-3 text-sm"><input type="checkbox" name="maintenance_mode" defaultChecked={!!settings.maintenance_mode} /> Banner de manutenção ativo</label>
            <div className="space-y-2"><Label htmlFor="maintenance_message">Mensagem de manutenção</Label><Textarea id="maintenance_message" name="maintenance_message" rows={3} defaultValue={settings.maintenance_message} /></div>
            <label className="flex items-center gap-3 rounded-2xl border border-border/50 p-3 text-sm"><input type="checkbox" name="storefront_enabled" defaultChecked={!!settings.storefront_enabled} /> Habilitar área pública da loja</label>
            <div className="space-y-2"><Label htmlFor="storefront_title">Título da loja</Label><Input id="storefront_title" name="storefront_title" defaultValue={settings.storefront_title} /></div>
            <div className="space-y-2"><Label htmlFor="storefront_description">Descrição da loja</Label><Textarea id="storefront_description" name="storefront_description" rows={4} defaultValue={settings.storefront_description} /></div>
            <div className="space-y-2"><Label htmlFor="storefront_href">Link da loja</Label><Input id="storefront_href" name="storefront_href" defaultValue={settings.storefront_href} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button size="lg" className="rounded-2xl px-6">Salvar configurações</Button></div>
      </div>
    </form>
  );
}
