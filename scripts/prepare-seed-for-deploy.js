const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const Database = require("better-sqlite3");

const root = process.cwd();
const dbPath = path.join(root, "data", "tomoverso.db");
const seedPath = path.join(root, "data", "tomoverso.seed.db.gz");

if (!fs.existsSync(dbPath)) {
  console.error(`[prepare-seed] DB não encontrado: ${dbPath}`);
  process.exit(1);
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

console.log(`[prepare-seed] Abrindo ${dbPath}`);
const db = new Database(dbPath);
try {
  db.pragma("journal_mode = DELETE");
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.exec("VACUUM");
  db.pragma("optimize");
} finally {
  db.close();
}

for (const suffix of ["-wal", "-shm"]) {
  const p = `${dbPath}${suffix}`;
  if (fs.existsSync(p)) {
    const size = fs.statSync(p).size;
    if (size === 0) fs.rmSync(p, { force: true });
    else console.warn(`[prepare-seed] Aviso: ${p} ainda existe com ${mb(size)}`);
  }
}

const input = fs.readFileSync(dbPath);
const output = zlib.gzipSync(input, { level: 9 });
fs.writeFileSync(seedPath, output);

console.log(`[prepare-seed] DB: ${mb(input.length)}`);
console.log(`[prepare-seed] Seed: ${mb(output.length)} → ${seedPath}`);

if (output.length > 95 * 1024 * 1024) {
  console.error("[prepare-seed] Seed passou de 95MB; GitHub/Vercel podem rejeitar. Reduza páginas/capítulos antes do push.");
  process.exit(2);
}
