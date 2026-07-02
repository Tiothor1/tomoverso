import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TargetLang = "pt" | "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "zh-CN";

const SUPPORTED = new Set<TargetLang>(["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"]);
const MAX_TEXTS = 180;
const MAX_CHARS_PER_TEXT = 900;
const USER_AGENT = "Tomoverso-Translate/1.0 (+https://tomoverso.vercel.app)";

function protectBrand(text: string): string {
  return text
    .replace(/\bTomoverse\b/gi, "Tomoverso")
    .replace(/\bTomoversum\b/gi, "Tomoverso")
    .replace(/\bTomoverso\b/g, "Tomoverso");
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

async function translateOne(text: string, target: TargetLang): Promise<string> {
  if (target === "pt") return text;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "pt");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json,text/plain,*/*",
    },
    cache: "no-store",
  });

  if (!response.ok) return text;
  const json = await response.json();
  const translated = Array.isArray(json?.[0])
    ? json[0].map((chunk: unknown) => (Array.isArray(chunk) ? chunk[0] || "" : "")).join("")
    : "";

  return typeof translated === "string" && translated.trim() ? protectBrand(translated) : text;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeTarget(body?.target);
    const texts = normalizeTexts(body?.texts);

    if (target === "pt") {
      return NextResponse.json({ ok: true, target, translations: Object.fromEntries(texts.map((text) => [text, text])) });
    }

    const translated = await mapWithConcurrency(texts, 8, async (text) => {
      try {
        return await translateOne(text, target);
      } catch {
        return text;
      }
    });

    const translations: Record<string, string> = {};
    texts.forEach((text, index) => {
      translations[text] = translated[index] || text;
    });

    return NextResponse.json({ ok: true, target, translations });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "translation_failed", translations: {} },
      { status: 500 }
    );
  }
}
