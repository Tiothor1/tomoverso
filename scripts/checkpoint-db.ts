import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, statSync } from "fs";
import * as path from "path";

const DB_PATH = process.env.DB_PATH
  || (process.env.VERCEL || process.env.NODE_ENV === "production"
    ? "/tmp/tomoverso/tomoverso.db"
    : path.join(process.cwd(), "data", "tomoverso.db"));

const SEED_PATH = process.env.VERCEL || process.env.NODE_ENV === "production"
  ? path.join(process.cwd(), "data", "tomoverso.seed.db")  // bundled in deploy
  : path.join(process.cwd(), "data", "tomoverso.db");        // local = current

const dbDir = path.dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// On Vercel (production): if /tmp DB doesn't exist, seed it from bundled file.
// This makes the DB "persist" across cold starts within the same container,
// and provides initial data on every cold start.
if (process.env.VERCEL && !existsSync(DB_PATH) && existsSync(SEED_PATH)) {
  console.log(`[db] Cold start: copying seed DB from ${SEED_PATH} → ${DB_PATH}`);
  copyFileSync(SEED_PATH, DB_PATH);
}

const db = new Database(DB_PATH);
const seedSize = existsSync(SEED_PATH) ? statSync(SEED_PATH).size : 0;
console.log(`[db] DB at ${DB_PATH} (seed: ${(seedSize / 1024).toFixed(1)} KB)`);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export { db };
