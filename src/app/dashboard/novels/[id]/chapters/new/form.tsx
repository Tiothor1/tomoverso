"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createChapterAction } from "@/lib/actions/chapter-actions";

interface NewChapterFormProps {
  novel: {
    id: string;
    title: string;
    slug: string;
    nextChapterNumber: number;
  };
}

export function NewChapterForm({ novel }: NewChapterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 250);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createChapterAction(formData);
    if (result && !result.ok) {
      setError(result.error || "Erro ao criar capítulo");
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">{novel.title}</Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">Novo capítulo</h1>
          <p className="text-muted-foreground mt-1">Escreva com calma. Você pode salvar rascunhos depois.</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <input type="hidden" name="novel_id" value={novel.id} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Informações do capítulo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-[120px_1fr] gap-4">
              <div className="space-y-2">
                <Label htmlFor="chapter_number">Número</Label>
                <Input
                  id="chapter_number"
                  name="chapter_number"
                  type="number"
                  min={1}
                  max={9999}
                  defaultValue={novel.nextChapterNumber}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Ex: O Caderno da Avó"
                  className="text-lg h-10"
                  required
                  minLength={2}
                  maxLength={200}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conteúdo</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{wordCount} palavras</span>
                <span>·</span>
                <span>~{readingTime} min de leitura</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              name="content"
              placeholder="Comece a escrever aqui. Pode pular linhas entre parágrafos — o sistema vai formatar pra você."
              rows={20}
              required
              minLength={100}
              className="resize-y font-serif text-base leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Dica: parágrafos separados por linha em branco. Mínimo 100 caracteres.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/80 backdrop-blur-md p-4 rounded-lg border border-border/40 -mx-4 px-4">
          <Button type="submit" size="lg" className="flex-1" disabled={loading || wordCount < 100}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Publicar capítulo
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
