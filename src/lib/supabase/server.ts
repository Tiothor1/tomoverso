import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_MARKERS = ["COLOCAR", "REPLACE", "CHANGE_ME", "..."];

function isFilled(value: string | undefined | null): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 0 && !PLACEHOLDER_MARKERS.some((marker) => normalized.toUpperCase().includes(marker));
}

export function hasSupabasePublicConfig(): boolean {
  return isFilled(process.env.NEXT_PUBLIC_SUPABASE_URL) && isFilled(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseAdminConfig(): boolean {
  return isFilled(process.env.NEXT_PUBLIC_SUPABASE_URL) && isFilled(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAuthClient(): SupabaseClient | null {
  if (!hasSupabasePublicConfig()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "tomoverso-auth-bridge",
        },
      },
    }
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!hasSupabaseAdminConfig()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "tomoverso-marketplace-mvp",
        },
      },
    }
  );
}

export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase server credentials missing. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

export function getSupabaseBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "tomoverso";
}

export async function ensureSupabaseStorageBucket() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, reason: "missing_config" as const };

  const bucket = getSupabaseBucketName();
  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
  if (existing) return { ok: true as const, bucket, created: false };
  if (getError && getError.message && !getError.message.toLowerCase().includes("not found")) {
    return { ok: false as const, reason: getError.message };
  }

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, bucket, created: true };
}
