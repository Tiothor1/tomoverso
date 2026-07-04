import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TargetLang = "pt" | "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "zh-CN";

const SUPPORTED = new Set<TargetLang>(["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"]);
const MAX_TEXTS = 500;
const MAX_CHARS_PER_TEXT = 900;
const USER_AGENT = "Tomoverso-Translate/1.0 (+https://tomoverso.vercel.app)";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeTarget(body?.target);
    const texts = normalizeTexts(body?.texts);

    if (target === "pt" || texts.length === 0) {
      return NextResponse.json({ ok: true, target, translations: Object.fromEntries(texts.map((t) => [t, t])) });
    }

    // BATCH OTIMIZADO: envia TODOS os textos em UMA chamada ao Google Translate
    // usando múltiplos parâmetros q= na URL
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "pt");
    url.searchParams.set("tl", target);
    url.searchParams.set("dt", "t");
    texts.forEach((text) => url.searchParams.append("q", text));

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json,text/plain,*/*" },
      cache: "no-store",
    });

    const translations: Record<string, string> = {};

    if (response.ok) {
      const json = await response.json();
      // Resposta do Google com múltiplos q=:
      // [ [["en1", "pt1"]], [["en2", "pt2"]], ... ]
      if (Array.isArray(json)) {
        json.forEach((result: unknown, index: number) => {
          if (Array.isArray(result) && result[0] && Array.isArray(result[0])) {
            const translated = result[0][0];
            if (typeof translated === "string" && translated.trim()) {
              translations[texts[index]] = protectBrand(translated);
            }
          }
        });
      }
    }

    // Preencher textos que não foram traduzidos com o original
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
