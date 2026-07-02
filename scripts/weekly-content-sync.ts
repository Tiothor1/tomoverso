import Database = require("better-sqlite3");
import { importNovel, listCatalogNovels } from "../src/lib/manga/adapters/centralnovel";
import { importManga, listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";

type CliOptions = {
  dryRun: boolean;
  maxNovels: number;
  maxMangas: number;
  maxNewNovels: number;
  maxNewMangas: number;
  catalogPages: number;
  maxNovelChaptersPerRun: number;
  maxNewNovelChapters: number;
  maxChaptersNewManga: number;
  sleepMs: number;
};

type Totals = {
  novelsChecked: number;
  novelsImported: number;
  novelChaptersAdded: number;
  novelErrors: number;
  mangasChecked: number;
  mangasImported: number;
  mangaChaptersAdded: number;
  mangaPagesAdded: number;
  mangaErrors: number;
};

const DEFAULTS: CliOptions = {
  dryRun: false,
  maxNovels: 80,
  maxMangas: 120,
  maxNewNovels: 5,
  maxNewMangas: 5,
  catalogPages: 10,
  maxNovelChaptersPerRun: 2,
  maxNewNovelChapters: 5,
  maxChaptersNewManga: 80,
  sleepMs: 1200,
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts = { ...DEFAULTS };
  const numberArg = (arg: string, current: number) => {
    const n = Number(arg.split("=")[1]);
    return Number.isFinite(n) ? n : current;
  };
  for (const arg of args) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--max-novels=")) opts.maxNovels = numberArg(arg, opts.maxNovels);
    else if (arg.startsWith("--max-mangas=")) opts.maxMangas = numberArg(arg, opts.maxMangas);
    else if (arg.startsWith("--max-new-novels=")) opts.maxNewNovels = numberArg(arg, opts.maxNewNovels);
    else if (arg.startsWith("--max-new-mangas=")) opts.maxNewMangas = numberArg(arg, opts.maxNewMangas);
    else if (arg.startsWith("--catalog-pages=")) opts.catalogPages = numberArg(arg, opts.catalogPages);
    else if (arg.startsWith("--max-novel-chapters-per-run=")) opts.maxNovelChaptersPerRun = numberArg(arg, opts.maxNovelChaptersPerRun);
    else if (arg.startsWith("--max-new-novel-chapters=")) opts.maxNewNovelChapters = numberArg(arg, opts.maxNewNovelChapters);
    else if (arg.startsWith("--max-chapters-new-manga=")) opts.maxChaptersNewManga = numberArg(arg, opts.maxChaptersNewManga);
    else if (arg.startsWith("--sleep-ms=")) opts.sleepMs = numberArg(arg, opts.sleepMs);
  }
  return opts;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ts() {
  return new Date().toISOString();
}

function getDb() {
  const db = new Database("data/tomoverso.db");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function countAll(db: Database.Database) {
  const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    novels: one("SELECT COUNT(*) c FROM novels"),
    chapters: one("SELECT COUNT(*) c FROM chapters"),
    mangas: one("SELECT COUNT(*) c FROM mangas"),
    mangaChapters: one("SELECT COUNT(*) c FROM manga_chapters"),
    mangaPages: one("SELECT COUNT(*) c FROM manga_pages"),
  };
}

function selectCentralNovelRows(db: Database.Database, limit: number): Array<{ source_id: string; currentMax: number }> {
  return (db.prepare(`
    SELECT n.source_id, COALESCE(MAX(c.chapter_number), 0) AS currentMax
    FROM novels n
    LEFT JOIN chapters c ON c.novel_id = n.id
    WHERE n.source = 'centralnovel'
      AND n.type = 'light-novel'
      AND COALESCE(n.source_id, '') <> ''
    GROUP BY n.id, n.source_id, n.last_synced_at, n.updated_at
    ORDER BY COALESCE(n.last_synced_at, '1970-01-01') ASC, n.updated_at ASC
    LIMIT ?
  `).all(limit) as Array<{ source_id: string; currentMax: number }>);
}

function selectMangaOnlineSlugs(db: Database.Database, limit: number): string[] {
  return (db.prepare(`
    SELECT source_id
    FROM mangas
    WHERE source = 'mangaonline.blue'
      AND COALESCE(source_id, '') <> ''
    ORDER BY COALESCE(last_synced_at, '1970-01-01') ASC, updated_at ASC
    LIMIT ?
  `).all(limit) as Array<{ source_id: string }>).map((r) => r.source_id);
}

async function syncCentralNovelExisting(db: Database.Database, opts: CliOptions, totals: Totals) {
  const rows = selectCentralNovelRows(db, opts.maxNovels);
  console.log(`[${ts()}] CentralNovel existentes para checar: ${rows.length}`);
  if (opts.dryRun) {
    console.log(rows.map((r, i) => `  ${i + 1}. ${r.source_id} — atual=${r.currentMax}, alvo=${r.currentMax + opts.maxNovelChaptersPerRun}`).join("\n"));
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const { source_id: slug, currentMax } = rows[i];
    const plannedMax = opts.maxNovelChaptersPerRun > 0 ? currentMax + opts.maxNovelChaptersPerRun : null;
    console.log(`\n[${ts()}] [LN ${i + 1}/${rows.length}] ${slug} (atual=${currentMax}, alvo=${plannedMax ?? "todos"})`);
    try {
      const result = await importNovel(slug, {
        maxChapters: plannedMax,
        onProgress: (msg) => {
          if (msg.includes("importado") || msg.includes("capítulos") || msg.includes("erro") || msg.includes("curto")) {
            console.log(`  ${msg}`);
          }
        },
      });
      totals.novelsChecked++;
      totals.novelChaptersAdded += result.chaptersAdded;
      totals.novelErrors += result.errors.length;
      console.log(`  → +${result.chaptersAdded} capítulos, ${result.errors.length} erros`);
    } catch (error: any) {
      totals.novelErrors++;
      console.log(`  → ERRO: ${error?.message || error}`);
    }
    await sleep(opts.sleepMs);
  }
}

async function importNewCentralNovels(db: Database.Database, opts: CliOptions, totals: Totals) {
  if (opts.maxNewNovels <= 0) return;
  console.log(`\n[${ts()}] Buscando novas LNs no catálogo CentralNovel (${opts.catalogPages} páginas)...`);
  const catalog = await listCatalogNovels(opts.catalogPages);
  const existing = new Set((db.prepare("SELECT source_id FROM novels WHERE source='centralnovel'").all() as Array<{ source_id: string }>).map((r) => r.source_id));
  const newOnes = catalog.filter((n) => !existing.has(n.slug)).slice(0, opts.maxNewNovels);
  console.log(`[${ts()}] Novas LNs encontradas: ${newOnes.length}`);
  if (opts.dryRun) {
    console.log(newOnes.map((n, i) => `  ${i + 1}. ${n.slug} — ${n.title}`).join("\n"));
    return;
  }

  for (let i = 0; i < newOnes.length; i++) {
    const item = newOnes[i];
    console.log(`\n[${ts()}] [NOVA LN ${i + 1}/${newOnes.length}] ${item.slug}`);
    try {
      const result = await importNovel(item.slug, { maxChapters: opts.maxNewNovelChapters });
      totals.novelsImported++;
      totals.novelChaptersAdded += result.chaptersAdded;
      totals.novelErrors += result.errors.length;
      console.log(`  → importada, +${result.chaptersAdded} capítulos, ${result.errors.length} erros`);
    } catch (error: any) {
      totals.novelErrors++;
      console.log(`  → ERRO: ${error?.message || error}`);
    }
    await sleep(opts.sleepMs);
  }
}

async function syncMangaOnlineExisting(db: Database.Database, opts: CliOptions, totals: Totals) {
  const slugs = selectMangaOnlineSlugs(db, opts.maxMangas);
  console.log(`\n[${ts()}] MangaOnline existentes para checar: ${slugs.length}`);
  if (opts.dryRun) {
    console.log(slugs.map((s, i) => `  ${i + 1}. ${s}`).join("\n"));
    return;
  }

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    console.log(`\n[${ts()}] [MANGA ${i + 1}/${slugs.length}] ${slug}`);
    try {
      const result = await importManga(slug, {
        maxChapters: null,
        skipExistingPages: true,
        onProgress: (msg) => {
          if (msg.includes("+ Cap") || msg.includes("✓ Cap") || msg.includes("erro") || msg.includes("nenhuma página") || msg.includes("Título:")) {
            console.log(`  ${msg}`);
          }
        },
      });
      totals.mangasChecked++;
      totals.mangaChaptersAdded += result.chaptersAdded;
      totals.mangaPagesAdded += result.pagesAdded;
      totals.mangaErrors += result.errors.length;
      console.log(`  → +${result.chaptersAdded} capítulos, +${result.pagesAdded} páginas, ${result.errors.length} erros`);
    } catch (error: any) {
      totals.mangaErrors++;
      console.log(`  → ERRO: ${error?.message || error}`);
    }
    await sleep(opts.sleepMs);
  }
}

async function importNewMangaOnline(db: Database.Database, opts: CliOptions, totals: Totals) {
  if (opts.maxNewMangas <= 0) return;
  console.log(`\n[${ts()}] Buscando novos mangás/manhwas no MangaOnline (${opts.catalogPages} páginas)...`);
  const catalog = await listCatalogMangas(opts.catalogPages);
  const existing = new Set((db.prepare("SELECT source_id FROM mangas WHERE source='mangaonline.blue'").all() as Array<{ source_id: string }>).map((r) => r.source_id));
  const newOnes = catalog.filter((m) => !existing.has(m.slug)).slice(0, opts.maxNewMangas);
  console.log(`[${ts()}] Novos mangás/manhwas encontrados: ${newOnes.length}`);
  if (opts.dryRun) {
    console.log(newOnes.map((m, i) => `  ${i + 1}. ${m.slug} — ${m.title}`).join("\n"));
    return;
  }

  for (let i = 0; i < newOnes.length; i++) {
    const item = newOnes[i];
    console.log(`\n[${ts()}] [NOVO MANGA ${i + 1}/${newOnes.length}] ${item.slug}`);
    try {
      const result = await importManga(item.slug, {
        maxChapters: opts.maxChaptersNewManga,
        skipExistingPages: true,
      });
      totals.mangasImported++;
      totals.mangaChaptersAdded += result.chaptersAdded;
      totals.mangaPagesAdded += result.pagesAdded;
      totals.mangaErrors += result.errors.length;
      console.log(`  → importado, +${result.chaptersAdded} capítulos, +${result.pagesAdded} páginas, ${result.errors.length} erros`);
    } catch (error: any) {
      totals.mangaErrors++;
      console.log(`  → ERRO: ${error?.message || error}`);
    }
    await sleep(opts.sleepMs);
  }
}

async function main() {
  const opts = parseArgs();
  console.log("=".repeat(72));
  console.log("TOMOVERSO — WEEKLY CONTENT SYNC");
  console.log("=".repeat(72));
  console.log(JSON.stringify(opts, null, 2));

  const db = getDb();
  const before = countAll(db);
  console.log("\nANTES", before);

  const totals: Totals = {
    novelsChecked: 0,
    novelsImported: 0,
    novelChaptersAdded: 0,
    novelErrors: 0,
    mangasChecked: 0,
    mangasImported: 0,
    mangaChaptersAdded: 0,
    mangaPagesAdded: 0,
    mangaErrors: 0,
  };

  try {
    await syncCentralNovelExisting(db, opts, totals);
    await importNewCentralNovels(db, opts, totals);
    await syncMangaOnlineExisting(db, opts, totals);
    await importNewMangaOnline(db, opts, totals);

    if (!opts.dryRun) {
      db.pragma("wal_checkpoint(TRUNCATE)");
    }
    const after = countAll(db);
    console.log("\nDEPOIS", after);
    console.log("\nRESUMO", totals);
    console.log("=".repeat(72));

    const changed =
      totals.novelChaptersAdded > 0 ||
      totals.novelsImported > 0 ||
      totals.mangaChaptersAdded > 0 ||
      totals.mangaPagesAdded > 0 ||
      totals.mangasImported > 0;

    if (process.env.GITHUB_OUTPUT) {
      const fs = await import("fs");
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed ? "true" : "false"}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `novel_chapters_added=${totals.novelChaptersAdded}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `manga_chapters_added=${totals.mangaChaptersAdded}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `manga_pages_added=${totals.mangaPagesAdded}\n`);
    }
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
