import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { MangaReader } from "@/components/manga/manga-reader";

interface MangaRow {
  id: string;
  slug: string;
  title: string;
}

interface ChapterRow {
  id: string;
  chapter_number: number;
  title: string | null;
  slug: string;
  page_count: number;
}

interface PageRow {
  id: string;
  page_number: number;
  image_url: string;
  width: number | null;
  height: number | null;
}

export const dynamic = "force-dynamic";

export default async function MangaChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterSlug } = await params;
  const db = getDb();

  const manga = db.prepare(`SELECT id, slug, title FROM mangas WHERE slug = ?`).get(slug) as
    | MangaRow
    | undefined;
  if (!manga) notFound();

  // chapter param pode ser número ou slug — aceita ambos
  const chapter = db
    .prepare(
      `SELECT id, chapter_number, title, slug, page_count
       FROM manga_chapters
       WHERE manga_id = ? AND (slug = ? OR CAST(CAST(chapter_number AS INTEGER) AS TEXT) = ?)
       LIMIT 1`
    )
    .get(manga.id, chapterSlug, chapterSlug) as ChapterRow | undefined;

  if (!chapter) notFound();

  const pages = db
    .prepare(
      `SELECT id, page_number, image_url, width, height
       FROM manga_pages
       WHERE chapter_id = ?
       ORDER BY page_number ASC`
    )
    .all(chapter.id) as PageRow[];

  const allChapters = db
    .prepare(
      `SELECT id, chapter_number, title, slug, page_count
       FROM manga_chapters
       WHERE manga_id = ?
       ORDER BY chapter_number ASC`
    )
    .all(manga.id) as ChapterRow[];

  const currentIdx = allChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

  return (
    <MangaReader
      manga={{ slug: manga.slug, title: manga.title }}
      chapter={{
        id: chapter.id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        slug: chapter.slug,
        page_count: chapter.page_count,
      }}
      pages={pages.map((p) => ({
        id: p.id,
        page_number: p.page_number,
        image_url: p.image_url,
        width: p.width,
        height: p.height,
      }))}
      prevChapter={
        prevChapter
          ? {
              id: prevChapter.id,
              chapter_number: prevChapter.chapter_number,
              title: prevChapter.title,
              slug: prevChapter.slug,
              page_count: prevChapter.page_count,
            }
          : null
      }
      nextChapter={
        nextChapter
          ? {
              id: nextChapter.id,
              chapter_number: nextChapter.chapter_number,
              title: nextChapter.title,
              slug: nextChapter.slug,
              page_count: nextChapter.page_count,
            }
          : null
      }
      allChapters={allChapters.map((c) => ({
        id: c.id,
        chapter_number: c.chapter_number,
        title: c.title,
        slug: c.slug,
        page_count: c.page_count,
      }))}
    />
  );
}