import Database from "better-sqlite3";
import { copyFileSync, existsSync } from "fs";
import * as path from "path";

function main() {
  const dbSeedPath = path.join(process.cwd(), "data", "tomoverso.seed.db");
  const dbLivePath = path.join(process.cwd(), "data", "tomoverso.db");

  if (!existsSync(dbLivePath)) {
    console.log("DB local não encontrado em", dbLivePath);
    return;
  }

  // Checkpoint no DB live pra consolidar WAL
  const dbLive = new Database(dbLivePath);
  dbLive.pragma("wal_checkpoint(TRUNCATE)");
  dbLive.close();

  // Copia live → seed
  copyFileSync(dbLivePath, dbSeedPath);
  const size = existsSync(dbSeedPath) ? require("fs").statSync(dbSeedPath).size : 0;
  console.log(`Seed atualizado: ${(size / 1024 / 1024).toFixed(1)} MB`);

  // Stats
  const dbSeed = new Database(dbSeedPath, { readonly: true });
  const totalNovels = (dbSeed.prepare("SELECT COUNT(*) c FROM novels").get() as any).c;
  const totalChapters = (dbSeed.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c;
  dbSeed.close();
  console.log(`Novels: ${totalNovels}`);
  console.log(`Capítulos: ${totalChapters}`);
}

main();
