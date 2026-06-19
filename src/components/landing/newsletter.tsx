"use client";

import { useState } from "react";
import { Mail, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setSent(true);
    toast.success("Inscrito! Você vai receber novidades em breve.");
    setEmail("");
  }

  return (
    <section className="container mx-auto max-w-5xl px-4 py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-8 md:p-12">
        {/* Glow decorativo */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Newsletter Tomoverso
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold">
              Toda quinta, 5 novels na sua caixa
            </h2>
            <p className="text-muted-foreground">
              Curadoria semanal de novas Light Novels pra você descobrir. Sem spam, pode cancelar quando quiser.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-72">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-12 bg-background/60 backdrop-blur-sm"
                required
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6">
              {sent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Inscrito
                </>
              ) : (
                "Inscrever"
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
