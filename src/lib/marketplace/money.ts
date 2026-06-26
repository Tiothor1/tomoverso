import { MARKETPLACE_FEE_BASIS_POINTS } from "./constants";

export function formatBRLCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

export function parseBRLToCents(value: FormDataEntryValue | null): number {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/R\$\s?/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  return Math.round(Number(normalized || 0) * 100);
}

export function calculateMarketplaceSplit(params: {
  grossCents: number;
  mpFeeCents?: number;
  platformFeeBasisPoints?: number;
}) {
  const grossCents = Math.max(0, Math.round(params.grossCents));
  const mpFeeCents = Math.max(0, Math.round(params.mpFeeCents || 0));
  const platformFeeBasisPoints = params.platformFeeBasisPoints ?? MARKETPLACE_FEE_BASIS_POINTS;
  const platformFeeCents = Math.floor((grossCents * platformFeeBasisPoints) / 10_000);
  const authorNetCents = Math.max(0, grossCents - mpFeeCents - platformFeeCents);

  return {
    grossCents,
    mpFeeCents,
    platformFeeBasisPoints,
    platformFeeCents,
    authorNetCents,
  };
}
