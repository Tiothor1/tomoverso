/**
 * Busca capas OFICIAIS em AniList + MangaDex para cada mangá.
 * Estas são fontes curadas — capa SEMPRE corresponde à obra correta.
 * 
 * Para cada mangá, tenta:
 *   1. AniList GraphQL (título original + variações)
 *   2. MangaDex REST (título original + variações)
 * 
 * Se nenhuma fonte oficial encontrar, reverte para SVG (placeholder)
 * em vez de manter imagem aleatória do Google.
 */

import Database = require("better-sqlite3");
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── AniList GraphQL ────────────────────────────────────────
async function searchAniList(title: string): Promise<{ url: string; officialTitle: string } | null> {
  const query = `
    query ($search: String) {
      Page(perPage: 5) {
        media(search: $search, type: MANGA) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          format
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
    
    // Pega o primeiro resultado que parece ser um mangá/novel real (não um doujin)
    for (const m of results) {
      if (m.format === "DOUJIN") continue;
      const url = m.coverImage?.extraLarge || m.coverImage?.large;
      if (url) {
        const officialTitle = m.title?.romaji || m.title?.english || m.title?.native || title;
        return { url, officialTitle };
      }
    }
    return null;
  } catch { return null; }
}

// ─── MangaDex REST ──────────────────────────────────────────
async function searchMangaDex(title: string): Promise<{ url: string; officialTitle: string } | null> {
  try {
    const params = new URLSearchParams({ title, limit: "5", "availableTranslatedLanguage[]": "pt-br" });
    const r = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.data || j.data.length === 0) return null;
    
    for (const m of j.data) {
      const titleObj = m.attributes?.title || {};
      const officialTitle = titleObj.en || titleObj["ja-ro"] || titleObj.ja || title;
      const coverRel = m.relationships?.find((r: any) => r.type === "cover_art");
      if (!coverRel?.id) continue;
      
      const cr = await fetch(`https://api.mangadex.org/cover/${coverRel.id}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!cr.ok) continue;
      const cj = await cr.json();
      const fileName = cj?.data?.attributes?.fileName;
      if (!fileName) continue;
      return {
        url: `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg`,
        officialTitle,
      };
    }
    return null;
  } catch { return null; }
}

// ─── Download helpers ────────────────────────────────────────
async function downloadOfficial(url: string, slug: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5000) return null;
    let ext = "jpg";
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    const filename = `${slug}.${ext}`;
    writeFileSync(join(outDir, filename), buf);
    return `/uploads/mangas/locais/${filename}`;
  } catch { return null; }
}

function deleteLocalFile(slug: string) {
  for (const ext of [".jpg", ".png", ".webp", ".svg"]) {
    const p = join(outDir, `${slug}${ext}`);
    if (existsSync(p)) unlinkSync(p);
  }
}

// ─── Generate SVG placeholder ────────────────────────────────
function generateSvg(title: string, slug: string): string {
  const palettes = [
    ["#fb923c","#dc2626","#7c2d12"], ["#60a5fa","#1e3a8a","#0c1e4a"],
    ["#a78bfa","#5b21b6","#2e1065"], ["#f472b6","#9d174d","#500724"],
    ["#34d399","#065f46","#022c22"], ["#fde047","#ca8a04","#713f12"],
  ];
  const h = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2, c3] = palettes[Math.abs(h) % palettes.length];
  const display = title.length > 50 ? title.slice(0, 47) + "..." : title;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="50%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/>
  </linearGradient></defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <circle cx="300" cy="350" r="120" fill="white" opacity="0.08"/>
  <circle cx="300" cy="350" r="80" fill="white" opacity="0.06"/>
  <text x="300" y="550" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-weight="900" font-size="28" style="text-shadow:0 2px 8px rgba(0,0,0,0.5)">${escapeXml(display)}</text>
</svg>`;
}
function escapeXml(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function cleanTitle(t: string): string {
  return t
    .replace(/\s*[\-–—]\s*pt\s*br\s*$/i, "")
    .replace(/\s*[\-–—]\s*manga\s*$/i, "")
    .replace(/\s*\(\s*pt-br\s*\)\s*$/i, "")
    .replace(/\s*manga\s*$/i, "")
    .replace(/\s*manhwa\s*$/i, "")
    .replace(/\s*manhua\s*$/i, "")
    .replace(/\s*novel\s*$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function main() {
  // Pega TODOS os mangás que OU estão com capa real ORIGINAL (não oficial)
  // ou que estão com SVG e ainda não têm capa oficial
  const args = process.argv.slice(2);
  const max = parseInt(args.find(a => a.startsWith("--max="))?.split("=")[1] || "9999", 10);
  const start = parseInt(args.find(a => a.startsWith("--start="))?.split("=")[1] || "0", 10);
  const force = args.includes("--force"); // re-busca mesmo quem já tem capa JPG/PNG
  
  let where = "m.cover_local_path IS NULL OR m.cover_local_path LIKE '%.svg'";
  if (force) where = "1=1"; // re-busca TUDO

  const candidates = db.prepare(`
    SELECT m.id, m.slug, m.title,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE ${where}
    ORDER BY chapter_count DESC
    LIMIT ? OFFSET ?
  `).all(max, start) as any[];

  console.log(`Mangas para buscar capa oficial: ${candidates.length}`);
  if (candidates.length === 0) { console.log("Nada a fazer."); return; }

  let official = 0, fallback = 0;
  const t0 = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    const cleaned = cleanTitle(m.title);
    console.log(`[${i+1}/${candidates.length}] ${m.title}`);

    // Tenta AniList com título limpo
    let result = await searchAniList(cleaned);
    // Tenta AniList com título original
    if (!result) result = await searchAniList(m.title);
    
    // Tenta MangaDex
    if (!result) result = await searchMangaDex(cleaned);
    if (!result) result = await searchMangaDex(m.title);

    if (result) {
      const localPath = await downloadOfficial(result.url, m.slug);
      if (localPath) {
        db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(localPath, m.id);
        console.log(`  ✅ OFICIAL: ${localPath.split('/').pop()} (${result.officialTitle.slice(0,50)})`);
        official++;
      } else {
        // Download falhou — gera SVG
        const svgContent = generateSvg(m.title, m.slug);
        writeFileSync(join(outDir, `${m.slug}.svg`), svgContent, "utf8");
        db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(`/uploads/mangas/locais/${m.slug}.svg`, m.id);
        console.log(`  ⚠ SVG (download oficial falhou): ${m.slug}.svg`);
        fallback++;
      }
    } else {
      // Nenhuma fonte oficial encontrou — SVG
      const svgContent = generateSvg(m.title, m.slug);
      writeFileSync(join(outDir, `${m.slug}.svg`), svgContent, "utf8");
      db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(`/uploads/mangas/locais/${m.slug}.svg`, m.id);
      console.log(`  ⚠ SVG (sem resultado oficial): ${m.slug}.svg`);
      fallback++;
    }

    if ((i + 1) % 10 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`\n[CHECK ${i+1} | ${elapsed}s] Oficiais=${official} | SVG gerados=${fallback}\n`);
    }
    await sleep(600);
  }

  const reais = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.jpg' OR cover_local_path LIKE '%.png' OR cover_local_path LIKE '%.webp'").get();
  const svgs = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.svg'").get();
  const sem = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path IS NULL OR cover_local_path=''").get();
  console.log(`\n${"=".repeat(55)}`);
  console.log("FONTES OFICIAIS — RESULTADO FINAL");
  console.log("=".repeat(55));
  console.log(`  Capas oficiais: ${official}`);
  console.log(`  SVG gerados:    ${fallback}`);
  console.log(`  Tempo:          ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`\n  Total JPG/PNG:  ${(reais as any).c}`);
  console.log(`  Total SVG:      ${(svgs as any).c}`);
  console.log(`  Sem capa:       ${(sem as any).c}`);
  console.log("=".repeat(55));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });