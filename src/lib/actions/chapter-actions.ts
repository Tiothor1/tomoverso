"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const chapterSchema = z.object({
  novel_id: z.string(),
  chapter_number: z.number().int().min(1).max(9999),
  title: z.string().min(2).max(200),
  content: z.string().min(100, "Capítulo muito curto (mínimo 100 caracteres)"),
});

function generateId(): string {
  return crypto.randomUUID();
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function createChapterAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const data = {
    novel_id: formData.get("novel_id") as string,
    chapter_number: parseInt(formData.get("chapter_number") as string, 10),
    title: formData.get("title") as string,
    content: formData.get("content") as string,
  };

  const parsed = chapterSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const db = getDb();
  const novel = db.prepare("SELECT id, slug, author_id FROM novels WHERE id = ?").get(parsed.data.novel_id) as any;
  if (!novel) return { ok: false, error: "Novel não encontrada" };
  if (novel.author_id !== user.id && user.role !== "admin") {
    return { ok: false, error: "Você não é o autor dessa novel" };
  }

  // Verifica se chapter_number já existe
  const existing = db.prepare("SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?").get(parsed.data.novel_id, parsed.data.chapter_number);
  if (existing) {
    return { ok: false, error: `Já existe um capítulo ${parsed.data.chapter_number}. Escolha outro número.` };
  }

  const id = generateId();
  const wordCount = countWords(parsed.data.content);

  try {
    db.prepare(`
      INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, parsed.data.novel_id, parsed.data.chapter_number, parsed.data.title, parsed.data.content, wordCount);
  } catch (e: any) {
    return { ok: false, error: e.message };
  }

  db.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)")
    .run(generateId(), user.id, "create_chapter", "chapter", id);

  revalidatePath(`/novels/${novel.slug}`);
  revalidatePath(`/novels/${novel.slug}/${parsed.data.chapter_number}`);
  revalidatePath("/dashboard");
  redirect(`/novels/${novel.slug}/${parsed.data.chapter_number}`);
}
