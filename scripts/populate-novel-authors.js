const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const DB = new Database(path.join(process.cwd(), 'data', 'tomoverso.db'));
DB.pragma('journal_mode = WAL');

const NOVELS = DB.prepare(`
  SELECT n.id, n.slug, n.title, n.source, n.source_url
  FROM novels n
  LEFT JOIN users u ON u.id = n.author_id
  WHERE n.source IN ('centralnovel', 'ao3', 'kakuyomu', 'tomoverso-original')
    AND (u.username = 'fabio_tx')
    AND (n.source != 'tomoverso-original')
`).all();

console.log(JSON.stringify({ novels_to_fix: NOVELS.length }));

async function fetchCN(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
  const h = await r.text();
  const m = h.match(/<b>Autor:<\/b>\s*<a[^>]*>([^<]+)</i);
  return m ? m[1].trim() : null;
}

async function fetchAO3(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
  const h = await r.text();
  const m = h.match(/<a[^>]*rel="author"[^>]*href="\/users\/[^"]+"[^>]*>([^<]+)</i);
  return m ? m[1].trim() : null;
}

async function fetchKakuyomu(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    const h = await r.text();
    const m = h.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i);
    if (m) return m[1];
    const m2 = h.match(/authorName[^>]*>([^<]+)</i);
    return m2 ? m2[1].trim() : null;
  } catch { return null; }
}

function createAuthorUser(displayName) {
  // Gera username a partir do nome
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const username = base || `author-${randomUUID().slice(0, 8)}`;
  
  // Verifica se já existe
  const existing = DB.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return existing.id;

  const id = randomUUID();
  // Senha hash impossível — ninguém loga como autor externo
  const fakeHash = '$2b$10$' + 'x'.repeat(53);
  DB.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name, bio, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, 'author', 1)
  `).run(id, `${username}@external.author`, username, fakeHash, displayName, `Autor(a) externo(a) — ${displayName}`);
  return id;
}

(async () => {
  let found = 0;
  let failed = 0;

  for (const n of NOVELS) {
    let authorName = null;
    try {
      if (n.source === 'centralnovel') authorName = await fetchCN(n.source_url);
      else if (n.source === 'ao3') authorName = await fetchAO3(n.source_url);
      else if (n.source === 'kakuyomu') authorName = await fetchKakuyomu(n.source_url);
    } catch { authorName = null; }

    const slugShort = n.slug.length > 40 ? n.slug.slice(0, 40) + '…' : n.slug;
    if (authorName) {
      const authorId = createAuthorUser(authorName);
      DB.prepare("UPDATE novels SET author_id = ?, updated_at = datetime('now') WHERE id = ?").run(authorId, n.id);
      console.log(`✓ ${slugShort} — ${n.title.slice(0, 45)} → ${authorName}`);
      found++;
    } else {
      console.log(`✗ ${slugShort} — autor não encontrado`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  // Atualiza contagem de novels por autor
  const authorCounts = DB.prepare("SELECT u.display_name, COUNT(*) as c FROM novels n JOIN users u ON u.id = n.author_id GROUP BY u.display_name ORDER BY c DESC LIMIT 20").all();
  console.log('\nAutores por quantidade de obras:');
  for (const a of authorCounts) console.log(`  ${a.display_name}: ${a.c}`);

  console.log(`\nResumo: ${found} atualizados, ${failed} falharam`);
  DB.close();
})();
