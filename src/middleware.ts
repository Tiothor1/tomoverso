import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter (resets on Vercel cold start, fine for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= maxRequests) {
    return false; // blocked
  }
  entry.count++;
  return true;
}

function shouldRateLimitAuthRequest(pathname: string, method: string): boolean {
  // Nunca rate-limit navegação GET/HEAD de páginas como /auth/login.
  // Antes isso fazia clique rápido no link "Entrar" renderizar JSON 429 cru.
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

  return (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/admin/login" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname === "/auth/verify"
  );
}

function isAllowedOrigin(originHost: string, host: string): boolean {
  if (originHost === host) return true;
  if (originHost === "tomoverso.studio" || originHost === "www.tomoverso.studio") return true;
  if (originHost === "localhost" || originHost.startsWith("localhost:")) return true;
  if (originHost === "127.0.0.1" || originHost.startsWith("127.0.0.1:")) return true;
  return false;
}

function tooManyAttemptsResponse(request: NextRequest): NextResponse {
  const headers = new Headers({ "Retry-After": "60" });
  const accept = request.headers.get("accept") || "";
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/") || accept.includes("application/json");

  if (isApiRequest) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 1 minuto e tente novamente." },
      { status: 429, headers }
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = request.nextUrl.pathname.startsWith("/auth/signup") ? "/auth/signup" : "/auth/login";
  url.searchParams.set("error", "too_many_attempts");
  return NextResponse.redirect(url, { status: 303, headers });
}

// Paths that don't need CSRF / heavy security
const PUBLIC_PATHS = [
  "/_next/",
  "/favicon",
  "/images/",
  "/uploads/",
  "/previews/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Secret Admin Path ─────────────────────────────────────────
  const adminSecret = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";
  if (pathname === `/${adminSecret}` || pathname.startsWith(`/${adminSecret}/`)) {
    const newPath = pathname.replace(`/${adminSecret}`, "/admin-secreto");
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.rewrite(url);
  }

  // ── Security Headers ───────────────────────────────────────────
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Strict CSP (relaxed for images from external CDNs)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://*.adtrafficquality.google", // unsafe-inline needed for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.vercel.app https://*.catbox.moe https://mangaonline.blue https://centralnovel.com https://kakuyomu.jp https://archiveofourown.org https://files.catbox.moe https://www.google-analytics.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://www.google.com.br https://*.adtrafficquality.google",
      "font-src 'self' data:",
      "connect-src 'self' https://*.vercel.app https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://stats.g.doubleclick.net https://www.google.com https://*.adtrafficquality.google",
      "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.adtrafficquality.google https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // ── Rate limiting for auth mutations ─────────────────────────────
  const isApiPath = pathname.startsWith("/api/");

  if (shouldRateLimitAuthRequest(pathname, request.method)) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `auth:${ip}`;
    if (!rateLimit(key, 10, 60000)) { // 10 mutações por minuto
      return tooManyAttemptsResponse(request);
    }
  }

  // ── CSRF check for API mutations ───────────────────────────────
  if (isApiPath && request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (!isAllowedOrigin(originHost, host)) {
          return NextResponse.json(
            { error: "Requisição rejeitada: origem não autorizada." },
            { status: 403 }
          );
        }
      } catch {
        // Invalid origin, allow through
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|uploads/|previews/).*)",
  ],
};
