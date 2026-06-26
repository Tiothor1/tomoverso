import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { UserRecord } from "@/lib/auth";

export type PaidContentType = "novel" | "book" | "manga";

export async function canAccessPaidContent(params: {
  user: Pick<UserRecord, "id" | "role"> | null;
  contentType: PaidContentType;
  contentId: string;
  ownerUserId?: string | null;
}) {
  const { user, contentType, contentId, ownerUserId } = params;
  if (!user) return false;
  if (user.role === "admin") return true;
  if (ownerUserId && ownerUserId === user.id) return true;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("content_access_grants")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt.now()")
      .maybeSingle();
    if (!error && data?.id) return true;
  }

  const db = getDb();
  const grant = db.prepare(`
    SELECT id FROM content_access_grants
    WHERE user_id = ?
      AND content_type = ?
      AND content_id = ?
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    LIMIT 1
  `).get(user.id, contentType, contentId) as { id: string } | undefined;

  return !!grant;
}

export async function isPaidWorkApproved(contentType: PaidContentType, contentId: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("paid_works")
      .select("id")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("status", "approved")
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!error && data?.id) return true;
  }

  const db = getDb();
  const row = db.prepare(`
    SELECT id FROM paid_works
    WHERE content_type = ? AND content_id = ? AND status = 'approved' AND approval_status = 'approved'
    LIMIT 1
  `).get(contentType, contentId) as { id: string } | undefined;
  return !!row;
}
