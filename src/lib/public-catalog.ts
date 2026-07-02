export function readableNovelChapterSql(alias = "c") {
  return `(length(trim(coalesce(${alias}.content, ''))) > 120 OR coalesce(${alias}.word_count, 0) > 30)`;
}

export function readableMangaExistsSql(alias = "m") {
  return `EXISTS (
    SELECT 1
    FROM manga_chapters ch
    JOIN manga_pages p ON p.chapter_id = ch.id
    WHERE ch.manga_id = ${alias}.id
      AND coalesce(p.image_url, p.local_path, '') <> ''
  )`;
}

export function publicSafeNovelSql(alias = "n") {
  return `COALESCE(${alias}.source, '') NOT IN ('ao3', 'kakuyomu')
    AND ${alias}.type <> 'web-novel'
    AND ${alias}.slug NOT LIKE 'ao3-%'
    AND ${alias}.title NOT LIKE 'AO3 Work %'`;
}

export function publicVisibleNovelSql(alias = "n") {
  return `${publicSafeNovelSql(alias)} AND NOT EXISTS (
    SELECT 1 FROM catalog_controls cc
    WHERE cc.item_type = 'novel' AND cc.item_id = ${alias}.id AND cc.is_hidden = 1
  )`;
}

export function publicReadableNovelSql(alias = "n", chapterAlias = "c") {
  return `${publicVisibleNovelSql(alias)} AND EXISTS (
    SELECT 1 FROM chapters ${chapterAlias}
    WHERE ${chapterAlias}.novel_id = ${alias}.id
      AND ${readableNovelChapterSql(chapterAlias)}
  )`;
}

export function publicVisibleMangaSql(alias = "m") {
  return `${readableMangaExistsSql(alias)} AND NOT EXISTS (
    SELECT 1 FROM catalog_controls cc
    WHERE cc.item_type = 'manga' AND cc.item_id = ${alias}.id AND cc.is_hidden = 1
  )`;
}
