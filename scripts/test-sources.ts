/**
 * Tenta raspar mangafire.to via Playwright.
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Tenta mangafire
  console.log("=== MANGAFIRE.TO ===");
  await page.goto("https://mangafire.to/browse?page=1", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const links = await page.$$eval("a[href^='/']", els => 
    els.map(el => ({ href: (el as HTMLAnchorElement).href, text: (el.textContent || "").trim() }))
      .filter(l => l.href.match(/mangafire\.to\/([a-z0-9-]{10,})/))
      .slice(0, 20)
  );
  
  console.log(`Links encontrados: ${links.length}`);
  links.forEach(l => console.log(`  ${l.href} -> ${l.text.slice(0,60)}`));

  // Tenta batoto de novo com mais tempo
  console.log("\n=== BATO.TO ===");
  await page.goto("https://batoto.website/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.waitForSelector("a[href*='/manga/']", { timeout: 15000 }).catch(() => console.log("  sem seletor"));
  
  const batotoLinks = await page.$$eval("a[href*='/manga/']", els =>
    els.map(el => ({ href: (el as HTMLAnchorElement).href, text: (el.textContent || "").trim() }))
      .filter(l => l.href.match(/\/manga\/([^/]+)/) && !l.href.includes("page"))
      .slice(0, 20)
  );
  console.log(`Batoto links: ${batotoLinks.length}`);
  batotoLinks.forEach(l => console.log(`  ${l.href.match(/\/manga\/([^/]+)/)?.[1] || l.href} -> ${l.text.slice(0,60)}`));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
