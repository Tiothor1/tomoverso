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
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Strict CSP (relaxed for images from external CDNs)
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com", // unsafe-inline needed for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.vercel.app https://*.catbox.moe https://mangaonline.blue https://centralnovel.com https://kakuyomu.jp https://archiveofourown.org https://files.catbox.moe https://www.google-analytics.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.vercel.app https://www.google-analytics.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
      "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // ── Rate limiting for auth endpoints ────────────────────────────
  const isAuthPath = pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");
  const isApiPath = pathname.startsWith("/api/");

  if (isAuthPath) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `auth:${ip}`;
    if (!rateLimit(key, 10, 60000)) { // 10 requests per minute
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em 1 minuto." },
        { status: 429 }
      );
    }
  }

  // ── CSRF check for API mutations ───────────────────────────────
  if (isApiPath && request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host && !originHost.endsWith(".vercel.app")) {
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
