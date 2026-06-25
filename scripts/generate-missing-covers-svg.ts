/**
 * Gera capa SVG para QUALQUER mangá sem capa local.
 * Cobre os 206 que faltam (lermangas.me caiu).
 *
 * Roda uma vez, gera todos.
 */

import Database = require("better-sqlite3");
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { readableTitle } from "../src/lib/display-title";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const palettes = [
  ["#fb923c", "#dc2626", "#7c2d12"], // fogo
  ["#60a5fa", "#1e3a8a", "#0c1e4a"], // agua
  ["#a78bfa", "#5b21b6", "#2e1065"], // magico
  ["#f472b6", "#9d174d", "#500724"], // rosa
  ["#34d399", "#065f46", "#022c22"], // verde
  ["#fde047", "#ca8a04", "#713f12"], // dourado
  ["#fb7185", "#9f1239", "#4c0519"], // carmesim
  ["#22d3ee", "#0e7490", "#083344"], // cyan
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickMotif(title: string, synopsis: string): string {
  const text = (title + " " + synopsis).toLowerCase();
  if (/murim|espada|cultivo|martial|espadachim|cacique|destruição|combat|luta/.test(text)) return "sword";
  if (/magia|mago|dragão|magic|druid|summon|reino/.test(text)) return "magic";
  if (/amor|romance|casamento|namorada|esposa|bebe/.test(text)) return "heart";
  if (/sistema|skill|level|status|janela/.test(text)) return "system";
  if (/reencarn|isekai|reborn/.test(text)) return "portal";
  if (/demônio|demon|dark|escuro|death|morte|reaper/.test(text)) return "demon";
  if (/escola|school|academy|estudante/.test(text)) return "school";
  return "star";
}

function makeSvg(title: string, synopsis: string): string {
  const h = hashStr(title);
  const palette = palettes[h % palettes.length];
  const [c1, c2, c3] = palette;
  const motif = pickMotif(title, synopsis);
  const display = readableTitle({ title, alternative_titles: [], type: "light-novel" }).slice(0, 50);
  
  const motifs: Record<string, string> = {
    sword: `<path d="M150 700 L150 200 L130 220 L130 720 Z M150 700 L150 200 L170 220 L170 720 Z M140 720 L160 720 L150 740 Z M120 200 L180 200 L180 180 L120 180 Z" fill="white" opacity="0.8"/><circle cx="150" cy="180" r="8" fill="white" opacity="0.9"/>`,
    magic: `<circle cx="300" cy="450" r="80" fill="white" opacity="0.15"/><circle cx="300" cy="450" r="60" fill="white" opacity="0.2"/><circle cx="300" cy="450" r="40" fill="white" opacity="0.3"/><path d="M300 350 L310 440 L400 450 L310 460 L300 550 L290 460 L200 450 L290 440 Z" fill="white" opacity="0.7"/>`,
    heart: `<path d="M300 550 C200 450 150 380 150 320 C150 270 200 240 250 260 C275 270 300 290 300 320 C300 290 325 270 350 260 C400 240 450 270 450 320 C450 380 400 450 300 550 Z" fill="white" opacity="0.7"/>`,
    system: `<rect x="180" y="320" width="240" height="260" rx="4" fill="white" opacity="0.12"/><line x1="200" y1="360" x2="400" y2="360" stroke="white" stroke-width="2" opacity="0.5"/><line x1="200" y1="400" x2="380" y2="400" stroke="white" stroke-width="2" opacity="0.4"/><line x1="200" y1="440" x2="400" y2="440" stroke="white" stroke-width="2" opacity="0.4"/><line x1="200" y1="480" x2="360" y2="480" stroke="white" stroke-width="2" opacity="0.4"/><line x1="200" y1="520" x2="340" y2="520" stroke="white" stroke-width="2" opacity="0.4"/>`,
    portal: `<circle cx="300" cy="450" r="120" fill="none" stroke="white" stroke-width="3" opacity="0.5"/><circle cx="300" cy="450" r="100" fill="none" stroke="white" stroke-width="3" opacity="0.6"/><circle cx="300" cy="450" r="80" fill="none" stroke="white" stroke-width="3" opacity="0.7"/><circle cx="300" cy="450" r="60" fill="white" opacity="0.15"/>`,
    demon: `<path d="M250 300 Q300 200 350 300 L370 380 Q300 360 230 380 Z" fill="white" opacity="0.5"/><circle cx="280" cy="380" r="8" fill="${c3}"/><circle cx="320" cy="380" r="8" fill="${c3}"/><path d="M280 420 Q300 440 320 420" stroke="white" stroke-width="3" fill="none" opacity="0.7"/>`,
    school: `<rect x="220" y="380" width="160" height="220" rx="8" fill="white" opacity="0.2"/><rect x="220" y="380" width="160" height="30" fill="white" opacity="0.3"/><circle cx="300" cy="395" r="6" fill="${c1}"/>`,
    star: `<path d="M300 250 L320 410 L480 410 L350 500 L390 660 L300 570 L210 660 L250 500 L120 410 L280 410 Z" fill="white" opacity="0.4"/>`,
  };

  const motifSvg = motifs[motif] || motifs.star;
  
  // Quebra título em linhas
  const words = display.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).length > 18) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current);
  const titleSvg = lines.slice(0, 4).map((line, i) => 
    `<text x="300" y="${130 + i * 38}" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-weight="900" font-size="34" style="text-shadow: 0 2px 8px rgba(0,0,0,0.8)">${escape(line)}</text>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <ellipse cx="300" cy="450" rx="280" ry="320" fill="url(#glow)"/>
  <g>${motifSvg}</g>
  ${titleSvg}
  <rect x="40" y="820" width="520" height="2" fill="white" opacity="0.3"/>
  <text x="300" y="860" text-anchor="middle" fill="white" opacity="0.7" font-family="system-ui" font-size="18">TOMOVERSO</text>
</svg>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const noCover = db.prepare(`
  SELECT id, slug, title, synopsis, cover_url FROM mangas
  WHERE (cover_local_path IS NULL OR cover_local_path='')
    AND cover_url NOT LIKE '/uploads/%'
`).all() as any[];

console.log(`Mangás sem capa: ${noCover.length}`);

let generated = 0;
for (const m of noCover) {
  const filename = `${m.slug}.svg`;
  const localPath = join(outDir, filename);
  const publicPath = `/uploads/mangas/locais/${filename}`;

  const svg = makeSvg(m.title, m.synopsis || "");
  writeFileSync(localPath, svg, "utf8");
  db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(publicPath, m.id);
  generated++;
}

console.log(`Capas SVG geradas: ${generated}`);
const totalLocal = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '/uploads/mangas/locais/%'").get();
console.log(`Total local agora: ${(totalLocal as any).c}`);