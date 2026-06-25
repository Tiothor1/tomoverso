/**
 * Varre o banco e baixa capas que apontam para URL externa.
 * Salva local em /public/uploads/mangas/locais/.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import Database = require("better-sqlite3");

async function main() {
  const db = new Database("data/tomoverso.db");
  const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const external = db.prepare(`
    SELECT id, slug, cover_url FROM mangas
    WHERE cover_url LIKE 'http%' AND cover_url NOT LIKE '/uploads/%'
  `).all() as Array<{ id: string; slug: string; cover_url: string }>;

  console.log(`Capas externas para baixar: ${external.length}`);

  let downloaded = 0, failed = 0, skipped = 0;
  const updatePath = db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?");

  for (let i = 0; i < external.length; i++) {
    const m = external[i];
    const ext = m.cover_url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] || "jpg";
    const filename = `${m.slug}.${ext}`;
    const localPath = join(outDir, filename);
    const publicPath = `/uploads/mangas/locais/${filename}`;

    if (existsSync(localPath)) {
      updatePath.run(publicPath, m.id);
      skipped++;
      continue;
    }

    try {
      const r = await fetch(m.cover_url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) { failed++; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) { failed++; continue; }
      writeFileSync(localPath, buf);
      updatePath.run(publicPath, m.id);
      downloaded++;
    } catch {
      failed++;
    }

    if ((i + 1) % 20 === 0) {
      console.log(`[${i+1}/${external.length}] +${downloaded} baixados | ${failed} falhas | ${skipped} ja tinham`);
    }
    await sleep(150);
  }

  console.log(`\nDONE: +${downloaded} baixados | ${failed} falhas | ${skipped} ja tinham`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
