import type { Metadata } from "next";
import { FeedScroller } from "@/components/feed/feed-scroller";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getFeedPage, getFeedWorkOptions } from "@/lib/feed/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed | Tomoverso",
  description: "Feed inteligente estilo Shorts/Reels para descobrir novels, mangás, manhwas e posts da comunidade.",
};

export default async function FeedPage() {
  const db = getDb();
  const user = await getCurrentUser().catch(() => null);
  const initialFeed = getFeedPage(db, user, { limit: 8 });
  const workOptions = getFeedWorkOptions(db);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-black text-white">
      <FeedScroller initialFeed={initialFeed} workOptions={workOptions} isLoggedIn={!!user} />
    </main>
  );
}
