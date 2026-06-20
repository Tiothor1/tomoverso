"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Promove o usuário logado para admin APENAS SE não existir nenhum admin no banco.
 * Útil pra emergência quando o seed não rodou ou foi perdido.
 */
export async function bootstrapAdminAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();
  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;

  if (adminCount > 0) {
    return { ok: false, error: "Já existe um admin no sistema. Use essa conta." };
  }

  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  db.prepare("INSERT INTO activity_log (id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?)")
    .run(generateId(), user.id, "bootstrap_admin", "user", user.id, JSON.stringify({ reason: "no_admin_exists" }));

  return { ok: true, message: "Você agora é admin! Redirecionando..." };
}
