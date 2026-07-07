import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { ensureTranslationsTable } from "@/lib/i18n/translation-cache";
import { TranslationsAdminClient } from "./translations-admin-client";

export const dynamic = "force-dynamic";

export default async function TranslationsAdminPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect("/");

  const db = getDb();
  ensureTranslationsTable(db);
  const translations = db.prepare(`
    SELECT * FROM translations ORDER BY updated_at DESC LIMIT 200
  `).all() as any[];

  const stats = db.prepare(`
    SELECT target_locale, COUNT(*) as count, status FROM translations GROUP BY target_locale, status ORDER BY count DESC
  `).all() as any[];

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-heading text-3xl font-black">Gerenciar traduções</h1>
        <p className="mt-2 text-white/60">{translations.length} traduções no cache · {stats.length} grupos de idioma</p>
        <TranslationsAdminClient translations={translations} stats={stats} />
      </div>
    </div>
  );
}
