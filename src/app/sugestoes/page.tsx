import type { Metadata } from "next";
import { SuggestionsList } from "@/components/suggestions/suggestions-list";
import { SuggestionForm } from "@/components/suggestions/suggestion-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sugestões | Tomo Verso Editora",
  description: "Sugira animes, novels, mangás e manhwas para o Tomoverso.",
};

export default function SuggestionsPage() {
  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
            💡 Sugestões
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            Peça uma obra para o Tomoverso
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Solicite um anime, novel, mangá ou manhwa que você quer ver aqui no site.
            Em até <strong className="text-amber-200">7 dias</strong> sua solicitação será
            aceita ou recusada pelos admins. Se for aceita, aparece na lista abaixo!
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-6">
          <h2 className="mb-5 text-center text-sm font-black uppercase tracking-[0.18em] text-amber-200/80">
            📝 Nova solicitação
          </h2>
          <SuggestionForm />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-black text-white">📋 Sugestões enviadas</h2>
          <SuggestionsList />
        </div>
      </div>
    </main>
  );
}
