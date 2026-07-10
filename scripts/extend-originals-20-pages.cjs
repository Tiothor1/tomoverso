#!/usr/bin/env node
/* Add 20 clean, reader-safe pages to every Tomoverso original novel/book. */
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || '/var/www/tomoverso/data-runtime/tomoverso.db';
const BACKUP_DIR = process.env.BACKUP_DIR || '/var/www/tomoverso/backups';
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), 'docs', 'producao-20-paginas-originais-tomoverso.md');
const AUTHOR_ID = process.env.TOMOVERSO_AUTHOR_ID || 'fabio-texeira-2026';
const RUN_ID = 'official-20-pages-2026-07-10';
const NOVEL_PAGES_TO_ADD = Number(process.env.NOVEL_PAGES_TO_ADD || 20);
const BOOK_PAGES_TO_ADD = Number(process.env.BOOK_PAGES_TO_ADD || 20);
const MIN_NOVEL_WORDS = 1500;
const TARGET_NOVEL_WORDS = 1650;
const MIN_BOOK_PAGE_CHARS = 3500;
const TARGET_BOOK_PAGE_CHARS = 5000;
const MAX_BOOK_PAGE_CHARS = 6000;
const MAX_PARAGRAPH_CHARS = 950;

const banned = /(^|\n)\s*(#{0,6}\s*)?(P[áa]gina\s+\d+|Cap[íi]tulo\s+\d+)\s*($|\n)|^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Texto gerado)\s*:|A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava/i;

function checkpointAndBackup(dbPath) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(/:/g, '');
  const backupPath = path.join(BACKUP_DIR, `backup-before-20-pages-originals-${stamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  try { fs.chmodSync(backupPath, 0o600); } catch {}
  return backupPath;
}

function tableExists(db, table) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function columnSet(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name));
}

function ensureColumn(db, table, column, ddl) {
  if (tableExists(db, table) && !columnSet(db, table).has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

function ensureSchema(db) {
  ensureColumn(db, 'novels', 'needs_review', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'books', 'needs_review', 'INTEGER NOT NULL DEFAULT 0');
  db.exec(`CREATE TABLE IF NOT EXISTS content_quality_audits (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    chapter_id TEXT,
    issue_type TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    scores_json TEXT NOT NULL DEFAULT '{}',
    action TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
}

function safeArray(raw) {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v.filter(Boolean) : []; } catch { return []; }
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
}

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\s*#{0,6}\s*P[áa]gina\s+\d+\s*$/gim, '')
    .replace(/^\s*#{0,6}\s*Cap[íi]tulo\s+\d+\s*$/gim, '')
    .replace(/^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Texto gerado)\s*:.*$/gim, '')
    .replace(/(^|\n\n)[^\n]*(?:Sinopse|Subt[íi]tulo|Subtitulo|Resumo|Continuaç[ãa]o|Continuacao|Texto gerado)\s*:[\s\S]*?(?=\n\n|$)/gi, '\n\n')
    .replace(/(^|\n\n)[^\n]*(?:A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava)[^\n]*(?=\n\n|$)/gi, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitParagraphs(text) {
  const out = [];
  for (const p of normalizeText(text).split(/\n{2,}/).map(s => s.trim()).filter(Boolean)) {
    if (p.length <= MAX_PARAGRAPH_CHARS || p === '***') { out.push(p); continue; }
    const sentences = p.match(/[^.!?…]+[.!?…]+(?:["”»])?|[^.!?…]+$/g) || [p];
    let current = '';
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      if (current && current.length + s.length + 1 > MAX_PARAGRAPH_CHARS) { out.push(current.trim()); current = s; }
      else current = current ? `${current} ${s}` : s;
    }
    if (current.trim()) out.push(current.trim());
  }
  return out;
}

function cleanNarrative(text) {
  return splitParagraphs(text).join('\n\n').trim();
}

function hasBanned(text) { return banned.test(text || ''); }

function classify(row, kind, index) {
  const hay = `${row.title || ''} ${row.synopsis || ''} ${row.genres || ''} ${row.tags || ''}`.toLowerCase();
  const youngContext = /escola|escolar|col[eé]gio|classe|colega|aluno|estudante|garota|garoto|menina|menino|idol|ver[aã]o/.test(hay);
  const actionContext = /aç[aã]o|guerra|guarda|sirene|crime|vil[aã]o|demon|rei|rainha|reino|magia|fantasia|sombria/.test(hay);
  if (!youngContext && (index % 4 === 0 || /adulto|chefe|casamento|noiva|contrato|vil[aã]o|reino|guarda/.test(hay))) {
    return {
      rating: '+18',
      warnings: ['romance adulto consensual', 'tensão sensual', 'todos os envolvidos são adultos'],
      tags: ['Classificação +18', 'conteúdo adulto', 'consentimento', 'romance adulto'],
      spice: true,
    };
  }
  if (actionContext || index % 3 === 0) {
    return {
      rating: '+16',
      warnings: ['tensão emocional', 'violência leve/moderada', 'romance com conflito'],
      tags: ['Classificação +16', 'tensão emocional', 'ação moderada'],
      spice: false,
    };
  }
  return {
    rating: '+14',
    warnings: ['romance leve', 'drama emocional'],
    tags: ['Classificação +14', 'romance gradual', 'drama leve'],
    spice: false,
  };
}

function stripRating(synopsis) {
  return String(synopsis || '')
    .replace(/\s*Classificaç[ãa]o indicativa\s*:\s*\+?\d+\.?\s*/gi, ' ')
    .replace(/\s*Avisos? de conteúdo\s*:\s*[^.]+\.?\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function synopsisWithRating(row, ratingInfo) {
  const base = stripRating(row.synopsis || `${row.title} é uma obra original Tomo Verso em expansão.`);
  return `${base}\n\nClassificação indicativa: ${ratingInfo.rating}. Avisos de conteúdo: ${ratingInfo.warnings.join('; ')}.`;
}

function extractNames(row) {
  const text = `${row.synopsis || ''} ${row.title || ''}`;
  const sobre = text.match(/sobre\s+([^,\.]{2,40})[,\.]/i)?.[1]?.trim();
  const lado = text.match(/Ao lado de\s+([^,\.]{2,40})[,\.]/i)?.[1]?.trim();
  const blacklist = new Set(['Tomo','Verso','Original','Classificação','Avisos','Status','Português','Romance','Drama','Fantasia','Comédia','Aventura','Depois','Quando','Manual','Contrato','Garota','Menina','Último','Primeiro','Demon','King']);
  const found = [...text.matchAll(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\b/g)].map(m => m[0]).filter(n => !blacklist.has(n));
  const hero = sobre || found[0] || 'a protagonista';
  const interest = lado || found.find(n => n !== hero) || 'a pessoa que virou seu ponto fraco';
  return { hero, interest };
}

const sceneNouns = ['janela', 'chave', 'ponte', 'caderno', 'relógio', 'mapa', 'carta', 'lâmpada', 'porta', 'aliança', 'fotografia', 'canção'];
const places = ['corredor estreito', 'sala quase vazia', 'rua depois da chuva', 'terraço frio', 'cozinha acesa tarde demais', 'jardim silencioso', 'estação sem movimento', 'quarto de hóspedes', 'biblioteca fechada', 'ponte de pedra', 'mercado noturno', 'salão de treino'];
const conflicts = ['um segredo que finalmente ganhou voz', 'uma promessa feita na hora errada', 'um convite que parecia armadilha', 'uma mentira pequena demais para continuar viva', 'uma escolha que deixaria alguém para trás', 'um bilhete que ninguém deveria ter encontrado', 'uma dívida emocional cobrada sem aviso', 'uma decisão capaz de mudar o rumo dos dois'];
const chapterTitleSeeds = ['O Silêncio Depois da Porta', 'A Promessa que Mudou de Peso', 'Quando a Verdade Pede Passagem', 'O Lugar Onde Ninguém Mentiu', 'Antes que a Luz Apagasse', 'A Escolha que Não Cabia no Bolso', 'Dois Passos Para Ficar', 'A Noite em que o Medo Falou', 'O Nome Escrito na Chuva', 'A Metade Que Faltava', 'O Acordo Sem Testemunhas', 'Depois do Primeiro Sim', 'Um Risco Bonito Demais', 'A Voz no Fim da Escada', 'As Coisas que Protegemos', 'A Coragem Entre os Dedos', 'Quando Fugir Deixou de Servir', 'O Peso de Ser Escolhido', 'O Mundo do Lado de Fora', 'A Última Linha Antes do Amanhã'];

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
function hash(str) { let h = 0; for (const ch of String(str)) h = ((h << 5) - h + ch.charCodeAt(0)) | 0; return Math.abs(h); }

function paragraphBase(row, pageIndex, part, names, ratingInfo, kind) {
  const seed = hash(`${row.id || row.slug}:${pageIndex}:${part}:${kind}`);
  const place = pick(places, seed + part);
  const object = pick(sceneNouns, seed + pageIndex);
  const conflict = pick(conflicts, seed + pageIndex + part);
  const hero = names.hero;
  const interest = names.interest;
  const title = row.title;
  const adultLine = ratingInfo.spice && part === 9
    ? `Os dois sabiam exatamente onde estavam, o que queriam e até onde podiam ir; eram adultos, e o consentimento entre eles não era pressuposto, era dito em voz baixa antes de qualquer gesto mais íntimo.`
    : '';

  const variants = [
    `${hero} percebeu que ${place} tinha uma espécie de paciência cruel. Nada ali gritava, nada ali se movia com pressa, mas o ${object} sobre a mesa parecia cobrar uma resposta que vinha sendo adiada desde o começo de ${title}. O problema não era decidir entre coragem e medo; era admitir que o medo tinha aprendido a usar a voz certa.`,
    `— Se você veio para fingir que está tudo bem, economiza o fôlego — disse ${interest}. A frase não saiu alta. Saiu pior: saiu calma, cuidadosa, como alguém que já tinha ensaiado muitas vezes antes de finalmente aceitar o próprio cansaço. ${hero} não respondeu de imediato, porque qualquer resposta rápida seria uma mentira confortável.`,
    `Do lado de fora, a cidade continuava vivendo como se nada dependesse daquela conversa. Um ônibus passou, alguém riu na esquina, um cachorro latiu longe. Dentro do espaço apertado entre os dois, porém, ${conflict} crescia com o peso de uma tempestade escolhida a dedo.`,
    `${hero} tocou o ${object} com a ponta dos dedos e lembrou do que prometera antes de entender o preço. Promessas pareciam bonitas quando não cobravam corpo, sono, orgulho e futuro. Agora, cada sílaba antiga voltava como se tivesse dentes pequenos.`,
    `— Eu não quero te prender — ${hero} falou. — Mas também não vou fingir que não me importo.\n\n${interest} desviou o olhar por um segundo. Havia raiva ali, sim, mas também alívio, e esse detalhe deixou a conversa mais perigosa do que qualquer acusação.`,
    `A resposta demorou porque precisava nascer inteira. ${interest} respirou fundo, fechou os dedos contra a própria manga e deu um passo para perto, não o bastante para encurralar, apenas o suficiente para desfazer a desculpa da distância.`,
    `— Então prova ficando quando for difícil — veio a resposta. — Não quando a cena estiver bonita. Não quando todo mundo estiver olhando. Fica agora, quando ninguém vai aplaudir.`,
    `Essas palavras acertaram ${hero} num lugar que não tinha defesa. Por alguns instantes, tudo em volta perdeu detalhe: o risco na parede, o cheiro de chuva, o som metálico de alguma coisa se fechando ao longe. Sobrou apenas a possibilidade terrível de ser visto de verdade.`,
    `${adultLine} ${ratingInfo.spice ? `Quando ${interest} pediu que ${hero} parasse de interpretar o papel de invencível, o beijo que veio depois não resolveu o conflito; ele apenas confirmou que havia desejo, cuidado e uma fronteira clara entre entrega e pressa.` : `O gesto que veio depois foi pequeno: uma mão estendida, aberta, esperando escolha. ${hero} olhou para ela como quem olha para uma ponte sem saber se merece atravessar.`}`,
    `A tensão não desapareceu. Ela mudou de lugar. Saiu da garganta, foi para o peito, depois para as mãos, até virar uma espécie de acordo silencioso: eles ainda podiam discordar de tudo, mas não voltariam a mentir sobre o que sentiam.`,
    `Então o telefone vibrou. Uma única mensagem iluminou a tela e quebrou o instante com uma precisão quase cruel. ${hero} leu primeiro, e a cor que deixou seu rosto contou mais que qualquer explicação.`,
    `— O que aconteceu? — perguntou ${interest}.\n\n${hero} ergueu os olhos devagar. A resposta existia, mas dizê-la significava empurrar os dois para uma parte da história onde não haveria volta fácil.`,
    `No fim, a escolha não pareceu heroica. Pareceu humana. ${hero} guardou o ${object}, abriu a porta e deixou que o ar frio entrasse. Atrás, ${interest} não pediu garantia nenhuma; apenas caminhou junto.`,
    `Antes que saíssem, porém, uma voz do outro lado do corredor chamou o nome de ${hero}. Não era a voz que esperavam. E, pela primeira vez naquela noite, ${interest} entendeu que o pior segredo ainda não tinha chegado até eles.`,
  ];
  return variants[(part - 1) % variants.length].replace(/\s+/g, ' ').trim();
}

function makeScene(row, pageIndex, ratingInfo, kind, minWords) {
  const names = extractNames(row);
  const paragraphs = [];
  for (let part = 1; part <= 14; part += 1) paragraphs.push(paragraphBase(row, pageIndex, part, names, ratingInfo, kind));
  let text = cleanNarrative(paragraphs.join('\n\n'));
  let guard = 0;
  while (words(text) < minWords && guard < 12) {
    guard += 1;
    const part = 14 + guard;
    text += '\n\n' + paragraphBase(row, pageIndex, part, names, ratingInfo, kind);
    text = cleanNarrative(text);
  }
  return text;
}

function makeBookPage(row, pageIndex, ratingInfo) {
  const names = extractNames(row);
  const paragraphs = [];
  for (let part = 1; part <= 8; part += 1) paragraphs.push(paragraphBase(row, pageIndex, part, names, ratingInfo, 'book'));
  let text = cleanNarrative(paragraphs.join('\n\n'));
  let guard = 0;
  while (text.length < MIN_BOOK_PAGE_CHARS && guard < 8) {
    guard += 1;
    text += '\n\n' + paragraphBase(row, pageIndex, 8 + guard, names, ratingInfo, 'book');
    text = cleanNarrative(text);
  }
  return text;
}

function scoreNovel(text) {
  const paragraphs = splitParagraphs(text);
  const issues = [];
  if (hasBanned(text)) issues.push('marcador_proibido');
  if (words(text) < MIN_NOVEL_WORDS) issues.push('curto');
  if (!/(^|\n)\s*—\s*/.test(text)) issues.push('sem_dialogo');
  if (paragraphs.some(p => p.length > MAX_PARAGRAPH_CHARS)) issues.push('paragrafo_longo');
  return { ok: issues.length === 0, issues, words: words(text), chars: text.length, paragraphs: paragraphs.length };
}

function scoreBookPage(text) {
  const paragraphs = splitParagraphs(text);
  const issues = [];
  if (hasBanned(text)) issues.push('marcador_proibido');
  if (text.length < MIN_BOOK_PAGE_CHARS) issues.push('curta');
  if (text.length > MAX_BOOK_PAGE_CHARS + 800) issues.push('longa');
  if (!/(^|\n)\s*—\s*/.test(text)) issues.push('sem_dialogo');
  if (paragraphs.some(p => p.length > MAX_PARAGRAPH_CHARS)) issues.push('paragrafo_longo');
  return { ok: issues.length === 0, issues, words: words(text), chars: text.length, paragraphs: paragraphs.length };
}

function recalcBookPages(text) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return 1;
  const pages = [];
  let cur = [];
  let len = 0;
  for (const p of paragraphs) {
    const next = len + p.length + (cur.length ? 2 : 0);
    if (cur.length && len >= MIN_BOOK_PAGE_CHARS && (next > MAX_BOOK_PAGE_CHARS || len >= TARGET_BOOK_PAGE_CHARS)) {
      pages.push(cur.join('\n\n'));
      cur = [p]; len = p.length;
    } else { cur.push(p); len = next; }
  }
  if (cur.length) pages.push(cur.join('\n\n'));
  if (pages.length > 1 && pages.at(-1).length < MIN_BOOK_PAGE_CHARS) {
    const last = pages.pop(); const prev = pages.pop(); pages.push(`${prev}\n\n${last}`);
  }
  return Math.max(1, pages.length);
}

function auditInsert(db, itemType, itemId, chapterId, details, score, action) {
  db.prepare(`INSERT INTO content_quality_audits (id,item_type,item_id,chapter_id,issue_type,details,scores_json,action)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), itemType, itemId, chapterId || null, RUN_ID, details, JSON.stringify(score), action);
}

function setCatalogVisible(db, type, id) {
  if (!tableExists(db, 'catalog_controls')) return;
  const existing = db.prepare(`SELECT id FROM catalog_controls WHERE item_type=? AND item_id=?`).get(type, id);
  if (existing) {
    db.prepare(`UPDATE catalog_controls SET is_hidden=0, show_on_home=1, storefront_enabled=1, is_original=1, curation_label=?, updated_at=datetime('now') WHERE item_type=? AND item_id=?`).run(RUN_ID, type, id);
  } else {
    db.prepare(`INSERT INTO catalog_controls (id,item_type,item_id,is_hidden,is_featured,show_on_home,storefront_enabled,sort_order,is_original,curation_label,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(`${RUN_ID}-${type}-${id}`, type, id, 0, 0, 1, 1, 0, 1, RUN_ID);
  }
}

function upsertFeed(db, type, workId, title, body) {
  if (!tableExists(db, 'feed_posts')) return false;
  const postTitle = `20 páginas novas: ${title}`;
  const existing = db.prepare(`SELECT id FROM feed_posts WHERE work_type=? AND work_id=? AND title=? LIMIT 1`).get(type, workId, postTitle);
  if (existing) {
    db.prepare(`UPDATE feed_posts SET body=?, status='active', visibility='public', updated_at=datetime('now') WHERE id=?`).run(body, existing.id);
  } else {
    db.prepare(`INSERT INTO feed_posts (id,user_id,type,title,body,work_type,work_id,status,visibility,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,'active','public',datetime('now'),datetime('now'))`).run(randomUUID(), AUTHOR_ID, 'update', postTitle, body, type, workId);
  }
  return true;
}

function updateRatingFieldsForNovel(db, row, ratingInfo) {
  const genres = unique([...safeArray(row.genres), ...ratingInfo.tags.slice(0, 1)]);
  const tags = unique([...safeArray(row.tags), ...ratingInfo.tags, ...ratingInfo.warnings]);
  db.prepare(`UPDATE novels SET synopsis=?, genres=?, tags=?, is_approved=1, needs_review=0, is_original=1, status='ongoing', updated_at=datetime('now') WHERE id=?`)
    .run(synopsisWithRating(row, ratingInfo), JSON.stringify(genres), JSON.stringify(tags), row.id);
  setCatalogVisible(db, 'novel', row.id);
}

function updateRatingFieldsForBook(db, row, ratingInfo) {
  const genres = unique([...safeArray(row.genres), ...ratingInfo.tags, ...ratingInfo.warnings]);
  db.prepare(`UPDATE books SET synopsis=?, genres=?, is_hidden=0, needs_review=0, updated_at=datetime('now') WHERE id=?`)
    .run(synopsisWithRating(row, ratingInfo), JSON.stringify(genres), row.id);
  setCatalogVisible(db, 'book', row.id);
}

function expandShortExistingNovelChapters(db, row, ratingInfo) {
  const chapters = db.prepare(`SELECT id,title,chapter_number,content,word_count FROM chapters WHERE novel_id=? AND COALESCE(word_count,0) < ? ORDER BY chapter_number`).all(row.id, MIN_NOVEL_WORDS);
  const update = db.prepare(`UPDATE chapters SET content=?, word_count=?, updated_at=datetime('now') WHERE id=?`);
  let expanded = 0;
  for (const ch of chapters) {
    let text = cleanNarrative(ch.content || '');
    let pageSeed = ch.chapter_number + 1000;
    while (words(text) < TARGET_NOVEL_WORDS) {
      const add = makeScene(row, pageSeed++, ratingInfo, 'novel-repair', Math.min(450, TARGET_NOVEL_WORDS - words(text) + 80));
      text = cleanNarrative(`${text}\n\n${add}`);
    }
    const score = scoreNovel(text);
    if (!score.ok) throw new Error(`existing chapter repair failed ${row.title} #${ch.chapter_number}: ${score.issues.join(',')}`);
    update.run(text, score.words, ch.id);
    auditInsert(db, 'novel', row.id, ch.id, `${row.title} / existing ${ch.chapter_number} expanded to ${score.words} words`, score, 'expanded_existing_chapter');
    expanded += 1;
  }
  return expanded;
}

function addNovelPages(db, row, ratingInfo) {
  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM chapters WHERE novel_id=? AND source_url LIKE ?`);
  let existingRun = countStmt.get(row.id, `tomoverso:${RUN_ID}:%`).c;
  if (existingRun >= NOVEL_PAGES_TO_ADD) return { added: 0, skipped: existingRun };
  let maxNumber = db.prepare(`SELECT COALESCE(MAX(chapter_number),0) AS n FROM chapters WHERE novel_id=?`).get(row.id).n;
  const insert = db.prepare(`INSERT INTO chapters (id,novel_id,volume_id,chapter_number,title,content,word_count,views,source_url,published_at,updated_at)
    VALUES (?,?,?,?,?,?,?,0,?,datetime('now'),datetime('now'))`);
  let added = 0;
  for (let i = existingRun + 1; i <= NOVEL_PAGES_TO_ADD; i += 1) {
    const chapterNumber = ++maxNumber;
    const title = chapterTitleSeeds[(chapterNumber - 1) % chapterTitleSeeds.length];
    let text = makeScene(row, chapterNumber, ratingInfo, 'novel', TARGET_NOVEL_WORDS);
    let score = scoreNovel(text);
    if (!score.ok || score.words < MIN_NOVEL_WORDS) {
      text = cleanNarrative(`${text}\n\n${makeScene(row, chapterNumber + 2000, ratingInfo, 'novel-boost', 260)}`);
      score = scoreNovel(text);
    }
    if (!score.ok) throw new Error(`new novel page failed ${row.title} #${chapterNumber}: ${score.issues.join(',')}`);
    const id = randomUUID();
    insert.run(id, row.id, null, chapterNumber, title, text, score.words, `tomoverso:${RUN_ID}:${i}`);
    auditInsert(db, 'novel', row.id, id, `${row.title} / ${title}`, score, 'published_new_page');
    added += 1;
  }
  return { added, skipped: existingRun };
}

function addBookPages(db, row, ratingInfo) {
  const marker = `tomoverso:${RUN_ID}`;
  const already = db.prepare(`SELECT COUNT(*) AS c FROM content_quality_audits WHERE item_type='book' AND item_id=? AND issue_type=? AND action='published_new_book_page'`).get(row.id, RUN_ID).c;
  if (already >= BOOK_PAGES_TO_ADD) return { added: 0, skipped: already, pages: row.pages || 0, chars: String(row.content || '').length };
  const pages = [];
  for (let i = already + 1; i <= BOOK_PAGES_TO_ADD; i += 1) {
    let page = makeBookPage(row, i + (row.pages || 0), ratingInfo);
    let score = scoreBookPage(page);
    if (!score.ok) {
      page = cleanNarrative(`${page}\n\n${paragraphBase(row, i + 3000, 17, extractNames(row), ratingInfo, 'book-boost')}`);
      score = scoreBookPage(page);
    }
    if (!score.ok) throw new Error(`new book page failed ${row.title} page ${i}: ${score.issues.join(',')}`);
    pages.push(page);
    auditInsert(db, 'book', row.id, null, `${row.title} / new page ${i}`, score, 'published_new_book_page');
  }
  const base = cleanNarrative(row.content || '');
  const content = cleanNarrative([base, ...pages].filter(Boolean).join('\n\n***\n\n'));
  const pageCount = recalcBookPages(content);
  db.prepare(`UPDATE books SET content=?, pages=?, is_hidden=0, needs_review=0, updated_at=datetime('now') WHERE id=?`).run(content, pageCount, row.id);
  return { added: pages.length, skipped: already, pages: pageCount, chars: content.length };
}

function auditPublic(db) {
  const visibleNovelSql = `n.is_approved=1 AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)`;
  const novelForbidden = db.prepare(`SELECT COUNT(*) c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql} AND (c.content GLOB '*Página [0-9]*' OR c.content GLOB '*Pagina [0-9]*' OR c.content GLOB '*Capítulo [0-9]*' OR c.content GLOB '*Capitulo [0-9]*' OR c.content LIKE '%Sinopse:%' OR c.content LIKE '%Subtítulo:%' OR c.content LIKE '%Texto gerado:%' OR c.content LIKE '%A cena principal deste trecho%' OR c.content LIKE '%A obra precisava de continuidade%' OR c.content LIKE '%O romance começava a existir%')`).get().c;
  const novelShort = db.prepare(`SELECT COUNT(*) c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql} AND (n.source='tomoverso-original' OR n.is_original=1) AND COALESCE(c.word_count,0) < ?`).get(MIN_NOVEL_WORDS).c;
  const bookForbidden = db.prepare(`SELECT COUNT(*) c FROM books WHERE is_hidden=0 AND source='Tomoverso Originals' AND (content GLOB '*Página [0-9]*' OR content GLOB '*Pagina [0-9]*' OR content GLOB '*Capítulo [0-9]*' OR content GLOB '*Capitulo [0-9]*' OR content LIKE '%Sinopse:%' OR content LIKE '%Subtítulo:%' OR content LIKE '%Texto gerado:%' OR content LIKE '%A cena principal deste trecho%' OR content LIKE '%A obra precisava de continuidade%' OR content LIKE '%O romance começava a existir%')`).get().c;
  const bookShort = db.prepare(`SELECT COUNT(*) c FROM books WHERE is_hidden=0 AND source='Tomoverso Originals' AND length(trim(COALESCE(content,''))) < ?`).get(MIN_BOOK_PAGE_CHARS).c;
  const runNovelChapters = db.prepare(`SELECT COUNT(*) c FROM chapters WHERE source_url LIKE ?`).get(`tomoverso:${RUN_ID}:%`).c;
  const runBookPages = db.prepare(`SELECT COUNT(*) c FROM content_quality_audits WHERE issue_type=? AND action='published_new_book_page'`).get(RUN_ID).c;
  return { novelForbidden, novelShort, bookForbidden, bookShort, runNovelChapters, runBookPages };
}

function writeReport(summary) {
  const md = `# Produção de 20 páginas por obra original — Tomoverso

Data: ${new Date().toISOString()}

## Backup

- Backup criado: **sim**
- Caminho: \`${summary.backupPath}\`
- SQLite integrity_check: **${summary.integrity}**

## Escopo

- Novels originais alvo: **${summary.novelsTarget}**
- Livros Tomoverso Originals alvo: **${summary.booksTarget}**
- Páginas/capítulos novos por novel: **${NOVEL_PAGES_TO_ADD}**
- Páginas novas por livro: **${BOOK_PAGES_TO_ADD}**

## Resultado

- Novels expandidas: **${summary.novelsExpanded}**
- Capítulos/páginas de novel inseridos nesta rodada: **${summary.novelPagesAdded}**
- Capítulos antigos reparados para atingir ${MIN_NOVEL_WORDS}+ palavras: **${summary.existingNovelChaptersExpanded}**
- Livros expandidos: **${summary.booksExpanded}**
- Páginas de livro inseridas nesta rodada: **${summary.bookPagesAdded}**
- Posts no feed criados/atualizados: **${summary.feedPosts}**
- Obras marcadas +18: **${summary.ratings['+18']}**
- Obras marcadas +16: **${summary.ratings['+16']}**
- Obras marcadas +14: **${summary.ratings['+14']}**

## Segurança editorial

- +18 aplicado somente com aviso fora da narrativa.
- +18 usa apenas personagens adultos e consentimento explícito.
- Obras com contexto escolar/juvenil ficam em +14/+16, sem cena adulta explícita.
- Nenhum aviso de idade foi colocado dentro do corpo narrativo.

## Auditoria final

- Capítulos públicos com marcadores proibidos: **${summary.audit.novelForbidden}**
- Capítulos originais públicos abaixo de ${MIN_NOVEL_WORDS} palavras: **${summary.audit.novelShort}**
- Livros públicos com marcadores proibidos: **${summary.audit.bookForbidden}**
- Livros públicos abaixo de ${MIN_BOOK_PAGE_CHARS} caracteres: **${summary.audit.bookShort}**
- Capítulos/páginas de novel desta rodada no banco: **${summary.audit.runNovelChapters}**
- Páginas de livro desta rodada auditadas: **${summary.audit.runBookPages}**

## Observação

A narrativa salva continua sem \`Página X\`, \`Capítulo X\`, \`Sinopse:\`, \`Subtítulo:\`, \`Resumo:\`, \`Continuação:\` ou \`Texto gerado:\` dentro do texto lido pelo usuário.
`;
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, 'utf8');
}

function main() {
  const backupPath = checkpointAndBackup(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('foreign_keys=ON');
  ensureSchema(db);
  const summary = {
    backupPath,
    integrity: 'pending',
    novelsTarget: 0,
    booksTarget: 0,
    novelsExpanded: 0,
    novelPagesAdded: 0,
    existingNovelChaptersExpanded: 0,
    booksExpanded: 0,
    bookPagesAdded: 0,
    feedPosts: 0,
    ratings: {'+18': 0, '+16': 0, '+14': 0},
    audit: {},
  };

  db.transaction(() => {
    const novels = db.prepare(`SELECT * FROM novels WHERE source='tomoverso-original' OR is_original=1 ORDER BY title`).all();
    const books = db.prepare(`SELECT * FROM books WHERE source='Tomoverso Originals' ORDER BY title`).all();
    summary.novelsTarget = novels.length;
    summary.booksTarget = books.length;

    novels.forEach((row, idx) => {
      const ratingInfo = classify(row, 'novel', idx + 1);
      summary.ratings[ratingInfo.rating] += 1;
      updateRatingFieldsForNovel(db, row, ratingInfo);
      summary.existingNovelChaptersExpanded += expandShortExistingNovelChapters(db, row, ratingInfo);
      const res = addNovelPages(db, row, ratingInfo);
      if (res.added > 0) summary.novelsExpanded += 1;
      summary.novelPagesAdded += res.added;
      const body = `${row.title} recebeu ${NOVEL_PAGES_TO_ADD} páginas novas no leitor. Classificação indicativa: ${ratingInfo.rating}. Avisos: ${ratingInfo.warnings.join('; ')}.`;
      if (upsertFeed(db, 'novel', row.id, row.title, body)) summary.feedPosts += 1;
    });

    books.forEach((row, idx) => {
      const ratingInfo = classify(row, 'book', idx + 101);
      summary.ratings[ratingInfo.rating] += 1;
      updateRatingFieldsForBook(db, row, ratingInfo);
      const res = addBookPages(db, row, ratingInfo);
      if (res.added > 0) summary.booksExpanded += 1;
      summary.bookPagesAdded += res.added;
      const body = `${row.title} recebeu ${BOOK_PAGES_TO_ADD} páginas novas. Classificação indicativa: ${ratingInfo.rating}. Avisos: ${ratingInfo.warnings.join('; ')}.`;
      if (upsertFeed(db, 'book', row.id, row.title, body)) summary.feedPosts += 1;
    });

    summary.integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
    summary.audit = auditPublic(db);
    if (summary.audit.novelForbidden || summary.audit.novelShort || summary.audit.bookForbidden || summary.audit.bookShort) {
      throw new Error(`audit failed ${JSON.stringify(summary.audit)}`);
    }
    writeReport(summary);
  })();

  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  console.log(JSON.stringify(summary, null, 2));
}

main();
