import { containsForbiddenNarrativeMarker, splitNarrativeParagraphs } from "./narrative-cleaner";
import { MAX_PARAGRAPH_CHARS } from "./standards";

export type NarrativeQualityScore = {
  formatacao: number;
  coerencia: number;
  continuidade: number;
  desenvolvimento: number;
  leitura: number;
  gancho: number;
  media: number;
  issues: string[];
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function scoreNarrativeQuality(
  text: string,
  opts: { minChars?: number; minWords?: number } = {}
): NarrativeQualityScore {
  const issues: string[] = [];
  const paragraphs = splitNarrativeParagraphs(text);
  const charCount = text.replace(/\s/g, "").length;
  const wordCount = words(text);
  const hasDialogue = /(^|\n)\s*—\s*\S+/m.test(text);
  const hasSceneBreak = paragraphs.includes("***");
  const longParagraphs = paragraphs.filter((p) => p.length > MAX_PARAGRAPH_CHARS);
  const hasForbidden = containsForbiddenNarrativeMarker(text);

  if (hasForbidden) issues.push("marcador_artificial");
  if (paragraphs.length < 6) issues.push("poucos_paragrafos");
  if (longParagraphs.length > 0) issues.push("paragrafo_gigante");
  if (opts.minChars && charCount < opts.minChars) issues.push("curto_demais");
  if (opts.minWords && wordCount < opts.minWords) issues.push("poucas_palavras");
  if (!hasDialogue) issues.push("sem_dialogo");

  const formatacao = clampScore(10 - (hasForbidden ? 5 : 0) - longParagraphs.length * 1.5 - (paragraphs.length < 6 ? 2 : 0));
  const coerencia = clampScore(hasForbidden ? 6 : 8.4);
  const continuidade = clampScore(hasSceneBreak || paragraphs.length >= 10 ? 8.2 : 7.5);
  const desenvolvimento = clampScore((opts.minChars && charCount < opts.minChars) || (opts.minWords && wordCount < opts.minWords) ? 6.5 : 8.2);
  const leitura = clampScore(formatacao - (hasDialogue ? 0 : 0.8));
  const gancho = clampScore(/[?!…]$/.test(text.trim()) || paragraphs.length >= 10 ? 8.1 : 7.2);
  const media = clampScore((formatacao + coerencia + continuidade + desenvolvimento + leitura + gancho) / 6);

  return { formatacao, coerencia, continuidade, desenvolvimento, leitura, gancho, media, issues };
}
