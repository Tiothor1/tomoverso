import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

// Remove ALL novels without chapters
const result = c.prepare("DELETE FROM novels WHERE id NOT IN (SELECT DISTINCT novel_id FROM chapters)");
const deleted = result.run();
console.log(`Removidas: ${deleted.changes} novels sem capítulos`);

// Also remove orphan tags/relations
c.exec("DELETE FROM novel_tags WHERE novel_id NOT IN (SELECT id FROM novels)");
c.exec("VACUUM");

const remaining = c.prepare("SELECT COUNT(*) as n FROM novels").get() as {n:number};
console.log(`Restantes: ${remaining.n} novels (todas com capítulos)`);

// Check VNs
const vns = c.prepare("SELECT COUNT(*) as n FROM novels WHERE type='visual-novel'").get() as {n:number};
console.log(`VNs restantes: ${vns.n}`);
