"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PIX_KEY_TYPES } from "@/lib/marketplace/constants";
import { adminLog, requireAdminUser } from "@/lib/actions/_admin-utils";

const sellerApplicationSchema = z.object({
  legal_name: z.string().min(3, "Informe seu nome legal completo").max(120),
  public_name: z.string().min(2, "Informe o nome público").max(80),
  pix_key_type: z.enum(PIX_KEY_TYPES),
  pix_key: z.string().min(3, "Informe a chave PIX").max(160),
  payout_notes: z.string().max(500).optional(),
  message: z.string().max(800).optional(),
});

async function ensureSupabaseProfile(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !user) return null;

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio: user.bio || "",
    role: user.role,
    email_verified: !!user.email_verified,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  return supabase;
}

export async function submitSellerApplicationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const parsed = sellerApplicationSchema.safeParse({
    legal_name: formData.get("legal_name"),
    public_name: formData.get("public_name"),
    pix_key_type: formData.get("pix_key_type"),
    pix_key: formData.get("pix_key"),
    payout_notes: formData.get("payout_notes") || "",
    message: formData.get("message") || "",
  });

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await ensureSupabaseProfile(user);
  if (supabase) {
    const existing = await supabase.from("seller_profiles").select("id,status").eq("user_id", user.id).maybeSingle();
    if (existing.data?.status === "approved") return { ok: false, error: "Você já está aprovado como vendedor." };

    const sellerPayload = {
      user_id: user.id,
      status: "pending",
      legal_name: parsed.data.legal_name.trim(),
      public_name: parsed.data.public_name.trim(),
      pix_key_type: parsed.data.pix_key_type,
      pix_key: parsed.data.pix_key.trim(),
      payout_notes: parsed.data.payout_notes || "",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    const { data: seller, error } = await supabase
      .from("seller_profiles")
      .upsert(sellerPayload, { onConflict: "user_id" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await supabase.from("seller_applications").insert({
      seller_id: seller.id,
      user_id: user.id,
      status: "pending",
      message: parsed.data.message || "",
    });
  } else {
    const db = getDb();
    const existing = db.prepare("SELECT id, status FROM seller_profiles WHERE user_id = ?").get(user.id) as { id: string; status: string } | undefined;
    if (existing?.status === "approved") return { ok: false, error: "Você já está aprovado como vendedor." };

    const sellerId = existing?.id || crypto.randomUUID();
    if (existing) {
      db.prepare(`
        UPDATE seller_profiles
        SET status = 'pending', legal_name = ?, public_name = ?, pix_key_type = ?, pix_key = ?, payout_notes = ?, rejection_reason = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(parsed.data.legal_name.trim(), parsed.data.public_name.trim(), parsed.data.pix_key_type, parsed.data.pix_key.trim(), parsed.data.payout_notes || "", sellerId);
    } else {
      db.prepare(`
        INSERT INTO seller_profiles (id, user_id, status, legal_name, public_name, pix_key_type, pix_key, payout_notes)
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(sellerId, user.id, parsed.data.legal_name.trim(), parsed.data.public_name.trim(), parsed.data.pix_key_type, parsed.data.pix_key.trim(), parsed.data.payout_notes || "");
    }

    db.prepare(`
      INSERT INTO seller_applications (id, seller_id, user_id, status, message)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(crypto.randomUUID(), sellerId, user.id, parsed.data.message || "");
  }

  revalidatePath("/dashboard/seller");
  revalidatePath("/admin/sellers");
  return { ok: true };
}

export async function reviewSellerApplicationAction(formData: FormData) {
  const admin = await requireAdminUser();
  const sellerId = String(formData.get("seller_id") || "");
  const decision = String(formData.get("decision") || "");
  const rejectionReason = String(formData.get("rejection_reason") || "").trim();
  if (!sellerId || !["approve", "reject", "suspend"].includes(decision)) return;

  const status = decision === "approve" ? "approved" : decision === "suspend" ? "suspended" : "rejected";
  const supabase = await ensureSupabaseProfile(admin);
  if (supabase) {
    const { data: seller } = await supabase.from("seller_profiles").select("user_id").eq("id", sellerId).maybeSingle();
    await supabase.from("seller_profiles").update({
      status,
      approved_by: decision === "approve" ? admin.id : null,
      approved_at: decision === "approve" ? new Date().toISOString() : null,
      rejection_reason: decision === "approve" ? null : rejectionReason,
      updated_at: new Date().toISOString(),
    }).eq("id", sellerId);

    await supabase.from("seller_applications").update({
      status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "cancelled",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === "approve" ? null : rejectionReason,
      updated_at: new Date().toISOString(),
    }).eq("seller_id", sellerId).eq("status", "pending");

    if (decision === "approve" && seller?.user_id) {
      await supabase.from("profiles").update({ role: "author", updated_at: new Date().toISOString() }).eq("id", seller.user_id);
    }
  } else {
    const db = getDb();
    const seller = db.prepare("SELECT user_id FROM seller_profiles WHERE id = ?").get(sellerId) as { user_id: string } | undefined;
    db.prepare(`
      UPDATE seller_profiles
      SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, decision === "approve" ? admin.id : null, decision === "approve" ? new Date().toISOString() : null, decision === "approve" ? null : rejectionReason, sellerId);

    db.prepare(`
      UPDATE seller_applications
      SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?, updated_at = datetime('now')
      WHERE seller_id = ? AND status = 'pending'
    `).run(decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "cancelled", admin.id, new Date().toISOString(), decision === "approve" ? null : rejectionReason, sellerId);

    if (decision === "approve" && seller?.user_id) {
      db.prepare("UPDATE users SET role = 'author', updated_at = datetime('now') WHERE id = ? AND role = 'user'").run(seller.user_id);
    }

    adminLog(admin.id, `seller_${status}`, "seller", sellerId, { decision, rejectionReason });
  }

  revalidatePath("/admin/sellers");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard/seller");
}
