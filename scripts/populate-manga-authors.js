const fs = require("fs");
const DB_PATH = require("path").join(process.cwd(), "data", "tomoverso.db");
const Database = require("better-sqlite3");

const db = new Database(DB_PATH);

// Busca mangás sem autor
const mangas = db.prepare(`
  SELECT id, slug, title, source, source_url, author, artist
  FROM mangas
  WHERE source = 'mangaonline.blue' AND (author IS NULL OR artist IS NULL OR author = '' OR artist = '')
  ORDER BY slug
  LIMIT 200
`).all();

console.log(JSON.stringify({ mangas_sem_autor: mangas.length }, null, 2));

// Tenta extrair autor de cada um
async function fetchAuthor(slug) {
  const url = `https://mangaonline.blue/manga/${slug}/`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Tomoverso/1.0; +https://tomoverso.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Tenta extrair autor do JSON-LD (schema.org)
    let author = null;
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld.author?.name) author = ld.author.name;
      } catch {}
    }

    return { author, artist: null };
  } catch {
    return null;
  }
}

(async () => {
  let updated = 0;
  let failed = 0;

  for (const manga of mangas) {
    const info = await fetchAuthor(manga.slug);
    if (info && (info.author || info.artist)) {
      db.prepare("UPDATE mangas SET author = ?, artist = ? WHERE id = ?")
        .run(info.author || null, info.artist || null, manga.id);
      console.log(`✓ ${manga.slug} → autor: ${info.author || "—"}, artista: ${info.artist || "—"}`);
      updated++;
    } else {
      console.log(`✗ ${manga.slug} → não encontrado`);
      failed++;
    }
    // Delay pra não sobrecarregar
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nResumo: ${updated} atualizados, ${failed} falharam`);

  db.close();
})();
