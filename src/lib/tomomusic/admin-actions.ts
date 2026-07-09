"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getAdminSecretPath, requireSecretAdminAction } from "@/lib/admin/admin-v2-auth";
import { ensureTomomusicTables } from "@/lib/tomomusic/service";

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a)(?:\?.*)?$/i;

function text(formData: FormData, key: string, max = 500) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function revalidateTomomusicAdmin() {
  const root = `/${getAdminSecretPath()}`;
  revalidatePath("/tomomusic");
  revalidatePath("/musicas/creditos");
  revalidatePath(`${root}/tomomusic`);
}

function isSafeAudioUrl(value: string) {
  if (!value || !AUDIO_EXT.test(value)) return false;
  if (value.startsWith("/audio/tomomusic/") || value.startsWith("/storage/audio/tomomusic/")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function toggleTomomusicTrackActiveAction(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = text(formData, "track_id", 120);
  if (!id) return;
  const db = getDb();
  ensureTomomusicTables(db);
  db.prepare("UPDATE tomomusic_tracks SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?").run(id);
  revalidateTomomusicAdmin();
}

export async function deleteTomomusicTrackAction(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = text(formData, "track_id", 120);
  if (!id) return;
  const db = getDb();
  ensureTomomusicTables(db);
  db.prepare("DELETE FROM tomomusic_playlist_tracks WHERE track_id = ?").run(id);
  db.prepare("DELETE FROM tomomusic_likes WHERE track_id = ?").run(id);
  db.prepare("DELETE FROM tomomusic_favorites WHERE track_id = ?").run(id);
  db.prepare("DELETE FROM tomomusic_plays WHERE track_id = ?").run(id);
  db.prepare("DELETE FROM tomomusic_tracks WHERE id = ?").run(id);
  revalidateTomomusicAdmin();
}

export async function updateTomomusicTrackAction(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const id = text(formData, "track_id", 120);
  const title = text(formData, "title", 180);
  const artist = text(formData, "artist", 180);
  const mood = text(formData, "mood", 80) || "reading";
  const genre = text(formData, "genre", 100) || "ambient";
  const description = text(formData, "description", 800);
  if (!id || !title || !artist) return;
  const db = getDb();
  ensureTomomusicTables(db);
  db.prepare(`
    UPDATE tomomusic_tracks
    SET title = ?, artist = ?, mood = ?, genre = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, artist, mood, genre, description, id);
  revalidateTomomusicAdmin();
}

export async function addManualTomomusicTrackAction(formData: FormData) {
  const admin = await requireSecretAdminAction();
  if (!admin) return;
  const title = text(formData, "title", 180);
  const artist = text(formData, "artist", 180);
  const fileUrl = text(formData, "file_url", 600);
  const sourceUrl = text(formData, "source_url", 600);
  const licenseName = text(formData, "license_name", 180);
  const licenseUrl = text(formData, "license_url", 600);
  const attributionText = text(formData, "attribution_text", 900);
  if (!title || !artist || !isSafeAudioUrl(fileUrl) || !sourceUrl || !licenseName || !licenseUrl) return;
  const lowerLicense = `${licenseName} ${licenseUrl}`.toLowerCase();
  if (lowerLicense.includes("noncommercial") || lowerLicense.includes("/nc/") || lowerLicense.includes("no derivatives") || lowerLicense.includes("/nd/")) return;

  const db = getDb();
  ensureTomomusicTables(db);
  db.prepare(`
    INSERT INTO tomomusic_tracks (
      id, title, artist, description, mood, genre, duration_seconds, file_url, cover_url,
      source_url, license_name, license_url, attribution_required, attribution_text,
      source, downloaded_at, local_file, bytes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(
    crypto.randomUUID(),
    title,
    artist,
    text(formData, "description", 800),
    text(formData, "mood", 80) || "reading",
    text(formData, "genre", 100) || "ambient",
    Math.max(0, Number(text(formData, "duration_seconds", 20)) || 0),
    fileUrl,
    text(formData, "cover_url", 600) || null,
    sourceUrl,
    licenseName,
    licenseUrl,
    formData.get("attribution_required") ? 1 : 0,
    attributionText || `${title} — ${artist}. Fonte: ${sourceUrl}. Licença: ${licenseUrl}`,
    text(formData, "source", 120) || "manual",
    new Date().toISOString(),
    fileUrl.startsWith("/") ? fileUrl : null,
    Math.max(0, Number(text(formData, "bytes", 20)) || 0),
  );
  revalidateTomomusicAdmin();
}
