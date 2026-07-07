import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { FeedScroller } from "@/components/feed/feed-scroller";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getFeedPage, getFeedWorkOptions } from "@/lib/feed/service";
import { getLocaleFromCookies, createTranslator } from "@/lib/i18n/server-t";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed | Tomo Verso Editora",
  description: "Feed inteligente estilo Shorts/Reels para descobrir novels, mangás, manhwas e posts da comunidade.",
};

async function FeedUnavailable() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore.get("novel_lang")?.value || null);
  const t = createTranslator(locale);
  return (
    <main className="min-h-[100dvh] bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-fuchsia-100">
          {t("feed.title")}
        </div>
        <h1 className="font-heading text-3xl font-black sm:text-5xl">{t("common.something_wrong")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
          {t("feed.create_modal_subtitle")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/feed" className="rounded-full bg-white px-5 py-3 text-sm font-black text-black hover:bg-fuchsia-100">
            {t("common.retry")}
          </Link>
          <Link href="/explore" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
            {t("home.cta_explore")}
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
      <main className="h-[100dvh] overflow-hidden bg-black text-white">
        <FeedScroller initialFeed={initialFeed} workOptions={workOptions} isLoggedIn={!!user} />
      </main>
    );
  } catch (error) {
    console.error("[feed] Failed to render /feed", error);
    return <FeedUnavailable />;
  }
}
