import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";
import { getDb } from "../db";

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");
  return user;
}

export function adminLog(userId: string, action: string, targetType?: string | null, targetId?: string | null, metadata?: unknown) {
  const db = getDb();
  db.prepare(`
    INSERT INTO activity_log (id, user_id, action, target_type, target_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    action,
    targetType || null,
    targetId || null,
    metadata ? JSON.stringify(metadata) : JSON.stringify({})
  );
}

export function touchPublicRoutes() {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/manga");
  revalidatePath("/store");
}
