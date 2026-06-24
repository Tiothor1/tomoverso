import Database = require("better-sqlite3");
import { existsSync, mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { readableTitle } from "../src/lib/display-title";

const db = new Database("data/tomoverso.db");
const outDir = path.join(process.cwd(), "public", "uploads", "novels", "generated");
const force = process.argv.includes("--force");
mkdirSync(outDir, { recursive: true });

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  alternative_titles: string;
  type: string;
  genres: string;
  tags: string;
  cover_url: string | null;
  cover_local_path: string | null;
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function publicPathExists(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith("/")) return false;
  const abs = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  return existsSync(abs);
}

function needsCover(row: NovelRow) {
  const local = row.cover_local_path;
  const url = row.cover_url;
  if (local && publicPathExists(local)) return false;
  if (url && url.startsWith("/")) return !publicPathExists(url);
  return !(url && /^https?:\/\//i.test(url));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (const ch of value) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function wrapTitle(title: string, max = 18) {
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

const palettes = [
  { bg1: "#271314", bg2: "#7c2d12", accent: "#f59e0b", soft: "#fed7aa" },
  { bg1: "#111827", bg2: "#312e81", accent: "#818cf8", soft: "#ddd6fe" },
  { bg1: "#0f172a", bg2: "#065f46", accent: "#34d399", soft: "#bbf7d0" },
  { bg1: "#2e1065", bg2: "#831843", accent: "#f472b6", soft: "#fbcfe8" },
  { bg1: "#1c1917", bg2: "#854d0e", accent: "#fde047", soft: "#fef3c7" },
  { bg1: "#0c4a6e", bg2: "#164e63", accent: "#22d3ee", soft: "#cffafe" },
  { bg1: "#450a0a", bg2: "#7f1d1d", accent: "#fb7185", soft: "#fecdd3" },
  { bg1: "#172554", bg2: "#581c87", accent: "#c084fc", soft: "#e9d5ff" },
];

function motifFor(genres: string[], tags: string[], title: string, synopsis: string) {
  const text = `${genres.join(" ")} ${tags.join(" ")} ${title} ${synopsis}`.toLowerCase();
  if (/romance|love|amor|casamento|noiva|namorada/.test(text)) return "heart";
  if (/sistema|level|rank|game|jogo|status|skill/.test(text)) return "system";
  if (/dragon|dragão|fantasia|magic|magia|mago|cultivo|dao/.test(text)) return "magic";
  if (/ação|action|war|guerra|battle|batalha|sword|espada|martial|murim/.test(text)) return "blade";
  if (/dark|terror|horror|dem[oô]nio|undead|necrom|sombra|spooky/.test(text)) return "moon";
  if (/school|escola|academy|academia|slice/.test(text)) return "academy";
  return "book";
}

function motifSvg(kind: string, accent: string, soft: string) {
  const common = `fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"`;
  switch (kind) {
    case "heart":
      return `<path ${common} d="M260 250 C205 195 120 230 132 312 C145 395 260 460 260 460 C260 460 375 395 388 312 C400 230 315 195 260 250Z"/><circle cx="260" cy="320" r="96" fill="${soft}" opacity="0.08"/>`;
    case "system":
      return `<rect x="118" y="196" width="284" height="210" rx="24" ${common}/><path ${common} d="M160 252h120M160 304h200M160 356h150"/><circle cx="350" cy="252" r="18" fill="${accent}" opacity="0.8"/><path ${common} d="M208 148h104M260 148v48"/>`;
    case "magic":
      return `<path ${common} d="M260 140 L294 248 L408 248 L316 314 L350 424 L260 356 L170 424 L204 314 L112 248 L226 248 Z"/><circle cx="260" cy="286" r="138" fill="${soft}" opacity="0.07"/>`;
    case "blade":
      return `<path ${common} d="M330 130 L190 350"/><path ${common} d="M350 152 L372 174 L232 394 L190 350 Z"/><path ${common} d="M164 374 L220 318"/><path ${common} d="M142 398 L190 350 L238 398"/>`;
    case "moon":
      return `<path fill="${accent}" opacity="0.86" d="M316 150c-70 22-120 86-120 162 0 66 38 123 94 151-12 3-25 5-38 5-93 0-168-75-168-168s75-168 168-168c22 0 43 4 64 18Z"/><circle cx="326" cy="268" r="92" fill="${soft}" opacity="0.06"/>`;
    case "academy":
      return `<path ${common} d="M104 246 L260 166 L416 246 L260 326 Z"/><path ${common} d="M156 278v86c44 36 164 36 208 0v-86"/><path ${common} d="M416 246v106"/><circle cx="416" cy="374" r="16" fill="${accent}" opacity="0.8"/>`;
    default:
      return `<path ${common} d="M142 178h94c36 0 64 28 64 64v234c0-34-28-62-62-62h-96z"/><path ${common} d="M300 242c0-36 28-64 64-64h14v236h-80"/><path ${common} d="M176 242h76M176 292h82M176 342h62"/>`;
  }
}

function makeSvg(row: NovelRow) {
  const genres = safeJsonArray(row.genres);
  const tags = safeJsonArray(row.tags);
  const displayTitle = readableTitle({
    title: row.title,
    alternative_titles: row.alternative_titles,
    type: row.type,
    slug: row.slug,
  });
  const hash = hashString(row.title + row.slug);
  const palette = palettes[hash % palettes.length];
  const motif = motifFor(genres, tags, displayTitle, row.synopsis);
  const titleLines = wrapTitle(displayTitle);
  const genre = genres[0] || (row.type === "web-novel" ? "WebNovel" : "Light Novel");
  const kicker = row.type === "web-novel" ? "WEBNOVEL" : "LIGHT NOVEL";
  const patternShift = hash % 120;

  const titleText = titleLines
    .map((line, index) => `<text x="48" y="${630 + index * 46}" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="800" fill="#fff" letter-spacing="-1">${escapeXml(line)}</text>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${escapeXml(displayTitle)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="58%" stop-color="${palette.bg2}"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.36"/>
      <stop offset="65%" stop-color="${palette.accent}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#glow)"/>
  <circle cx="${120 + patternShift}" cy="120" r="190" fill="${palette.accent}" opacity="0.10" filter="url(#blur)"/>
  <circle cx="520" cy="${300 + (hash % 180)}" r="150" fill="${palette.soft}" opacity="0.08" filter="url(#blur)"/>
  <path d="M0 760 C120 700 190 830 300 780 C424 724 486 780 600 724 V900 H0Z" fill="#000" opacity="0.28"/>
  <g opacity="0.20" stroke="#fff" stroke-width="1">
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${-80 + i * 92} 0 L${-240 + i * 92} 900"/>`).join("\n    ")}
  </g>
  <g transform="translate(40 96)">
    <rect x="0" y="0" width="520" height="520" rx="36" fill="#000" opacity="0.18"/>
    <g transform="translate(0 18)">${motifSvg(motif, palette.accent, palette.soft)}</g>
  </g>
  <rect x="34" y="34" width="532" height="832" rx="34" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="2"/>
  <text x="48" y="580" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="${palette.soft}" letter-spacing="4">TOMOVERSO · ${escapeXml(kicker)}</text>
  ${titleText}
  <text x="48" y="840" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${palette.accent}">${escapeXml(genre)}</text>
</svg>`;
}

const rows = db.prepare(`
  SELECT id, slug, title, synopsis, alternative_titles, type, genres, tags, cover_url, cover_local_path
  FROM novels
  WHERE type IN ('light-novel', 'web-novel')
  ORDER BY title COLLATE NOCASE
`).all() as NovelRow[];

let generated = 0;
let skipped = 0;
for (const row of rows) {
  const existingPath = row.cover_local_path || row.cover_url || "";
  const shouldForce = force && existingPath.startsWith("/uploads/novels/generated/");
  if (!shouldForce && !needsCover(row)) {
    skipped++;
    continue;
  }
  const fileName = `${row.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}.svg`;
  const publicPath = `/uploads/novels/generated/${fileName}`;
  const abs = path.join(outDir, fileName);
  writeFileSync(abs, makeSvg(row), "utf8");
  db.prepare(`UPDATE novels SET cover_url = ?, cover_local_path = ?, updated_at = datetime('now') WHERE id = ?`).run(publicPath, publicPath, row.id);
  generated++;
}

const missingAfter = db.prepare(`
  SELECT COUNT(*) AS c
  FROM novels
  WHERE type IN ('light-novel', 'web-novel')
    AND (cover_url IS NULL OR trim(cover_url) = '')
`).get() as { c: number };

console.log(JSON.stringify({ total: rows.length, generated, skipped, missingAfter: missingAfter.c, outDir }));
