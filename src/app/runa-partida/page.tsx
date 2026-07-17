import type { Metadata } from "next";
import { RunaPartidaReader } from "@/components/runa-partida/runa-partida-reader";

export const metadata: Metadata = {
  title: "Runa Partida — Prólogo | Tomo Verso",
  description: "Uma história original de isekai em Runeterra. Cinco páginas iniciais ilustradas.",
};

export default function RunaPartidaPage() {
  return <RunaPartidaReader />;
}
