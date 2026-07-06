import { redirect } from "next/navigation";

export default async function NovelAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/novels/${slug}`);
}
