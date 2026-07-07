export type WorkAttributionFields = {
  is_original?: boolean | number | null;
  source?: string | null;
};

export function isOriginalOrUserPosted(work: WorkAttributionFields): boolean {
  const source = String(work.source || "").trim().toLowerCase();
  return Boolean(work.is_original) || source === "" || source === "tomoverso" || source === "original";
}

export function shouldShowAttribution(work: WorkAttributionFields): boolean {
  return isOriginalOrUserPosted(work);
}
