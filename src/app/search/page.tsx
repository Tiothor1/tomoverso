import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SearchClient from "./search-client";

export const metadata = {
  title: "Buscar — Tomo Verso Editora",
  description: "Encontre novels, autores e tags.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchClient />
    </Suspense>
  );
}

function SearchSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-6">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[3/4]" />
        ))}
      </div>
    </div>
  );
}
