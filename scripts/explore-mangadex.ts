/**
 * Explora MangaDex API para entender estrutura de capítulos/páginas.
 */
async function main() {
  // 1. Get top PT-BR manga
  const r1 = await fetch("https://api.mangadex.org/manga?limit=3&availableTranslatedLanguage%5B%5D=pt-br&order%5BfollowedCount%5D=desc&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive&contentRating%5B%5D=erotica", {
    headers: { "User-Agent": "Tomoverso/1.0" }
  });
  const data = await r1.json();
  const manga = data.data[0];
  const mangaId = manga.id;
  const title = manga.attributes.title;
  console.log(`Top manga: ID=${mangaId}`);
  console.log(`Title: ${JSON.stringify(title)}`);
  console.log(`Alt titles: ${JSON.stringify(manga.attributes.altTitles?.slice(0, 3))}`);
  console.log(`Description (pt): ${manga.attributes.description?.pt?.slice(0, 100) || "none"}`);
  console.log(`Tags: ${JSON.stringify(manga.attributes.tags?.slice(0, 3).map((t: any) => t.attributes?.name?.en))}`);

  // 2. Get chapters for this manga (PT-BR)
  const r2 = await fetch(`https://api.mangadex.org/chapter?manga=${mangaId}&translatedLanguage%5B%5D=pt-br&limit=5&order%5Bchapter%5D=asc`, {
    headers: { "User-Agent": "Tomoverso/1.0" }
  });
  const chData = await r2.json();
  const chapter = chData.data?.[0];
  console.log(`\nFirst chapter ID: ${chapter?.id}`);
  console.log(`Chapter: ${chapter?.attributes?.chapter} - ${chapter?.attributes?.title}`);
  console.log(`Pages: ${chapter?.attributes?.pages}`);

  // 3. Get chapter pages (needs report server)
  if (chapter) {
    const r3 = await fetch(`https://api.mangadex.org/at-home/server/${chapter.id}`, {
      headers: { "User-Agent": "Tomoverso/1.0" }
    });
    const server = await r3.json();
    const base = server.baseUrl;
    const hash = server.chapter.hash;
    const pages = server.chapter.data?.slice(0, 3);
    console.log(`\nBase URL: ${base}`);
    console.log(`Hash: ${hash}`);
    console.log(`First 3 pages: ${pages?.join(", ")}`);
    console.log(`Full page URL: ${base}/data/${hash}/${pages?.[0]}`);
  }

  // 4. Total count
  console.log(`\nTotal manga with PT-BR: ${data.total}`);
  
  // 5. Check search
  const r4 = await fetch("https://api.mangadex.org/manga?limit=2&title=one+piece&availableTranslatedLanguage%5B%5D=pt-br", {
    headers: { "User-Agent": "Tomoverso/1.0" }
  });
  const searchData = await r4.json();
  console.log(`\nSearch 'one piece' PT-BR: ${searchData.total} results`);
}

main().catch(console.error);
