import Script from "next/script";

/**
 * Adiciona o script do Google AdSense no <head> do site.
 * Colocado no root layout. O AdSense só é carregado se NEXT_PUBLIC_ADSENSE_ENABLED=true.
 */
export function GoogleAdsense() {
  if (process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== "true") return null;

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2780687772948357"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
