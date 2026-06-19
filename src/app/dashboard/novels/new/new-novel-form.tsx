"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, ImageIcon, Tag, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { createNovelAction } from "@/lib/actions/novel-actions";

const popularGenres = [
  "Fantasia", "Ação", "Romance", "Drama", "Comédia", "Slice of Life",
  "Mistério", "Horror", "Sistema", "Isekai", "Cultivo", "Sobrenatural",
  "Sci-Fi", "Escolar", "Psicológico", "Aventura", "Murim", "Regressão",
];

export function NewNovelForm() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleGenre(g: string) {
    setSelectedGenres((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      if (prev.length >= 5) return prev;
      return [...prev, g];
    });
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("genres", selectedGenres.join(","));
    const result = await createNovelAction(formData);
    if (result && !result.ok) {
      setError(result.error || "Erro ao criar novel");
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao painel
        </Link>
      </Button>

      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">Criar nova novel</h1>
        <p className="text-muted-foreground mt-1">Preencha as informações básicas. Você pode editar tudo depois.</p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Informações básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" placeholder="Ex: O Que Eu Desenhei, Existe" className="text-lg h-12" required minLength={2} maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt-title">Títulos alternativos (opcional)</Label>
              <Input id="alt-title" name="alternative_titles" placeholder="OQEDE, Drawn to Life" />
              <p className="text-xs text-muted-foreground">Separe por vírgula</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="synopsis">Sinopse *</Label>
              <Textarea id="synopsis" name="synopsis" placeholder="Resuma sua história em 2-4 parágrafos. Capriche — é a primeira impressão." rows={8} required minLength={100} maxLength={2000} />
              <p className="text-xs text-muted-foreground">Mínimo 100 caracteres. Recomendado 300-800.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select id="type" name="type" defaultValue="light-novel" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="light-novel">Light Novel</option>
                  <option value="web-novel">Web Novel</option>
                  <option value="short">Novel Curta</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue="ongoing" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="ongoing">Em andamento</option>
                  <option value="hiatus">Em hiato</option>
                  <option value="completed">Completa</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gêneros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Escolha até 5 gêneros. {selectedGenres.length}/5 selecionados.
            </p>
            <div className="flex flex-wrap gap-2">
              {popularGenres.map((g) => {
                const selected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    disabled={!selected && selectedGenres.length >= 5}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/80 backdrop-blur-md p-4 rounded-lg border border-border/40 -mx-4 px-4">
          <Button type="submit" size="lg" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Criar novel
              </>
            )}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/dashboard">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
