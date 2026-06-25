/**
 * Remove TODAS as capas DuckDuckGo (lermangas.me com JPG/PNG)
 * e substitui por SVG placeholder limpo.
 * Mantém apenas capas originais do mangaonline.blue.
 */
import Database = require("better-sqlite3");
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");

const palettes = [
  ["#fb923c","#dc2626","#7c2d12"],["#60a5fa","#1e3a8a","#0c1e4a"],
  ["#a78bfa","#5b21b6","#2e1065"],["#f472b6","#9d174d","#500724"],
  ["#34d399","#065f46","#022c22"],["#fde047","#ca8a04","#713f12"],
];

function makeSvg(title: string, slug: string): string {
  const h = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1,c2,c3] = palettes[Math.abs(h) % palettes.length];
  const display = title.length > 55 ? title.slice(0, 52) + "..." : title;
  const words = display.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 18) { if (cur) lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  const txt = lines.slice(0, 4).map((l, i) =>
    `<text x="300" y="${130 + i * 40}" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-weight="900" font-size="34" style="text-shadow:0 2px 8px rgba(0,0,0,0.7)">${esc(l)}</text>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="50%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="600" height="900" fill="url(#bg)"/><circle cx="300" cy="450" r="180" fill="white" opacity="0.06"/><circle cx="300" cy="450" r="100" fill="white" opacity="0.04"/>${txt}<text x="300" y="820" text-anchor="middle" fill="white" opacity="0.4" font-family="system-ui" font-size="16">TOMOVERSO</text></svg>`;
}
function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// Mangas do lermangas.me com capas JPG/PNG (DuckDuckGo)
const ddg = db.prepare(`
  SELECT m.id, m.slug, m.title FROM mangas m
  WHERE m.source = 'lermangas.me'
    AND (m.cover_local_path LIKE '%.jpg' OR m.cover_local_path LIKE '%.png' OR m.cover_local_path LIKE '%.webp')
`).all() as any[];

console.log(`Capas DuckDuckGo (lermangas) para remover: ${ddg.length}`);

let rm = 0;
for (const m of ddg) {
  // Remove arquivo do disco
  for (const ext of [".jpg", ".png", ".webp"]) {
    const p = join(outDir, m.slug + ext);
    if (existsSync(p)) { unlinkSync(p); break; }
  }
  // Gera SVG
  writeFileSync(join(outDir, m.slug + ".svg"), makeSvg(m.title, m.slug), "utf8");
  db.prepare("UPDATE mangas SET cover_local_path = ? WHERE id = ?").run(`/uploads/mangas/locais/${m.slug}.svg`, m.id);
  rm++;
}
console.log(`Removidas e substituidas por SVG: ${rm}`);

const reais = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.jpg' OR cover_local_path LIKE '%.png' OR cover_local_path LIKE '%.webp'").get();
const svgs = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.svg'").get();
const sem = db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path IS NULL OR cover_local_path=''").get();
console.log(`\nFinal: JPG/PNG=${(reais as any).c} | SVG=${(svgs as any).c} | Sem=${(sem as any).c}`);
db.close();
