import { chromium } from "playwright";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import * as path from "path";

const EMAIL = "aaaalarakiba@gmail.com";
const PASSWORD = "Hermes2026";
const DB_PATH = path.join(process.cwd(), "data", "tomoverso.seed.db");
const MAX_NOVELS = 429;
const MAX_CHAPS = 20;

async function main() {
  console.log("=== PLAYWRIGHT NOVELMANIA IMPORTER ===");
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  const page = await context.newPage();
  
  // Login
  console.log("Logging in...");
  await page.goto("https://novelmania.com.br/login?redirect=%2Fnovels");
  await page.locator("#accept-cookies-btn, button:has-text('Aceitar todos')").click().catch(() => {});
  await page.fill('input[name="email"], input[type="text"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL("**/novels", { timeout: 10000 });
  console.log("Logged in!");
  
  // Get novels from API
  const novels = await page.evaluate(async () => {
    const r = await fetch("/api/novels?limit=429");
    const d = await r.json();
    return d.data.map(n => ({ title: n.title, slug: n.slug, id: n.id }));
  });
  console.log(`Found ${novels.length} novels`);
  
  // Setup DB
  const db = new Database(DB_PATH);
  const me = (db.prepare("SELECT id FROM users WHERE username='fabio_tx'").get() as any).id;
  db.prepare(`INSERT OR IGNORE INTO sources (id,name,display_name,type,base_url,rate_limit_per_sec,enabled,config)
    VALUES(?,'novelmania','NovelMania (BR)','scrape','https://novelmania.com.br',2,1,'{}')
  `).run(randomUUID());
  
  let totalCh = 0;
  let totalNv = 0;
  
  for (const novel of novels.slice(0, MAX_NOVELS)) {
    const nid = `nm-${novel.slug}`;
    
    // Check if already has chapters
    const existing = db.prepare("SELECT COUNT(*) c FROM chapters WHERE novel_id=?").get(nid) as any;
    if (existing.c > 0) {
      console.log(`SKIP ${novel.title} (${existing.c} ch)`);
      continue;
    }
    
    // Get chapters from API
    const numId = Buffer.from(novel.id.split("--")[0], "base64").toString();
    const chapters: any[] = await page.evaluate(async (id) => {
      const r = await fetch(`/api/novels/${id}/chapters`);
      const d = await r.json();
      return (d.data || []).slice(0, 20).map((c: any) => ({
        slug: c.slug, title: c.longTitle || c.title || "",
        position: Math.round(c.position || 0)
      }));
    }, numId);
    
    if (chapters.length === 0) continue;
    
    console.log(`[${totalNv+1}] ${novel.title} - ${chapters.length} ch`);
    
    // Create novel in DB
    const nExists = db.prepare("SELECT id FROM novels WHERE id=?").get(nid);
    if (!nExists) {
      db.prepare(`INSERT INTO novels(id,slug,title,synopsis,author_id,source,source_id,source_url,type,status,genres,tags,is_featured,is_approved,created_at)
        VALUES(?,?,?,?,?,'novelmania',?,?,'light-novel','ongoing','[]','[]',0,1,datetime('now'))
      `).run(nid, novel.slug, novel.title, "", me, novel.id,
        `https://novelmania.com.br/novels/${novel.slug}`);
    }
    
    // Download each chapter
    let ok = 0;
    for (const ch of chapters) {
      try {
        const url = `https://novelmania.com.br/novels/${novel.slug}/capitulos/${ch.slug}`;
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        
        // Extract text from rendered DOM
        const text = await page.evaluate(() => {
          const main = document.querySelector("main");
          if (!main) return "";
          // Remove footer elements
          const clone = main.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("nav, header, footer, [class*=comment], [class*=reaction], script, style")
            .forEach(el => el.remove());
          return clone.textContent?.replace(/\s+/g, " ").trim() || "";
        });
        
        if (text.length < 100) continue;
        
        const chNum = ch.position || ok + 1;
        const cExists = db.prepare("SELECT id FROM chapters WHERE novel_id=? AND chapter_number=?").get(nid, chNum);
        if (cExists) continue;
        
        db.prepare(`INSERT INTO chapters(id,novel_id,chapter_number,title,content,word_count,source_url)
          VALUES(?,?,?,?,?,?,?)`).run(
          randomUUID(), nid, chNum, ch.title || `Capítulo ${chNum}`,
          text.slice(0, 100000),
          text.split(/\s+/).filter(Boolean).length,
          url
        );
        ok++;
        totalCh++;
      } catch (e: any) {
        // Skip failed chapters
      }
      if (ok % 5 === 0) process.stdout.write(".");
    }
    console.log(` +${ok}`);
    totalNv++;
    
    if (totalNv % 5 === 0) {
      db.pragma("wal_checkpoint(TRUNCATE)");
    }
  }
  
  console.log(`\n\n=== DONE ===`);
  console.log(`${totalNv} novels, ${totalCh} chapters`);
  
  const t = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  const n = (db.prepare("SELECT COUNT(DISTINCT novel_id) c FROM chapters").get() as any).c;
  console.log(`DB: ${t} ch, ${n} novels`);
  
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  await browser.close();
  
  // Git push
  if (totalCh > 0) {
    const { execSync } = require("child_process");
    execSync(`cd "${process.cwd()}" && git add -A && git commit -m "import: ${totalCh} ch NovelMania" && git push`, { stdio: "inherit", timeout: 60000 });
  }
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
