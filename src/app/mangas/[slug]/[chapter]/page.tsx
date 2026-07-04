import { redirect } from "next/navigation";

export default async function MangaChapterAliasPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  redirect(`/manga/${slug}/${chapter}`);
}
