import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "t.vndb.org" },
      { protocol: "https", hostname: "*.vndb.org" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "myanimelist.net" },
      { protocol: "https", hostname: "*.myanimelist.net" },
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "*.mangadex.org" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "*.anilist.co" },
      { protocol: "https", hostname: "anilist.co" },
      { protocol: "https", hostname: "cdn-static.kakuyomu.jp" },
      { protocol: "https", hostname: "*.kakuyomu.jp" },
    ],
  },
  // Cache páginas estáticas por mais tempo no CDN
  staticPageGenerationTimeout: 120,
  // headers globais pra melhorar cache do navegador
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
