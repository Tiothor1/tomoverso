/**
 * Importa capítulos dos mangás MangaDex do mais popular para o menos.
 * Uso: npx tsx scripts/import-md-chapters-bulk.ts [--max=200] [--resume]
 *
 * Processa em lote de 10, salvando checkpoint a cada lote.
 */

import Database = require("better-sqlite3");
import { randomUUID } from "crypto";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const CK = join(process.cwd(), "data", "md-chapter-bulk-ck.json");

const argv = process.argv.slice(2);
const MAX = parseInt(argv.find(a=>a.startsWith("--max="))?.split("=")[1]||"200", 10);
const RESUME = argv.includes("--resume");

const DB = new Database("data/tomoverso.db");
const BASE = "https://api.mangadex.org";
const UA = "Tomoverso/1.0";

function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
function ts(){return new Date().toLocaleTimeString("pt-BR");}

// Rate limit: max 4 req/s
let calls=0,reset=Date.now();
async function mdGet(url:string) {
  calls++;
  if (calls>=4){const w=Math.max(0,reset-Date.now()+300);if(w>0)await sleep(w);calls=0;reset=Date.now()+1000;}
  const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/json"}});
  const text=await r.text();
  if (!text.trim().startsWith("{")&&!text.trim().startsWith("[")) throw new Error(`Non-JSON: ${text.slice(0,100)}`);
  return JSON.parse(text);
}

async function main() {
  // Carrega checkpoint
  let done = new Set<string>();
  if (RESUME && existsSync(CK)) {
    const saved = JSON.parse(readFileSync(CK,"utf8"));
    for (const id of saved) done.add(id);
    console.log(`[${ts()}] Resume: ${done.size} ja processados`);
  }

  // Pega mangas MD sem capitulos ou com poucos capitulos, ordenados por created_at (mais popular primeiro)
  const mangas = DB.prepare(`
    SELECT m.id, m.source_id, m.title, m.slug,
      (SELECT COUNT(*) FROM manga_chapters WHERE manga_id=m.id) as chapter_count
    FROM mangas m 
    WHERE m.source='mangadex'
    ORDER BY m.created_at ASC
  `).all() as any[];

  const pending = mangas.filter(m => !done.has(m.id));
  const toProcess = pending.slice(0, MAX);
  
  console.log(`[${ts()}] Total MD: ${mangas.length}`);
  console.log(`[${ts()}] Ja processados: ${done.size}`);
  console.log(`[${ts()}] Para processar: ${toProcess.length} (de ${pending.length} pendentes)`);

  if (toProcess.length === 0) { console.log("Nada a fazer."); process.exit(0); }

  let ok = 0, fail = 0, totalCaps = 0, totalPags = 0;
  const t0 = Date.now();

  for (let i = 0; i < toProcess.length; i++) {
    const m = toProcess[i];
    const elapsed = ((Date.now()-t0)/1000).toFixed(0);
    const title = (m.title||"").slice(0, 50);
    
    // Pula se ja tem capitulos
    if (m.chapter_count > 0 && !done.has(m.id)) {
      done.add(m.id);
      ok++;
      continue;
    }

    process.stdout.write(`\n[${ts()}] [${i+1}/${toProcess.length}] (+${elapsed}s) ${title}... `);

    try {
      // Busca capitulos PT-BR
      const chapters: Array<{id:string;num:number;title:string|null}> = [];
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

      if (chapters.length === 0) {
        console.log(`0 caps (pulando)`);
        done.add(m.id);
        ok++;
        continue;
      }

      let chAdded = 0, pgAdded = 0;

      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const exist = DB.prepare("SELECT id FROM manga_chapters WHERE manga_id=? AND chapter_number=?").get(m.id, ch.num) as any;
        if (exist) continue;

        const chId = randomUUID();
        const chSlug = `capitulo-${ch.num}`;
        DB.prepare(`INSERT INTO manga_chapters (id,manga_id,chapter_number,title,slug,source_url,page_count) VALUES (?,?,?,?,?,?,0)`)
          .run(chId, m.id, ch.num, ch.title||`Cap ${ch.num}`, chSlug, `https://mangadex.org/chapter/${ch.id}`);
        chAdded++;

        try {
          const srv = await mdGet(`${BASE}/at-home/server/${ch.id}`);
          await sleep(80);
          const base = srv.baseUrl, hash = srv.chapter.hash, files = srv.chapter.data||[];
          for (let pi = 0; pi < files.length; pi++) {
            DB.prepare("INSERT OR IGNORE INTO manga_pages (id,chapter_id,page_number,image_url) VALUES (?,?,?,?)")
              .run(randomUUID(), chId, pi+1, `${base}/data/${hash}/${files[pi]}`);
            pgAdded++;
          }
          DB.prepare("UPDATE manga_chapters SET page_count=? WHERE id=?").run(files.length, chId);
        } catch(e: any) {
          // skip chapter on error
        }
      }

      totalCaps += chAdded;
      totalPags += pgAdded;
      done.add(m.id);
      ok++;

      console.log(`+${chAdded} caps, +${pgAdded} pags (${chapters.length} disponiveis)`);

      // Checkpoint a cada 5
      if (ok % 5 === 0) {
        writeFileSync(CK, JSON.stringify(Array.from(done)), "utf8");
        const rate = (totalCaps+totalPags)/((Date.now()-t0)/1000);
        console.log(`  [CHECK] ${ok} mangas | +${totalCaps} caps | +${totalPags} pags | ${rate.toFixed(1)} itens/s`);
      }
    } catch(e: any) {
      console.log(`ERRO: ${(e.message||"").slice(0,80)}`);
      done.add(m.id);
      fail++;
    }
  }

  writeFileSync(CK, JSON.stringify(Array.from(done)), "utf8");

  const fm = (DB.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  const fc = (DB.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c;
  const fp = (DB.prepare("SELECT COUNT(*) c FROM manga_pages").get() as any).c;
  const et = ((Date.now()-t0)/1000).toFixed(1);

  console.log(`\n${"=".repeat(50)}`);
  console.log("RESUMO FINAL");
  console.log("  Processados: "+ok);
  console.log("  Falhas: "+fail);
  console.log("  Caps adicionados: "+totalCaps);
  console.log("  Pags adicionadas: "+totalPags);
  console.log("  Tempo: "+et+"s");
  console.log("  TOTAL mangas: "+fm);
  console.log("  TOTAL capitulos: "+fc);
  console.log("  TOTAL paginas: "+fp);
  console.log("=".repeat(50));
}

main().catch(e=>{console.error("FATAL:",e);process.exit(1);});
