import { getDb } from "@/lib/db";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/server";

export type SellerProfile = {
  id: string;
  user_id: string;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  legal_name: string;
  public_name: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random";
  pix_key: string;
  payout_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerWithUser = SellerProfile & {
  email?: string;
  username?: string;
  display_name?: string;
};

function mapSupabaseSeller(row: any): SellerProfile | null {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    legal_name: row.legal_name,
    public_name: row.public_name,
    pix_key_type: row.pix_key_type,
    pix_key: row.pix_key,
    payout_notes: row.payout_notes,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getSellerProfile(userId: string): Promise<SellerProfile | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) return mapSupabaseSeller(data);
    // If Supabase is configured but schema not applied yet, fall back so preview does not hard-crash.
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ? LIMIT 1").get(userId) as SellerProfile | undefined;
  return row || null;
}

export async function listSellersForAdmin(): Promise<SellerWithUser[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("*, profiles(email, username, display_name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((row: any) => ({
        ...mapSupabaseSeller(row)!,
        email: row.profiles?.email,
        username: row.profiles?.username,
        display_name: row.profiles?.display_name,
      }));
    }
  }

  const db = getDb();
  return db.prepare(`
    SELECT sp.*, u.email, u.username, u.display_name
    FROM seller_profiles sp
    JOIN users u ON u.id = sp.user_id
    ORDER BY CASE sp.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, sp.created_at DESC
  `).all() as SellerWithUser[];
}

export async function hasApprovedSellerProfile(userId: string): Promise<boolean> {
  const seller = await getSellerProfile(userId);
  return seller?.status === "approved";
}

export function isSupabaseMarketplaceActive() {
  return hasSupabaseAdminConfig();
}
