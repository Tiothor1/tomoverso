import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // VNDB
      { protocol: "https", hostname: "t.vndb.org" },
      { protocol: "https", hostname: "*.vndb.org" },
      // JIKAN / MAL
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "myanimelist.net" },
      { protocol: "https", hostname: "*.myanimelist.net" },
      // MangaDex
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "*.mangadex.org" },
      // AniList
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "*.anilist.co" },
      { protocol: "https", hostname: "anilist.co" },
    ],
  },
};

export default nextConfig;
