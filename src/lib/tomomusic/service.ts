import seedTracks from "./seed-tracks.generated";
import type { TomoMusicPayload, TomoMusicPlaylist, TomoMusicTrack } from "./types";

type Db = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
};

type TrackRow = Omit<TomoMusicTrack, "attribution_required" | "is_active" | "liked" | "favorited"> & {
  attribution_required: number;
  is_active: number;
  liked?: number;
  favorited?: number;
};

type PlaylistRow = Omit<TomoMusicPlaylist, "is_system" | "is_active" | "track_ids"> & {
  is_system: number;
  is_active: number;
  track_ids?: string;
};

const PLAYLISTS = [
  { slug: "leitura-calma", title: "Leitura calma", mood: "reading", description: "Faixas tranquilas para ler sem competir com a história." },
  { slug: "lofi-para-novels", title: "Lofi para novels", mood: "lofi", description: "Batidas leves e atmosfera noturna para capítulos longos." },
  { slug: "fantasia-tranquila", title: "Fantasia tranquila", mood: "fantasy", description: "Texturas suaves para mundos mágicos, aventura e contemplação." },
  { slug: "romance-suave", title: "Romance suave", mood: "chill", description: "Clima quente, lento e acolhedor para cenas emocionais." },
  { slug: "noite-de-leitura", title: "Noite de leitura", mood: "sleep", description: "Som escuro e confortável para ler de madrugada." },
  { slug: "chuva-e-paginas", title: "Chuva e páginas", mood: "rain", description: "Ambiência de chuva, janela aberta e páginas virando." },
  { slug: "foco-total", title: "Foco total", mood: "ambient", description: "Loop limpo para estudo, escrita e leitura concentrada." },
];

function now() {
  return new Date().toISOString();
}

function bool(value: unknown) {
  return Number(value || 0) === 1;
}

function normalizeTrack(row: TrackRow): TomoMusicTrack {
  return {
    ...row,
    duration_seconds: Number(row.duration_seconds || 0),
    bytes: Number(row.bytes || 0),
    play_count: Number(row.play_count || 0),
    like_count: Number(row.like_count || 0),
    attribution_required: bool(row.attribution_required),
    is_active: bool(row.is_active),
    liked: bool(row.liked),
    favorited: bool(row.favorited),
  };
}

function normalizePlaylist(row: PlaylistRow): TomoMusicPlaylist {
  return {
    ...row,
    sort_order: Number(row.sort_order || 0),
    is_system: bool(row.is_system),
    is_active: bool(row.is_active),
    track_ids: row.track_ids ? String(row.track_ids).split(",").filter(Boolean) : [],
  };
}

function hasClearCommercialSafeLicense(track: { license_url?: string; license_name?: string }) {
  const url = String(track.license_url || "").toLowerCase();
  const name = String(track.license_name || "").toLowerCase();
  if (!url || !name) return false;
  if (url.includes("/nc/") || name.includes("noncommercial") || name.includes("non-commercial")) return false;
  if (url.includes("/nd/") || name.includes("no derivatives")) return false;
  return url.includes("creativecommons.org/licenses/by") || url.includes("creativecommons.org/publicdomain/zero");
}

export function ensureTomomusicTables(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tomomusic_tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL DEFAULT 'reading',
      genre TEXT NOT NULL DEFAULT 'ambient',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      file_url TEXT NOT NULL,
      cover_url TEXT,
      source_url TEXT NOT NULL,
      license_name TEXT NOT NULL,
      license_url TEXT NOT NULL,
      attribution_required INTEGER NOT NULL DEFAULT 0,
      attribution_text TEXT NOT NULL DEFAULT '',
      source TEXT,
      downloaded_at TEXT,
      local_file TEXT,
      bytes INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      play_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tomomusic_tracks_active ON tomomusic_tracks(is_active, mood, play_count);
    CREATE INDEX IF NOT EXISTS idx_tomomusic_tracks_search ON tomomusic_tracks(title, artist, mood, genre);

    CREATE TABLE IF NOT EXISTS tomomusic_likes (
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (track_id, user_id),
      FOREIGN KEY (track_id) REFERENCES tomomusic_tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tomomusic_likes_user ON tomomusic_likes(user_id, created_at);

    CREATE TABLE IF NOT EXISTS tomomusic_favorites (
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (track_id, user_id),
      FOREIGN KEY (track_id) REFERENCES tomomusic_tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tomomusic_favorites_user ON tomomusic_favorites(user_id, created_at);

    CREATE TABLE IF NOT EXISTS tomomusic_plays (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      seconds_listened INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (track_id) REFERENCES tomomusic_tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tomomusic_plays_track ON tomomusic_plays(track_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tomomusic_plays_user ON tomomusic_plays(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tomomusic_plays_session ON tomomusic_plays(session_id, created_at);

    CREATE TABLE IF NOT EXISTS tomomusic_playlists (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL DEFAULT 'reading',
      cover_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tomomusic_playlist_tracks (
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES tomomusic_playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tomomusic_tracks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tomomusic_playlist_tracks_sort ON tomomusic_playlist_tracks(playlist_id, sort_order);
  `);

  seedTomomusic(db);
}

function seedTomomusic(db: Db) {
  const insertTrack = db.prepare(`
    INSERT INTO tomomusic_tracks (
      id, title, artist, description, mood, genre, duration_seconds, file_url, cover_url,
      source_url, license_name, license_url, attribution_required, attribution_text,
      source, downloaded_at, local_file, bytes, is_active, created_at, updated_at
    ) VALUES (
      @id, @title, @artist, @description, @mood, @genre, @duration_seconds, @file_url, @cover_url,
      @source_url, @license_name, @license_url, @attribution_required, @attribution_text,
      @source, @downloaded_at, @local_file, @bytes, 1, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      description=excluded.description,
      mood=excluded.mood,
      genre=excluded.genre,
      duration_seconds=excluded.duration_seconds,
      file_url=excluded.file_url,
      cover_url=excluded.cover_url,
      source_url=excluded.source_url,
      license_name=excluded.license_name,
      license_url=excluded.license_url,
      attribution_required=excluded.attribution_required,
      attribution_text=excluded.attribution_text,
      source=excluded.source,
      downloaded_at=excluded.downloaded_at,
      local_file=excluded.local_file,
      bytes=excluded.bytes,
      updated_at=excluded.updated_at
  `);

  const stamp = now();
  const seed = Array.isArray(seedTracks) ? seedTracks : [];
  for (const track of seed) {
    if (!hasClearCommercialSafeLicense(track)) continue;
    insertTrack.run({
      ...track,
      attribution_required: track.attribution_required ? 1 : 0,
      cover_url: track.cover_url || null,
      source: track.source || "ccMixter",
      downloaded_at: track.downloaded_at || stamp,
      local_file: track.local_file || null,
      bytes: Number(track.bytes || 0),
      created_at: stamp,
      updated_at: stamp,
    });
  }

  const activeTrackIds = (db.prepare("SELECT id, mood, cover_url FROM tomomusic_tracks WHERE is_active = 1 ORDER BY title ASC").all() as Array<{ id: string; mood: string; cover_url: string | null }>);
  const byMood = new Map<string, string[]>();
  for (const row of activeTrackIds) {
    const key = row.mood || "reading";
    byMood.set(key, [...(byMood.get(key) || []), row.id]);
  }
  const allIds = activeTrackIds.map((t) => t.id);

  const insertPlaylist = db.prepare(`
    INSERT INTO tomomusic_playlists (id, slug, title, description, mood, cover_url, sort_order, is_system, is_active, updated_at)
    VALUES (@id, @slug, @title, @description, @mood, @cover_url, @sort_order, 1, 1, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, mood=excluded.mood, cover_url=excluded.cover_url, sort_order=excluded.sort_order, is_active=1, updated_at=datetime('now')
  `);
  const clearPlaylist = db.prepare("DELETE FROM tomomusic_playlist_tracks WHERE playlist_id = ?");
  const insertPlaylistTrack = db.prepare("INSERT OR IGNORE INTO tomomusic_playlist_tracks (playlist_id, track_id, sort_order) VALUES (?, ?, ?)");

  PLAYLISTS.forEach((playlist, idx) => {
    const matching = byMood.get(playlist.mood) || [];
    const trackIds = Array.from(new Set([...matching, ...allIds])).slice(0, Math.min(8, allIds.length));
    const cover = activeTrackIds.find((t) => trackIds.includes(t.id) && t.cover_url)?.cover_url || null;
    const id = `system-${playlist.slug}`;
    insertPlaylist.run({ ...playlist, id, cover_url: cover, sort_order: idx + 1 });
    clearPlaylist.run(id);
    trackIds.forEach((trackId, order) => insertPlaylistTrack.run(id, trackId, order + 1));
  });
}

export function getTomomusicPayload(db: Db, userId?: string | null, options?: { q?: string; mood?: string; includeInactive?: boolean }): TomoMusicPayload {
  ensureTomomusicTables(db);
  const q = options?.q?.trim();
  const mood = options?.mood?.trim();
  const where: string[] = [];
  const params: unknown[] = [];
  if (!options?.includeInactive) where.push("t.is_active = 1");
  if (q) {
    where.push("(t.title LIKE ? OR t.artist LIKE ? OR t.description LIKE ? OR t.genre LIKE ? OR t.mood LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (mood && mood !== "todos") {
    where.push("t.mood = ?");
    params.push(mood);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const userJoin = userId
    ? `, EXISTS(SELECT 1 FROM tomomusic_likes tl WHERE tl.track_id = t.id AND tl.user_id = ?) AS liked,
       EXISTS(SELECT 1 FROM tomomusic_favorites tf WHERE tf.track_id = t.id AND tf.user_id = ?) AS favorited`
    : `, 0 AS liked, 0 AS favorited`;
  const rows = db.prepare(`
    SELECT t.* ${userJoin}
    FROM tomomusic_tracks t
    ${whereSql}
    ORDER BY t.is_active DESC, t.play_count DESC, t.created_at DESC, t.title ASC
  `).all(...(userId ? [userId, userId, ...params] : params)) as TrackRow[];
  const tracks = rows.map(normalizeTrack);

  const playlists = (db.prepare(`
    SELECT p.*, GROUP_CONCAT(pt.track_id) AS track_ids
    FROM tomomusic_playlists p
    LEFT JOIN tomomusic_playlist_tracks pt ON pt.playlist_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.title ASC
  `).all() as PlaylistRow[]).map(normalizePlaylist);

  const statsRow = db.prepare(`
    SELECT COUNT(*) AS totalTracks,
           COALESCE(SUM(duration_seconds), 0) AS totalSeconds,
           COALESCE(SUM(bytes), 0) AS totalBytes,
           COALESCE(SUM(CASE WHEN attribution_required = 1 THEN 1 ELSE 0 END), 0) AS creditsRequired
    FROM tomomusic_tracks
    WHERE is_active = 1
  `).get() as { totalTracks: number; totalSeconds: number; totalBytes: number; creditsRequired: number };

  return {
    tracks,
    playlists,
    moods: Array.from(new Set(tracks.map((t) => t.mood).filter(Boolean))).sort(),
    stats: {
      totalTracks: Number(statsRow.totalTracks || 0),
      totalSeconds: Number(statsRow.totalSeconds || 0),
      totalBytes: Number(statsRow.totalBytes || 0),
      creditsRequired: Number(statsRow.creditsRequired || 0),
    },
  };
}

export function recordTomomusicPlay(db: Db, input: { trackId: string; userId?: string | null; sessionId?: string | null; secondsListened?: number }) {
  ensureTomomusicTables(db);
  const seconds = Math.max(0, Math.floor(input.secondsListened || 0));
  if (seconds < 30) return { counted: false, reason: "min_30_seconds" };
  const track = db.prepare("SELECT id FROM tomomusic_tracks WHERE id = ? AND is_active = 1").get(input.trackId) as { id: string } | undefined;
  if (!track) return { counted: false, reason: "track_not_found" };

  const recent = input.userId
    ? db.prepare("SELECT id FROM tomomusic_plays WHERE track_id = ? AND user_id = ? AND created_at > datetime('now', '-6 hours') LIMIT 1").get(input.trackId, input.userId)
    : input.sessionId
      ? db.prepare("SELECT id FROM tomomusic_plays WHERE track_id = ? AND session_id = ? AND created_at > datetime('now', '-6 hours') LIMIT 1").get(input.trackId, input.sessionId)
      : null;
  if (recent) return { counted: false, reason: "recent_duplicate" };

  db.prepare("INSERT INTO tomomusic_plays (id, track_id, user_id, session_id, seconds_listened) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), input.trackId, input.userId || null, input.sessionId || null, seconds);
  db.prepare("UPDATE tomomusic_tracks SET play_count = COALESCE(play_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(input.trackId);
  return { counted: true };
}

export function toggleTomomusicLike(db: Db, userId: string, trackId: string) {
  ensureTomomusicTables(db);
  const existing = db.prepare("SELECT 1 FROM tomomusic_likes WHERE user_id = ? AND track_id = ?").get(userId, trackId);
  if (existing) {
    db.prepare("DELETE FROM tomomusic_likes WHERE user_id = ? AND track_id = ?").run(userId, trackId);
  } else {
    db.prepare("INSERT OR IGNORE INTO tomomusic_likes (user_id, track_id) VALUES (?, ?)").run(userId, trackId);
  }
  const row = db.prepare("SELECT COUNT(*) AS c FROM tomomusic_likes WHERE track_id = ?").get(trackId) as { c: number };
  db.prepare("UPDATE tomomusic_tracks SET like_count = ?, updated_at = datetime('now') WHERE id = ?").run(Number(row.c || 0), trackId);
  return { liked: !existing, like_count: Number(row.c || 0) };
}

export function toggleTomomusicFavorite(db: Db, userId: string, trackId: string) {
  ensureTomomusicTables(db);
  const existing = db.prepare("SELECT 1 FROM tomomusic_favorites WHERE user_id = ? AND track_id = ?").get(userId, trackId);
  if (existing) {
    db.prepare("DELETE FROM tomomusic_favorites WHERE user_id = ? AND track_id = ?").run(userId, trackId);
  } else {
    db.prepare("INSERT OR IGNORE INTO tomomusic_favorites (user_id, track_id) VALUES (?, ?)").run(userId, trackId);
  }
  return { favorited: !existing };
}
