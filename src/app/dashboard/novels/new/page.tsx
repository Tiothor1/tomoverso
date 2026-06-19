import Link from "next/link";
import { ArrowLeft, Save, BookOpen, PenLine, Image as ImageIcon, Tag, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const popularGenres = [
  "Fantasia", "Ação", "Romance", "Drama", "Comédia", "Slice of Life",
  "Mistério", "Horror", "Sistema", "Isekai", "Cultivo", "Sobrenatural",
  "Sci-Fi", "Escolar", "Psicológico", "Aventura", "Sobrenatural", "Murim",
];

export const metadata = {
  title: "Criar nova novel — Tomoverso",
};

export default function NewNovelPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao painel
        </Link>
      </Button>

      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Criar nova novel
        </h1>
        <p className="text-muted-foreground mt-1">
          Preencha as informações básicas. Você pode editar tudo depois.
        </p>
      </div>

      <form className="space-y-6">
        {/* Título */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Informações básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: O Que Eu Desenhei, Existe"
                className="text-lg h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-title">Títulos alternativos (opcional)</Label>
              <Input
                id="alt-title"
                placeholder="Ex: OQEDE, Drawn to Life"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Usado pra busca.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="synopsis">Sinopse *</Label>
              <Textarea
                id="synopsis"
                placeholder="Resuma sua história em 2-4 parágrafos. Capriche — é a primeira impressão."
                rows={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 100 caracteres. Recomendado 300-800.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="light-novel"
                >
                  <option value="light-novel">Light Novel</option>
                  <option value="web-novel">Web Novel</option>
                  <option value="short">Novel Curta</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="ongoing"
                >
                  <option value="ongoing">Em andamento</option>
                  <option value="hiatus">Em hiato</option>
                  <option value="completed">Completa</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Capa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center space-y-3 hover:border-primary/50 transition-colors cursor-pointer">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <div className="font-medium">Arraste uma imagem ou clique aqui</div>
                <div className="text-xs text-muted-foreground mt-1">
                  PNG ou JPG, recomendado 600x800px (3:4)
                </div>
              </div>
              <Button variant="outline" size="sm" type="button">
                <Sparkles className="h-3 w-3 mr-2" />
                Ou gerar com IA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gêneros e tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Gêneros e tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gêneros (escolha até 5)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {popularGenres.map((g) => (
                  <Badge
                    key={g}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/50"
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags customizadas</Label>
              <div className="flex gap-2">
                <Input id="tags" placeholder="Digite uma tag e pressione Enter" />
                <Button type="button" variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tags ajudam leitores a descobrir sua novel.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/80 backdrop-blur-md p-4 rounded-lg border border-border/40 -mx-4 px-4">
          <Button type="submit" size="lg" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Criar novel
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/dashboard">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}
