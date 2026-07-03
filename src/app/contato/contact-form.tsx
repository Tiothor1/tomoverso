"use client";

import { useState } from "react";
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Erro ao enviar mensagem");
        return;
      }

      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
      setErrorMsg("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          Contato
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tem alguma dúvida, sugestão ou quer falar com a gente? Manda uma mensagem.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <h2 className="font-heading text-xl font-semibold">Envie sua mensagem</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Assunto da mensagem"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Escreva sua mensagem..."
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  minLength={10}
                />
              </div>

              <Button type="submit" className="w-full" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar mensagem
                  </>
                )}
              </Button>

              {status === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Mensagem enviada com sucesso! Responderemos em breve.
                </div>
              )}

              {status === "error" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="font-heading text-xl font-semibold">Outras formas de contato</h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/30">
                  <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">E-mail</p>
                    <a
                      href="mailto:tomoversoeditora@gmail.com"
                      className="text-sm text-primary hover:underline"
                    >
                      tomoversoeditora@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  Respondemos em até 48 horas úteis.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Para questões de direitos autorais, use o e-mail acima com o assunto
                  &quot;DMCA&quot; ou &quot;Remoção&quot;.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="font-heading text-xl font-semibold">Links rápidos</h2>
              <div className="space-y-2 text-sm">
                <a href="/termos" className="block text-primary hover:underline">
                  Termos de Uso e Publicação
                </a>
                <a href="/privacidade" className="block text-primary hover:underline">
                  Política de Privacidade
                </a>
                <a href="/sobre" className="block text-primary hover:underline">
                  Sobre a Tomo Verso Editora
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
