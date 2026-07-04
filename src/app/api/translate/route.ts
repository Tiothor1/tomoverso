import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TargetLang = "pt" | "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "zh-CN";

const SUPPORTED = new Set<TargetLang>(["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"]);
const MAX_TEXTS = 500;
const MAX_CHARS_PER_TEXT = 900;
const USER_AGENT = "Tomoverso-Translate/1.0 (+https://tomoverso.vercel.app)";
const DELIM = "\n";

function protectBrand(text: string): string {
  return text
    .replace(/\bTomoverse\b/gi, "Tomo Verso Editora")
    .replace(/\bTomoversum\b/gi, "Tomo Verso Editora");
}

function normalizeTarget(value: unknown): TargetLang {
  return SUPPORTED.has(value as TargetLang) ? (value as TargetLang) : "pt";
}

function normalizeTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim().replace(/\s+/g, " ");
    if (!text || text.length > MAX_CHARS_PER_TEXT || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= MAX_TEXTS) break;
  }
  return out;
}

/** Traduz múltiplos textos em UMA chamada ao Google Translate.
 *  Usa um único parâmetro q= com os textos separados por \n.
 *  O Google retorna um array de resultados na mesma ordem. */
async function translateBatch(texts: string[], target: TargetLang): Promise<Record<string, string>> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "pt");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", texts.join(DELIM));

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json,text/plain,*/*" },
    cache: "no-store",
  });

  const translations: Record<string, string> = {};

  if (!response.ok) return translations;

  const json = await response.json();
  // Formato da resposta: [ [["en1","pt1",...],["en2","pt2",...],...], null, "pt", ... ]
  const results = json?.[0];
  if (!Array.isArray(results)) return translations;

  for (let i = 0; i < results.length && i < texts.length; i++) {
    const entry = results[i];
    if (!Array.isArray(entry)) continue;
    const raw = entry[0]; // translated text (may have trailing \n)
    if (typeof raw !== "string") continue;
    const cleaned = raw.replace(/\n+$/, "").trim();
    if (cleaned) {
      translations[texts[i]] = protectBrand(cleaned);
    }
  }

  return translations;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeTarget(body?.target);
    const texts = normalizeTexts(body?.texts);

    if (target === "pt" || texts.length === 0) {
      return NextResponse.json({ ok: true, target, translations: Object.fromEntries(texts.map((t) => [t, t])) });
    }

    const translations = await translateBatch(texts, target);

    // Garantir que todo texto tenha tradução (fallback = original)
    for (const text of texts) {
      if (!translations[text]) translations[text] = text;
    }

    return NextResponse.json({ ok: true, target, translations });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "translation_failed", translations: {} },
      { status: 500 }
    );
  }
}
