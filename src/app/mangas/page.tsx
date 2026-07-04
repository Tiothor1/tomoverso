import { redirect } from "next/navigation";

export default function MangasAliasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else if (value) {
      params.set(key, value);
    }
  }
  redirect(`/manga${params.toString() ? `?${params.toString()}` : ""}`);
}
