import { BookOpen } from "lucide-react";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function MangaCatalogPage() {
  let count = 0;
  let error = "";
  try {
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    count = tables.length;
    const mangaTable = tables.find((t: any) => t.name === "mangas");
    if (mangaTable) {
      const row = db.prepare("SELECT COUNT(*) as n FROM mangas").get() as any;
      count = row.n;
    }
  } catch (e: any) {
    error = e.message?.slice(0, 200) || String(e);
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="font-heading text-3xl md:text-4xl font-bold">
          Catálogo de Mangás
        </h1>
      </div>
      <div className="bg-card border border-border/40 rounded-xl p-6 text-center">
        <p className="text-2xl font-bold">{error ? "❌" : "✅"}</p>
        <p className="text-muted-foreground mt-2">
          {error ? error : `Banco funcionando. ${count} mangás. ${count >= 170 ? "SITE PRONTO!" : "Precisa importar."}`}
        </p>
      </div>
    </div>
  );
}
