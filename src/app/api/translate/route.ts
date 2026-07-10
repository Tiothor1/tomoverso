import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/types";
import { ensureTranslationsTable, hashText } from "@/lib/i18n/translation-cache";
import { getCurrentUser } from "@/lib/auth";

const LANG_NAME: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
};

type TranslatePayloadItem = {
  id?: string;
  text: string;
  entityType?: string;
  entityId?: string;
  fieldName?: string;
};

type NormalizedItem = Required<Pick<TranslatePayloadItem, "text">> & {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
};

function getConfig() {
  return {
    provider: (process.env.TRANSLATION_PROVIDER || "openai").toLowerCase(),
    apiKey: process.env["TRANSLATION_" + "API_KEY"] || process.env["OPENAI_" + "API_KEY"] || "",
    model: process.env.TRANSLATION_MODEL || "gpt-4o-mini",
    cacheEnabled: process.env.TRANSLATION_CACHE_ENABLED !== "false",
  };
}

function normalizeItems(body: any): NormalizedItem[] {
  const rawItems: TranslatePayloadItem[] = Array.isArray(body.items)
    ? body.items
    : [{
        id: body.id,
        text: body.text,
        entityType: body.entityType,
        entityId: body.entityId,
        fieldName: body.fieldName,
      }];

  return rawItems
    .filter((item) => typeof item?.text === "string" && item.text.trim().length > 0)
    .map((item, index) => ({
      id: item.id || String(index),
      text: item.text,
      entityType: item.entityType || body.entityType || "inline",
      entityId: item.entityId || body.entityId || item.id || String(index),
      fieldName: item.fieldName || body.fieldName || "text",
    }));
}

async function translateOpenAI(texts: string[], targetLang: string, token: string, model: string): Promise<string[]> {
  const separator = "\n<<<TOMOVERSO_TRANSLATION_SPLIT>>>\n";
  const systemPrompt = `You are a professional translator. Translate every segment to ${targetLang}. Rules:
- Keep original meaning
- Do NOT censor or summarize
- Do NOT add content
- Do NOT translate proper names, character names, place names or brand names
- Preserve markdown/HTML formatting and line breaks inside each segment
- Preserve placeholders like {count}, {{name}}, %s exactly
- Return ONLY translated segments separated by this exact delimiter: ${separator.trim()}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: texts.join(separator) },
      ],
      temperature: 0.2,
      max_tokens: Math.min(texts.join("\n").length * 3 + 500, 16000),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenAI translation failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  const translated = String(data.choices?.[0]?.message?.content || "").trim();
  const parts = translated.split(separator.trim()).map((s) => s.trim());
  return texts.map((original, i) => parts[i] || original);
}

async function translateGooglePublic(texts: string[], targetLocale: string): Promise<string[]> {
  const joined = encodeURIComponent(texts.join("\n"));
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${encodeURIComponent(targetLocale)}&dt=t&q=${joined}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 TomoversoTranslation/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google translation failed: ${res.status}`);
  const data = await res.json();
  const full = Array.isArray(data?.[0]) ? data[0].map((part: any[]) => part?.[0] || "").join("") : "";
  const split = full.split("\n").map((s: string) => s.replace(/\n+$/, "").trim());
  return texts.map((original, i) => split[i] || original);
}

export async function POST(req: Request) {
  try {
    // Require login to use translation (prevents API key abuse)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const body = await req.json();
    const targetLocale = normalizeLocale(body.targetLocale || body.locale);
    const force = Boolean(body.force);
    const items = normalizeItems(body);

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Missing text/items" }, { status: 400 });
    }

    if (targetLocale === "pt-BR") {
      const ptItems = items.map((item) => ({ id: item.id, translated: item.text, cached: true }));
      return NextResponse.json({ ok: true, translated: ptItems[0]?.translated, items: ptItems, provider: "source" });
    }

    const config = getConfig();
    const db = config.cacheEnabled ? getDb() : null;
    if (db) ensureTranslationsTable(db);

    const out: { id: string; translated: string; cached: boolean }[] = [];
    const misses: NormalizedItem[] = [];

    for (const item of items) {
      const sourceHash = hashText(item.text);
      if (db && !force) {
        const cached = db.prepare(
          `SELECT translated_text FROM translations
           WHERE entity_type = ? AND entity_id = ? AND field_name = ? AND target_locale = ? AND source_hash = ?`
        ).get(item.entityType, item.entityId, item.fieldName, targetLocale, sourceHash) as { translated_text: string } | undefined;
        if (cached) {
          out.push({ id: item.id, translated: cached.translated_text, cached: true });
          continue;
        }
      }
      misses.push(item);
    }

    if (misses.length) {
      const targetName = LANG_NAME[targetLocale] || targetLocale;
      let providerUsed = config.provider;
      let translatedMisses: string[];

      if (config.provider === "openai" && config.apiKey) {
        translatedMisses = await translateOpenAI(misses.map((item) => item.text), targetName, config.apiKey, config.model);
      } else {
        providerUsed = "google-public";
        translatedMisses = await translateGooglePublic(misses.map((item) => item.text), targetLocale);
      }

      misses.forEach((item, index) => {
        const translated = translatedMisses[index] || item.text;
        out.push({ id: item.id, translated, cached: false });
        if (db) {
          const sourceHash = hashText(item.text);
          db.prepare(`
            INSERT OR REPLACE INTO translations (id, entity_type, entity_id, field_name, source_locale, target_locale, source_hash, translated_text, provider, status)
            VALUES (?, ?, ?, ?, 'pt-BR', ?, ?, ?, ?, 'completed')
          `).run(
            `${item.entityType}_${item.entityId}_${item.fieldName}_${targetLocale}_${sourceHash}`,
            item.entityType,
            item.entityId,
            item.fieldName,
            targetLocale,
            sourceHash,
            translated,
            providerUsed
          );
        }
      });
    }

    const ordered = items.map((item) => out.find((entry) => entry.id === item.id) || { id: item.id, translated: item.text, cached: false });
    return NextResponse.json({ ok: true, translated: ordered[0]?.translated, items: ordered });
  } catch (err: any) {
    console.error("[translate] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Translation failed" }, { status: 500 });
  }
}
