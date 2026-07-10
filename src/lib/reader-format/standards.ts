export const BOOK_PAGE_MIN_CHARS = 3500;
export const BOOK_PAGE_TARGET_CHARS = 5000;
export const BOOK_PAGE_MAX_CHARS = 6000;

export const LN_MIN_WORDS_PER_CHAPTER = 1500;
export const MAX_PARAGRAPH_CHARS = 950;
export const IDEAL_PARAGRAPH_MAX_CHARS = 700;
export const MIN_QUALITY_SCORE = 8;

export const FORBIDDEN_NARRATIVE_PATTERNS: RegExp[] = [
  /^\s*#{0,6}\s*P[áa]gina\s+\d+\s*$/gim,
  /^\s*#{0,6}\s*Cap[íi]tulo\s+\d+\s*$/gim,
  /^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Texto gerado)\s*:.*$/gim,
  /A cena principal deste trecho/gi,
  /A obra precisava de continuidade/gi,
  /O romance começava a existir/gi,
  /não era uma frase bonita para vender a história/gi,
  /não porque a história precisava/gi,
  /nota de continuidade\s*:/gi,
];

export const SCENE_BREAK = "***";
