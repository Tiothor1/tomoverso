/**
 * ULTIMATE NOVELMANIA IMPORTER
 * 
 * Baixa TODAS as novels do NovelMania e importa pro Tomoverso.
 * 
 * Uso: npx tsx scripts/novelmania-ultimate.ts
 * 
 * Requer: login via email/senha (já configurado)
 * Faz: login → lista novels → lista capítulos → baixa conteúdo → importa DB → commit → push
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";

const EMAIL = "aaaalarakiba@gmail.com";
const PASSWORD = "Hermes2026";
const DB_PATH = path.join(process.cwd(), "data", "tomoverso.seed.db");
const MAX_NOVELS = 999;
const MAX_CHAPS = 999;
const SLEEP_MS = 300;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

interface CookieJar { [key: string]: string }

let cookies: CookieJar = {};

async function apiCall(path: string, opts: any = {}): Promise<any> {
  const headers: any = { "User-Agent": UA, ...opts.headers };
  if (cookies) {
    headers["Cookie"] = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  const url = `https://novelmania.com.br${path}`;
  const res = await fetch(url, { ...opts, headers, redirect: "manual" });
  
  // Save cookies
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    const m = sc.match(/^([^=]+)=([^;]+)/);
    if (m) cookies[m[1]] = m[2];
  }
  
  if (opts.raw) return res;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) return await res.json();
  return await res.text();
}

function extractChapterText(html: string): string {
  // Extract from SSR HTML
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!m) return "";
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{4,}/g, "\n\n")
    .replace(/© 2026 Novel Mania[\s\S]*$/s, "")
    .trim();
}

async function login() {
  console.log("Logging in...");
  
  // Get CSRF cookie first
  await apiCall("/api/sanctum/csrf-cookie", { credentials: "include" });
  
  // Login
  const res = await apiCall("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  
  if (typeof res === "object" && res.success === false) {
    throw new Error(`Login failed: ${res.error}`);
  }
  
  console.log("✓ Logged in!", Object.keys(cookies).join(", "));
  return cookies;
}

async function main() {
  console.log("=== NOVELMANIA ULTIMATE IMPORTER ===\n");
  
  // 1. Login
  await login();
  
  // 2. Get all novels
  console.log("\nFetching novels...");
  let allNovels: any[] = [];
  let page = 1;
  while (true) {
    const data = await apiCall(`/api/novels?page=${page}&limit=50`);
    if (!data.success || !data.data || data.data.length === 0) break;
    allNovels.push(...data.data);
    console.log(`  Page ${page}: ${data.data.length} novels`);
    page++;
    if (page > 20) break; // safety
  }
  console.log(`\nTotal: ${allNovels.length} novels`);
  
  // 3. Setup DB
  const db = new Database(DB_PATH);
  const me = (db.prepare("SELECT id FROM users WHERE username='fabio_tx'").get() as any).id;
  
  db.prepare(`INSERT OR IGNORE INTO sources (id,name,display_name,type,base_url,rate_limit_per_sec,enabled,config)
    VALUES(?,'novelmania','NovelMania (BR)','scrape','https://novelmania.com.br',2,1,'{}')
  `).run(randomUUID());
  
  // 4. For each novel, get chapters and content
  let totalCh = 0;
  let totalNovels = 0;
  
  for (const novel of allNovels.slice(0, MAX_NOVELS)) {
    const nid = `nm-${novel.slug}`;
    
    // Check if already imported
    const existing = db.prepare("SELECT COUNT(*) c FROM chapters WHERE novel_id=?").get(nid) as any;
    if (existing.c > 0) {
      console.log(`  SKIP ${novel.title} (${existing.c} chapters already)`);
      continue;
    }
    
    console.log(`\n[${totalNovels + 1}/${Math.min(allNovels.length, MAX_NOVELS)}] ${novel.title} (${novel.author})`);
    
    // Get chapters from API
    const numId = novel.id.split("--")[0];
    let base64Id = "";
    try { base64Id = atob(numId); } catch { base64Id = numId; }
    
    const chData = await apiCall(`/api/novels/${base64Id}/chapters`);
    if (!chData.success) { console.log(`  ✗ API error: ${chData.error}`); continue; }
    
    const chapters = chData.data || [];
    if (chapters.length === 0) { console.log(`  ✗ 0 chapters`); continue; }
    
    console.log(`  ${chapters.length} chapters`);
    
    // Create novel in DB
    const novelExists = db.prepare("SELECT id FROM novels WHERE id=?").get(nid);
    if (!novelExists) {
      const cats = (novel as any).category?.name || "";
      db.prepare(`INSERT OR IGNORE INTO novels(id,slug,title,synopsis,author_id,source,source_id,source_url,type,status,genres,tags,is_featured,is_approved,created_at,updated_at)
        VALUES(?,?,?,?,?,'novelmania',?,?,?,?,'["${cats}"]','["${novel.slug}"]',0,1,datetime('now'),datetime('now'))
      `).run(
        nid, novel.slug, novel.title, `Novel do NovelMania`,
        me, novel.id, `https://novelmania.com.br/novels/${novel.slug}`,
        (novel.kind || "Light Novel").toLowerCase(),
        (novel.status || "ongoing").toLowerCase()
      );
    }
    
    // Download each chapter
    let ok = 0;
    for (const ch of chapters.slice(0, MAX_CHAPS)) {
      const chNum = Math.round(ch.position || ok + 1);
      
      // Check if exists
      const chExists = db.prepare("SELECT id FROM chapters WHERE novel_id=? AND chapter_number=?").get(nid, chNum);
      if (chExists) continue;
      
      await new Promise(r => setTimeout(r, SLEEP_MS));
      
      try {
        const url = `/novels/${novel.slug}/capitulos/${ch.slug}`;
        const html = await apiCall(url, { raw: true }).then(async (r: any) => {
          if (r.status === 419) throw new Error("Session expired");
          return await r.text();
        });
        
        let content = extractChapterText(html);
        
        // Fallback: try body text
        if (content.length < 100) {
          const bm = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
          if (bm) {
            content = bm[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{4,}/g, "\n\n").trim();
          }
        }
        
        // Fallback: look for article content
        if (content.length < 100) {
          const am = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/);
          if (am) {
            content = am[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{4,}/g, "\n\n").trim();
          }
        }
        
        if (content.length < 100) continue;
        
        const title = ch.longTitle || ch.title || `Chapter ${chNum}`;
        
        db.prepare(`INSERT INTO chapters(id,novel_id,chapter_number,title,content,word_count,published_at,source_url)
          VALUES(?,?,?,?,?,?,datetime('now'),?)`).run(
          randomUUID(), nid, chNum, title,
          content.slice(0, 100000),
          content.split(/\s+/).filter(Boolean).length,
          `https://novelmania.com.br/novels/${novel.slug}/capitulos/${ch.slug}`
        );
        ok++;
        totalCh++;
      } catch (e: any) {
        if (e.message?.includes("Session expired")) {
          console.log("\n  SESSION EXPIRED! Re-logging in...");
          await login();
          continue;
        }
      }
      
      if (ok % 10 === 0) process.stdout.write(`  +${ok}`);
    }
    
    console.log(`  → ${ok} chapters imported`);
    totalNovels++;
    
    // Checkpoint every 10 novels
    if (totalNovels % 10 === 0) {
      db.pragma("wal_checkpoint(TRUNCATE)");
      console.log("  CHECKPOINT saved");
    }
  }
  
  console.log(`\n\n=== FINAL ===`);
  console.log(`${totalNovels} novels, ${totalCh} chapters`);
  
  const t = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  const n = (db.prepare("SELECT COUNT(DISTINCT novel_id) c FROM chapters").get() as any).c;
  console.log(`DB: ${t} chapters across ${n} novels`);
  
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  
  // Git commit and push if there are new chapters
  if (totalCh > 0) {
    console.log("\nCommitting and pushing...");
    require("child_process").execSync(
      `cd "${process.cwd()}" && git add -A && git commit -m "import: ${totalCh} capitulos do NovelMania" && git push`,
      { stdio: "inherit", timeout: 60000 }
    );
    console.log("✓ Pushed to GitHub");
    console.log("✓ Vercel auto-deploy triggered");
  }
}

main().catch(e => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
