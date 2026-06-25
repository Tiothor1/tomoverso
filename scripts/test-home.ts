import { getDb } from "../src/lib/db";

async function main() {
  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");
    const r1 = db.prepare("SELECT COUNT(DISTINCT novel_id) AS c FROM chapters").get();
    console.log("novel chapters:", r1);
    const r2 = db.prepare("SELECT COUNT(*) AS c FROM mangas").get();
    console.log("mangas:", r2);
    const r3 = db.prepare("SELECT COUNT(*) AS c FROM manga_chapters").get();
    console.log("manga chapters:", r3);
    const top = db.prepare(`
      SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path,
             (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
      FROM mangas m
      WHERE (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) > 0
      ORDER BY chapter_count DESC LIMIT 5
    `).all();
    console.log("top mangas:", top.length);
    const novels = db.prepare(`
      SELECT n.id, n.slug, n.title, n.alternative_titles, n.synopsis, n.cover_url, n.cover_local_path, n.type, n.genres
      FROM novels n
      WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
      ORDER BY n.is_featured DESC, n.views DESC LIMIT 20
    `).all();
    console.log("novels:", novels.length);
    const filtered = novels.filter((n: any) => !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(n.title)).slice(0, 6);
    console.log("filtered:", filtered.length);
    console.log("OK");
  } catch (e: any) {
    console.error("ERRO:", e.message);
    console.error(e.stack?.slice(0, 500));
  }
}
main();
