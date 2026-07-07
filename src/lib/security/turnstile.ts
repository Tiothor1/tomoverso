const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyTurnstileToken(token: FormDataEntryValue | string | null | undefined, remoteIp?: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTurnstileEnabled()) return { ok: true };

  const value = typeof token === "string" ? token.trim() : "";
  if (!value) {
    return { ok: false, error: "Confirme que você não é robô antes de continuar." };
  }

  const body = new FormData();
  body.set("secret", process.env.TURNSTILE_SECRET_KEY || "");
  body.set("response", value);
  if (remoteIp) body.set("remoteip", remoteIp.split(",")[0].trim());

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = await res.json().catch(() => null) as { success?: boolean } | null;
    if (!res.ok || !data?.success) {
      return { ok: false, error: "Proteção anti-bot falhou. Recarregue a página e tente de novo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Não consegui validar a proteção anti-bot. Tente novamente." };
  }
}
