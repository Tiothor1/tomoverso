/**
 * Registry de adapters — mapeia nome de fonte (ex: "vndb") → instância do adapter.
 *
 * Cada adapter implementa a interface ExternalSource e é registrado aqui.
 * Adicionar uma nova fonte = 1 linha de import + 1 entrada no map.
 */

import type { ExternalSource } from "../types";
import { VndbAdapter } from "./vndb";
import { JikanAdapter } from "./jikan";
import { MangaDexAdapter } from "./mangadex";
import { AniListAdapter } from "./anilist";

const adapters: Record<string, () => ExternalSource> = {
  vndb: () => new VndbAdapter(),
  jikan: () => new JikanAdapter(),
  mangadex: () => new MangaDexAdapter(),
  anilist: () => new AniListAdapter(),
  // royalroad: () => new RoyalRoadAdapter(), // API descontinuada em 2024
};

export function getAdapter(name: string): ExternalSource | null {
  const factory = adapters[name];
  return factory ? factory() : null;
}

export function listAdapterNames(): string[] {
  return Object.keys(adapters);
}

export function isAdapterRegistered(name: string): boolean {
  return name in adapters;
}
