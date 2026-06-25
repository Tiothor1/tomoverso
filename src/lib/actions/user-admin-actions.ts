"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { adminLog, requireAdminUser } from "./_admin-utils";

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdminUser();
  const db = getDb();
  const userId = String(formData.get("user_id") || "").trim();
  const role = String(formData.get("role") || "user").trim();

  if (!userId || !["user", "author", "admin"].includes(role)) {
    return;
  }

  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, userId);
  adminLog(admin.id, "set_user_role", "user", userId, { role });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function setUserSuspensionAction(formData: FormData) {
  const admin = await requireAdminUser();
  const db = getDb();
  const userId = String(formData.get("user_id") || "").trim();
  const isSuspended = formData.get("is_suspended") ? 1 : 0;
  const reason = String(formData.get("suspension_reason") || "").trim() || null;

  if (!userId) return;

  const existing = db.prepare("SELECT user_id FROM user_access_controls WHERE user_id = ?").get(userId) as { user_id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE user_access_controls SET is_suspended = ?, suspension_reason = ?, updated_at = datetime('now') WHERE user_id = ?").run(isSuspended, reason, userId);
  } else {
    db.prepare("INSERT INTO user_access_controls (user_id, is_suspended, suspension_reason) VALUES (?, ?, ?)").run(userId, isSuspended, reason);
  }

  adminLog(admin.id, isSuspended ? "suspend_user" : "unsuspend_user", "user", userId, { reason });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
