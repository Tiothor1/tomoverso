import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import path from "path";

function getDbDir(): string {
  // Em Vercel, o filesystem é read-only fora de /tmp
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "/tmp/tomoverso";
  }
  return path.join(process.cwd(), "data");
}

const DB_DIR = getDbDir();
const DB_PATH = path.join(DB_DIR, "tomoverso.db");

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

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      alternative_titles TEXT DEFAULT '[]',
      synopsis TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      author_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'light-novel' CHECK (type IN ('light-novel', 'web-novel', 'short')),
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),
      genres TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      views INTEGER NOT NULL DEFAULT 0,
      rating_sum INTEGER NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
    CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author_id);
    CREATE INDEX IF NOT EXISTS idx_novels_featured ON novels(is_featured);

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, chapter_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);

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
  `);

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
