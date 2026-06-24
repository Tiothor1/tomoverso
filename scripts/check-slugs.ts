import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");
const r = c
  .prepare(
    "SELECT slug, chapter_number FROM manga_chapters WHERE manga_id = (SELECT id FROM mangas WHERE slug = 'solo-max-level-newbie') ORDER BY chapter_number LIMIT 3"
  )
  .all();
console.log("Solo Max Level caps:");
console.log(r);

console.log("\nBlue Lock caps:");
console.log(
  c
    .prepare(
      "SELECT slug, chapter_number FROM manga_chapters WHERE manga_id = (SELECT id FROM mangas WHERE slug = 'blue-lock-manga-pt-br') ORDER BY chapter_number LIMIT 3"
    )
    .all()
);