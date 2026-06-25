import Database = require("better-sqlite3");
import sharp = require("sharp");
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import * as path from "path";

const db = new Database("data/tomoverso.db");
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const outDir = path.join(process.cwd(), "public", "uploads", "novels", "gpt-image");
const manifestDir = path.join(process.cwd(), "data", "ln-cover-manifests");
mkdirSync(outDir, { recursive: true });
mkdirSync(manifestDir, { recursive: true });

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const force = argv.includes("--force");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const onlySlugArg = argv.find((a) => a.startsWith("--slug="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const onlySlug = onlySlugArg ? onlySlugArg.split("=")[1] : null;

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  title_jp?: string | null;
  synopsis: string | null;
  genres: string | null;
  tags: string | null;
  type: string;
  source: string | null;
  cover_local_path: string | null;
  cover_url: string | null;
};

type Brief = {
  slug: string;
  title: string;
  titleEn?: string | null;
  titleJp?: string | null;
  summary: string;
  genres: string[];
  tags: string[];
  mood: string[];
  visualKeywords: string[];
  palette: string[];
  composition: string;
  setting: string;
  protagonist: string;
  artStyle: string;
  prompt: string;
};

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function cleanText(value: string | null | undefined) {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/⚠️.*?(?=[A-ZÀ-Ú]|$)/g, " ")
    .trim();
}

function shortSummary(text: string, max = 260) {
  const cleaned = cleanText(text);
  if (!cleaned) return "Sem sinopse detalhada; inferir pela obra, título e tom geral.";
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max).replace(/[,:;\s]+[^\s]*$/, "") + "...";
}

function inferGenres(title: string, synopsis: string, genres: string[], tags: string[]) {
  const text = `${title} ${synopsis} ${genres.join(" ")} ${tags.join(" ")}`.toLowerCase();
  const out = new Set<string>(genres);
  if (/romance|amor|noiva|wife|casamento|namor/.test(text)) out.add("Romance");
  if (/magic|mago|magia|wizard|archmage|cultiv|dao|fantasy|fantasia|dragon|dragão/.test(text)) out.add("Fantasia");
  if (/war|guerra|militar|battle|batalha|sword|espada|martial|murim|hunter|caçador|apocalypse/.test(text)) out.add("Ação");
  if (/school|escola|academy|academia/.test(text)) out.add("Escolar");
  if (/sci|futur|mecha|tech|federation|space|cyber/.test(text)) out.add("Sci-Fi");
  if (/dark|terror|horror|undead|demon|dem[oô]nio|abyss|shadow|necrom/.test(text)) out.add("Sombrio");
  if (/isekai|reencarn|another world|outro mundo|summon/.test(text)) out.add("Isekai");
  if (/game|vrmmo|system|level|rank|skill|player/.test(text)) out.add("Sistema");
  return Array.from(out).slice(0, 6);
}

function deriveMood(title: string, synopsis: string, genres: string[]) {
  const text = `${title} ${synopsis} ${genres.join(" ")}`.toLowerCase();
  const mood: string[] = [];
  if (/romance|amor|wife|noiva|delicat|heart/.test(text)) mood.push("emocional", "elegante", "delicado");
  if (/war|guerra|battle|hunter|apocalypse|action|martial/.test(text)) mood.push("intenso", "dinâmico", "impactante");
  if (/dark|abyss|shadow|demon|terror|horror/.test(text)) mood.push("sombrio", "misterioso", "ameaçador");
  if (/school|academy|slice/.test(text)) mood.push("juvenil", "limpo", "contemporâneo");
  if (/sci|federation|space|mecha|cyber|future/.test(text)) mood.push("futurista", "tecnológico", "neon");
  if (/magic|dragon|fantasy|cultiv|wizard/.test(text)) mood.push("épico", "mágico", "aventureiro");
  if (!mood.length) mood.push("premium", "cinematográfico", "atraente");
  return Array.from(new Set(mood)).slice(0, 5);
}

function derivePalette(title: string, synopsis: string, genres: string[]) {
  const text = `${title} ${synopsis} ${genres.join(" ")}`.toLowerCase();
  if (/romance|amor|wife|noiva/.test(text)) return ["rose gold", "pink", "lavender", "warm cream"];
  if (/dark|abyss|shadow|demon|terror/.test(text)) return ["black", "deep crimson", "violet", "cold silver"];
  if (/sci|federation|space|mecha|cyber|future/.test(text)) return ["navy", "cyan", "neon blue", "steel"];
  if (/magic|dragon|fantasy|archmage|wizard|cultiv/.test(text)) return ["midnight blue", "gold", "emerald", "glow accents"];
  if (/war|battle|martial|hunter|apocalypse/.test(text)) return ["gunmetal", "red", "orange sparks", "dusty gray"];
  return ["deep indigo", "gold accents", "soft rim light", "rich shadows"];
}

function deriveSetting(title: string, synopsis: string, genres: string[]) {
  const text = `${title} ${synopsis} ${genres.join(" ")}`.toLowerCase();
  if (/federation|space|mecha|future|sci|cyber/.test(text)) return "fundo futurista detalhado, arquitetura sci-fi ou campo de batalha tecnológico";
  if (/academy|school|escola/.test(text)) return "fundo temático coerente com escola, academia ou cidade jovem";
  if (/dragon|fantasy|magic|wizard|cultiv|dao/.test(text)) return "mundo de fantasia rico, com ruínas, magia, céu dramático ou cenário épico";
  if (/war|guerra|battle|apocalypse|hunter|martial/.test(text)) return "campo de batalha, ruínas, cidade em crise ou cenário tenso de ação";
  if (/romance|amor|wife|noiva/.test(text)) return "ambiente elegante e bonito, com foco emocional e atmosfera calorosa";
  return "fundo temático coerente com a história, com profundidade e leitura clara";
}

function deriveProtagonist(title: string, synopsis: string) {
  const text = `${title} ${synopsis}`.toLowerCase();
  if (/girl|garota|bibliotec|princesa|hero[ií]na|ela /.test(text)) return "protagonista feminina claramente destacada";
  if (/brothers|irmão|irmãos/.test(text)) return "dupla de protagonistas com contraste visual";
  if (/mecha|militar|hunter|sword|wizard|archmage|monarch|king/.test(text)) return "protagonista principal em pose marcante, com presença forte";
  return "personagem principal com silhueta clara e design memorável";
}

function deriveComposition(title: string, synopsis: string, genres: string[]) {
  const text = `${title} ${synopsis} ${genres.join(" ")}`.toLowerCase();
  if (/romance|amor|wife|noiva/.test(text)) return "composição elegante, foco nos personagens, espaço limpo para tipografia, enquadramento íntimo";
  if (/war|battle|action|hunter|martial|apocalypse/.test(text)) return "composição dinâmica, perspectiva forte, energia, movimento e profundidade";
  if (/sci|future|mecha|cyber|federation/.test(text)) return "composição premium com foco central, skyline futurista, linhas de luz e sensação tecnológica";
  return "composição forte de capa de light novel, com personagem principal, fundo temático e leitura clara em miniatura";
}

function buildPrompt(brief: Omit<Brief, "prompt">) {
  return [
    "Create a premium commercially-published light novel cover illustration.",
    "Vertical 2:3 composition, polished anime / semi-anime digital painting, premium art direction, clean rendering, strong focal point, beautiful lighting, rich depth, readable thumbnail silhouette.",
    "No logos, no watermark, no publisher marks, no border, no transparent background.",
    "Do NOT add any text in the image. Artwork only; title will be overlaid later.",
    `Story title: ${brief.title}.`,
    brief.titleJp ? `Original Japanese title reference: ${brief.titleJp}.` : "",
    `Story summary: ${brief.summary}`,
    `Genres: ${brief.genres.join(", ") || "Light Novel"}.`,
    `Mood: ${brief.mood.join(", ")}.`,
    `Visual keywords: ${brief.visualKeywords.join(", ")}.`,
    `Suggested palette: ${brief.palette.join(", ")}.`,
    `Protagonist direction: ${brief.protagonist}.`,
    `Setting direction: ${brief.setting}.`,
    `Composition direction: ${brief.composition}.`,
    `Art style: ${brief.artStyle}.`,
    "The result must feel specific to this novel, not generic key art."
  ].filter(Boolean).join(" ");
}

function buildBrief(row: NovelRow): Brief {
  const genres = inferGenres(row.title, row.synopsis || "", safeJsonArray(row.genres), safeJsonArray(row.tags));
  const mood = deriveMood(row.title, row.synopsis || "", genres);
  const palette = derivePalette(row.title, row.synopsis || "", genres);
  const setting = deriveSetting(row.title, row.synopsis || "", genres);
  const protagonist = deriveProtagonist(row.title, row.synopsis || "");
  const composition = deriveComposition(row.title, row.synopsis || "", genres);
  const visualKeywords = Array.from(new Set([...genres, ...mood, ...palette])).slice(0, 10);
  const base: Omit<Brief, "prompt"> = {
    slug: row.slug,
    title: row.title,
    titleEn: row.title_en || null,
    titleJp: row.title_jp || null,
    summary: shortSummary(row.synopsis),
    genres,
    tags: safeJsonArray(row.tags),
    mood,
    visualKeywords,
    palette,
    composition,
    setting,
    protagonist,
    artStyle: "high-end light novel cover illustration, refined digital painting, anime/semi-anime, premium commercial finish"
  };
  return { ...base, prompt: buildPrompt(base) };
}

function wrapTitle(title: string, max = 16) {
  const words = title.replace(/[:：]/g, ": ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if ((current + " " + word).length <= max) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

async function renderFinalCover(inputBuffer: Buffer, brief: Brief, slug: string) {
  const width = 1024;
  const height = 1536;
  const titleLines = wrapTitle(brief.title, 17);
  const subtitle = brief.genres.slice(0, 2).join(" · ") || "LIGHT NOVEL";
  const textSvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0" />
        <stop offset="35%" stop-color="#000" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.82" />
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.55"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#fade)"/>
    <rect x="38" y="38" width="${width - 76}" height="${height - 76}" rx="28" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
    <text x="72" y="1120" font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="800" fill="#ffffff" filter="url(#shadow)">
      ${titleLines.map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 102}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    <text x="76" y="1452" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="5" fill="rgba(255,255,255,.82)">${escapeXml(subtitle.toUpperCase())}</text>
  </svg>`;
  return sharp(inputBuffer)
    .resize(width, height, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(textSvg), top: 0, left: 0 }])
    .webp({ quality: 92 })
    .toBuffer();
}

async function openAiGenerate(prompt: string): Promise<Buffer> {
  if (!apiKey) throw new Error("OPENAI_API_KEY ausente");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1536"
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  const item = json.data?.[0];
  const b64 = item?.b64_json;
  if (b64) return Buffer.from(b64, "base64");
  const url = item?.url;
  if (url) {
    const imageRes = await fetch(url);
    if (!imageRes.ok) throw new Error(`Image fetch ${imageRes.status}`);
    return Buffer.from(await imageRes.arrayBuffer());
  }
  throw new Error("Resposta da OpenAI sem b64_json/url");
}

const rows = db.prepare(`
  SELECT id, slug, title, title_en, title_jp, synopsis, genres, tags, type, source, cover_local_path, cover_url
  FROM novels
  WHERE type='light-novel'
  ORDER BY title COLLATE NOCASE
`).all() as NovelRow[];

const selected = rows
  .filter((r) => !onlySlug || r.slug === onlySlug)
  .filter((r) => force || !(r.cover_local_path || "").match(/^\/uploads\/novels\/gpt-image\//))
  .slice(0, limit || rows.length);

const briefs = selected.map(buildBrief);
writeFileSync(path.join(manifestDir, dryRun ? "ln-cover-briefs.dry-run.json" : "ln-cover-briefs.json"), JSON.stringify(briefs, null, 2));

if (dryRun) {
  console.log(JSON.stringify({ totalLightNovels: rows.length, selected: selected.length, dryRun: true, model, hasOpenAiKey: !!apiKey, slugs: selected.map((r) => r.slug) }, null, 2));
  process.exit(0);
}

(async () => {
  const results: any[] = [];
  for (const row of selected) {
    const brief = buildBrief(row);
    const raw = await openAiGenerate(brief.prompt);
    const finalBuffer = await renderFinalCover(raw, brief, row.slug);
    const fileName = `${row.slug}-cover.webp`;
    const publicPath = `/uploads/novels/gpt-image/${fileName}`;
    writeFileSync(path.join(outDir, fileName), finalBuffer);
    db.prepare(`UPDATE novels SET cover_local_path = ?, cover_url = ?, cover_source_url = ?, updated_at = datetime('now') WHERE id = ?`).run(publicPath, publicPath, `openai:${model}`, row.id);
    writeFileSync(path.join(manifestDir, `${row.slug}.json`), JSON.stringify(brief, null, 2));
    results.push({ slug: row.slug, fileName, promptChars: brief.prompt.length });
    console.log(`generated ${row.slug}`);
  }
  console.log(JSON.stringify({ totalLightNovels: rows.length, generated: results.length, model, outDir, manifestDir }, null, 2));
})();
