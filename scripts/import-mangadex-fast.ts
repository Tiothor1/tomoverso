/**
 * Importa METADATA de mangás do MangaDex (sem capítulos - rápido).
 * 
 * Uso: npx tsx scripts/import-mangadex-fast.ts [--limit=500] [--resume]
 *
 * Depois rode o slow import separado para pegar capítulos.
 */

import Database = require("better-sqlite3");
import { randomUUID } from "crypto";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const CK = join(process.cwd(), "data", "md-fast-ck.json");

const DBG = new Database("data/tomoverso.db");

const argv = process.argv.slice(2);
const LIMIT = parseInt(argv.find(a=>a.startsWith("--limit="))?.split("=")[1]||"500", 10);
const RESUME = argv.includes("--resume");
const BASE = "https://api.mangadex.org";
const UA = "Tomoverso/1.0";

function sleep(ms: number) { return new Promise(r=>setTimeout(r, ms)); }

let calls=0, lastReset=Date.now();
async function mdGet(url:string) {
calls++;
if (calls >= 4) { const w = Math.max(0, lastReset - Date.now() + 300); if (w > 0) await sleep(w); calls = 0; lastReset = Date.now()+1000; }
const r = await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/json"}});
const text = await r.text();
if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
  throw new Error(`Non-JSON response: ${text.slice(0,150)}`);
}
return JSON.parse(text);
}

function safeStr(v:any,f="") {
  if (!v) return f;
  if (typeof v==="string") return v;
  return v.en||v["pt-br"]||v.ja||Object.values(v)[0] as string||f;
}

const sMap: Record<string,string> = {ongoing:"ongoing",completed:"completed",hiatus:"hiatus",cancelled:"dropped"};

async function main() {
  const existing = new Set((DBG.prepare("SELECT source_id FROM mangas WHERE source='mangadex'").all() as any[]).map(r=>r.source_id));
  if (RESUME && existsSync(CK)) { const saved=JSON.parse(readFileSync(CK,"utf8")); for (const id of saved) existing.add(id); }
  
  console.log(`Ja no DB: ${existing.size}`);

  let batch: Array<{id:string;title:string}> = [];
  
  for (let page=0; batch.length < LIMIT + 50 && page < 100; page++) {
    const off = page * 50;
    const d = await mdGet(`${BASE}/manga?limit=50&offset=${off}&availableTranslatedLanguage[]=pt-br&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`);
    if (!d.data?.length) break;
    for (const m of d.data) {
      if (!existing.has(m.id)) batch.push({id:m.id, title:safeStr(m.attributes.title)});
    }
    console.log(`Pag ${page+1}: ${batch.length} novos (total disp: ${d.total})`);
  }

  batch = batch.slice(0, LIMIT);
  console.log(`\nPara importar: ${batch.length}`);

  let ok=0, fail=0;
  const t0=Date.now();

  for (let i=0;i<batch.length;i++) {
    const m = batch[i];
    try {
      const d = await mdGet(`${BASE}/manga/${m.id}?includes[]=author&includes[]=artist&includes[]=cover_art`);
      const a = d.data.attributes;
      const t = safeStr(a.title, m.id);
      
      const alt = (a.altTitles||[]).map((x:any)=>Object.values(x)[0]).filter(Boolean);
      const desc = safeStr(a.description,"").slice(0,3000);
      const st = sMap[a.status]||"ongoing";
      const tags = (a.tags||[]).map((x:any)=>safeStr(x.attributes?.name)).filter(Boolean);
      
      let author=null, artist=null, cover=null;
      for (const rel of d.data.relationships||[]) {
        if (rel.type==="author") author=rel.attributes?.name||author;
        if (rel.type==="artist") artist=rel.attributes?.name||artist;
        if (rel.type==="cover_art"&&rel.attributes?.fileName) cover=`https://uploads.mangadex.org/covers/${m.id}/${rel.attributes.fileName}.512.jpg`;
      }

      const slug = `md-${m.id.slice(0,8)}`;
      const id = randomUUID();
      
      DBG.prepare(`INSERT INTO mangas (id,slug,title,alternative_titles,synopsis,cover_url,author,artist,status,source,source_id,source_url,last_synced_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'mangadex',?,?,datetime('now'),datetime('now'),datetime('now'))`)
        .run(id,slug,t,JSON.stringify(alt),desc,cover,author,artist,st,m.id,`https://mangadex.org/title/${m.id}`);
      
      try {
        DBG.prepare("DELETE FROM manga_tags WHERE manga_id=?").run(id);
        for (const tag of tags) DBG.prepare("INSERT OR IGNORE INTO manga_tags (manga_id,tag) VALUES (?,?)").run(id,tag);
      } catch {}
      
      existing.add(m.id);
      ok++;
      if ((i+1)%25===0) {
        writeFileSync(CK,JSON.stringify(Array.from(existing)),"utf8");
        console.log(`[${i+1}/${batch.length}] +${ok} mangas | ${((Date.now()-t0)/1000).toFixed(1)}s`);
      }
    } catch (e:any) {
      fail++;
    }
  }

  writeFileSync(CK,JSON.stringify(Array.from(existing)),"utf8");
  const t = ((Date.now()-t0)/1000).toFixed(1);
  const total = (DBG.prepare("SELECT COUNT(*) c FROM mangas WHERE source='mangadex'").get() as any).c;
  const allM = (DBG.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Mangadex importados: ${ok}`);
  console.log(`Falhas: ${fail}`);
  console.log(`Tempo: ${t}s`);
  console.log(`Mangadex no DB: ${total}`);
  console.log(`TOTAL mangas: ${allM}`);
  console.log(`TOTAL caps (todas fontes): ${(DBG.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c}`);
  console.log(`TOTAL paginas: ${(DBG.prepare("SELECT COUNT(*) c FROM manga_pages").get() as any).c}`);
  console.log("=".repeat(50));
}

main().catch(e=>{console.error(e);process.exit(1);});
