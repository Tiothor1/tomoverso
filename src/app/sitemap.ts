import { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { publicVisibleNovelSql, publicVisibleMangaSql } from "@/lib/public-catalog";

const BASE_URL = "https://tomoversoeditora.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/explore`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/manga`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/web-novels`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/sobre`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/termos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacidade`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contato`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/concurso`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  // Novel slugs
  const novels = db.prepare(
    `SELECT slug, updated_at FROM novels n WHERE ${publicVisibleNovelSql("n")} ORDER BY n.updated_at DESC`
  ).all() as { slug: string; updated_at: string }[];

  const novelRoutes: MetadataRoute.Sitemap = novels.map((n) => ({
    url: `${BASE_URL}/novels/${n.slug}`,
    lastModified: new Date(n.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Manga slugs (via mangas table)
  const mangas: { slug: string; updated_at: string }[] = [];
  try {
    const mangaRows = db.prepare(
      `SELECT slug, updated_at FROM mangas WHERE ${publicVisibleMangaSql("m")} ORDER BY updated_at DESC`
    ).all() as { slug: string; updated_at: string }[];
    mangas.push(...mangaRows);
  } catch {
    // mangas table may not exist yet
  }

  const mangaRoutes: MetadataRoute.Sitemap = mangas.map((m) => ({
    url: `${BASE_URL}/manga/${m.slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Author pages
  const authors = db.prepare(
    `SELECT username FROM users WHERE role IN ('author', 'admin') ORDER BY username`
  ).all() as { username: string }[];

  const authorRoutes: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${BASE_URL}/authors/${a.username}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...novelRoutes, ...mangaRoutes, ...authorRoutes];
}
