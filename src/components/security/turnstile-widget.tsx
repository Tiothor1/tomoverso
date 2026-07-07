"use client";

import Script from "next/script";

interface TurnstileWidgetProps {
  className?: string;
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function TurnstileWidget({ className }: TurnstileWidgetProps) {
  if (!siteKey) return null;

  return (
    <div className={className}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="auto"
        data-size="flexible"
      />
    </div>
  );
}
