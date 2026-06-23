import Database from "better-sqlite3";
const d = new Database("data/tomoverso.db", { readonly: true });
console.log("DB live OK:", d.prepare("SELECT COUNT(*) c FROM novels").get());
console.log("chapters:", d.prepare("SELECT COUNT(*) c FROM chapters").get());
d.close();
