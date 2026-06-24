/**
 * Explora Bato.to e MangaDex — as fontes mais promissoras.
 */

// Bato.to catalog structure
async function checkBatoto() {
  console.log("=== BATO.TO ===");
  const r = await fetch("https://batoto.website/", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await r.text();
  
  // Find manga links
  const slugMatches = [...html.matchAll(/href="\/manga\/([^"/]+)"/g)];
  const titles = slugMatches.map(m => m[1]).slice(0, 20);
  
  // Find title in img alt or text
  const titleMatches = [...html.matchAll(/alt="([^"]{3,80})"/g)];
  const alts = titleMatches.map(m => m[1]).slice(0, 20);
  
  console.log(`Page size: ${(html.length/1024).toFixed(0)}KB`);
  console.log(`Slugs found: ${slugMatches.length}`);
  console.log(`Sample slugs: ${titles.slice(0, 5).join(", ")}`);
  console.log(`Sample alts: ${alts.slice(0, 5).join(", ")}`);
  
  // Check if it has pagination
  const pageMatch = html.match(/page[/=](\d+)/);
  const lastPage = html.match(/class=["']last["'][^>]*href=["'][^"']*page[/=](\d+)/);
  console.log(`Pagination: ${pageMatch ? "yes" : "no"} | last page: ${lastPage?.[1] || "?"}`);
}

// MangaDex correct query
async function checkMangaDex() {
  console.log("\n=== MANGADEX ===");
  const r = await fetch("https://api.mangadex.org/manga?limit=5&availableTranslatedLanguage%5B%5D=pt-br&order%5BfollowedCount%5D=desc&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica", {
    headers: { "User-Agent": "Tomoverso/1.0" }
  });
  const text = await r.text();
  const isJson = text.trim().startsWith("{");
  if (isJson) {
    const data = JSON.parse(text);
    const mangaCount = data?.total || data?.data?.length || 0;
    const titles = (data?.data || []).slice(0, 5).map((m: any) => m?.attributes?.title?.en || m?.attributes?.title?.ja || "?");
    console.log(`HTTP ${r.status} | Total: ${data?.total || "?"} | Sample: ${titles.join(", ")}`);
  } else {
    console.log(`HTTP ${r.status} | ${text.slice(0, 200)}`);
  }
}

async function main() {
  await checkBatoto();
  await checkMangaDex();
}

main().catch(console.error);
