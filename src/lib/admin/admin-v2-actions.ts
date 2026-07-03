"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getAdminSecretPath, requireSecretAdminAction } from "@/lib/admin/admin-v2-auth";
import { safeRun, tableExists } from "@/lib/admin/admin-v2-data";

function adminPaths(...suffixes: string[]) {
  const root = `/${getAdminSecretPath()}`;
  return [root, ...suffixes.map((suffix) => `${root}${suffix}`)];
}

function cleanId(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function deleteNovelV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("novel_id"));
  if (!id) return;

  const db = getDb();
  safeRun(db, "DELETE FROM bookmarks WHERE chapter_id IN (SELECT id FROM chapters WHERE novel_id = ?)", id);
  safeRun(db, "DELETE FROM comments WHERE novel_id = ?", id);
  safeRun(db, "DELETE FROM paid_works WHERE content_type IN ('novel','book') AND content_id = ?", id);
  safeRun(db, "DELETE FROM catalog_controls WHERE item_type = 'novel' AND item_id = ?", id);
  safeRun(db, "DELETE FROM chapters WHERE novel_id = ?", id);
  safeRun(db, "DELETE FROM novels WHERE id = ?", id);

  for (const path of adminPaths("/novels")) revalidatePath(path);
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function deleteMangaV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("manga_id"));
  if (!id) return;

  const db = getDb();
  safeRun(db, "DELETE FROM manga_pages WHERE chapter_id IN (SELECT id FROM manga_chapters WHERE manga_id = ?)", id);
  safeRun(db, "DELETE FROM paid_works WHERE content_type = 'manga' AND content_id = ?", id);
  safeRun(db, "DELETE FROM catalog_controls WHERE item_type = 'manga' AND item_id = ?", id);
  safeRun(db, "DELETE FROM manga_chapters WHERE manga_id = ?", id);
  safeRun(db, "DELETE FROM mangas WHERE id = ?", id);

  for (const path of adminPaths("/mangas")) revalidatePath(path);
  revalidatePath("/");
  revalidatePath("/explore");
}

export async function updateUserEmailV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const userId = cleanId(formData.get("user_id"));
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase() : "";
  if (!userId || !email || !email.includes("@") || email.endsWith("@external.author")) return;

  const db = getDb();
  safeRun(db, "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?", email, userId);
  revalidatePath(`/${getAdminSecretPath()}/usuarios`);
}

export async function toggleUserBanV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const userId = cleanId(formData.get("user_id"));
  if (!userId || userId === admin.id) return;

  const db = getDb();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as any;
  if (!user || user.role === "admin") return;

  const nextRole = user.role === "banned" ? "user" : "banned";
  safeRun(db, "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", nextRole, userId);

  if (tableExists(db, "user_access_controls")) {
    safeRun(
      db,
      `INSERT INTO user_access_controls (user_id, is_suspended, suspension_reason, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET is_suspended=excluded.is_suspended, suspension_reason=excluded.suspension_reason, updated_at=datetime('now')`,
      userId,
      nextRole === "banned" ? 1 : 0,
      nextRole === "banned" ? "Suspenso pelo Admin Hub" : null,
    );
  }

  if (nextRole === "banned") safeRun(db, "DELETE FROM sessions WHERE user_id = ?", userId);
  revalidatePath(`/${getAdminSecretPath()}/usuarios`);
}

export async function deleteUserV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const userId = cleanId(formData.get("user_id"));
  if (!userId || userId === admin.id) return;

  const db = getDb();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as any;
  if (!user || user.role === "admin") return;

  safeRun(db, "DELETE FROM sessions WHERE user_id = ?", userId);
  safeRun(db, "DELETE FROM user_access_controls WHERE user_id = ?", userId);
  safeRun(db, "DELETE FROM verification_codes WHERE user_id = ?", userId);
  safeRun(db, "DELETE FROM users WHERE id = ?", userId);
  revalidatePath(`/${getAdminSecretPath()}/usuarios`);
}

export async function hideCommentV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("comment_id"));
  if (!id) return;
  const db = getDb();
  safeRun(db, "UPDATE comments SET content = '[removido por administração]', is_hidden = 1 WHERE id = ?", id);
  revalidatePath(`/${getAdminSecretPath()}/comentarios`);
}

export async function confirmWithdrawalV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const withdrawalId = cleanId(formData.get("withdrawal_id"));
  if (!withdrawalId) return;

  const db = getDb();
  try {
    db.prepare("UPDATE withdrawal_requests SET status = 'paid', reviewed_by = ?, reviewed_at = datetime('now'), paid_at = datetime('now') WHERE id = ? AND status = 'pending'").run(admin.id, withdrawalId);
  } catch {
    safeRun(db, "UPDATE withdrawal_requests SET status = 'paid', approved_by = ?, approved_at = datetime('now') WHERE id = ? AND status = 'pending'", admin.id, withdrawalId);
  }
  revalidatePath(`/${getAdminSecretPath()}/finance`);
  revalidatePath("/admin/finance");
}

export async function markImportCompletedV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("import_id"));
  if (!id) return;
  const db = getDb();
  safeRun(db, "UPDATE import_queue SET status = 'completed', processed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", id);
  revalidatePath(`/${getAdminSecretPath()}/analise`);
  revalidatePath(`/${getAdminSecretPath()}/upload`);
}

export async function deleteImportV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("import_id"));
  if (!id) return;
  const db = getDb();
  safeRun(db, "DELETE FROM import_queue WHERE id = ?", id);
  revalidatePath(`/${getAdminSecretPath()}/analise`);
  revalidatePath(`/${getAdminSecretPath()}/upload`);
}

export async function updateReportStatusV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("report_id"));
  const table = cleanId(formData.get("table"));
  const status = cleanId(formData.get("status"));
  if (!id || !status || !["resolved", "dismissed"].includes(status)) return;

  const db = getDb();
  if (table === "feed_reports") {
    safeRun(db, "UPDATE feed_reports SET status = ? WHERE id = ?", status, id);
  } else {
    safeRun(db, "UPDATE reports SET status = ? WHERE id = ?", status, id);
  }
  revalidatePath(`/${getAdminSecretPath()}/moderacao`);
}

export async function hideFeedPostV2Action(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = cleanId(formData.get("post_id"));
  if (!id) return;
  const db = getDb();
  safeRun(db, "UPDATE feed_posts SET status = 'hidden', updated_at = datetime('now') WHERE id = ?", id);
  revalidatePath(`/${getAdminSecretPath()}/feed`);
  revalidatePath(`/${getAdminSecretPath()}/moderacao`);
  revalidatePath("/feed");
}
