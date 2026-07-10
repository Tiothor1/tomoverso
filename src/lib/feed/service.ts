import { randomUUID } from "crypto";
import type { UserRecord } from "@/lib/auth";
import { readableTitle, safeJsonArray } from "@/lib/display-title";
import { ensureFeedTables, seedStarterFeedPosts } from "@/lib/feed/schema";
import type {
  FeedCommentItem,
  FeedCounts,
  FeedItem,
  FeedPageResult,
  FeedState,
  FeedTargetType,
  FeedUserBadge,
  FeedWorkOption,
  FeedWorkRef,
  FeedWorkType,
} from "@/lib/feed/types";

type SqliteDb = { exec(sql: string): void; prepare(sql: string): any };

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  title_jp?: string | null;
  alternative_titles?: string | null;
  synopsis: string | null;
  cover_url: string | null;
  cover_source_url?: string | null;
  author_id: string;
  author_name?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: "user" | "admin" | "author";
  type: string;
  status: string;
  genres: string | null;
  tags: string | null;
  views: number;
  rating_sum: number;
  rating_count: number;
  external_score: number | null;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  latest_chapter_number?: number | null;
  latest_chapter_title?: string | null;
};

type MangaRow = {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  cover_url: string | null;
  author: string | null;
  artist: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  page_count: number;
  tags: string | null;
  latest_chapter_number?: number | null;
  latest_chapter_title?: string | null;
  preview_page_url?: string | null;
  preview_chapter_number?: number | null;
  preview_page_number?: number | null;
};

type PostRow = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string;
  media_url: string | null;
  work_type: FeedWorkType | null;
  work_id: string | null;
  repost_of_id: string | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: "user" | "admin" | "author";
};

type InterestProfile = {
  tags: Map<string, number>;
  authors: Set<string>;
  hidden: Set<string>;
  impressions: Map<string, number>;
};

const SYSTEM_TAGS = ["fantasia", "ação", "isekai", "vingança", "magia", "aventura", "drama"];

export function sanitizeFeedText(value: string, max = 1200): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function ensure(db: SqliteDb) {
  ensureFeedTables(db);
  seedStarterFeedPosts(db);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "T";
}

function tagsFromNovel(row: NovelRow): string[] {
  return [...safeJsonArray(row.genres), ...safeJsonArray(row.tags)].filter(Boolean).slice(0, 8);
}

function tagsFromManga(row: MangaRow): string[] {
  return safeJsonArray(row.tags).filter(Boolean).slice(0, 8);
}

function compactSynopsis(value: string | null | undefined, fallback: string) {
  const cleaned = sanitizeFeedText(value || "", 380);
  return cleaned || fallback;
}

function makeUserBadge(row: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; role?: "user" | "admin" | "author" } | null, currentUserId: string | null, db: SqliteDb): FeedUserBadge | null {
  if (!row?.id) return null;
  const followed = currentUserId
    ? !!db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1").get(currentUserId, row.id)
    : false;
  const displayName = row.display_name || row.username || "Leitor Tomo Verso Editora";
  return {
    id: row.id,
    username: row.username || "tomoverso",
    displayName,
    avatarUrl: row.avatar_url || null,
    role: row.role || "user",
    isFollowed: followed,
  };
}

function novelWork(row: NovelRow): FeedWorkRef {
  const title = readableTitle({
    title: row.title,
    title_en: row.title_en,
    title_jp: row.title_jp,
    alternative_titles: row.alternative_titles,
    type: row.type,
    slug: row.slug,
  });
  const firstHref = `/novels/${row.slug}/1`;
  const latestHref = row.latest_chapter_number ? `/novels/${row.slug}/${row.latest_chapter_number}` : firstHref;
  return {
    id: row.id,
    slug: row.slug,
    title,
    type: "novel",
    href: `/novels/${row.slug}`,
    readHref: firstHref,
    coverUrl: row.cover_url || row.cover_source_url || null,
    synopsis: compactSynopsis(row.synopsis, "Uma leitura do catálogo Tomo Verso Editora pronta para descobrir."),
    authorName: row.author_name || row.display_name || null,
    authorId: row.author_id || null,
    genres: safeJsonArray(row.genres).slice(0, 4),
    tags: safeJsonArray(row.tags).slice(0, 5),
    status: row.status,
    chapterCount: Number(row.chapter_count || 0),
    views: Number(row.views || 0),
    rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : row.external_score || null,
    latestChapterTitle: row.latest_chapter_title || null,
    latestChapterHref: latestHref,
  };
}

function mangaWork(row: MangaRow): FeedWorkRef {
  const firstHref = `/manga/${row.slug}/1`;
  const latestHref = row.latest_chapter_number ? `/manga/${row.slug}/${row.latest_chapter_number}` : firstHref;
  const tags = tagsFromManga(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: "manga",
    href: `/manga/${row.slug}`,
    readHref: firstHref,
    coverUrl: row.cover_url || null,
    synopsis: compactSynopsis(row.synopsis, "Mangá com páginas importadas no Tomoverso."),
    authorName: row.author || row.artist || null,
    authorId: null,
    genres: tags.slice(0, 4),
    tags: tags.slice(0, 5),
    status: row.status,
    chapterCount: Number(row.chapter_count || 0),
    views: 0,
    rating: null,
    latestChapterTitle: row.latest_chapter_title || null,
    latestChapterHref: latestHref,
  };
}

function targetKey(type: FeedTargetType, id: string) {
  return `${type}:${id}`;
}

function getMangaPreviewMedia(db: SqliteDb, mangaId: string, count = 4): { items: Array<{ url: string; caption: string | null }> } {
  const rows = db.prepare(`
    SELECT mp.image_url, mc.chapter_number, mp.page_number
    FROM manga_pages mp
    JOIN manga_chapters mc ON mc.id = mp.chapter_id
    WHERE mc.manga_id = ?
      AND COALESCE(mp.image_url, '') <> ''
    ORDER BY mc.chapter_number DESC,
      CASE
        WHEN mp.page_number BETWEEN 2 AND 6 THEN 0
        WHEN mp.page_number > 6 THEN 1
        ELSE 2
      END,
      mp.page_number ASC
    LIMIT ?
  `).all(mangaId, count) as Array<{ image_url: string | null; chapter_number: number | null; page_number: number | null }>;
  const items = rows
    .filter((r): r is { image_url: string; chapter_number: number | null; page_number: number | null } => !!r.image_url)
    .map((r) => {
      const chapter = r.chapter_number ? `cap. ${r.chapter_number}` : "capítulo";
      const page = r.page_number ? `pág. ${r.page_number}` : "página";
      return { url: r.image_url, caption: `Página real · ${chapter} · ${page}` };
    });
  return { items };
}

function getCounts(db: SqliteDb, targetType: FeedTargetType, targetId: string): FeedCounts {
  const interactions = db.prepare(`
    SELECT interaction_type, COUNT(*) as count
    FROM feed_interactions
    WHERE target_type = ? AND target_id = ?
      AND interaction_type IN ('like', 'share', 'repost')
    GROUP BY interaction_type
  `).all(targetType, targetId) as Array<{ interaction_type: string; count: number }>;
  const map = new Map(interactions.map((i) => [i.interaction_type, Number(i.count)]));
  const comments = (db.prepare(`SELECT COUNT(*) as c FROM feed_comments WHERE target_type = ? AND target_id = ? AND status = 'active'`).get(targetType, targetId) as { c: number }).c;
  const favorites = (db.prepare(`SELECT COUNT(*) as c FROM saved_feed_items WHERE target_type = ? AND target_id = ?`).get(targetType, targetId) as { c: number }).c;
  const reposts = targetType === "post"
    ? (db.prepare(`SELECT COUNT(*) as c FROM feed_posts WHERE repost_of_id = ? AND status = 'active'`).get(targetId) as { c: number }).c
    : map.get("repost") || 0;
  return {
    likes: map.get("like") || 0,
    comments: Number(comments || 0),
    favorites: Number(favorites || 0),
    reposts: Number(reposts || 0),
    shares: map.get("share") || 0,
  };
}

function getState(db: SqliteDb, userId: string | null, targetType: FeedTargetType, targetId: string): FeedState {
  if (!userId) return { liked: false, saved: false, hidden: false, notInterested: false };
  const rows = db.prepare(`
    SELECT interaction_type
    FROM feed_interactions
    WHERE user_id = ? AND target_type = ? AND target_id = ?
      AND interaction_type IN ('like', 'hide', 'not_interested')
  `).all(userId, targetType, targetId) as Array<{ interaction_type: string }>;
  const interactions = new Set(rows.map((r) => r.interaction_type));
  const saved = !!db.prepare(`SELECT 1 FROM saved_feed_items WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1`).get(userId, targetType, targetId);
  return {
    liked: interactions.has("like"),
    saved,
    hidden: interactions.has("hide"),
    notInterested: interactions.has("not_interested"),
  };
}

function buildInterestProfile(db: SqliteDb, userId: string | null): InterestProfile {
  const profile: InterestProfile = { tags: new Map(), authors: new Set(), hidden: new Set(), impressions: new Map() };
  if (!userId) return profile;

  const hiddenRows = db.prepare(`
    SELECT target_type, target_id
    FROM feed_interactions
    WHERE user_id = ? AND interaction_type IN ('hide', 'not_interested')
  `).all(userId) as Array<{ target_type: string; target_id: string }>;
  for (const row of hiddenRows) profile.hidden.add(`${row.target_type}:${row.target_id}`);

  const impressionRows = db.prepare(`
    SELECT item_type, item_id, COUNT(*) as c
    FROM feed_impressions
    WHERE user_id = ? AND created_at > datetime('now', '-14 days')
    GROUP BY item_type, item_id
  `).all(userId) as Array<{ item_type: string; item_id: string; c: number }>;
  for (const row of impressionRows) profile.impressions.set(`${row.item_type}:${row.item_id}`, Number(row.c));

  const favoriteNovels = db.prepare(`
    SELECT n.genres, n.tags, n.author_id
    FROM favorites f
    JOIN novels n ON n.id = f.novel_id
    WHERE f.user_id = ?
    LIMIT 60
  `).all(userId) as Array<{ genres: string | null; tags: string | null; author_id: string }>;
  for (const row of favoriteNovels) {
    for (const tag of [...safeJsonArray(row.genres), ...safeJsonArray(row.tags)]) {
      profile.tags.set(tag.toLowerCase(), (profile.tags.get(tag.toLowerCase()) || 0) + 4);
    }
    profile.authors.add(row.author_id);
  }

  const signalRows = db.prepare(`
    SELECT work_type, work_id, signal_type, metadata
    FROM user_reading_signals
    WHERE user_id = ? AND created_at > datetime('now', '-90 days')
    LIMIT 200
  `).all(userId) as Array<{ work_type: FeedWorkType; work_id: string; signal_type: string; metadata: string }>;
  for (const row of signalRows) {
    try {
      const meta = JSON.parse(row.metadata || "{}");
      const tags = Array.isArray(meta.tags) ? meta.tags : [];
      for (const tag of tags) profile.tags.set(String(tag).toLowerCase(), (profile.tags.get(String(tag).toLowerCase()) || 0) + 2);
    } catch {}
  }

  const followed = db.prepare("SELECT following_id FROM follows WHERE follower_id = ?").all(userId) as Array<{ following_id: string }>;
  for (const row of followed) profile.authors.add(row.following_id);

  return profile;
}

function scoreWork(work: FeedWorkRef, profile: InterestProfile, options?: { followed?: boolean; kind?: "trend" | "update" | "continue" }): { score: number; reason: string } {
  if (options?.kind === "continue") return { score: 999, reason: "Você parou aqui. Continuar agora é o caminho mais rápido pra voltar pra leitura." };

  let score = 10;
  score += Math.min(40, Math.log10((work.views || 0) + 1) * 7);
  score += Math.min(35, work.chapterCount / 8);
  if (work.rating) score += Math.min(20, work.rating * 2);
  if (work.latestChapterHref) score += 8;
  if (options?.kind === "trend") score += 18;
  if (options?.kind === "update") score += 22;
  if (options?.followed) score += 35;

  let bestTag: string | null = null;
  let bestWeight = 0;
  for (const tag of [...work.genres, ...work.tags]) {
    const weight = profile.tags.get(tag.toLowerCase()) || 0;
    if (weight > bestWeight) {
      bestTag = tag;
      bestWeight = weight;
    }
  }
  score += bestWeight * 10;

  const seenPenalty = profile.impressions.get(`${work.type}:${work.id}`) || 0;
  score -= Math.min(28, seenPenalty * 7);

  if (bestTag) return { score, reason: `Porque combina com ${bestTag}, que aparece no seu histórico de leitura.` };
  if (options?.followed) return { score, reason: "Porque você segue esse perfil/autor." };
  if (options?.kind === "update") return { score, reason: "Capítulo recente disponível pra voltar sem procurar." };
  if (options?.kind === "trend") return { score, reason: "Está em alta entre leitores do Tomoverso." };
  const fallback = work.tags[0] || work.genres[0] || SYSTEM_TAGS[Math.abs(work.id.charCodeAt(0) || 0) % SYSTEM_TAGS.length];
  return { score, reason: `Boa porta de entrada pra quem quer ${fallback}.` };
}

function decorateItem(db: SqliteDb, item: Omit<FeedItem, "counts" | "state">, userId: string | null): FeedItem {
  return {
    ...item,
    counts: getCounts(db, item.targetType, item.targetId),
    state: getState(db, userId, item.targetType, item.targetId),
  };
}

function getNovelRows(db: SqliteDb): NovelRow[] {
  return db.prepare(`
    SELECT
      n.*,
      u.username,
      u.display_name,
      u.avatar_url,
      u.role,
      u.display_name AS author_name,
      COUNT(ch.id) AS chapter_count,
      (
        SELECT c.chapter_number FROM chapters c
        WHERE c.novel_id = n.id
        ORDER BY c.chapter_number DESC
        LIMIT 1
      ) AS latest_chapter_number,
      (
        SELECT c.title FROM chapters c
        WHERE c.novel_id = n.id
        ORDER BY c.chapter_number DESC
        LIMIT 1
      ) AS latest_chapter_title
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    JOIN chapters ch ON ch.novel_id = n.id
    WHERE n.is_approved = 1
      AND COALESCE(ch.content, '') <> ''
    GROUP BY n.id
    ORDER BY n.is_featured DESC, n.views DESC, chapter_count DESC, n.updated_at DESC
    LIMIT 120
  `).all() as NovelRow[];
}

function getMangaRows(db: SqliteDb): MangaRow[] {
  return db.prepare(`
    SELECT
      m.*,
      '[' || COALESCE((SELECT group_concat(json_quote(tag)) FROM manga_tags mt WHERE mt.manga_id = m.id), '') || ']' AS tags,
      COUNT(DISTINCT ch.id) AS chapter_count,
      COUNT(p.id) AS page_count,
      (
        SELECT mc.chapter_number FROM manga_chapters mc
        WHERE mc.manga_id = m.id
        ORDER BY mc.chapter_number DESC
        LIMIT 1
      ) AS latest_chapter_number,
      (
        SELECT mc.title FROM manga_chapters mc
        WHERE mc.manga_id = m.id
        ORDER BY mc.chapter_number DESC
        LIMIT 1
      ) AS latest_chapter_title,
      (
        SELECT mp.image_url
        FROM manga_pages mp
        JOIN manga_chapters mc ON mc.id = mp.chapter_id
        WHERE mc.manga_id = m.id
          AND COALESCE(mp.image_url, '') <> ''
        ORDER BY mc.chapter_number DESC,
          CASE
            WHEN mp.page_number BETWEEN 2 AND 6 THEN 0
            WHEN mp.page_number > 6 THEN 1
            ELSE 2
          END,
          mp.page_number ASC
        LIMIT 1
      ) AS preview_page_url,
      (
        SELECT mc.chapter_number
        FROM manga_pages mp
        JOIN manga_chapters mc ON mc.id = mp.chapter_id
        WHERE mc.manga_id = m.id
          AND COALESCE(mp.image_url, '') <> ''
        ORDER BY mc.chapter_number DESC,
          CASE
            WHEN mp.page_number BETWEEN 2 AND 6 THEN 0
            WHEN mp.page_number > 6 THEN 1
            ELSE 2
          END,
          mp.page_number ASC
        LIMIT 1
      ) AS preview_chapter_number,
      (
        SELECT mp.page_number
        FROM manga_pages mp
        JOIN manga_chapters mc ON mc.id = mp.chapter_id
        WHERE mc.manga_id = m.id
          AND COALESCE(mp.image_url, '') <> ''
        ORDER BY mc.chapter_number DESC,
          CASE
            WHEN mp.page_number BETWEEN 2 AND 6 THEN 0
            WHEN mp.page_number > 6 THEN 1
            ELSE 2
          END,
          mp.page_number ASC
        LIMIT 1
      ) AS preview_page_number
    FROM mangas m
    JOIN manga_chapters ch ON ch.manga_id = m.id
    JOIN manga_pages p ON p.chapter_id = ch.id
    GROUP BY m.id
    HAVING page_count > 0
    ORDER BY page_count DESC, chapter_count DESC, m.updated_at DESC
    LIMIT 120
  `).all() as MangaRow[];
}

function buildWorkItems(db: SqliteDb, userId: string | null, profile: InterestProfile): FeedItem[] {
  const items: FeedItem[] = [];
  for (const row of getNovelRows(db)) {
    const work = novelWork(row);
    const followed = work.authorId ? profile.authors.has(work.authorId) : false;
    const mode = row.latest_chapter_number ? "update" : undefined;
    const scored = scoreWork(work, profile, { followed, kind: mode as "update" | undefined });
    if (profile.hidden.has(targetKey("novel", work.id))) continue;
    const base = decorateItem(db, {
      id: `novel:${work.id}`,
      kind: mode ? "update" : "recommendation",
      targetType: "novel",
      targetId: work.id,
      title: mode ? `Capítulo novo em ${work.title}` : work.title,
      body: work.synopsis,
      reason: scored.reason,
      score: scored.score,
      createdAt: row.updated_at || row.created_at,
      user: makeUserBadge({ id: row.author_id, username: row.username, display_name: row.display_name || row.author_name, avatar_url: row.avatar_url, role: row.role }, userId, db),
      work,
      actionLabel: work.chapterCount > 0 ? "Começar leitura" : "Ver obra",
      actionHref: work.readHref,
      badges: ["Novel", ...work.genres.slice(0, 2)],
    }, userId);
    items.push(base);
  }

  for (const row of getMangaRows(db)) {
    const work = mangaWork(row);
    if (profile.hidden.has(targetKey("manga", work.id))) continue;
    const scored = scoreWork(work, profile, { kind: "trend" });
    const hasCover = Boolean(work.coverUrl);
    const previewPages = hasCover ? getMangaPreviewMedia(db, row.id, 3).items : [];
    const allImages: Array<{ url: string; caption: string | null }> = [];
    if (work.coverUrl) allImages.push({ url: work.coverUrl, caption: null });
    for (const p of previewPages) {
      if (!allImages.some((i) => i.url === p.url)) allImages.push(p);
    }
    const hasVisual = allImages.length > 0;
    if (!hasVisual) continue;
    const mediaUrl = allImages[0]?.url || null;
    const mediaItems = allImages.length > 1 ? allImages : null;
    items.push(decorateItem(db, {
      id: `manga:${row.id}`,
      kind: "trend",
      targetType: "manga",
      targetId: row.id,
      title: work.title,
      body: work.synopsis,
      reason: scored.reason,
      score: scored.score + 4,
      createdAt: row.updated_at || row.created_at,
      user: null,
      work,
      mediaUrl,
      mediaKind: "cover",
      mediaCaption: null,
      mediaItems,
      actionLabel: "Ler mangá",
      actionHref: work.readHref,
      badges: ["Mangá", `${work.chapterCount} caps`, ...work.tags.slice(0, 1)],
    }, userId));
  }

  return items;
}

function buildContinueItems(db: SqliteDb, userId: string | null): FeedItem[] {
  if (!userId) return [];
  const rows = db.prepare(`
    SELECT rp.*, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles, n.synopsis, n.cover_url, n.cover_source_url,
      n.author_id, n.type, n.status, n.genres, n.tags, n.views, n.rating_sum, n.rating_count, n.external_score,
      n.created_at, n.updated_at, u.username, u.display_name, u.avatar_url, u.role,
      (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count,
      ch.chapter_number as latest_chapter_number,
      ch.title as latest_chapter_title
    FROM reading_progress rp
    JOIN novels n ON n.id = rp.novel_id
    JOIN chapters ch ON ch.id = rp.chapter_id
    LEFT JOIN users u ON u.id = n.author_id
    WHERE rp.user_id = ?
    ORDER BY rp.last_read_at DESC
    LIMIT 6
  `).all(userId) as Array<NovelRow & { progress: number; last_read_at: string }>;

  return rows.map((row) => {
    const work = novelWork(row);
    const scored = scoreWork(work, { tags: new Map(), authors: new Set(), hidden: new Set(), impressions: new Map() }, { kind: "continue" });
    return decorateItem(db, {
      id: `continue:${work.id}:${row.latest_chapter_number}`,
      kind: "continue",
      targetType: "novel",
      targetId: work.id,
      title: `Continuar ${work.title}`,
      body: `Você parou no capítulo ${row.latest_chapter_number}. Retoma daí sem perder tempo.`,
      reason: scored.reason,
      score: scored.score,
      createdAt: row.last_read_at,
      user: makeUserBadge({ id: row.author_id, username: row.username, display_name: row.display_name || row.author_name, avatar_url: row.avatar_url, role: row.role }, userId, db),
      work,
      actionLabel: `Continuar cap. ${row.latest_chapter_number}`,
      actionHref: `/novels/${work.slug}/${row.latest_chapter_number}`,
      badges: ["Continuar", `${Math.max(0, Math.min(100, row.progress || 0))}% lido`],
    }, userId);
  });
}

function buildPostItems(db: SqliteDb, userId: string | null, profile: InterestProfile): FeedItem[] {
  const rows = db.prepare(`
    SELECT fp.*, u.username, u.display_name, u.avatar_url, u.role
    FROM feed_posts fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.status = 'active' AND fp.visibility = 'public'
    ORDER BY fp.created_at DESC
    LIMIT 80
  `).all() as PostRow[];

  return rows
    .filter((row) => !profile.hidden.has(targetKey("post", row.id)))
    .map((row) => {
      const work = row.work_type && row.work_id ? getWorkById(db, row.work_type, row.work_id) : null;
      const linkedMangaPreview = !row.media_url && row.work_type === "manga" && row.work_id
        ? getMangaPreviewMedia(db, row.work_id, 1)
        : { items: [] as Array<{ url: string; caption: string | null }> };
      const firstPage = linkedMangaPreview.items[0] || null;
      let score = 70;
      if (row.user_id && profile.authors.has(row.user_id)) score += 35;
      if (work) score += scoreWork(work, profile).score / 3;
      const seen = profile.impressions.get(`post:${row.id}`) || 0;
      score -= Math.min(25, seen * 6);
      return decorateItem(db, {
        id: `post:${row.id}`,
        kind: "post",
        targetType: "post",
        targetId: row.id,
        postId: row.id,
        title: row.title || (work ? `Post sobre ${work.title}` : "Post da comunidade"),
        body: sanitizeFeedText(row.body, 600),
        reason: row.user_id && profile.authors.has(row.user_id) ? "Porque você segue esse perfil." : work ? `Post ligado a ${work.title}.` : "Post recente da comunidade Tomoverso.",
        score,
        createdAt: row.created_at,
        user: makeUserBadge({ id: row.user_id, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url, role: row.role }, userId, db),
        work,
        mediaUrl: row.media_url || firstPage?.url || null,
        mediaKind: row.media_url ? "post" : firstPage?.url ? "page" : null,
        mediaCaption: row.media_url ? "Mídia da comunidade" : firstPage?.caption || null,
        actionLabel: work ? "Abrir obra" : "Ver conversa",
        actionHref: work?.href || `/feed?post=${row.id}`,
        badges: [row.type === "review" ? "Review" : row.type === "repost" ? "Republicação" : "Post"],
      }, userId);
    });
}

function getWorkById(db: SqliteDb, type: FeedWorkType, id: string): FeedWorkRef | null {
  if (type === "novel") {
    const row = db.prepare(`
      SELECT n.*, u.username, u.display_name, u.avatar_url, u.role, u.display_name AS author_name,
        (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count,
        (SELECT c.chapter_number FROM chapters c WHERE c.novel_id = n.id ORDER BY c.chapter_number DESC LIMIT 1) as latest_chapter_number,
        (SELECT c.title FROM chapters c WHERE c.novel_id = n.id ORDER BY c.chapter_number DESC LIMIT 1) as latest_chapter_title
      FROM novels n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.id = ?
      LIMIT 1
    `).get(id) as NovelRow | undefined;
    return row ? novelWork(row) : null;
  }
  const row = db.prepare(`
    SELECT m.*,
      '[' || COALESCE((SELECT group_concat(json_quote(tag)) FROM manga_tags mt WHERE mt.manga_id = m.id), '') || ']' AS tags,
      (SELECT COUNT(*) FROM manga_chapters c WHERE c.manga_id = m.id) as chapter_count,
      (SELECT COUNT(*) FROM manga_pages p JOIN manga_chapters c ON c.id = p.chapter_id WHERE c.manga_id = m.id) as page_count,
      (SELECT c.chapter_number FROM manga_chapters c WHERE c.manga_id = m.id ORDER BY c.chapter_number DESC LIMIT 1) as latest_chapter_number,
      (SELECT c.title FROM manga_chapters c WHERE c.manga_id = m.id ORDER BY c.chapter_number DESC LIMIT 1) as latest_chapter_title
    FROM mangas m
    WHERE m.id = ?
    LIMIT 1
  `).get(id) as MangaRow | undefined;
  return row ? mangaWork(row) : null;
}

function diversify(items: FeedItem[]): FeedItem[] {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const result: FeedItem[] = [];
  while (sorted.length && result.length < 80) {
    const lastTwo = result.slice(-2).map((i) => i.targetType);
    let index = sorted.findIndex((item) => !(lastTwo.length === 2 && lastTwo.every((t) => t === item.targetType)));
    if (index < 0) index = 0;
    const [item] = sorted.splice(index, 1);
    result.push(item);
  }
  return result;
}

function isEligibleForShortsFeed(item: FeedItem): boolean {
  if (item.state.hidden || item.state.notInterested) return false;
  const hasVisual = !!(item.mediaUrl || item.mediaItems?.length || item.work?.coverUrl);
  // Posts textuais ligados a novels originais usam o gradiente/fallback visual do card.
  // Sem isso, divulgações de obras novas sem capa ficam salvas no banco, mas somem do /feed.
  if (item.targetType === "post") return true;
  return hasVisual;
}

export function getFeedPage(db: SqliteDb, user: UserRecord | null, input?: { cursor?: number; limit?: number; sessionId?: string }): FeedPageResult {
  ensure(db);
  const userId = user?.id || null;
  const cursor = Math.max(0, Number(input?.cursor || 0));
  const limit = Math.min(20, Math.max(4, Number(input?.limit || 8)));
  const sessionId = input?.sessionId || randomUUID();
  const profile = buildInterestProfile(db, userId);
  const all = diversify([
    ...buildContinueItems(db, userId),
    ...buildPostItems(db, userId, profile),
    ...buildWorkItems(db, userId, profile),
  ]).filter(isEligibleForShortsFeed);

  const items = all.slice(cursor, cursor + limit);
  return {
    items,
    nextCursor: cursor + limit < all.length ? cursor + limit : null,
    sessionId,
  };
}

export function getFeedWorkOptions(db: SqliteDb): FeedWorkOption[] {
  ensure(db);
  const novels = getNovelRows(db).slice(0, 24).map((row) => {
    const title = novelWork(row).title;
    return { id: row.id, type: "novel" as FeedWorkType, title, label: `Novel · ${title}` };
  });
  const mangas = getMangaRows(db).slice(0, 24).map((row) => ({ id: row.id, type: "manga" as FeedWorkType, title: row.title, label: `Mangá · ${row.title}` }));
  return [...novels, ...mangas].slice(0, 40);
}

export function toggleLike(db: SqliteDb, userId: string, targetType: FeedTargetType, targetId: string) {
  ensure(db);
  const existing = db.prepare(`SELECT id FROM feed_interactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND interaction_type = 'like' LIMIT 1`).get(userId, targetType, targetId) as { id: string } | undefined;
  if (existing) {
    db.prepare("DELETE FROM feed_interactions WHERE id = ?").run(existing.id);
    db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'unlike')`).run(randomUUID(), userId, targetType, targetId);
  } else {
    db.prepare(`INSERT OR IGNORE INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'like')`).run(randomUUID(), userId, targetType, targetId);
  }
  return { liked: !existing, counts: getCounts(db, targetType, targetId) };
}

export function toggleSave(db: SqliteDb, userId: string, targetType: FeedTargetType, targetId: string, work?: { type?: FeedWorkType | null; id?: string | null }) {
  ensure(db);
  const existing = db.prepare(`SELECT id FROM saved_feed_items WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1`).get(userId, targetType, targetId) as { id: string } | undefined;
  if (existing) {
    db.prepare("DELETE FROM saved_feed_items WHERE id = ?").run(existing.id);
    db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'unfavorite')`).run(randomUUID(), userId, targetType, targetId);
  } else {
    db.prepare(`INSERT OR IGNORE INTO saved_feed_items (id, user_id, target_type, target_id, post_id, work_type, work_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(),
      userId,
      targetType,
      targetId,
      targetType === "post" ? targetId : null,
      work?.type || (targetType === "novel" || targetType === "manga" ? targetType : null),
      work?.id || (targetType === "novel" || targetType === "manga" ? targetId : null)
    );
    db.prepare(`INSERT OR IGNORE INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'favorite')`).run(randomUUID(), userId, targetType, targetId);
  }
  return { saved: !existing, counts: getCounts(db, targetType, targetId) };
}

export function toggleFollow(db: SqliteDb, userId: string, followingId: string) {
  ensure(db);
  if (userId === followingId) return { following: false };
  const existing = db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1").get(userId, followingId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(userId, followingId);
    return { following: false };
  }
  db.prepare("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)").run(userId, followingId);
  db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, 'user', ?, 'follow_user')`).run(randomUUID(), userId, followingId);
  return { following: true };
}

export function createFeedPost(db: SqliteDb, userId: string, input: { title?: string; body: string; workType?: FeedWorkType | ""; workId?: string; type?: string }) {
  ensure(db);
  const body = sanitizeFeedText(input.body, 1200);
  const title = sanitizeFeedText(input.title || "", 120) || null;
  if (body.length < 3) return { ok: false, error: "Escreve pelo menos uma frase." };

  const recent = (db.prepare(`SELECT COUNT(*) as c FROM feed_posts WHERE user_id = ? AND created_at > datetime('now', '-5 minutes')`).get(userId) as { c: number }).c;
  if (recent >= 6) return { ok: false, error: "Calma aí: limite anti-spam ativado. Tenta de novo em alguns minutos." };

  const workType = input.workType === "novel" || input.workType === "manga" ? input.workType : null;
  const workId = workType && input.workId ? input.workId : null;
  if (workType && workId && !getWorkById(db, workType, workId)) return { ok: false, error: "Obra relacionada não encontrada." };

  const id = randomUUID();
  db.prepare(`
    INSERT INTO feed_posts (id, user_id, type, title, body, work_type, work_id, visibility, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'public', 'active')
  `).run(id, userId, input.type === "review" ? "review" : "post", title, body, workType, workId);
  db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, 'post', ?, 'create_post')`).run(randomUUID(), userId, id);
  return { ok: true, postId: id };
}

export function getComments(db: SqliteDb, targetType: FeedTargetType, targetId: string, currentUserId: string | null): FeedCommentItem[] {
  ensure(db);
  const rows = db.prepare(`
    SELECT fc.*, u.username, u.display_name, u.avatar_url, u.role
    FROM feed_comments fc
    JOIN users u ON u.id = fc.user_id
    WHERE fc.target_type = ? AND fc.target_id = ? AND fc.status = 'active'
    ORDER BY fc.created_at DESC
    LIMIT 80
  `).all(targetType, targetId) as Array<{ id: string; body: string; created_at: string; user_id: string; username: string; display_name: string; avatar_url: string | null; role: "user" | "admin" | "author" }>;
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    user: makeUserBadge({ id: row.user_id, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url, role: row.role }, currentUserId, db)!,
  }));
}

export function createComment(db: SqliteDb, userId: string, targetType: FeedTargetType, targetId: string, bodyInput: string) {
  ensure(db);
  const body = sanitizeFeedText(bodyInput, 800);
  if (body.length < 2) return { ok: false, error: "Comentário vazio." };
  const recent = (db.prepare(`SELECT COUNT(*) as c FROM feed_comments WHERE user_id = ? AND created_at > datetime('now', '-1 minute')`).get(userId) as { c: number }).c;
  if (recent >= 8) return { ok: false, error: "Muitos comentários em pouco tempo." };
  const id = randomUUID();
  db.prepare(`
    INSERT INTO feed_comments (id, target_type, target_id, post_id, user_id, body, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, targetType, targetId, targetType === "post" ? targetId : null, userId, body);
  db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'comment')`).run(randomUUID(), userId, targetType, targetId);
  return { ok: true, commentId: id, counts: getCounts(db, targetType, targetId) };
}

export function repostItem(db: SqliteDb, userId: string, targetType: FeedTargetType, targetId: string, text?: string) {
  ensure(db);
  const body = sanitizeFeedText(text || "Republicando no meu feed.", 600);
  const id = randomUUID();
  if (targetType === "post") {
    const original = db.prepare("SELECT id FROM feed_posts WHERE id = ? AND status = 'active' LIMIT 1").get(targetId) as { id: string } | undefined;
    if (!original) return { ok: false, error: "Post original não encontrado." };
    db.prepare(`INSERT INTO feed_posts (id, user_id, type, body, repost_of_id, visibility, status) VALUES (?, ?, 'repost', ?, ?, 'public', 'active')`).run(id, userId, body, targetId);
  } else {
    db.prepare(`INSERT INTO feed_posts (id, user_id, type, body, work_type, work_id, visibility, status) VALUES (?, ?, 'repost', ?, ?, ?, 'public', 'active')`).run(id, userId, body, targetType, targetId);
  }
  db.prepare(`INSERT INTO feed_interactions (id, user_id, target_type, target_id, interaction_type) VALUES (?, ?, ?, ?, 'repost')`).run(randomUUID(), userId, targetType, targetId);
  return { ok: true, postId: id, counts: getCounts(db, targetType, targetId) };
}

export function markFeedItem(db: SqliteDb, userId: string, targetType: FeedTargetType, targetId: string, interaction: "hide" | "not_interested" | "share" | "open_work" | "open_chapter", metadata?: Record<string, unknown>) {
  ensure(db);
  db.prepare(`
    INSERT OR IGNORE INTO feed_interactions (id, user_id, target_type, target_id, interaction_type, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, targetType, targetId, interaction, JSON.stringify(metadata || {}));
  return { ok: true, counts: getCounts(db, targetType, targetId) };
}

export function registerImpression(db: SqliteDb, userId: string | null, input: { itemType: string; itemId: string; position?: number; sessionId?: string }) {
  ensure(db);
  if (!input.itemType || !input.itemId) return { ok: false };
  db.prepare(`
    INSERT INTO feed_impressions (id, user_id, item_type, item_id, position, feed_session_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, input.itemType, input.itemId, Number(input.position || 0), input.sessionId || null);
  return { ok: true };
}
