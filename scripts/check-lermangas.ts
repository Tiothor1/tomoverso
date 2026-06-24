/**
 * Explora lermangas.me — fonte promissora de mangás PT-BR.
 * Parece ser WordPress Madara, igual mangaonline.blue.
 */
const BASE = "https://lermangas.me";

async function explore() {
  // Página 1
  const r1 = await fetch(`${BASE}/manga/`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  const html1 = await r1.text();
  
  const slugs = [...new Set([...html1.matchAll(/href=["']https?:\/\/lermangas\.me\/manga\/([^"']+?)(?:\/|["'])/g)].map(m => m[1]))]
    .filter(s => s.length > 3 && !s.includes("page") && !s.includes("wp-") && !s.includes("feed") && !s.includes("search"));
  
  console.log(`Pagina 1: ${slugs.length} slugs`);
  console.log(`Amostra: ${slugs.slice(0, 10).join(", ")}`);

  // Check pagination
  const page2 = await fetch(`${BASE}/manga/page/2/`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html2 = await page2.text();
  const slugs2 = [...new Set([...html2.matchAll(/href=["']https?:\/\/lermangas\.me\/manga\/([^"']+?)(?:\/|["'])/g)].map(m => m[1]))]
    .filter(s => s.length > 3 && !s.includes("page") && !s.includes("wp-"));
  console.log(`Pagina 2: ${slugs2.length} slugs`);
  
  // Last page number
  const lastPage = html1.match(/class=["']last["'][^>]*href=["'][^"']*\/manga\/page\/(\d+)/);
  const pages = [...html1.matchAll(/\/manga\/page\/(\d+)\//g)].map(m => parseInt(m[1]));
  const maxPage = Math.max(...pages, lastPage ? parseInt(lastPage[1]) : 1);
  console.log(`Paginas: ~${maxPage}`);

  // Check one detail page
  if (slugs.length > 0) {
    const slug = slugs[0];
    const r3 = await fetch(`${BASE}/manga/${slug}/`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html3 = await r3.text();
    
    const title = html3.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "?";
    const coverMatch = html3.match(/<img[^>]*class=["']img-responsive["'][^>]*src=["']([^"']+)["']/);
    const cover = coverMatch?.[1] || html3.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/)?.[1] || "";
    const synopsis = html3.match(/<div[^>]*class=["']summary__content["'][^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g,"").trim().slice(0, 300) || "";
    const author = html3.match(/Autor[^<]*<[^>]*class=["']summary-content["'][^>]*>([^<]+)/)?.[1]?.trim() || "";
    const chapters = [...html3.matchAll(/<a[^>]*href=["']https?:\/\/lermangas\.me\/manga\/${slug}\/([^"']+?)["']/g)];
    const genres = [...new Set([...html3.matchAll(/href=["']https?:\/\/lermangas\.me\/genre\/([^"']+?)["']/g)].map(m => decodeURIComponent(m[1])))];

    console.log(`\nDetalhe de "${slug}":`);
    console.log(`  Titulo: ${title.slice(0, 60)}`);
    console.log(`  Cover: ${cover.slice(0, 80)}`);
    console.log(`  Autor: ${author.slice(0, 40)}`);
    console.log(`  Generos: ${genres.slice(0, 5).join(", ")}`);
    console.log(`  Caps: ${chapters.length}`);
    console.log(`  Sinopse: ${synopsis.slice(0, 100)}...`);
  }
}

explore().catch(console.error);
