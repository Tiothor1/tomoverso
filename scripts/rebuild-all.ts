import Database from "better-sqlite3";
import { copyFileSync } from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "fs";

const DB = path.join(process.cwd(), "data", "tomoverso.db");
const SEED = path.join(process.cwd(), "data", "tomoverso.seed.db");
const AO3_DIR = path.join(process.cwd(), "ao3_output");

function main() {
  // Verifica DB live
  const db = new Database(DB);
  let n = (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c;
  let ch = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  console.log(`DB live: ${n} novels, ${ch} chapters`);

  // Se DB está vazio (só seed 3 novels), precisa popular
  if (n <= 5) {
    console.log("DB vazio ou recém-criado. Rodando seed...");
    db.pragma("wal_checkpoint(TRUNCATE)");
    const seed = new Database(DB); // reconecta
    // O seed roda automaticamente via db.ts
    // Mas vamos forçar: pega do mock
    const { mockNovels, mockChapters, mockUsers } = require("./src/lib/data/mock-novels");
    
    // Fabio user
    const { hashPassword } = require("./src/lib/auth-helpers");
    db.prepare(`INSERT OR IGNORE INTO users (id, email, username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?, 'admin')`).run("fabio-texeira-2026", "fabio@tomoverso.com", "fabio_tx",
      hashPassword("tomoverso2026"), "Fábio Teixeira");
    
    // 3 novels
    for (const m of mockNovels) {
      db.prepare(`INSERT OR IGNORE INTO novels
        (id, slug, title, synopsis, cover_url, author_id, type, status, genres, tags, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        m.id, m.slug, m.title, m.synopsis, "", "fabio-texeira-2026",
        m.type || "light-novel", m.status || "ongoing",
        JSON.stringify(m.genres || []), JSON.stringify(m.tags || []), m.featured ? 1 : 0
      );
    }
    
    // 3 chapters
    const insertCh = db.prepare(`INSERT OR IGNORE INTO chapters
      (id, novel_id, chapter_number, title, content, word_count, published_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);
    for (const ch of mockChapters.slice(0, 3)) {
      insertCh.run(ch.id, ch.novel_id, ch.chapter_number, ch.title, ch.content, ch.word_count);
    }
    
    n = (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c;
    ch = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
    console.log(`Após seed: ${n} novels, ${ch} chapters`);
  }

  // Importa AO3 se existir
  if (existsSync(AO3_DIR)) {
    const workDirs = readdirSync(AO3_DIR);
    console.log(`\nImportando ${workDirs.length} obras do AO3...`);
    
    const fabioId = "fabio-texeira-2026";
    const sourceId = randomUUID();
    db.prepare(`INSERT OR IGNORE INTO sources (id, name, display_name, type, base_url, rate_limit_per_sec, enabled, config)
      VALUES (?, 'ao3', 'Archive of Our Own', 'scrape', 'https://archiveofourown.org', 2.0, 1, '{}')
    `).run(sourceId);
    
    let total = 0;
    for (const workId of workDirs) {
      const chapterFiles = readdirSync(path.join(AO3_DIR, workId)).filter(f => f.endsWith(".txt")).sort();
      if (chapterFiles.length === 0) continue;
      
      const nid = `ao3-${workId}`;
      const slug = `ao3-${workId}`;
      
      db.prepare(`INSERT OR IGNORE INTO novels
        (id, slug, title, synopsis, cover_url, author_id, source, source_id, source_url, type, status, genres, tags)
        VALUES (?, ?, ?, ?, ?, ?, 'ao3', ?, ?, 'web-novel', 'ongoing', '["original-work"]', '["ao3"]')
      `).run(nid, slug, `AO3 Work ${workId}`, `Original work from AO3.`, "",
        fabioId, workId, `https://archiveofourown.org/works/${workId}`);
      
      const insert = db.prepare(`INSERT OR IGNORE INTO chapters
        (id, novel_id, chapter_number, title, content, word_count, published_at, source_url)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`);
      
      for (const f of chapterFiles) {
        const text = readFileSync(path.join(AO3_DIR, workId, f), "utf-8");
        const titleMatch = text.match(/^# (.+?)$/m);
        const title = titleMatch ? titleMatch[1].trim() : `Chapter ${f.replace(/[^0-9]/g, "")}`;
        let content = text.replace(/^# .+(\n|$)/, "").replace(/\n---\nSource: .+(\n|$)/, "").trim();
        if (content.length < 200) continue;
        const numMatch = f.match(/(\d+)/);
        const chNum = numMatch ? parseInt(numMatch[1]) : total + 1;
        insert.run(randomUUID(), nid, chNum, title, content.slice(0, 100000),
          content.split(/\s+/).filter(Boolean).length,
          `https://archiveofourown.org/works/${workId}/chapters`);
        total++;
      }
    }
    console.log(`AO3: +${total} capítulos`);
    
    // Remove AO3 dir
    const { rmSync } = require("fs");
    rmSync(AO3_DIR, { recursive: true, force: true });
  }

  // Stats finais
  n = (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c;
  ch = (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  const nl = (db.prepare("SELECT COUNT(DISTINCT novel_id) c FROM chapters").get() as any).c;
  console.log(`\n=== FINAL ===`);
  console.log(`${n} novels, ${ch} capítulos em ${nl} novels`);

  // Cria seed
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  copyFileSync(DB, SEED);
  const seedSize = require("fs").statSync(SEED).size;
  console.log(`Seed criado: ${(seedSize / 1024 / 1024).toFixed(1)} MB`);
}

main();
