import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MangaCatalogPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="font-heading text-3xl md:text-4xl font-bold">
          Catálogo de Mangás
        </h1>
      </div>
      <div className="bg-card border border-border/40 rounded-xl p-6 text-center">
        <p className="text-xl text-muted-foreground">
          Catálogo vazio — sem banco de dados nesta build.
        </p>
      </div>
    </div>
  );
}
