const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// Check 3 original novels in detail
const slugs = ['a-chef-e-o-critico-desastrado', 'a-garota-que-consertava-constelacoes', 'demon-king'];
slugs.forEach(slug => {
  const n = s.prepare("SELECT title, synopsis, tone, classification_rating, content_warnings, subtitle, tagline FROM novels WHERE slug = ?").get(slug);
  if (n) {
    console.log(`\n=== ${n.title} ===`);
    console.log(`SYNOPSIS: ${n.synopsis?.slice(0,500)}`);
    console.log(`TONE: ${n.tone}`);
    console.log(`CLASS: ${n.classification_rating}`);
    console.log(`WARN: ${n.content_warnings}`);
    console.log(`SUB: ${n.subtitle}`);
    console.log(`TAGLINE: ${n.tagline}`);
  }
});

// Check imported novel for source notes
console.log(`\n=== Solo Leveling ===`);
const sl = s.prepare("SELECT synopsis FROM novels WHERE slug = 'solo-leveling'").get();
if (sl) console.log(sl.synopsis?.slice(-200));

// Check a visual novel
console.log(`\n=== CLANNAD ===`);
const cl = s.prepare("SELECT synopsis FROM novels WHERE slug = 'clannad'").get();
if (cl) console.log(cl.synopsis?.slice(-300));

s.close();
