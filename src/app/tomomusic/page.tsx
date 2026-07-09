import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTomomusicPayload } from "@/lib/tomomusic/service";
import { TomoMusicLibrary } from "@/components/tomomusic/tomomusic-library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TomoMusic | Tomo Verso Editora",
  description: "Música ambiente royalty-free e Creative Commons para ler novels, mangás, manhwas e livros no Tomoverso.",
};

export default async function TomoMusicPage() {
  const user = await getCurrentUser().catch(() => null);
  const payload = getTomomusicPayload(getDb(), user?.id || null);
  return <TomoMusicLibrary initialPayload={payload} />;
}
