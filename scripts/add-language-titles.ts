/**
 * Add title_en, title_jp columns to novels table.
 * Populate them from known data or external lookups.
 */
import Database = require("better-sqlite3");
import { existsSync, writeFileSync } from "fs";

const db = new Database("data/tomoverso.db");

// 1. Add columns (idempotent)
try { db.exec(`ALTER TABLE novels ADD COLUMN title_en TEXT;`); } catch {}
try { db.exec(`ALTER TABLE novels ADD COLUMN title_jp TEXT;`); } catch {}

// 2. Hardcoded known Japanese LN/WebNovel English→Japanese mapping
const KNOWN_JP_MAP: Record<string, { en: string; jp: string }> = {
  "86-eighty-six":                { en: "86: Eighty Six", jp: "86-エイティシックス-" },
  "a-brothers-tale":              { en: "A Brother's Tale", jp: "" },
  "a-monster-who-levels-up":      { en: "A Monster Who Levels Up", jp: "" },
  "a-world-worth-protecting":     { en: "A World Worth Protecting", jp: "" },
  "abe-the-wizard":               { en: "Abe the Wizard", jp: "" },
  "abyss-domination":             { en: "Abyss Domination", jp: "" },
  "advent-of-the-archmage":       { en: "Advent of the Archmage", jp: "" },
  "against-the-gods":             { en: "Against the Gods", jp: "逆天邪神" },
  "ascendance-of-a-bookworm":     { en: "Ascendance of a Bookworm", jp: "本好きの下剋上" },
  "astral-apostle":               { en: "Astral Apostle", jp: "" },
  "begin-after-the-end":          { en: "The Beginning After The End", jp: "" },
  "bible-of-the-adepts":          { en: "Bible of the Adepts", jp: "" },
  "books-jewel-box":              { en: "Books Jewel Box", jp: "" },
  "chaos-emperor":                { en: "Chaos Emperor", jp: "" },
  "close-combat-mage":            { en: "Close Combat Mage", jp: "" },
  "coiling-dragon":               { en: "Coiling Dragon", jp: "盤龍" },
  "douluo-dalu":                  { en: "Douluo Dalu / Soul Land", jp: "斗羅大陸" },
  "dragon-marker":                { en: "Dragon Marker", jp: "" },
  "forty-millenniums-of-cultivation": { en: "Forty Millenniums of Cultivation", jp: "" },
  "god-of-slaughter":             { en: "God of Slaughter", jp: "" },
  "godly-model-creator":          { en: "Godly Model Creator", jp: "" },
  "grasping-evil":                { en: "Grasping Evil", jp: "" },
  "heavens-shadow-company":       { en: "Heaven's Shadow Company", jp: "" },
  "historys-number-1-founder":    { en: "History's Number 1 Founder", jp: "" },
  "i-am-the-monarch":             { en: "I Am the Monarch", jp: "" },
  "imperial-god-emperor":         { en: "Imperial God Emperor", jp: "" },
  "infinite-bloodcore":           { en: "Infinite Bloodcore", jp: "" },
  "invincible":                   { en: "Invincible", jp: "" },
  "kuro-no-kenkou":               { en: "Kuro no Kenkou", jp: "黒の健康" },
  "library-of-heavens-path":      { en: "Library of Heaven's Path", jp: "" },
  "lord-of-mysteries":            { en: "Lord of the Mysteries", jp: "詭秘之主" },
  "martial-god-asura":            { en: "Martial God Asura", jp: "" },
  "martial-peak-novel":           { en: "Martial Peak", jp: "武炼巅峰" },
  "mushoku-tensei":               { en: "Mushoku Tensei", jp: "無職転生" },
  "my-house-of-horrors":          { en: "My House of Horrors", jp: "" },
  "my-wife-is-a-beautiful-ceo":   { en: "My Wife Is a Beautiful CEO", jp: "" },
  "overgeared":                   { en: "Overgeared", jp: "" },
  "pursuit-of-the-truth":         { en: "Pursuit of the Truth", jp: "" },
  "reincarnation-of-the-strongest-sword-god": { en: "Reincarnation of the Strongest Sword God", jp: "" },
  "renegade-immortal":            { en: "Renegade Immortal", jp: "仙逆" },
  "rise-of-the-human-emperor":    { en: "Rise of the Human Emperor", jp: "人皇纪" },
  "sage-monarch":                 { en: "Sage Monarch", jp: "" },
  "shadow-slave":                 { en: "Shadow Slave", jp: "" },
  "shura-wrath":                  { en: "Shura Wrath", jp: "" },
  "solo-leveling-novel":          { en: "Solo Leveling", jp: "俺だけレベルアップな件／나 혼자만 레벨업" },
  "sword-of-coming-dawn":         { en: "Sword of Coming Dawn", jp: "" },
  "tales-of-the-world":           { en: "Tales of the World", jp: "" },
  "taming-master":                { en: "Taming Master", jp: "" },
  "temporal-fish":                { en: "Temporal Fish", jp: "" },
  "the-descendants-of-a-demonic-master": { en: "The Descendants of a Demonic Master", jp: "" },
  "the-divine-ancestor":          { en: "The Divine Ancestor", jp: "" },
  "the-great-ruler":              { en: "The Great Ruler", jp: "大主宰" },
  "the-kings-avatar":             { en: "The King's Avatar", jp: "全职高手" },
  "the-legend-of-the-condor-heroes": { en: "The Legend of the Condor Heroes", jp: "射鵰英雄傳" },
  "the-legendary-mechanic":       { en: "The Legendary Mechanic", jp: "" },
  "the-strongest-system":         { en: "The Strongest System", jp: "" },
  "the-wandering-inn":            { en: "The Wandering Inn", jp: "" },
  "throne-of-the-dragon-king":    { en: "Throne of the Dragon King", jp: "" },
  "tomb-raider-king":             { en: "Tomb Raider King", jp: "" },
  "versatile-mage":               { en: "Versatile Mage", jp: "" },
  "way-of-choices":               { en: "Way of Choices", jp: "择天记" },
  "warlock-of-the-magus-world":   { en: "Warlock of the Magus World", jp: "" },
  "world-of-cultivation":         { en: "World of Cultivation", jp: "" },
  "ze-tian-ji":                   { en: "Ze Tian Ji / Way of Choices", jp: "择天记" },
};

const tx = db.transaction(() => {
  const all = db.prepare("SELECT id, slug, title, source, source_id FROM novels").all() as any[];

  for (const novel of all) {
    const known = KNOWN_JP_MAP[novel.slug];
    let titleEn = novel.title;
    let titleJp = "";

    if (known) {
      titleEn = known.en || novel.title;
      titleJp = known.jp || "";
    }

    // Para obras da kakuyomu, o título atual JÁ é japonês original.
    if (novel.source === "kakuyomu") {
      titleJp = novel.title;
      titleEn = titleEn || "";
    }

    db.prepare("UPDATE novels SET title_en = ?, title_jp = ? WHERE id = ?").run(titleEn, titleJp, novel.id);
  }
});
tx();

const stats = db.prepare(`
  SELECT
    COUNT(*) total,
    SUM(CASE WHEN coalesce(title_jp,'')!='' THEN 1 ELSE 0 END) has_jp,
    SUM(CASE WHEN coalesce(title_en,'')!='' THEN 1 ELSE 0 END) has_en,
    source, COUNT(*) c
  FROM novels GROUP BY source
`).all();
for (const r of stats) console.log(JSON.stringify(r));

console.log("\nSample updates:");
for (const r of db.prepare("SELECT slug, title, title_en, title_jp, source FROM novels LIMIT 12").all()) console.log(JSON.stringify(r));
db.close();
