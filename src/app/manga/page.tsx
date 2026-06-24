export const dynamic = "force-static";
export const revalidate = 3600;

export default function MangaCatalogPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="text-center py-20">
        <h1 className="font-heading text-4xl font-bold mb-4">
          Catálogo de Mangás
        </h1>
        <p className="text-muted-foreground">
          Em construção. Volte em breve.
        </p>
      </div>
    </div>
  );
}
