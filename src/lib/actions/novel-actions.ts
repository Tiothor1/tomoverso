"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const novelSchema = z.object({
  title: z.string().min(2, "Título muito curto").max(120),
  alternative_titles: z.string().optional(),
  synopsis: z.string().min(100, "Sinopse muito curta (mínimo 100 caracteres)").max(2000),
  type: z.enum(["light-novel", "web-novel", "short"]),
  status: z.enum(["ongoing", "hiatus", "completed"]),
  genres: z.string().optional(), // comma-separated
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function createNovelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const data = {
    title: formData.get("title") as string,
    alternative_titles: (formData.get("alternative_titles") as string) || "",
    synopsis: formData.get("synopsis") as string,
    type: formData.get("type") as string,
    status: formData.get("status") as string,
    genres: (formData.get("genres") as string) || "",
  };

  const parsed = novelSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const db = getDb();

  // Limite de obras gratis: 3 works sem plano Autor
  const userCount = db.prepare("SELECT COUNT(*) as c FROM novels WHERE author_id = ?").get(user.id) as { c: number };
  const userWorkCount = userCount.c;

  const isAuthor = db.prepare(`
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = ? AND us.status IN ('active', 'trialing') AND sp.role_granted = 'author'
  `).get(user.id);

  if (userWorkCount >= 3 && !isAuthor) {
    return { ok: false, error: `Você já publicou ${userWorkCount} obras. O plano gratuito permite até 3. Assine o Autor para publicar mais.` };
  }

  const baseSlug = slugify(parsed.data.title);
  let slug = baseSlug;
  let n = 1;
  while (db.prepare("SELECT 1 FROM novels WHERE slug = ?").get(slug)) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  const id = generateId();
  const altTitles = parsed.data.alternative_titles
    ? parsed.data.alternative_titles.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const genres = parsed.data.genres
    ? parsed.data.genres.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5)
    : [];

  try {
    db.prepare(`
      INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, genres, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, slug, parsed.data.title, JSON.stringify(altTitles), parsed.data.synopsis,
      `/covers/${slug}.jpg`, user.id, parsed.data.type, parsed.data.status,
      JSON.stringify(genres), JSON.stringify([])
    );
  } catch (e: any) {
    return { ok: false, error: e.message };
  }

  db.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)")
    .run(generateId(), user.id, "create_novel", "novel", id);

  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath(`/authors/${user.username}`);
  redirect(`/dashboard/novels/${id}/chapters/new`);
}
