/**
 * Proxy de imagens de mangá.
 *
 * Em vez de carregar imagens diretamente de CDNs externos (mangaonline.blue, etc),
 * a gente baixa no servidor e serve localmente. Isso garante:
 *   - Não depende de terceiros pra exibir as imagens
 *   - Cache no Vercel Edge/CDN
 *   - Controle de headers e segurança
 */

const EXTERNAL_DOMAINS = [
  "mangaonline.blue",
];

export function isExternalMangaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return EXTERNAL_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

/**
 * Transforma uma URL de imagem externa para nosso proxy local.
 * Se a URL já é local ou de outro domínio permitido, retorna ela mesma.
 */
export function proxyImageUrl(url: string): string {
  if (!url || !isExternalMangaUrl(url)) return url;
  return `/api/manga-image?url=${encodeURIComponent(url)}`;
}
