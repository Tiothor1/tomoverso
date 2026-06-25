import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { gunzipSync } from "zlib";

function getDbDir(): string {
  // Em Vercel, o filesystem é read-only fora de /tmp
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "/tmp/tomoverso";
  }
  return path.join(process.cwd(), "data");
}

const DB_DIR = getDbDir();
const DB_PATH = path.join(DB_DIR, "tomoverso.db");

// Em produção (Vercel): o caminho bundled é o "seed" commitado no repo
// (data/tomoverso.seed.db). Em dev: não tem seed, usa o DB local.
const SEED_PATH = (process.env.VERCEL || process.env.NODE_ENV === "production")
  ? path.join(process.cwd(), "data", "tomoverso.seed.db")
  : "";

declare global {
  // eslint-disable-next-line no-var
  var __tomoverso_db: Database.Database | undefined;
}

function createDb() {
  if (!existsSync(DB_DIR)) {
    try {
      mkdirSync(DB_DIR, { recursive: true });
    } catch (e) {
      // ignore em ambiente read-only
    }
  }

  // Em produção (Vercel), se /tmp/tomoverso.db não existe (cold start),
  // tenta copiar do seed (binário ou .gz comprimido).
  if ((process.env.VERCEL || process.env.NODE_ENV === "production") && !existsSync(DB_PATH)) {
    if (SEED_PATH && existsSync(SEED_PATH)) {
      // Verifica se seed é LFS pointer (muito pequeno pra ser DB real)
      const seedStat = statSync(SEED_PATH);
      if (seedStat.size > 1024) {
        // Seed real
        try {
          console.log(`[db] Cold start: copying seed ${SEED_PATH} → ${DB_PATH}`);
          copyFileSync(SEED_PATH, DB_PATH);
        } catch (e) {
          console.error("[db] Seed copy failed:", e);
        }
      }
    }
    // Fallback: tenta .gz comprimido
    const gzPath = SEED_PATH + ".gz";
    if (!existsSync(DB_PATH) && existsSync(gzPath)) {
      try {
        console.log(`[db] Cold start: decompressing ${gzPath} → ${DB_PATH}`);
        const raw = gunzipSync(readFileSync(gzPath));
        writeFileSync(DB_PATH, raw);
        console.log(`[db] Decompressed ${(raw.length / 1024 / 1024).toFixed(0)}MB`);
      } catch (e) {
        console.error("[db] Gzip decompress failed:", e);
      }
    }
    if (!existsSync(DB_PATH)) {
      console.warn(`[db] No seed file — will auto-seed with empty DB`);
    }
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    -- Tabela de controle de migrations (idempotente)
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'author')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- Novels (com type='visual-novel' + colunas de origem)
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      alternative_titles TEXT DEFAULT '[]',
      synopsis TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      cover_source_url TEXT,
      cover_local_path TEXT,
      author_id TEXT NOT NULL,
      source TEXT,
      source_id TEXT,
      source_url TEXT,
      type TEXT NOT NULL DEFAULT 'light-novel' CHECK (type IN ('light-novel', 'web-novel', 'short', 'visual-novel')),
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),
      genres TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      views INTEGER NOT NULL DEFAULT 0,
      rating_sum INTEGER NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      external_score REAL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
    CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author_id);
    CREATE INDEX IF NOT EXISTS idx_novels_featured ON novels(is_featured);
    CREATE INDEX IF NOT EXISTS idx_novels_source ON novels(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_novels_last_synced ON novels(last_synced_at);
    CREATE INDEX IF NOT EXISTS idx_novels_external_score ON novels(external_score);

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      volume_id TEXT,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, chapter_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_volume ON chapters(volume_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id TEXT,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_comments_novel ON comments(novel_id);

    CREATE TABLE IF NOT EXISTS likes (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, novel_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      user_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      novel_id TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, chapter_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('novel', 'chapter', 'comment', 'user')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Tabelas de ingestão (catálogo externo)
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('api', 'scrape')),
      base_url TEXT,
      rate_limit_per_sec REAL NOT NULL DEFAULT 1.0,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      last_run_status TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_links (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      external_url TEXT,
      match_confidence REAL NOT NULL DEFAULT 1.0,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source_id, external_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_source_links_novel ON source_links(novel_id);
    CREATE INDEX IF NOT EXISTS idx_source_links_source ON source_links(source_id, external_id);

    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      volume_number REAL NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
      chapter_count INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, volume_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_novel ON volumes(novel_id);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('genre', 'tag', 'theme')),
      source TEXT,
      external_id TEXT,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

    CREATE TABLE IF NOT EXISTS novel_tags (
      novel_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (novel_id, tag_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      source_name TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('initial', 'weekly', 'daily', 'manual')),
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      duration_ms INTEGER,
      items_found INTEGER NOT NULL DEFAULT 0,
      items_imported INTEGER NOT NULL DEFAULT 0,
      items_updated INTEGER NOT NULL DEFAULT 0,
      items_skipped INTEGER NOT NULL DEFAULT 0,
      items_failed INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON sync_runs(source_id);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs(status);

    CREATE TABLE IF NOT EXISTS sync_errors (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      external_id TEXT,
      error_type TEXT,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES sync_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sync_errors_run ON sync_errors(run_id);

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL,
      site_tagline TEXT NOT NULL,
      hero_badge TEXT NOT NULL,
      hero_title TEXT NOT NULL,
      hero_highlight TEXT NOT NULL,
      hero_description TEXT NOT NULL,
      primary_cta_label TEXT NOT NULL,
      primary_cta_href TEXT NOT NULL,
      secondary_cta_label TEXT NOT NULL,
      secondary_cta_href TEXT NOT NULL,
      publish_cta_label TEXT NOT NULL,
      publish_cta_href TEXT NOT NULL,
      footer_tagline TEXT NOT NULL,
      support_email TEXT NOT NULL,
      github_url TEXT,
      discord_url TEXT,
      telegram_url TEXT,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      maintenance_message TEXT NOT NULL DEFAULT '',
      storefront_enabled INTEGER NOT NULL DEFAULT 0,
      storefront_title TEXT NOT NULL DEFAULT 'Loja',
      storefront_description TEXT NOT NULL DEFAULT '',
      storefront_href TEXT NOT NULL DEFAULT '/store',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catalog_controls (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL CHECK (item_type IN ('novel', 'manga')),
      item_id TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      show_on_home INTEGER NOT NULL DEFAULT 0,
      storefront_enabled INTEGER NOT NULL DEFAULT 0,
      storefront_label TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_controls_lookup ON catalog_controls(item_type, item_id);
    CREATE INDEX IF NOT EXISTS idx_catalog_controls_home ON catalog_controls(item_type, show_on_home, is_featured, is_hidden);

    CREATE TABLE IF NOT EXISTS user_access_controls (
      user_id TEXT PRIMARY KEY,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      suspension_reason TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_integrations (
      provider TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      project_id TEXT,
      project_name TEXT,
      team_id TEXT,
      production_url TEXT,
      access_token TEXT,
      token_hint TEXT,
      status_json TEXT,
      last_checked_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      product_type TEXT NOT NULL CHECK (product_type IN ('book', 'manga', 'bundle', 'merch', 'digital')),
      source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'novel', 'manga')),
      source_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
      price_cents INTEGER NOT NULL DEFAULT 0,
      compare_at_cents INTEGER,
      currency TEXT NOT NULL DEFAULT 'BRL',
      stock_qty INTEGER NOT NULL DEFAULT 0,
      sku TEXT,
      cover_url TEXT,
      cover_local_path TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_store_products_status ON store_products(status, is_featured, updated_at);
    CREATE INDEX IF NOT EXISTS idx_store_products_source ON store_products(source_type, source_id);

    CREATE TABLE IF NOT EXISTS store_collections (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_collection_items (
      collection_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (collection_id, product_id),
      FOREIGN KEY (collection_id) REFERENCES store_collections(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_store_collection_items_sort ON store_collection_items(collection_id, sort_order);
  `);

  const settingsRow = db.prepare("SELECT id FROM site_settings WHERE id = 'default'").get() as { id: string } | undefined;
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO site_settings (
        id, site_name, site_tagline, hero_badge, hero_title, hero_highlight, hero_description,
        primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
        publish_cta_label, publish_cta_href, footer_tagline, support_email, github_url,
        discord_url, telegram_url, maintenance_mode, maintenance_message,
        storefront_enabled, storefront_title, storefront_description, storefront_href
      ) VALUES (
        'default', 'Tomoverso', 'ler sem frescura.', 'Catálogo BR com leitura real', 'Tomoverso', 'ler sem frescura.',
        'Catálogo brasileiro com leitor por páginas, busca rápida e conteúdo que realmente dá pra ler.',
        'Ler mangás', '/manga', 'Explorar novels', '/explore', 'Publicar', '/auth/signup',
        'Onde Light Novels brasileiras ganham vida. Pra autores iniciantes e leitores apaixonados.',
        'contato@tomoverso.com', NULL, NULL, NULL, 0,
        'Estamos fazendo ajustes no painel e na loja. Algumas áreas podem mudar ao longo do dia.',
        1, 'Loja Tomoverso',
        'Prepare o catálogo para vender livros, mangás, bundles e edições digitais a partir do mesmo painel.',
        '/store'
      )
    `).run();
  }

  const vercelIntegration = db.prepare("SELECT provider FROM admin_integrations WHERE provider = 'vercel'").get() as { provider: string } | undefined;
  if (!vercelIntegration) {
    db.prepare(`INSERT INTO admin_integrations (provider, label) VALUES ('vercel', 'Vercel')`).run();
  }

  // Auto-seed se banco vazio (em produção, na primeira vez)
  if (process.env.SEED !== "false" && (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c === 0) {
    try {
      seedDatabase(db);
    } catch (e) {
      console.error("Seed error:", e);
    }
  }

  return db;
}

function seedDatabase(db: Database.Database) {
  const { hashPassword } = require("./auth-helpers");
  const now = new Date().toISOString();
  const fabioId = "fabio-texeira-2026";

  // Cria admin
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name, role, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    fabioId,
    "fabio@tomoverso.com",
    "fabio_tx",
    hashPassword("tomoverso2026"),
    "Fábio Teixeira",
    "admin",
    "Criador do Tomoverso. Escritor de Light Novels."
  );

  // Novels
  const novels = [
    {
      id: "o-que-eu-desenhei-existe",
      slug: "o-que-eu-desenhei-existe",
      title: "O Que Eu Desenhei, Existe",
      alt: ["OQEDE"],
      synopsis: "Yumi, 23 anos, é uma desenhista brasileira que nunca conseguiu publicar um mangá. Sobrevive de freela e tem um caderno velho, herdado da avó, onde desde os 12 anos desenhou um mundo inteiro de fantasia. Um dia, ela descobre que o que ela desenha com a mão esquerda vira real numa dimensão espelho — e que já existem pessoas lá idênticas aos personagens que ela inventou quando era criança. O reino que ela criou está em guerra civil. O vilão que ela desenhou está ganhando. E o herói que ela idealizou como 'interesse amoroso ideal' aos 14 anos está lá, esperando alguém que nunca veio. Yumi nunca terminou a história. E agora, o que ela fizer no caderno decide o destino de um mundo cheio de gente que ela mesma inventou.",
      genres: ["Fantasia", "Drama", "Slice of Life", "Sobrenatural"],
      tags: ["isekai-reverso", "criador-como-protagonista", "meta-narrativa", "romance-lento"],
      featured: 1,
    },
    {
      id: "dublador-de-almas",
      slug: "dublador-de-almas",
      title: "Dublador de Almas",
      alt: [],
      synopsis: "Diego, dublador brasileiro de anime, morre e acorda num mundo medieval em guerra — onde sua habilidade de imitar qualquer voz é a arma mais poderosa que existe.",
      genres: ["Fantasia", "Comédia", "Ação", "Isekai"],
      tags: ["dublador", "comédia", "meta-humor"],
      featured: 1,
    },
    {
      id: "sistema-ultima-posicao",
      slug: "sistema-ultima-posicao",
      title: "Sistema: Última Posição",
      alt: [],
      synopsis: "Kai é o único caçador preso no rank mais baixo por uma década. Até que copia, sem querer, a habilidade do monstro mais forte que existe.",
      genres: ["Ação", "Sistema", "Fantasia"],
      tags: ["underdog", "revenge", "level-up"],
      featured: 1,
    },
  ];

  const insertNovel = db.prepare(`
    INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, genres, tags, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of novels) {
    insertNovel.run(
      n.id, n.slug, n.title, JSON.stringify(n.alt), n.synopsis,
      `/covers/${n.slug}.jpg`, fabioId, "light-novel", "ongoing",
      JSON.stringify(n.genres), JSON.stringify(n.tags), n.featured
    );
  }

  // Capítulos
  const insertChapter = db.prepare(`
    INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertChapter.run(
    "oqede-cap-1", "o-que-eu-desenhei-existe", 1, "O Caderno da Avó",
    `O caderno estava dentro de uma caixa de sapatos, no fundo do armário da avó, embrulhado em três camadas de plástico-bolha e uma carta que ninguém tinha aberto em vinte e três anos.

Yumi só foi encontrá-lo porque o apartamento novo era pequeno demais pra guardar mais do que o essencial — e a mãe tinha jogado a caixa no canto da sala com um "cuida disso quando puder, filha, eu não tenho espaço emocional pra mais um objeto da tua avó" que era simultaneamente um favor e um sumiço.

O caderno tinha capa de couro falso, gasto nos cantos, e uma presilha de metal que não fechava mais. Na primeira página, uma caligrafia inclinada e redonda que Yumi não reconhecia de nenhum parente:

*"Para quem encontrar: isto não é meu. Mas é de alguém. Toma cuidado."*

Abaixo, com outra caneta, num garrancho de criança:

*"Pra mim mesma — se eu esquecer. NÃO ESQUECE."*

Yumi riu sozinha, no chão do apartamento, com uma caixa de pizza vazia do lado e a luz do corredor entrando pela porta entreaberta. A avó sempre foi dramática.

E na última página, uma única frase, na mesma caligrafia inclinada da primeira:

*"Você vai entender quando chegar lá."*

Quando acordou, o caderno estava embaixo do travesseiro. E na última página em branco, onde antes não tinha nada, agora tinha um desenho que ela não tinha feito:

Um rosto. Olhando pra ela.

Era o rosto do herói que ela tinha inventado aos 14. O interesse amoroso ideal, loiro, olhos azuis, sorriso torto, com uma cicatriz fina cortando a sobrancelha esquerda.

Ela lembrava do nome dele. Tinha dado um nome a ele, anos atrás.

Arlén.`,
    1850, now
  );
}

export function getDb(): Database.Database {
  if (!global.__tomoverso_db) {
    global.__tomoverso_db = createDb();
  }
  return global.__tomoverso_db;
}
