import {
  FORBIDDEN_NARRATIVE_PATTERNS,
  MAX_PARAGRAPH_CHARS,
  SCENE_BREAK,
} from "./standards";

function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function removeForbiddenMarkers(text: string): string {
  let result = text;
  for (const pattern of FORBIDDEN_NARRATIVE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "");
  }
  return result
    .replace(/\bP[áa]gina\s+\d+\b\s*[:.,–—-]?\s*/gi, "")
    .replace(/\bCap[íi]tulo\s+\d+\b\s*[:.,–—-]?\s*/gi, "")
    .replace(/(^|\n\n)[^\n]*(?:Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Texto gerado)\s*:[\s\S]*?(?=\n\n|$)/gi, "\n\n")
    .replace(/(^|\n\n)[^\n]*(?:A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava)[^\n]*(?=\n\n|$)/gi, "\n\n");
}

function normalizeSceneBreaks(text: string): string {
  return text
    .replace(/^\s*(?:[-_=*]\s*){3,}\s*$/gm, SCENE_BREAK)
    .replace(/\n\s*\*\*\*\s*\n/g, `\n\n${SCENE_BREAK}\n\n`);
}

function splitLongParagraph(paragraph: string): string[] {
  const trimmed = paragraph.trim();
  if (!trimmed || trimmed === SCENE_BREAK) return trimmed ? [trimmed] : [];
  if (trimmed.length <= MAX_PARAGRAPH_CHARS) return [trimmed];

  const sentences = trimmed.match(/[^.!?…]+[.!?…]+(?:["”»])?|[^.!?…]+$/g) || [trimmed];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences.map((s) => s.trim()).filter(Boolean)) {
    if (current && current.length + sentence.length + 1 > MAX_PARAGRAPH_CHARS) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function splitNarrativeParagraphs(text: string): string[] {
  return normalizeLineBreaks(text)
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitLongParagraph(paragraph))
    .map((p) => p.trim())
    .filter(Boolean);
}

export function normalizeNarrativeText(text: string): string {
  const cleaned = normalizeSceneBreaks(removeForbiddenMarkers(normalizeLineBreaks(text || "")))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return splitNarrativeParagraphs(cleaned).join("\n\n");
}

export function containsForbiddenNarrativeMarker(text: string): boolean {
  return FORBIDDEN_NARRATIVE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}
