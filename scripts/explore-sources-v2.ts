/**
 * Explora batoto.website e mangafire.to como fontes de mangá.
 */
async function checkBatotoPages() {
  console.log("=== BATOTO.WEBSITE ===");
  // Tenta pagina 1
  const r1 = await fetch("https://batoto.website/manga/page/1/", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html1 = await r1.text();
  const slugs = [...html1.matchAll(/href="(?:https?:\/\/batoto\.website)?\/manga\/([^"/]+)/g)]
    .map(m => m[1]).filter(s => s.length > 3 && !s.includes("page") && !s.includes("search"));
  
  const uniqueSlugs = [...new Set(slugs)].slice(0, 15);
  console.log(`Pagina 1: ${uniqueSlugs.length} slugs encontrados`);
  console.log(`Amostra: ${uniqueSlugs.slice(0, 5).join(", ")}`);

  // Verifica paginação
  const lastPage = html1.match(/class=["']last["'][^>]*href=["'][^"']*\/manga\/(?:page\/)?(\d+)\/?["']/);
  const pageLinks = [...html1.matchAll(/\/manga\/page\/(\d+)\//g)].map(m => parseInt(m[1]));
  const maxPage = Math.max(...pageLinks, lastPage ? parseInt(lastPage[1]) : 1);
  console.log(`Ultima pagina: ~${maxPage}`);
  
  // Verifica detalhe de um manga
  if (uniqueSlugs.length > 0) {
    const slug = uniqueSlugs[0];
    console.log(`\nChecando detalhe: ${slug}`);
    const r2 = await fetch(`https://batoto.website/manga/${slug}/`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html2 = await r2.text();
    const title = html2.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "?";
    const chapters = [...html2.matchAll(/href="\/manga\/[^"]+\/chapter-(\d+)/g)];
    const cover = html2.match(/<img[^>]*src="([^"]*\/manga\/[^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] || html2.match(/og:image["\s]+content="([^"]+)"/)?.[1] || "?";
    const genres = [...html2.matchAll(/<a\s+href="\/genre\/([^"/]+)"/g)].map(m => decodeURIComponent(m[1]));
    const chapterCount = chapters.length;
    const chapterMax = Math.max(...chapters.map(m => parseInt(m[1])), 0);
    
    console.log(`  Titulo: ${title.slice(0, 60)}`);
    console.log(`  Generos: ${genres.slice(0, 5).join(", ")}`);
    console.log(`  Caps: ${chapterCount} (max #${chapterMax})`);
    console.log(`  Cover: ${cover?.slice(0, 80) || "none"}`);
  }
}

async function checkMangaFire() {
  console.log("\n=== MANGAFIRE.TO ===");
  const r = await fetch("https://mangafire.to/browse?page=1", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await r.text();
  const slugs = [...new Set([...html.matchAll(/href="\/([a-z0-9-]{10,80})(?:\/|")/g)].map(m => m[1]))]
    .filter(s => !s.includes("page") && !s.includes("browse"));
  console.log(`Amostra: ${slugs.slice(0, 5).join(", ")}`);
  console.log(`Tamanho HTML: ${(html.length/1024).toFixed(0)}KB`);
}

async function checkExistingMangaSources() {
  console.log("\n=== STATUS ATUAL ===");
  const Database = require("better-sqlite3");
  const db = new Database("data/tomoverso.db");
  const stats = db.prepare("SELECT source, COUNT(*) c FROM mangas GROUP BY source").all();
  for (const s of stats) console.log(`  ${s.source}: ${s.c} mangas`);
}

Promise.all([checkBatotoPages(), checkMangaFire(), checkExistingMangaSources()]).catch(console.error);
