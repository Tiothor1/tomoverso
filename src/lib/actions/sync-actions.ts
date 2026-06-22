"use server";

/**
 * Server Actions para o painel admin de importações.
 *
 * Permitem:
 * - Forçar sync de uma fonte específica
 * - Marcar erro como resolvido
 * - Habilitar/desabilitar fonte
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { runSync, isAdapterRegistered } from "@/lib/ingest";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function forceSyncSourceAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const sourceName = formData.get("source") as string;
  const limit = parseInt((formData.get("limit") as string) ?? "100", 10);

  if (!sourceName || !isAdapterRegistered(sourceName)) {
    throw new Error(`Fonte desconhecida: ${sourceName}`);
  }

  console.log(`[admin] User ${user.username} disparou sync manual de '${sourceName}' (limit=${limit})`);

  // Roda sync em foreground — pode levar alguns segundos a minutos
  // dependendo do limit. Pra limites grandes (>500), recomenda usar o CLI.
  try {
    const result = await runSync({
      sourceName,
      mode: "manual",
      limit,
      pageSize: 100,
      onLog: (msg) => console.log(`[sync:${sourceName}]`, msg),
    });
    console.log(`[admin] Sync manual '${sourceName}' finalizado:`, result);

    // Loga no activity_log
    const db = getDb();
    db.prepare(`
      INSERT INTO activity_log (id, user_id, action, target_type, target_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      user.id,
      "force_sync_source",
      "source",
      result.sourceId,
      JSON.stringify({
        source: sourceName,
        imported: result.imported,
        updated: result.updated,
        failed: result.failed,
        runId: result.runId,
      })
    );
  } catch (e: any) {
    console.error(`[admin] Sync manual '${sourceName}' falhou:`, e);
    throw new Error(`Sync falhou: ${e.message}`);
  }

  revalidatePath("/admin/imports");
}

export async function toggleSourceEnabledAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const sourceId = formData.get("sourceId") as string;
  const db = getDb();
  const source = db.prepare(`SELECT enabled FROM sources WHERE id = ?`).get(sourceId) as { enabled: number } | undefined;
  if (!source) throw new Error("Source não encontrada");
  const newEnabled = source.enabled ? 0 : 1;
  db.prepare(`UPDATE sources SET enabled = ? WHERE id = ?`).run(newEnabled, sourceId);
  revalidatePath("/admin/imports");
}

export async function dismissSyncErrorAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const errorId = formData.get("errorId") as string;
  const db = getDb();
  db.prepare(`DELETE FROM sync_errors WHERE id = ?`).run(errorId);
  revalidatePath("/admin/imports");
}
