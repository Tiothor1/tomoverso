/**
 * Substitui capas placeholder por capas REAIS de APIs públicas:
 * - AniList GraphQL (https://docs.anilist.co)
 * - MangaDex API (https://api.mangadex.org)
 *
 * Roda em loop, processa por ordem de popularidade (mais capítulos primeiro).
 *
 * Uso: npx tsx scripts/real-covers-anilist.ts [--max=N] [--start=N]
 */

import Database = require("better-sqlite3");
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// AniList GraphQL
async function searchAniList(title: string): Promise<string | null> {
  const query = `
    query ($search: String) {
      Page(perPage: 5) {
        media(search: $search, type: MANGA) {
          id
          title { romaji english }
          coverImage { extraLarge large medium }
          synonyms
        }
      }
    }
  `;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { search: title } }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const results = j?.data?.Page?.media;
    if (!results || results.length === 0) return null;
    return results[0].coverImage?.extraLarge || results[0].coverImage?.large || results[0].coverImage?.medium || null;
  } catch {
    return null;
  }
}

// MangaDex REST
async function searchMangaDex(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, limit: "5" });
    const r = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const m = j?.data?.[0];
    if (!m) return null;
    const coverRel = m.relationships?.find((rel: any) => rel.type === "cover_art");
    if (!coverRel?.id) return null;
    const cr = await fetch(`https://api.mangadex.org/cover/${coverRel.id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!cr.ok) return null;
    const cj = await cr.json();
    const fileName = cj?.data?.attributes?.fileName;
    if (!fileName) return null;
    return `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg`;
  } catch {
    return null;
  }
}

async function download(url: string, slug: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) return null;
    let ext = "jpg";
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    const filename = `${slug}.${ext}`;
    const localPath = join(outDir, filename);
    const publicPath = `/uploads/mangas/locais/${filename}`;
    writeFileSync(localPath, buf);
    return publicPath;
  } catch {
    return null;
  }
}

// Limpa query pra busca (remove termos genericos tipo "manga")
function cleanTitle(t: string): string {
  return t
    .replace(/\s*-\s*pt\s*br\s*$/i, "")
    .replace(/\s*manga\s*$/i, "")
    .replace(/\s*manhwa\s*$/i, "")
    .replace(/\s*manhua\s*$/i, "")
    .replace(/\s*\(pt-br\)\s*$/i, "")
    .trim();
}

// Titulos chineses/japoneses em PT-BR sao muitas vezes traducoes literais
// Ex: "Imperador Magico" -> "Magic Emperor"
// Mas isso exige dicionario. Primeiro tenta titulo original, depois limpo.
// AniList retorna resultados mesmo com titulo PT se for sinonimo.

async function main() {
  const args = process.argv.slice(2);
  const max = parseInt(args.find(a => a.startsWith("--max="))?.split("=")[1] || "9999", 10);
  const start = parseInt(args.find(a => a.startsWith("--start="))?.split("=")[1] || "0", 10);

  // Mangas com SVG (placeholder) ou sem capa
  const candidates = db.prepare(`
    SELECT m.id, m.slug, m.title,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE m.cover_local_path LIKE '%.svg' OR m.cover_local_path IS NULL
    ORDER BY chapter_count DESC
    LIMIT ? OFFSET ?
  `).all(max, start) as any[];

  console.log(`Mangas para buscar capa real: ${candidates.length}`);

  let found = 0, failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    const cleanedTitle = cleanTitle(m.title);
    console.log(`[${i+1}/${candidates.length}] ${m.title} (buscando "${cleanedTitle}")`);

    let coverUrl: string | null = null;

    // Tenta AniList primeiro (capas reais, sem marca)
    coverUrl = await searchAniList(cleanedTitle);
    if (!coverUrl) {
      coverUrl = await searchAniList(m.title); // tenta com titulo original
    }
    if (!coverUrl) {
      coverUrl = await searchMangaDex(cleanedTitle);
    }

    if (coverUrl) {
      const localPath = await download(coverUrl, m.slug);
      if (localPath) {
        db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(localPath, m.id);
        console.log(`  ✅ ${localPath.split('/').pop()}`);
        found++;
      } else {
        console.log(`  ❌ URL ok mas download falhou`);
        failed++;
      }
    } else {
      console.log(`  ⚠ Sem capa real encontrada`);
      failed++;
    }

    if ((i + 1) % 10 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const rate = ((i + 1) / ((Date.now() - t0) / 1000)).toFixed(2);
      const total = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.jpg' OR cover_local_path LIKE '%.png' OR cover_local_path LIKE '%.webp'").get() as any).c;
      const svg = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.svg'").get() as any).c;
      console.log(`\n[CHECK ${i+1}/${candidates.length} | ${elapsed}s | ${rate}/s] reais=${total} svg=${svg} OK=${found}\n`);
    }

    await sleep(500); // rate limit
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Capas reais: ${found} | Falhas: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });