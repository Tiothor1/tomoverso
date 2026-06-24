import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

console.log("=== RESUMO FINAL DO DB ===");
console.log("Mangás:", c.prepare("SELECT COUNT(*) as n FROM mangas").get());
console.log("Capítulos de mangá:", c.prepare("SELECT COUNT(*) as n FROM manga_chapters").get());
console.log("Páginas de mangá:", c.prepare("SELECT COUNT(*) as n FROM manga_pages").get());
console.log("Novels (texto):", c.prepare("SELECT COUNT(*) as n FROM novels").get());
console.log("Capítulos de novel:", c.prepare("SELECT COUNT(*) as n FROM chapters").get());
console.log("Tags de mangá:", c.prepare("SELECT COUNT(*) as n FROM manga_tags").get());
console.log("Importações logadas:", c.prepare("SELECT COUNT(*) as n FROM manga_import_log").get());
console.log("");

console.log("=== POR FONTE ===");
const mBySrc = c.prepare("SELECT source, COUNT(*) as n FROM mangas GROUP BY source").all();
console.log("Mangás por fonte:", mBySrc);
const nBySrc = c.prepare("SELECT source, COUNT(*) as n FROM novels GROUP BY source").all();
console.log("Novels por fonte:", nBySrc);