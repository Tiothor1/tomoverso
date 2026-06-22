import Database from "better-sqlite3";
import * as path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"), { readonly: true });

console.log("Slugs de algumas VNs conhecidas:");
for (const title of ["Saya no Uta", "Fate/stay night", "Doki Doki Literature Club!", "STEINS;GATE", "Katawa Shoujo"]) {
  const row = db.prepare("SELECT slug, title FROM novels WHERE title LIKE ?").get(`%${title}%`) as any;
  console.log(`  "${title}": slug = ${row?.slug ?? "(não encontrada)"}`);
}

console.log("\nTotal visual-novel:", (db.prepare("SELECT COUNT(*) c FROM novels WHERE type='visual-novel'").get() as any).c);
console.log("Total com cover_url:", (db.prepare("SELECT COUNT(*) c FROM novels WHERE cover_url IS NOT NULL").get() as any).c);
console.log("Total com synopsis:", (db.prepare("SELECT COUNT(*) c FROM novels WHERE synopsis IS NOT NULL AND synopsis != ''").get() as any).c);

db.close();
