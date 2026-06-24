export function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export function hasCjk(value: string | null | undefined): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(value || "");
}

export function readableTitle(input: {
  title: string;
  alternative_titles?: string[] | string | null;
  type?: string | null;
  slug?: string | null;
}): string {
  const alternatives = Array.isArray(input.alternative_titles)
    ? input.alternative_titles
    : safeJsonArray(input.alternative_titles);

  if (!hasCjk(input.title)) return input.title;

  const readableAlt = alternatives.find((title) => title && !hasCjk(title) && /[a-z0-9]/i.test(title));
  if (readableAlt) return readableAlt;

  const slugTitle = (input.slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
  if (slugTitle && /[a-z0-9]/i.test(slugTitle) && !hasCjk(slugTitle) && !/^\d+(\s+\d+)*$/.test(slugTitle)) return slugTitle;

  return input.type === "web-novel" ? "WebNovel japonesa" : "Light Novel japonesa";
}
