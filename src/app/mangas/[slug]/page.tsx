import { redirect } from "next/navigation";

export default async function MangaSlugAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/manga/${slug}`);
}
