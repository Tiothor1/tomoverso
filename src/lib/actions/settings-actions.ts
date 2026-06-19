"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

function generateId(): string {
  return crypto.randomUUID();
}

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const display_name = (formData.get("display_name") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim();
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!display_name || display_name.length < 2) {
    return { ok: false, error: "Nome muito curto" };
  }

  const db = getDb();
  db.prepare("UPDATE users SET display_name = ?, bio = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(display_name, bio || "", avatar_url, user.id);

  db.prepare("INSERT INTO activity_log (id, user_id, action) VALUES (?, ?, ?)")
    .run(generateId(), user.id, "update_profile");

  revalidatePath("/dashboard");
  revalidatePath(`/authors/${user.username}`);
  return { ok: true, message: "Perfil atualizado!" };
}
