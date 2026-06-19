"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Sparkles, Star, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background com partículas */}
      <div className="absolute inset-0 -z-10">
        {/* Gradiente base */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />

        {/* Orbes flutuantes */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Estrelas/partículas */}
        {mounted &&
          Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                opacity: Math.random() * 0.6,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div className={`space-y-6 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <Badge variant="secondary" className="px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" />
              Plataforma brasileira de Light Novels
            </Badge>

            <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Sua história <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  começa aqui
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 4 Q 50 0, 100 4 T 200 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-primary"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
              Leia, escreva e descubra Light Novels originais em português.
              Um lar pra autores iniciantes e leitores apaixonados por narrativas
              que ainda não existem em nenhum outro lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" asChild className="text-base h-12 px-6">
                <Link href="/explore">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Explorar novels
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-base h-12 px-6 backdrop-blur-sm bg-background/50"
              >
                <Link href="/auth/signup">
                  <PenLine className="h-5 w-5 mr-2" />
                  Começar a escrever
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                <span>100% gratuito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-primary" />
                <span>Sem cartão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span>Comunidade ativa</span>
              </div>
            </div>
          </div>

          {/* Capas empilhadas */}
          <div className={`relative h-[500px] hidden lg:block transition-all duration-1000 delay-300 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Capa 1 - fundo esquerda */}
              <div className="absolute top-12 left-0 w-44 h-60 rotate-[-12deg] shadow-2xl shadow-primary/20">
                <BookCoverVisual variant="purple" />
              </div>
              {/* Capa 2 - centro, principal */}
              <div className="absolute top-0 z-10 w-52 h-72 shadow-2xl shadow-primary/40">
                <BookCoverVisual variant="main" />
              </div>
              {/* Capa 3 - fundo direita */}
              <div className="absolute top-20 right-0 w-44 h-60 rotate-[10deg] shadow-2xl shadow-primary/20">
                <BookCoverVisual variant="blue" />
              </div>
              {/* Capa 4 - inferior */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-64 rotate-[-3deg] shadow-2xl shadow-primary/20">
                <BookCoverVisual variant="red" />
              </div>
            </div>

            {/* Anel orbital */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-primary/20 animate-[spin_30s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/10 animate-[spin_45s_linear_infinite_reverse]" />
          </div>
        </div>

        {/* Stats com glass morphism */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto">
          {[
            { label: "Novels publicadas", value: "1.2k+", icon: BookOpen },
            { label: "Autores ativos", value: "340+", icon: Users },
            { label: "Capítulos lidos", value: "15k+", icon: Sparkles },
            { label: "Avaliação média", value: "4.8★", icon: Star },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`text-center p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/50 hover:bg-card/60 transition-all ${mounted ? "animate-fade-in" : "opacity-0"}`}
              style={{ animationDelay: `${i * 100 + 500}ms` }}
            >
              <s.icon className="h-5 w-5 mx-auto text-primary mb-2" />
              <div className="text-2xl md:text-3xl font-heading font-bold text-primary">
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </section>
  );
}

// Visual de capa abstrata (placeholder)
function BookCoverVisual({ variant }: { variant: "main" | "purple" | "blue" | "red" }) {
  const colors = {
    main: { from: "#1a0b2e", to: "#7c2d6f", accent: "#ff9ee5" },
    purple: { from: "#0f0a1f", to: "#4c1d95", accent: "#a78bfa" },
    blue: { from: "#0a1929", to: "#1a5d8e", accent: "#22d3ee" },
    red: { from: "#0a0000", to: "#7c1818", accent: "#fbbf24" },
  }[variant];

  return (
    <div
      className="w-full h-full rounded-md overflow-hidden border border-white/10 relative"
      style={{
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${colors.accent}40, transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 30% 70%, ${colors.accent}20, transparent 50%)`,
        }}
      />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="h-0.5 w-8 rounded" style={{ background: colors.accent }} />
        <div className="text-white/60 text-[8px] tracking-widest mt-1">LIGHT NOVEL</div>
      </div>
      {/* Símbolo decorativo central */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 opacity-30"
        style={{ borderColor: colors.accent }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full opacity-40"
        style={{ background: colors.accent }}
      />
    </div>
  );
}
