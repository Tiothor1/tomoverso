/**
 * Importa capítulos para os mangás MangaDex mais populares.
 * Uso: npx tsx scripts/import-mangadex-chapters.ts [--limit=50] [--start-from=1]
 *
 * Pega os mangás MangaDex com maior followedCount e importa capítulos PT-BR.
 */

import Database = require("better-sqlite3");
import { randomUUID } from "crypto";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const CK = join(process.cwd(), "data", "md-chapters-ck.json");

const argv = process.argv.slice(2);
const LIMIT = parseInt(argv.find(a=>a.startsWith("--limit="))?.split("=")[1]||"30", 10);
const START = parseInt(argv.find(a=>a.startsWith("--start-from="))?.split("=")[1]||"0", 10);
const RESUME = argv.includes("--resume");

const BASE = "https://api.mangadex.org";
const UA = "Tomoverso/1.0";
const db = new Database("data/tomoverso.db");

function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
function ts(){return new Date().toLocaleTimeString("pt-BR");}

let calls=0,reset=Date.now();
async function mdGet(url:string) {
  calls++;
  if (calls>=4){const w=Math.max(0,reset-Date.now()+300);if(w>0)await sleep(w);calls=0;reset=Date.now()+1000;}
  const r=await fetch(url,{headers:{"User-Agent":UA}});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function main() {
  // Get MD mangas ordered by when they were imported (first imported = most popular)
  const imported = db.prepare(`
    SELECT m.id, m.source_id, m.title 
    FROM mangas m 
    WHERE m.source='mangadex'
    ORDER BY m.created_at ASC 
    LIMIT ? OFFSET ?
  `).all(LIMIT, START) as any[];

  console.log(`[${ts()}] ${imported.length} mangas para processar`);

  let done = 0, failed = 0, totalCaps = 0, totalPags = 0;
  const t0 = Date.now();

  for (let i = 0; i < imported.length; i++) {
    const m = imported[i];
    const elapsed = ((Date.now()-t0)/1000).toFixed(1);
    console.log(`\n[${ts()}] [${i+1}/${imported.length}] (+${elapsed}s) ${(m.title||"").slice(0,50)}`);

    try {
      // Get chapters PT-BR
      let chapters: Array<{id:string;num:number;title:string|null}> = [];
      let cursor: string|null = null;
      while (true) {
        const url = `${BASE}/chapter?manga=${m.source_id}&translatedLanguage[]=pt-br&limit=100&order[chapter]=asc${cursor ? `&offset=${cursor}` : ""}`;
        const d = await mdGet(url);
        for (const ch of d.data||[]) {
          chapters.push({id:ch.id, num:parseFloat(ch.attributes.chapter)||0, title:ch.attributes.title||null});
        }
        const total = d.total||0;
        const off = (d.offset||0)+(d.data?.length||0);
        if (off >= total) break;
        cursor = String(off);
      }

      let chAdded = 0, pgAdded = 0;
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const exist = db.prepare("SELECT id FROM manga_chapters WHERE manga_id=? AND chapter_number=?").get(m.id, ch.num) as any;
        if (exist) continue;

        const chId = randomUUID();
        db.prepare(`INSERT INTO manga_chapters (id,manga_id,chapter_number,title,slug,source_url,page_count) VALUES (?,?,?,?,?,?,0)`)
          .run(chId, m.id, ch.num, ch.title||`Cap ${ch.num}`, `capitulo-${ch.num}`, `https://mangadex.org/chapter/${ch.id}`);
        chAdded++;

        try {
          const srv = await mdGet(`${BASE}/at-home/server/${ch.id}`);
          await sleep(100);
          const base = srv.baseUrl, hash = srv.chapter.hash, files = srv.chapter.data||[];
          for (let pi = 0; pi < files.length; pi++) {
            db.prepare("INSERT OR IGNORE INTO manga_pages (id,chapter_id,page_number,image_url) VALUES (?,?,?,?)")
              .run(randomUUID(), chId, pi+1, `${base}/data/${hash}/${files[pi]}`);
            pgAdded++;
          }
          db.prepare("UPDATE manga_chapters SET page_count=? WHERE id=?").run(files.length, chId);
        } catch(e:any) {
          // skip this chapter
        }
        
        if (ci % 10 === 0) process.stdout.write(".");
      }

      totalCaps += chAdded;
      totalPags += pgAdded;
      done++;
      console.log(`\n  ✓ +${chAdded} caps, +${pgAdded} pags (${chapters.length} total disponiveis)`);
    } catch(e:any) {
      console.error(`\n  ✗ ERRO: ${(e.message||"").slice(0,100)}`);
      failed++;
    }

    if ((i+1) % 5 === 0) {
      const rate = (totalCaps+totalPags)/((Date.now()-t0)/1000);
      console.log(`\n[CHECK ${i+1}/${imported.length}] +${done} mangas | +${totalCaps} caps | +${totalPags} pags | ${rate.toFixed(1)}itens/s\n`);
    }
  }

  const fm = (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  const fc = (db.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c;
  const fp = (db.prepare("SELECT COUNT(*) c FROM manga_pages").get() as any).c;
  const et = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESUMO`);
  console.log(`  Mangas processados: ${done}`);
  console.log(`  Falhas: ${failed}`);
  console.log(`  Caps adicionados: ${totalCaps}`);
  console.log(`  Pags adicionadas: ${totalPags}`);
  console.log(`  Tempo: ${et}s`);
  console.log(`  TOTAL mangas: ${fm}`);
  console.log(`  TOTAL chapters: ${fc}`);
  console.log(`  TOTAL pages: ${fp}`);
  console.log("=".repeat(50));
}

main().catch(e=>{console.error(e);process.exit(1);});
