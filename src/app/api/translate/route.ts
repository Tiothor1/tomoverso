import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createHash } from "crypto";

const SUPPORTED_PROVIDERS = ["openai", "google", "deepseek"];

function getConfig() {
  return {
    provider: (process.env.TRANSLATION_PROVIDER || "openai") as string,
    apiKey: process.env.TRANSLATION_API_KEY || "",
    model: process.env.TRANSLATION_MODEL || "gpt-4o-mini",
    cacheEnabled: process.env.TRANSLATION_CACHE_ENABLED !== "false",
  };
}

function ensureTranslationsTable(db: ReturnType<typeof getDb>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      source_locale TEXT NOT NULL DEFAULT 'pt-BR',
      target_locale TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      provider TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id, field_name, target_locale, source_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_translations_lookup
      ON translations(entity_type, entity_id, field_name, target_locale);
  `);
}

function hashText(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

async function translateOpenAI(text: string, targetLang: string, apiKey: string, model: string): Promise<string> {
  const systemPrompt = `You are a professional translator. Translate the following text to ${targetLang}. Rules:
- Keep the original meaning
- Do NOT censor or summarize
- Do NOT add content
- Do NOT translate proper names (character names, place names, brand names)
- Preserve markdown/HTML formatting
- Preserve line breaks
- Preserve important punctuation
- Translate naturally to ${targetLang}
- Return ONLY the translated text, no explanations`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: Math.min(text.length * 3, 16000),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenAI translation failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

export async function POST(req: Request) {
  try {
    const { text, targetLocale, entityType, entityId, fieldName, force } = await req.json();

    if (!text || !targetLocale) {
      return NextResponse.json({ ok: false, error: "Missing text or targetLocale" }, { status: 400 });
    }

    // pt-BR is source, no translation needed
    if (targetLocale === "pt-BR") {
      return NextResponse.json({ ok: true, translated: text });
    }

    const config = getConfig();
    const sourceHash = hashText(text);

    // Check cache
    if (config.cacheEnabled && !force && entityType && entityId && fieldName) {
      try {
        const db = getDb();
        ensureTranslationsTable(db);
        const cached = db.prepare(
          `SELECT translated_text FROM translations
           WHERE entity_type = ? AND entity_id = ? AND field_name = ? AND target_locale = ? AND source_hash = ?`
        ).get(entityType, entityId, fieldName, targetLocale, sourceHash) as { translated_text: string } | undefined;
        if (cached) {
          return NextResponse.json({ ok: true, translated: cached.translated_text, cached: true });
        }
      } catch {}
    }

    if (!config.apiKey) {
      return NextResponse.json({
        ok: false,
        error: "Tradução automática indisponível: configure TRANSLATION_API_KEY.",
        translated: null,
      }, { status: 503 });
    }

    // Translate
    const langName: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)",
    };
    const targetName = langName[targetLocale] || targetLocale;

    let translated: string;
    if (config.provider === "openai") {
      translated = await translateOpenAI(text, targetName, config.apiKey, config.model);
    } else {
      return NextResponse.json({ ok: false, error: `Provider ${config.provider} not implemented` }, { status: 501 });
    }

    // Save to cache
    if (config.cacheEnabled && entityType && entityId && fieldName) {
      try {
        const db = getDb();
        ensureTranslationsTable(db);
        db.prepare(`
          INSERT OR REPLACE INTO translations (id, entity_type, entity_id, field_name, source_locale, target_locale, source_hash, translated_text, provider, status)
          VALUES (?, ?, ?, ?, 'pt-BR', ?, ?, ?, ?, 'completed')
        `).run(
          `${entityType}_${entityId}_${fieldName}_${targetLocale}_${sourceHash}`,
          entityType, entityId, fieldName, targetLocale, sourceHash, translated, config.provider
        );
      } catch {}
    }

    return NextResponse.json({ ok: true, translated, cached: false });
  } catch (err: any) {
    console.error("[translate] error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Translation failed" }, { status: 500 });
  }
}
