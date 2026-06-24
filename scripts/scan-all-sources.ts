/**
 * Tenta TODAS as fontes de mangá possíveis com diferentes abordagens.
 * Não para até conseguir o máximo de mangás.
 */

import { chromium } from "playwright";

async function tryBatotoStealth() {
  console.log("\n=== BATOTO STEALTH ===");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "pt-BR",
  });
  const page = await ctx.newPage();
  
  // Tenta a home
  await page.goto("https://batoto.website/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Pega todos os links de manga
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll("a");
    const results: string[] = [];
    const seen = new Set<string>();
    anchors.forEach(a => {
      const m = a.href.match(/\/manga\/([^/]+)/);
      if (m && !seen.has(m[1]) && m[1].length > 3 && !m[1].includes("page") && !m[1].includes("wp-")) {
        seen.add(m[1]);
        results.push(m[1] + " -> " + (a.textContent || "").trim().slice(0, 60));
      }
    });
    return results;
  });
  
  console.log(`Home links: ${links.length}`);
  links.slice(0, 20).forEach(l => console.log("  " + l));

  // Tenta scrollar pra baixo pra carregar mais (infinite scroll?)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);
  
  const links2 = await page.evaluate(() => {
    const anchors = document.querySelectorAll("a");
    const seen = new Set<string>();
    const results: string[] = [];
    anchors.forEach(a => {
      const m = a.href.match(/\/manga\/([^/]+)/);
      if (m && !seen.has(m[1]) && m[1].length > 3 && !m[1].includes("page")) {
        seen.add(m[1]);
        results.push(m[1]);
      }
    });
    return results;
  });
  console.log(`Apos scroll: ${links2.length} slugs unicos`);

  await browser.close();
  return links2;
}

async function tryComick() {
  console.log("\n=== COMICK ===");
  // Diferentes endpoints
  const endpoints = [
    "https://api.comick.io/v1.0/search?limit=5",
    "https://api.comick.cc/v1.0/search?limit=5",
    "https://comick.io/api/v1.0/search?limit=5",
    "https://comick.cc/api/v1.0/search?limit=5",
    "https://comick.fun/api/v1.0/search?limit=5",
    "https://api.comick.fun/v1.0/search?limit=5",
  ];
  
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Referer": "https://comick.io/",
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      const isJson = text.trim().startsWith("{") || text.trim().startsWith("[");
      console.log(`  ${ep}: HTTP ${r.status} ${isJson ? "JSON" : "HTML"} (${(text.length/1024).toFixed(1)}KB)`);
      if (isJson && r.ok) {
        const data = JSON.parse(text);
        console.log(`    Dados: ${JSON.stringify(data).slice(0, 200)}`);
      }
    } catch (e: any) {
      console.log(`  ${ep}: ERRO ${e.message.slice(0, 60)}`);
    }
  }
}

async function tryMangaFire() {
  console.log("\n=== MANGAFIRE PLAYWRIGHT ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto("https://mangafire.to/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Procura por links de manga
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll("a");
      const results: string[] = [];
      const seen = new Set<string>();
      anchors.forEach(a => {
        const m = a.href.match(/mangafire\.to\/([a-z0-9-]{10,})/);
        if (m && !seen.has(m[1])) {
          seen.add(m[1]);
          results.push(m[1] + " -> " + (a.textContent || "").trim().slice(0, 60));
        }
      });
      return results;
    });
    
    console.log(`Links: ${links.length}`);
    links.slice(0, 15).forEach(l => console.log("  " + l));
  } catch (e) {
    console.log("ERRO: " + e.message.slice(0, 80));
  }
  
  await browser.close();
}

async function tryAlternativeSources() {
  console.log("\n=== OUTRAS FONTES ===");
  
  const sources = [
    { name: "mangaplus (v2)", url: "https://jumpg-webapi.tokyo-cdn.com/api/v2/title_list/all" },
    { name: "mangaplus (manga)", url: "https://jumpg-webapi.tokyo-cdn.com/api/manga_list?format=json" },
    { name: "brmangas", url: "https://brmangas.com/manga/" },
    { name: "mangalivre", url: "https://mangalivre.net/mangas/lista" },
    { name: "lermangas", url: "https://lermangas.me/manga/" },
    { name: "mangayabu", url: "https://mangayabu.top/" },
    { name: "hq-zone", url: "https://hq-zone.com/manga/" },
  ];
  
  for (const src of sources) {
    try {
      const r = await fetch(src.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await r.text();
      const slugs = [...html.matchAll(/href="[^"]*\/manga\/([a-z0-9-]{10,})(?:\/|")/g)];
      const uniqueSlugs = [...new Set(slugs.map(m => m[1]))].filter(s => !s.includes("page") && !s.includes("search"));
      console.log(`  ${src.name}: HTTP ${r.status} | ${(html.length/1024).toFixed(0)}KB | ~${uniqueSlugs.length} slugs`);
      if (uniqueSlugs.length > 0) console.log(`    Ex: ${uniqueSlugs.slice(0, 3).join(", ")}`);
    } catch (e: any) {
      console.log(`  ${src.name}: ERRO ${e.message.slice(0, 60)}`);
    }
  }
}

Promise.all([
  tryBatotoStealth(),
  tryComick(),
  tryMangaFire(),
  tryAlternativeSources(),
]).then(() => console.log("\nFIM")).catch(e => console.error("FATAL:", e));
