import { randomUUID } from "crypto";

type SqliteDb = { exec(sql: string): void; prepare(sql: string): any };

export function ensureFeedTables(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feed_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post', 'review', 'teaser', 'recommendation', 'author_update', 'repost')),
      title TEXT,
      body TEXT NOT NULL DEFAULT '',
      media_url TEXT,
      work_type TEXT CHECK (work_type IN ('novel', 'manga')),
      work_id TEXT,
      chapter_id TEXT,
      parent_post_id TEXT,
      repost_of_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed', 'pending')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_post_id) REFERENCES feed_posts(id) ON DELETE SET NULL,
      FOREIGN KEY (repost_of_id) REFERENCES feed_posts(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feed_posts_status_created ON feed_posts(status, visibility, created_at);
    CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feed_posts_work ON feed_posts(work_type, work_id);

    CREATE TABLE IF NOT EXISTS feed_interactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      target_type TEXT NOT NULL CHECK (target_type IN ('post', 'novel', 'manga', 'chapter', 'user')),
      target_id TEXT NOT NULL,
      interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'unlike', 'favorite', 'unfavorite', 'comment', 'share', 'repost', 'hide', 'not_interested', 'open_work', 'open_chapter', 'follow_author', 'follow_user', 'dwell_time', 'create_post')),
      value INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_feed_interactions_user ON feed_interactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feed_interactions_target ON feed_interactions(target_type, target_id, interaction_type, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_active_like_once
      ON feed_interactions(user_id, target_type, target_id, interaction_type)
      WHERE user_id IS NOT NULL AND interaction_type IN ('like', 'favorite', 'hide', 'not_interested');

    CREATE TABLE IF NOT EXISTS feed_comments (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK (target_type IN ('post', 'novel', 'manga')),
      target_id TEXT NOT NULL,
      post_id TEXT,
      user_id TEXT NOT NULL,
      parent_comment_id TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed', 'pending')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES feed_comments(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feed_comments_target ON feed_comments(target_type, target_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_feed_comments_user ON feed_comments(user_id, created_at);

    CREATE TABLE IF NOT EXISTS saved_feed_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('post', 'novel', 'manga')),
      target_id TEXT NOT NULL,
      post_id TEXT,
      work_type TEXT CHECK (work_type IN ('novel', 'manga')),
      work_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_saved_feed_user ON saved_feed_items(user_id, created_at);

    CREATE TABLE IF NOT EXISTS user_reading_signals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_type TEXT NOT NULL CHECK (work_type IN ('novel', 'manga')),
      work_id TEXT NOT NULL,
      chapter_id TEXT,
      signal_type TEXT NOT NULL CHECK (signal_type IN ('search', 'view_work', 'open_chapter', 'read_progress', 'completed_chapter', 'favorite_work', 'like_work', 'abandon', 'continue_reading', 'tag_interest')),
      value INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reading_signals_user ON user_reading_signals(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reading_signals_work ON user_reading_signals(work_type, work_id, signal_type);

    CREATE TABLE IF NOT EXISTS feed_impressions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      item_type TEXT NOT NULL CHECK (item_type IN ('post', 'novel', 'manga', 'chapter', 'continue')),
      item_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      feed_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_feed_impressions_user ON feed_impressions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feed_impressions_item ON feed_impressions(item_type, item_id, created_at);

    CREATE TABLE IF NOT EXISTS feed_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'novel', 'manga', 'user')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_feed_reports_status ON feed_reports(status, created_at);
  `);
}

export function seedStarterFeedPosts(db: SqliteDb): void {
  ensureFeedTables(db);
  const count = (db.prepare("SELECT COUNT(*) as c FROM feed_posts").get() as { c: number }).c;
  if (count > 0) return;

  const user = db.prepare("SELECT id FROM users WHERE email NOT LIKE '%@external.author' ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END, created_at LIMIT 1").get() as { id: string } | undefined;
  if (!user) return;

  const novel = db.prepare(`
    SELECT n.id, n.title
    FROM novels n
    JOIN chapters ch ON ch.novel_id = n.id
    WHERE n.is_approved = 1
    GROUP BY n.id
    ORDER BY COUNT(ch.id) DESC, n.views DESC
    LIMIT 1
  `).get() as { id: string; title: string } | undefined;

  const manga = db.prepare(`
    SELECT m.id, m.title
    FROM mangas m
    JOIN manga_chapters ch ON ch.manga_id = m.id
    JOIN manga_pages p ON p.chapter_id = ch.id
    GROUP BY m.id
    ORDER BY COUNT(p.id) DESC
    LIMIT 1
  `).get() as { id: string; title: string } | undefined;

  const insert = db.prepare(`
    INSERT INTO feed_posts (id, user_id, type, title, body, work_type, work_id, status, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'public')
  `);

  if (novel) {
    insert.run(
      randomUUID(),
      user.id,
      "recommendation",
      `Comece por ${novel.title}`,
      "Uma indicação rápida do Tomo Verso Editora pra testar o feed: abre, lê um capítulo e salva se combinar com seu gosto.",
      "novel",
      novel.id
    );
  }
  if (manga) {
    insert.run(
      randomUUID(),
      user.id,
      "recommendation",
      `${manga.title} está no radar`,
      "Mangá com páginas importadas de verdade. Esse tipo de card mistura leitura, comunidade e descoberta.",
      "manga",
      manga.id
    );
  }
}
