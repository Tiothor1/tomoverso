import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de imagens de mangá.
 *
 * Recebe ?url=... e baixa a imagem do CDN externo (mangaonline.blue, etc),
 * retornando com cache e headers corretos.
 *
 * Cache: 1h no CDN (s-maxage), 10min no browser (max-age).
 * Se o download falhar, tenta até 2x com backoff de 1s.
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(urlParam);
    new URL(decodedUrl); // valida
  } catch {
    return new NextResponse("Invalid url parameter", { status: 400 });
  }

  // Só permite URLs de fontes conhecidas de mangá
  const allowedPrefixes = [
    "https://mangaonline.blue/",
  ];
  const allowed = allowedPrefixes.some((p) => decodedUrl.startsWith(p));
  if (!allowed) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  // Tenta baixar com retry
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(decodedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/avif,image/jpeg,image/png,*/*",
          Referer: "https://mangaonline.blue/",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from origin`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "image/webp";

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(arrayBuffer.byteLength),
          "Cache-Control": "public, s-maxage=3600, max-age=600, immutable",
          "Access-Control-Allow-Origin": "*",
          "X-Proxy-Source": "manga-proxy",
        },
      });
    } catch (err: any) {
      lastError = err;
      if (attempt === 1) {
        // Espera 1s antes de retentar
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.error("[manga-image-proxy] failed after retries:", lastError?.message);
  return new NextResponse("Image proxy failed", { status: 502 });
}
