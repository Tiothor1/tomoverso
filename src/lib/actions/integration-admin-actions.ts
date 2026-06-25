"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { fetchVercelIntegrationStatus, maskToken } from "../admin/vercel";
import { adminLog, requireAdminUser } from "./_admin-utils";

export async function saveVercelIntegrationAction(formData: FormData) {
  const admin = await requireAdminUser();
  const db = getDb();

  const accessToken = String(formData.get("access_token") || "").trim() || null;
  const projectId = String(formData.get("project_id") || "").trim() || null;
  const projectName = String(formData.get("project_name") || "").trim() || null;
  const teamId = String(formData.get("team_id") || "").trim() || null;
  const productionUrl = String(formData.get("production_url") || "").trim() || null;

  db.prepare(`
    UPDATE admin_integrations
    SET label='Vercel', access_token=COALESCE(?, access_token), token_hint=?, project_id=?, project_name=?, team_id=?, production_url=?, updated_at=datetime('now')
    WHERE provider='vercel'
  `).run(accessToken, maskToken(accessToken), projectId, projectName, teamId, productionUrl);

  adminLog(admin.id, "save_vercel_integration", "integration", "vercel", { projectId, projectName, teamId, productionUrl, tokenSaved: !!accessToken });
  revalidatePath("/admin/integrations");
  revalidatePath("/admin");
}

export async function refreshVercelIntegrationAction() {
  const admin = await requireAdminUser();
  const db = getDb();
  const integration = db.prepare("SELECT * FROM admin_integrations WHERE provider='vercel' LIMIT 1").get() as any;
  if (!integration) return;

  try {
    const status = await fetchVercelIntegrationStatus(integration);
    const resolvedProductionUrl = status.deployment?.url
      ? `https://${status.deployment.url}`.replace("https://https://", "https://")
      : integration.production_url || null;
    db.prepare(`
      UPDATE admin_integrations
      SET status_json=?, last_checked_at=datetime('now'), last_error=?, project_id=COALESCE(?, project_id), project_name=COALESCE(?, project_name), production_url=COALESCE(?, production_url), updated_at=datetime('now')
      WHERE provider='vercel'
    `).run(
      JSON.stringify(status),
      status.ok ? null : status.message,
      status.project?.id || null,
      status.project?.name || null,
      resolvedProductionUrl,
    );
    adminLog(admin.id, "refresh_vercel_integration", "integration", "vercel", { ok: status.ok, message: status.message });
    revalidatePath("/admin/integrations");
  } catch (error: any) {
    db.prepare("UPDATE admin_integrations SET last_checked_at=datetime('now'), last_error=?, updated_at=datetime('now') WHERE provider='vercel'").run(error.message);
    adminLog(admin.id, "refresh_vercel_integration_failed", "integration", "vercel", { error: error.message });
    revalidatePath("/admin/integrations");
  }
}
