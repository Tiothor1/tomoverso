import type { NextConfig } from "next";

const standalone = process.env.NEXT_STANDALONE === "1" || process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  output: standalone ? "standalone" : undefined,
  outputFileTracingExcludes: standalone
    ? {
        "*": [
          "./data/**/*.db",
          "./data/**/*.db-shm",
          "./data/**/*.db-wal",
          "./data/backups/**/*",
          "./.git/**/*",
          "./.next/**/*",
        ],
      }
    : undefined,
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

  // 🔐 Admin path configurável via env var — o rewrite real está na middleware.ts
  // removido: rewrites() duplicado
};

export default nextConfig;

// Admin path configuration — defina ADMIN_SECRET_PATH no .env.local ou .env.production
// Exemplo: ADMIN_SECRET_PATH=admin-X7kPq9
// Se não definido, usa "admin-secreto" como padrão
