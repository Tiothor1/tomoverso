export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { NewChapterForm } from "./form";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const metadata = {
  title: "Novo capítulo — Tomoverso",
};

export default async function NewChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();
  const novel = db.prepare("SELECT id, title, slug, author_id FROM novels WHERE id = ?").get(id) as any;
  if (!novel) notFound();
  if (novel.author_id !== user.id && user.role !== "admin") redirect("/dashboard");

  const maxChapter = (db.prepare("SELECT MAX(chapter_number) as max FROM chapters WHERE novel_id = ?").get(id) as { max: number | null }).max;
  const nextChapterNumber = (maxChapter || 0) + 1;

  return <NewChapterForm novel={{ ...novel, nextChapterNumber }} />;
}
