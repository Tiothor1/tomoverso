import Link from "next/link";
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

function FeedUnavailable() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-fuchsia-100">
          Feed indisponível
        </div>
        <h1 className="font-heading text-3xl font-black sm:text-5xl">Não foi possível carregar o feed agora.</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
          O Tomoverso continua no ar. Tenta recarregar ou explora as obras enquanto o feed volta.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/feed" className="rounded-full bg-white px-5 py-3 text-sm font-black text-black hover:bg-fuchsia-100">
            Tentar novamente
          </Link>
          <Link href="/explore" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
            Explorar obras
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function FeedPage() {
  try {
    const db = getDb();
    const user = await getCurrentUser().catch(() => null);
    const initialFeed = getFeedPage(db, user, { limit: 8 });
    const workOptions = getFeedWorkOptions(db);

    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-black text-white">
        <FeedScroller initialFeed={initialFeed} workOptions={workOptions} isLoggedIn={!!user} />
      </main>
    );
  } catch (error) {
    console.error("[feed] Failed to render /feed", error);
    return <FeedUnavailable />;
  }
}
