/**
 * SCRIPT DE IMPORT EM MASSA - NovelMania → Tomoverso
 * 
 * Uso: npx tsx scripts/import-novelmania.ts
 * 
 * Requer: terminal desbloqueado
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";

// ===== CONFIG =====
const EMAIL = "aaaalarakiba@gmail.com";
const PASSWORD = "Hermes2026";
const DB_PATH = path.join(process.cwd(), "data", "tomoverso.seed.db");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const MAX_NOVELS = 429;
const MAX_CHAPTERS_PER_NOVEL = 999;
const SLEEP_MS = 500;

// ===== TYPES =====
interface NMNovel {
  id: string;
  title: string;
  slug: string;
  author: string;
  kind: string;
  nationality: string;
  status: string;
  cover?: { original?: string };
  synopsis?: string;
  categories?: { name: string }[];
}

interface NMChapter {
  id: string;
  title: string;
  slug: string;
  longTitle?: string;
  position: number;
}

interface NMSession {
  cookie: string;
  xsrf?: string;
}

// ===== AUTH =====
async function login(): Promise<NMSession> {
  // Get CSRF cookie first
  await fetch("https://novelmania.com.br/api/sanctum/csrf-cookie", {
    credentials: "include",
  });
  
  // Login
  const res = await fetch("https://novelmania.com.br/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    redirect: "manual",
  });
  
  const cookies = res.headers.getSetCookie?.() || [];
  const nmSession = cookies.find(c => c.includes("nm_session="));
  if (!nmSession) throw new Error("Login failed - no session cookie");
  
  // Extract cookie value
  const cookie = nmSession.split(";")[0];
  return { cookie };
}

async function api<T>(session: NMSession, path: string): Promise<T> {
  const res = await fetch(`https://novelmania.com.br${path}`, {
    headers: { "Cookie": session.cookie, "User-Agent": UA, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(`API error: ${data.error}`);
  return data.data as T;
}

function extractChapterText(html: string): string {
  // Try to extract from the main content
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!m) return "";
  
  let text = m[1]
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
    .trim();
  
  // Remove header/footer noise
  const lines = text.split("\n");
  const contentStart = lines.findIndex(l => l.length > 40 || (l.includes("—") || l.includes("Capítulo")));
  const contentEnd = lines.length - lines.slice().reverse().findIndex(l => l.includes("Comentários") || l.includes("Denunciar") || l.length > 30);
  
  if (contentStart >= 0 && contentEnd > contentStart) {
    text = lines.slice(contentStart, Math.max(contentEnd, contentStart + 10)).join("\n");
  }
  
  return text;
}

async function main() {
  console.log("=== NovelMania Import Script ===");
  console.log("Logging in...");
  const session = await login();
  console.log("✓ Logged in");
  
  // Get all novels
  console.log("Fetching novel list...");
  const novels = await api<NMNovel[]>(session, "/api/novels?limit=" + MAX_NOVELS);
  console.log(`✓ ${novels.length} novels found`);
  
  // Setup DB
  const db = new Database(DB_PATH);
  const me = (db.prepare("SELECT id FROM users WHERE username='fabio_tx'").get() as any).id;
  
  // Register source
  db.prepare(`INSERT OR IGNORE INTO sources (id,name,display_name,type,base_url,rate_limit_per_sec,enabled,config)
    VALUES(?,'novelmania','NovelMania (BR)','scrape','https://novelmania.com.br',2,1,'{}')
  `).run(randomUUID());
  
  let totalChapters = 0;
  let importedNovels = 0;
  
  for (const novel of novels.slice(0, MAX_NOVELS)) {
    const nid = `nm-${novel.slug}`;
    const exists = db.prepare("SELECT id FROM chapters WHERE novel_id=? LIMIT 1").get(nid);
    if (exists) {
      console.log(`  SKIP ${novel.title} (already has chapters)`);
      continue;
    }
    
    console.log(`\n[${importedNovels + 1}/${novels.length}] ${novel.title} (${novel.author})`);
    
    // Get chapters
    const novelDetail = await api<NMNovel & { id: string }>(session, `/api/novels/${novel.id}/chapters`);
    // Cast to any because the API returns chapters differently
    const chaptersRaw = await api<any[]>(session, `/api/novels/${novel.id}/chapters`);
    const chapters = chaptersRaw as NMChapter[];
    
    if (!chapters || chapters.length === 0) {
      console.log(`  ✗ 0 chapters`);
      continue;
    }
    
    console.log(`  ${chapters.length} chapters`);
    
    // Create novel in DB
    const novelExists = db.prepare("SELECT id FROM novels WHERE id=?").get(nid);
    if (!novelExists) {
      const slug = novel.slug;
      const catNames = (novel as any).categories?.map((c: any) => c.name) || [];
      
      db.prepare(`INSERT OR IGNORE INTO novels(id,slug,title,synopsis,author_id,source,source_id,source_url,type,status,genres,tags,is_featured,is_approved,created_at,updated_at)
        VALUES(?,?,?,?,?,'novelmania',?,?,?,?,'["${catNames.join('","')}"]','["${slug}"]',0,1,datetime('now'),datetime('now'))
      `).run(
        nid, slug, novel.title,
        `Novel from NovelMania (${novel.nationality})`,
        me,
        novel.id, `https://novelmania.com.br/novels/${slug}`,
        novel.kind?.toLowerCase() || 'light-novel',
        novel.status?.toLowerCase() || 'unknown'
      );
    }
    
    // Import chapters
    let ok = 0;
    for (const ch of chapters.slice(0, MAX_CHAPTERS_PER_NOVEL)) {
      const existingCh = db.prepare("SELECT id FROM chapters WHERE novel_id=? AND chapter_number=?").get(nid, ch.position);
      if (existingCh) continue;
      
      await sleep(SLEEP_MS);
      
      try {
        const url = `https://novelmania.com.br/novels/${novel.slug}/capitulos/${ch.slug}`;
        const res = await fetch(url, {
          headers: { "Cookie": session.cookie, "User-Agent": UA },
        });
        if (!res.ok) { 
          if (res.status === 419) throw new Error("Session expired");
          continue; 
        }
        
        const html = await res.text();
        const content = extractChapterText(html);
        
        if (content.length < 100) continue;
        
        const title = ch.longTitle || ch.title || `Chapter ${ch.position}`;
        
        db.prepare(`INSERT INTO chapters(id,novel_id,chapter_number,title,content,word_count,published_at,source_url)
          VALUES(?,?,?,?,?,?,datetime('now'),?)`).run(
          randomUUID(), nid, Math.round(ch.position), title,
          content.slice(0, 100000),
          content.split(/\s+/).filter(Boolean).length,
          url
        );
        ok++;
        totalChapters++;
      } catch (e: any) {
        if (e.message?.includes("Session expired")) throw e;
      }
      
      if (ok > 0 && ok % 5 === 0) process.stdout.write(`  +${ok}`);
    }
    
    console.log(`  → ${ok} chapters imported`);
    importedNovels++;
    
    // Checkpoint: save seed every 5 novels
    if (importedNovels % 5 === 0) {
      db.pragma("wal_checkpoint(TRUNCATE)");
      fs.copyFileSync(DB_PATH, DB_PATH.replace(".seed.", ".backup."));
    }
  }
  
  console.log(`\n\n=== FINAL ===`);
  console.log(`${importedNovels} novels, ${totalChapters} chapters imported`);
  
  // Summary
  const t = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  const n = (db.prepare("SELECT COUNT(DISTINCT novel_id) c FROM chapters").get() as any).c;
  console.log(`DB: ${t} chapters across ${n} novels`);
  
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(e => console.error("\nFATAL:", e));
