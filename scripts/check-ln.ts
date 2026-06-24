import Database from "better-sqlite3";
const c = new Database("data/tomoverso.db");

console.log("=== NOVELS ===");
console.log("Total:", c.prepare("SELECT COUNT(*) as n FROM novels").get());
console.log("Com capítulos:", c.prepare("SELECT COUNT(DISTINCT novel_id) as n FROM chapters").get());
console.log("Tipo visual-novel:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='visual-novel'").get());
console.log("Tipo light-novel:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='light-novel'").get());
console.log("Tipo web-novel:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='web-novel'").get());
console.log("\nVNs sem capítulos:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='visual-novel' AND id NOT IN (SELECT DISTINCT novel_id FROM chapters)").get());
console.log("LNs sem capítulos:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE (type='light-novel' OR type='web-novel') AND id NOT IN (SELECT DISTINCT novel_id FROM chapters)").get());

console.log("\n=== COVERS ===");
console.log("Novels sem cover:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE cover_url IS NULL AND cover_local_path IS NULL").get());
console.log("VNs sem cover:", c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='visual-novel' AND cover_url IS NULL AND cover_local_path IS NULL").get());
