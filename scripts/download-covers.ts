import Database from "better-sqlite3";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";

const c = new Database("data/tomoverso.db");
const mangas = c.prepare("SELECT id, slug, title, cover_url FROM mangas WHERE cover_url IS NOT NULL").all() as Array<{id:string;slug:string;title:string;cover_url:string}>;

const UPLOADS = path.join(process.cwd(), "public", "uploads", "mangas");
if (!existsSync(UPLOADS)) mkdirSync(UPLOADS, { recursive: true });

let downloaded = 0;
let failed = 0;

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    createWriteStream(dest).write(buf);
    return true;
  } catch { return false; }
}

(async () => {
  console.log(`Baixando ${mangas.length} capas...`);
  for (const m of mangas) {
    const ext = path.extname(new URL(m.cover_url).pathname) || ".jpg";
    const dest = path.join(UPLOADS, `${m.slug}${ext}`);
    if (existsSync(dest)) { console.log(`  · ${m.slug}: já existe`); continue; }
    const ok = await download(m.cover_url, dest);
    if (ok) {
      // Update DB with local path
      c.prepare("UPDATE mangas SET cover_local_path = ? WHERE id = ?").run(`/uploads/mangas/${m.slug}${ext}`, m.id);
      downloaded++;
      console.log(`  ✓ ${m.slug}`);
    } else { failed++; console.log(`  ✗ ${m.slug}`); }
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }
  console.log(`\nDownloaded: ${downloaded}, Failed: ${failed}, Already existed: ${mangas.length - downloaded - failed}`);
})();
