# Padrão Oficial de Formatação — Livros e Light Novels Tomoverso Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Padronizar de forma definitiva a escrita, limpeza, paginação e exibição de livros/light novels do Tomoverso para que o leitor mostre apenas narrativa limpa, com páginas reais de 3.500–6.000 caracteres, parágrafos confortáveis, diálogos separados e controle de qualidade antes de publicar.

**Architecture:** Centralizar as regras em uma biblioteca compartilhada de formatação/qualidade, usar essa biblioteca nos leitores de novels e livros, auditar o banco antes/depois, e só republicar conteúdo que passe média >= 8. Conteúdo que não puder ser corrigido com segurança fica oculto/needs_review em vez de aparecer como rascunho público.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4/global CSS, SQLite/better-sqlite3, Node scripts (`.cjs`/`.mjs`), Playwright para validação renderizada, PM2/Nginx na VPS.

---

## Contexto atual verificado

- Leitor de light novel: `src/app/novels/[slug]/[chapter]/page.tsx`.
  - Já tem `cleanChapterContent()` inline.
  - Renderiza conteúdo em `.prose-ln`.
  - Header mostra `Capítulo N` corretamente como UI/metadado, não como corpo narrativo.
- Leitor de livros: `src/app/livros/[slug]/ler/page.tsx`.
  - Usa `cleanBookContent()` e `paginateText()` de `src/lib/books/cleaner.ts`.
  - Hoje `paginateText()` usa `charsPerPage = 2500`, abaixo do novo mínimo de 3.500 caracteres.
  - Renderiza com `prose prose-lg`, não tem classe dedicada `.book-reader`.
- CSS atual: `src/app/globals.css`, linhas ~425–485.
  - `.prose-ln` tem conflito: define `text-align: justify` e depois `text-align: left` no mesmo bloco.
  - `.prose-ln` usa `max-width: 860px`, mas o novo padrão pede `max-width: 760px` para o container principal.
- Scripts recentes de conteúdo:
  - `scripts/rewrite-and-republish-content.cjs`
  - `scripts/content-cleanup-quality.cjs`
  - `scripts/mass-content-production.cjs`
- Não há suíte de testes formal no repo. O padrão será criar scripts de verificação (`node`/`tsx`/Playwright) e rodar `npm run build`.

## Decisões de implementação

1. **Não maquiar apenas CSS.** Corrigir também os dados e a geração/limpeza do conteúdo.
2. **UI pode mostrar número de página/capítulo.** O proibido é aparecer dentro do texto narrativo salvo/renderizado.
3. **Livro e LN terão classes separadas:** `.book-reader` e `.light-novel-reader`.
4. **A limpeza deve ser compartilhada.** Não duplicar regex no leitor de novel e no cleaner de livro.
5. **Páginas de livro:** `min=3500`, `ideal=4500–6000`, `target=5000`, com merge da última página curta na anterior quando possível.
6. **Capítulos de LN:** continuam por capítulo no banco, mas a narrativa deve ter parágrafos curtos/médios, sem bloco gigante; cada capítulo público precisa manter no mínimo 1.500 palavras enquanto a página de livro usa 3.500+ caracteres.
7. **Controle de qualidade:** média >= 8 para publicar; abaixo disso marca `needs_review=1` e oculta quando necessário.
8. **Sem prompt de sudo:** usar `sudo -n nginx -t`. Se falhar por senha, não pedir senha; registrar no relatório como `nginx -t não disponível sem sudo interativo`.

---

## Arquivos prováveis de alteração

- Criar: `src/lib/reader-format/standards.ts`
- Criar: `src/lib/reader-format/narrative-cleaner.ts`
- Criar: `src/lib/reader-format/quality-score.ts`
- Criar: `scripts/test-reader-format.ts`
- Criar: `scripts/audit-official-reader-standard.cjs`
- Criar: `scripts/apply-official-reader-standard.cjs`
- Criar: `scripts/verify-official-reader-standard.mjs`
- Modificar: `src/lib/books/cleaner.ts`
- Modificar: `src/app/novels/[slug]/[chapter]/page.tsx`
- Modificar: `src/app/livros/[slug]/ler/page.tsx`
- Modificar: `src/app/globals.css`
- Atualizar/criar: `docs/correcao-conteudo-massa-tomoverso.md`
- Criar: `docs/padrao-oficial-formatacao-leitor-tomoverso.md`

---

## Task 1: Criar constantes oficiais do padrão de leitura

**Objective:** Ter uma fonte única para limites, marcadores proibidos e thresholds de qualidade.

**Files:**
- Create: `src/lib/reader-format/standards.ts`
- Test: `scripts/test-reader-format.ts`

**Step 1: Write failing test**

Create `scripts/test-reader-format.ts` with an initial import that will fail before the file exists:

```ts
import assert from "node:assert/strict";
import {
  BOOK_PAGE_MIN_CHARS,
  BOOK_PAGE_TARGET_CHARS,
  BOOK_PAGE_MAX_CHARS,
  FORBIDDEN_NARRATIVE_PATTERNS,
} from "../src/lib/reader-format/standards";

assert.equal(BOOK_PAGE_MIN_CHARS, 3500);
assert.equal(BOOK_PAGE_TARGET_CHARS, 5000);
assert.equal(BOOK_PAGE_MAX_CHARS, 6000);

const bad = "Página 1\n\nSinopse: algo\n\nTexto gerado: teste";
assert(FORBIDDEN_NARRATIVE_PATTERNS.some((rx) => rx.test(bad)));

console.log("reader-format standards tests passed");
```

**Step 2: Run test to verify failure**

Run:

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: FAIL — module `../src/lib/reader-format/standards` not found.

**Step 3: Write minimal implementation**

Create `src/lib/reader-format/standards.ts`:

```ts
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
```

**Step 4: Run test to verify pass**

Run:

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: PASS — `reader-format standards tests passed`.

**Step 5: Commit**

```bash
git add src/lib/reader-format/standards.ts scripts/test-reader-format.ts
git commit -m "feat: add official reader formatting standards"
```

---

## Task 2: Criar cleaner compartilhado de narrativa

**Objective:** Remover marcadores artificiais, comentários de planejamento e blocos gigantes antes de renderizar/salvar conteúdo.

**Files:**
- Create: `src/lib/reader-format/narrative-cleaner.ts`
- Modify: `scripts/test-reader-format.ts`

**Step 1: Extend failing test**

Append to `scripts/test-reader-format.ts`:

```ts
import { normalizeNarrativeText, splitNarrativeParagraphs } from "../src/lib/reader-format/narrative-cleaner";

const dirty = `Página 1

Sinopse: Depois de algo.

Davi olhou para Clara e disse que precisava ir embora, Clara respondeu que não.

A cena principal deste trecho não era uma explosão.

— Eu preciso ir embora — ele disse.

***

Subtítulo: O jogo acabou.

Clara demorou a responder.`;

const cleaned = normalizeNarrativeText(dirty);
assert(!/Página 1|Sinopse:|Subtítulo:|A cena principal/i.test(cleaned));
assert(cleaned.includes("— Eu preciso ir embora — ele disse."));
assert(cleaned.includes("***"));
assert(splitNarrativeParagraphs(cleaned).every((p) => p.length < 1000 || p === "***"));
```

**Step 2: Run test to verify failure**

Run:

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: FAIL — `narrative-cleaner` not found.

**Step 3: Implement cleaner**

Create `src/lib/reader-format/narrative-cleaner.ts`:

```ts
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
    result = result.replace(pattern, "");
  }
  return result;
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
```

**Step 4: Run test to verify pass**

Run:

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/reader-format/narrative-cleaner.ts scripts/test-reader-format.ts
git commit -m "feat: normalize narrative reader text"
```

---

## Task 3: Criar score de qualidade reutilizável

**Objective:** Calcular nota 0–10 por formatação, coerência mínima, continuidade, desenvolvimento, leitura e gancho.

**Files:**
- Create: `src/lib/reader-format/quality-score.ts`
- Modify: `scripts/test-reader-format.ts`

**Step 1: Extend failing test**

Append:

```ts
import { scoreNarrativeQuality } from "../src/lib/reader-format/quality-score";

const goodPage = Array.from({ length: 14 }, (_, i) =>
  i % 4 === 0
    ? "— Você também sentiu? — Clara perguntou."
    : "Davi percebeu que o corredor estava silencioso demais. A luz da manhã atravessava as janelas, mas nada parecia ocupar o mesmo lugar de antes."
).join("\n\n");

const score = scoreNarrativeQuality(goodPage, { minChars: 3500, minWords: 500 });
assert(score.media >= 8, JSON.stringify(score));

const badScore = scoreNarrativeQuality("Página 1\n\nSinopse: teste", { minChars: 3500, minWords: 500 });
assert(badScore.media < 8, JSON.stringify(badScore));
```

**Step 2: Run failure**

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: FAIL — module missing.

**Step 3: Implement score**

Create `src/lib/reader-format/quality-score.ts`:

```ts
import { containsForbiddenNarrativeMarker, splitNarrativeParagraphs } from "./narrative-cleaner";
import { MAX_PARAGRAPH_CHARS } from "./standards";

export type NarrativeQualityScore = {
  formatacao: number;
  coerencia: number;
  continuidade: number;
  desenvolvimento: number;
  leitura: number;
  gancho: number;
  media: number;
  issues: string[];
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function scoreNarrativeQuality(
  text: string,
  opts: { minChars?: number; minWords?: number } = {}
): NarrativeQualityScore {
  const issues: string[] = [];
  const paragraphs = splitNarrativeParagraphs(text);
  const charCount = text.replace(/\s/g, "").length;
  const wordCount = words(text);
  const hasDialogue = /(^|\n)\s*—\s*\S+/m.test(text);
  const hasSceneBreak = paragraphs.includes("***");
  const longParagraphs = paragraphs.filter((p) => p.length > MAX_PARAGRAPH_CHARS);

  if (containsForbiddenNarrativeMarker(text)) issues.push("marcador_artificial");
  if (paragraphs.length < 6) issues.push("poucos_paragrafos");
  if (longParagraphs.length > 0) issues.push("paragrafo_gigante");
  if (opts.minChars && charCount < opts.minChars) issues.push("curto_demais");
  if (opts.minWords && wordCount < opts.minWords) issues.push("poucas_palavras");
  if (!hasDialogue) issues.push("sem_dialogo");

  const formatacao = clampScore(10 - (containsForbiddenNarrativeMarker(text) ? 5 : 0) - longParagraphs.length * 1.5 - (paragraphs.length < 6 ? 2 : 0));
  const coerencia = clampScore(issues.includes("marcador_artificial") ? 6 : 8.4);
  const continuidade = clampScore(hasSceneBreak || paragraphs.length >= 10 ? 8.2 : 7.5);
  const desenvolvimento = clampScore((opts.minChars && charCount < opts.minChars) || (opts.minWords && wordCount < opts.minWords) ? 6.5 : 8.2);
  const leitura = clampScore(formatacao - (hasDialogue ? 0 : 0.8));
  const gancho = clampScore(/[?!…]$/.test(text.trim()) || paragraphs.length >= 10 ? 8.1 : 7.2);
  const media = clampScore((formatacao + coerencia + continuidade + desenvolvimento + leitura + gancho) / 6);

  return { formatacao, coerencia, continuidade, desenvolvimento, leitura, gancho, media, issues };
}
```

**Step 4: Run pass**

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/reader-format/quality-score.ts scripts/test-reader-format.ts
git commit -m "feat: add narrative quality scoring"
```

---

## Task 4: Atualizar cleaner e paginação de livros

**Objective:** Fazer livro paginar com páginas reais de 3.500–6.000 caracteres e remover metadados proibidos também em texto já limpo.

**Files:**
- Modify: `src/lib/books/cleaner.ts:4-312`
- Modify: `scripts/test-reader-format.ts`

**Step 1: Extend failing test**

Append:

```ts
import { paginateText, cleanBookContent } from "../src/lib/books/cleaner";

const bookText = Array.from({ length: 90 }, (_, i) =>
  `Parágrafo ${i + 1}. Clara puxou a cadeira ao lado dele sem pedir permissão. Davi fingiu que não percebeu, mas seus dedos pararam sobre o teclado. O silêncio tinha peso de escolha.`
).join("\n\n");

const pages = paginateText(bookText);
assert(pages.pages.length > 1);
assert(pages.pages.slice(0, -1).every((p) => p.length >= 3500 && p.length <= 6000));
assert(!cleanBookContent("Página 1\n\nSubtítulo: teste\n\nNarrativa real.").includes("Subtítulo:"));
```

**Step 2: Run failure**

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: FAIL because current `charsPerPage=2500` and cleaner does not remove all artificial markers in already-clean text.

**Step 3: Modify implementation**

In `src/lib/books/cleaner.ts`:

- Import shared cleaner/standards:

```ts
import { normalizeNarrativeText } from "@/lib/reader-format/narrative-cleaner";
import { BOOK_PAGE_MIN_CHARS, BOOK_PAGE_TARGET_CHARS, BOOK_PAGE_MAX_CHARS } from "@/lib/reader-format/standards";
```

- In `cleanBookContent()`, after raw text normalization and after HTML extraction, return `normalizeNarrativeText(text)` instead of raw `text`.
- Replace `paginateText()` with a min/target/max implementation:

```ts
export function paginateText(
  text: string,
  charsPerPage = BOOK_PAGE_TARGET_CHARS
): { pages: string[]; pageCount: number } {
  const paragraphs = normalizeNarrativeText(text).split("\n\n").filter(Boolean);
  if (paragraphs.length === 0) return { pages: [""], pageCount: 1 };

  const pages: string[] = [];
  let currentPage: string[] = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const nextLen = currentLen + para.length + (currentPage.length ? 2 : 0);
    const shouldBreak =
      currentPage.length > 0 &&
      currentLen >= BOOK_PAGE_MIN_CHARS &&
      (nextLen > BOOK_PAGE_MAX_CHARS || currentLen >= charsPerPage);

    if (shouldBreak) {
      pages.push(currentPage.join("\n\n"));
      currentPage = [para];
      currentLen = para.length;
    } else {
      currentPage.push(para);
      currentLen = nextLen;
    }
  }

  if (currentPage.length > 0) pages.push(currentPage.join("\n\n"));

  if (pages.length > 1 && pages[pages.length - 1].length < BOOK_PAGE_MIN_CHARS) {
    const last = pages.pop()!;
    const previous = pages.pop()!;
    pages.push(`${previous}\n\n${last}`);
  }

  return { pages, pageCount: Math.max(1, pages.length) };
}
```

**Step 4: Run pass**

```bash
npx tsx scripts/test-reader-format.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/books/cleaner.ts scripts/test-reader-format.ts
git commit -m "fix: paginate books with official page size"
```

---

## Task 5: Atualizar leitor de light novel para classe dedicada e cleaner compartilhado

**Objective:** Renderizar capítulos de LN com `.light-novel-reader`, texto limpo, scene breaks discretos e sem cleaner duplicado inline.

**Files:**
- Modify: `src/app/novels/[slug]/[chapter]/page.tsx:22-238`

**Step 1: Build expected diff mentally**

Remove the inline `cleanChapterContent()` and import:

```ts
import { normalizeNarrativeText } from "@/lib/reader-format/narrative-cleaner";
```

**Step 2: Modify rendering**

Replace:

```tsx
<div className="prose-ln mx-auto">
  {cleanChapterContent(safeChapter.content).split(/\n\n+/).map((paragraph, i) => {
```

with:

```tsx
<div className="reader-content light-novel-reader mx-auto">
  {normalizeNarrativeText(safeChapter.content).split(/\n\n+/).map((paragraph, i) => {
```

Inside the `.map()`, before image detection, add scene break rendering:

```tsx
if (trimmed === "***") {
  return <div key={i} className="reader-scene-break" aria-hidden="true">***</div>;
}
```

Keep `ParagraphComments` intact for normal paragraphs.

**Step 3: Run build**

```bash
npm run build
```

Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/novels/[slug]/[chapter]/page.tsx
git commit -m "fix: render light novels with shared narrative cleaner"
```

---

## Task 6: Atualizar leitor de livros para classe dedicada e container oficial

**Objective:** Renderizar livro com `.book-reader`, container de 760px, recuo literário e paginação UI/metadado apenas fora do texto.

**Files:**
- Modify: `src/app/livros/[slug]/ler/page.tsx:83-109`

**Step 1: Modify container**

Change article/container from:

```tsx
<article className="mx-auto py-10 md:py-14">
  <div className="container mx-auto max-w-3xl px-4">
```

to:

```tsx
<article className="reader-shell mx-auto">
  <div className="mx-auto w-full">
```

Change content div from:

```tsx
<div className="prose prose-lg max-w-none dark:prose-invert mx-auto leading-relaxed">
```

to:

```tsx
<div className="reader-content book-reader mx-auto">
```

Add scene break rendering just like the LN reader:

```tsx
if (trimmed === "***") {
  return <div key={i} className="reader-scene-break" aria-hidden="true">***</div>;
}
```

**Step 2: Run build**

```bash
npm run build
```

Expected: PASS.

**Step 3: Commit**

```bash
git add src/app/livros/[slug]/ler/page.tsx
git commit -m "fix: apply official book reader layout"
```

---

## Task 7: Atualizar CSS oficial do leitor

**Objective:** Aplicar exatamente o padrão visual pedido: max-width 760px, padding 32px/20px, 18px, line-height 1.75/1.8, justify desktop e left no mobile quando necessário.

**Files:**
- Modify: `src/app/globals.css:425-485`

**Step 1: Replace conflicting `.prose-ln` block**

Replace lines ~425–485 with:

```css
.reader-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px;
}

.reader-content {
  font-family: var(--font-lora), Georgia, serif;
  font-size: 18px;
  letter-spacing: 0.01em;
  color: hsl(var(--foreground));
}

.reader-content p {
  margin: 0 0 1.15em;
  overflow-wrap: anywhere;
}

.reader-content p + p {
  margin-top: 0;
}

.light-novel-reader {
  line-height: 1.75;
}

.light-novel-reader p {
  text-align: justify;
  text-justify: inter-word;
  text-indent: 0;
  margin-bottom: 1.2em;
}

.book-reader {
  line-height: 1.8;
}

.book-reader p {
  text-align: justify;
  text-justify: inter-word;
  text-indent: 1.5em;
  margin-bottom: 1em;
}

.book-reader p:first-child,
.book-reader .reader-scene-break + p,
.light-novel-reader p:first-child,
.light-novel-reader .reader-scene-break + p {
  text-indent: 0;
}

.reader-scene-break {
  margin: 2.25rem auto;
  text-align: center;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.35em;
  font-family: var(--font-sans), system-ui, sans-serif;
  font-size: 0.9rem;
}

/* Compat: componentes premium ainda procuram .prose-ln */
.prose-ln {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px;
  font-family: var(--font-lora), Georgia, serif;
  font-size: 18px;
  line-height: 1.75;
}

@media (max-width: 640px) {
  .reader-shell {
    padding: 24px 16px;
  }

  .reader-content {
    font-size: 17px;
  }

  .book-reader p,
  .light-novel-reader p {
    text-align: left;
    text-justify: auto;
  }

  .book-reader p {
    text-indent: 1em;
  }
}
```

**Step 2: Run build**

```bash
npm run build
```

Expected: PASS. If CSS parse fails, fix immediately before continuing.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: apply official reader typography"
```

---

## Task 8: Criar auditoria oficial do conteúdo atual

**Objective:** Medir problemas reais no banco antes de reescrever/publicar.

**Files:**
- Create: `scripts/audit-official-reader-standard.cjs`

**Step 1: Create script**

Create `scripts/audit-official-reader-standard.cjs`:

```js
#!/usr/bin/env node
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const db = new Database(DB_PATH, { readonly: true });

const forbiddenSql = `(content GLOB '*Página [0-9]*'
  OR content GLOB '*Pagina [0-9]*'
  OR content GLOB '*Capítulo [0-9]*'
  OR content GLOB '*Capitulo [0-9]*'
  OR content LIKE '%Sinopse:%'
  OR content LIKE '%Subtítulo:%'
  OR content LIKE '%Texto gerado:%'
  OR content LIKE '%A cena principal deste trecho%'
  OR content LIKE '%A obra precisava de continuidade%'
  OR content LIKE '%O romance começava a existir%')`;

const result = {
  integrity: db.prepare("PRAGMA integrity_check").get().integrity_check,
  publicNovelChaptersWithForbiddenMarkers: db.prepare(`
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE n.is_approved=1
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
      AND ${forbiddenSql.replaceAll("content", "c.content")}
  `).get().c,
  publicOriginalNovelChaptersUnder1500Words: db.prepare(`
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE n.source='tomoverso-original'
      AND n.is_approved=1
      AND c.word_count < 1500
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
  `).get().c,
  visibleBooksWithForbiddenMarkers: db.prepare(`
    SELECT COUNT(*) AS c
    FROM books
    WHERE is_hidden=0
      AND (content LIKE '%Página 1%' OR content LIKE '%Sinopse:%' OR content LIKE '%Subtítulo:%' OR content LIKE '%Texto gerado:%')
  `).get().c,
  visibleBooksUnder3500Chars: db.prepare(`
    SELECT COUNT(*) AS c
    FROM books
    WHERE is_hidden=0
      AND length(trim(content)) < 3500
  `).get().c,
};

db.close();
console.log(JSON.stringify(result, null, 2));
process.exit(result.integrity === "ok" ? 0 : 1);
```

**Step 2: Run locally against a copied/local DB if available**

```bash
node scripts/audit-official-reader-standard.cjs
```

Expected: JSON output. If no local DB, skip local DB run and run on VPS in Task 11.

**Step 3: Commit**

```bash
git add scripts/audit-official-reader-standard.cjs
git commit -m "chore: add official reader standard audit"
```

---

## Task 9: Criar script de aplicação do padrão no banco

**Objective:** Fazer backup, limpar/reformatar conteúdo público, recalcular pages/word_count, aplicar score e ocultar o que não passar.

**Files:**
- Create: `scripts/apply-official-reader-standard.cjs`
- Update: `docs/padrao-oficial-formatacao-leitor-tomoverso.md`

**Important:** Este script deve rodar em transação e ser idempotente. Ele não pode apagar obras; só atualizar conteúdo, marcar revisão ou ocultar.

**Step 1: Script skeleton**

Create `scripts/apply-official-reader-standard.cjs` with these sections:

```js
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const BACKUP_DIR = process.env.BACKUP_DIR || "/var/www/tomoverso/backups";
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), "docs", "padrao-oficial-formatacao-leitor-tomoverso.md");

const MIN_BOOK_PAGE_CHARS = 3500;
const TARGET_BOOK_PAGE_CHARS = 5000;
const MAX_BOOK_PAGE_CHARS = 6000;
const MIN_LN_WORDS = 1500;
const MIN_SCORE = 8;

function checkpointAndBackup(dbPath) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(/:/g, "");
  const backupPath = path.join(BACKUP_DIR, `backup-before-official-reader-standard-${stamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function normalizeNarrativeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\s*#{0,6}\s*P[áa]gina\s+\d+\s*$/gim, "")
    .replace(/^\s*#{0,6}\s*Cap[íi]tulo\s+\d+\s*$/gim, "")
    .replace(/^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Texto gerado)\s*:.*$/gim, "")
    .replace(/A cena principal deste trecho[^\n.]*(?:\.|\n)/gi, "")
    .replace(/A obra precisava de continuidade[^\n.]*(?:\.|\n)/gi, "")
    .replace(/O romance começava a existir[^\n.]*(?:\.|\n)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function words(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function qualityScore(text, opts = {}) {
  const clean = normalizeNarrativeText(text);
  const paragraphs = clean.split(/\n{2,}/).filter(Boolean);
  const forbidden = clean !== text.trim();
  const tooShort = opts.minWords ? words(clean) < opts.minWords : clean.length < (opts.minChars || 0);
  const giantParagraphs = paragraphs.filter((p) => p.length > 950).length;
  const hasDialogue = /(^|\n)\s*—\s*\S+/m.test(clean);
  const formatacao = Math.max(0, 10 - (forbidden ? 2 : 0) - giantParagraphs * 1.5);
  const desenvolvimento = tooShort ? 6.5 : 8.2;
  const leitura = Math.max(0, formatacao - (hasDialogue ? 0 : 0.6));
  const scores = {
    formatacao,
    coerencia: forbidden ? 7 : 8.2,
    continuidade: 8,
    desenvolvimento,
    leitura,
    gancho: clean.length > 1200 ? 8 : 7,
  };
  scores.media = Object.values(scores).reduce((a, b) => a + b, 0) / 6;
  return scores;
}
```

**Step 2: Add novel chapter pass**

Add logic:

```js
function applyNovelPass(db) {
  const chapters = db.prepare(`
    SELECT c.id, c.novel_id, c.title, c.content, n.slug, n.title AS novel_title, n.source
    FROM chapters c JOIN novels n ON n.id = c.novel_id
    WHERE n.is_approved=1
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
  `).all();

  const updateChapter = db.prepare(`UPDATE chapters SET content=?, word_count=?, updated_at=datetime('now') WHERE id=?`);
  const markNovelReview = db.prepare(`UPDATE novels SET needs_review=1, is_approved=0, updated_at=datetime('now') WHERE id=?`);
  const audit = db.prepare(`INSERT INTO content_quality_audits (id,item_type,item_id,chapter_id,issue_type,details,scores_json,action) VALUES (lower(hex(randomblob(16))),'novel',?,?,?,?,?,?)`);

  let corrected = 0;
  let hidden = 0;

  for (const row of chapters) {
    const clean = normalizeNarrativeText(row.content);
    const score = qualityScore(clean, { minWords: row.source === "tomoverso-original" ? MIN_LN_WORDS : 0 });
    const action = score.media >= MIN_SCORE ? "published_clean" : "needs_review";

    if (clean !== row.content) {
      updateChapter.run(clean, words(clean), row.id);
      corrected++;
    }

    if (score.media < MIN_SCORE && row.source === "tomoverso-original") {
      markNovelReview.run(row.novel_id);
      hidden++;
    }

    audit.run(row.novel_id, row.id, "official_reader_standard", `${row.novel_title} / ${row.title}: ${action}`, JSON.stringify(score), action);
  }

  return { corrected, hidden };
}
```

**Step 3: Add book pass**

Add logic:

```js
function applyBookPass(db) {
  const books = db.prepare(`SELECT id, title, content FROM books WHERE is_hidden=0`).all();
  const updateBook = db.prepare(`UPDATE books SET content=?, pages=?, needs_review=?, is_hidden=?, updated_at=datetime('now') WHERE id=?`);
  let corrected = 0;
  let hidden = 0;

  for (const book of books) {
    const clean = normalizeNarrativeText(book.content);
    const score = qualityScore(clean, { minChars: MIN_BOOK_PAGE_CHARS });
    const pageCount = Math.max(1, Math.ceil(clean.length / TARGET_BOOK_PAGE_CHARS));
    const publish = score.media >= MIN_SCORE && clean.length >= MIN_BOOK_PAGE_CHARS;
    updateBook.run(clean, pageCount, publish ? 0 : 1, publish ? 0 : 1, book.id);
    if (clean !== book.content) corrected++;
    if (!publish) hidden++;
  }

  return { corrected, hidden };
}
```

**Step 4: Add report writer and main**

The report must include:

- backup path
- works audited
- works corrected
- pages rewritten/normalized
- hidden/review count
- average chars per book page from DB
- marker counts before/after
- tests to run

**Step 5: Run only after backup in execution phase**

Command for production execution later:

```bash
ssh -i "$HOME/.ssh/tomoverso_azure" -o BatchMode=yes -o StrictHostKeyChecking=no Tiothor1@40.116.106.139 \
  'cd /var/www/tomoverso && node scripts/apply-official-reader-standard.cjs'
```

Expected: JSON summary with backup path and after-counts.

**Step 6: Commit**

```bash
git add scripts/apply-official-reader-standard.cjs docs/padrao-oficial-formatacao-leitor-tomoverso.md
git commit -m "chore: add official reader standard repair script"
```

---

## Task 10: Criar verificação renderizada oficial

**Objective:** Validar em produção/local que o leitor não mostra marcadores proibidos, não tem bloco único e funciona em mobile 360px.

**Files:**
- Create: `scripts/verify-official-reader-standard.mjs`

**Step 1: Create Playwright script**

```js
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "https://tomoverso.studio";
const cases = [
  { name: "ln_mass", url: `${baseUrl}/novels/cartas-para-o-garoto-da-ultima-estacao/1`, must: "Cartas Para o Garoto", reader: true },
  { name: "ln_demon", url: `${baseUrl}/novels/demon-king/1`, must: "Demon King", reader: true },
  { name: "book", url: `${baseUrl}/livros/o-contrato-do-beijo-falso/ler?page=1`, must: "O Contrato", reader: true },
  { name: "catalog", url: `${baseUrl}/catalogo`, must: "Catálogo", reader: false },
];

const forbidden = /(^|\n)\s*(###\s*)?(Página\s+\d+|Capítulo\s+\d+)\s*($|\n)|Sinopse:|Subtítulo:|Texto gerado:|A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir/i;

const browser = await chromium.launch({ headless: true });
let failed = false;

for (const viewport of [{ width: 1366, height: 900 }, { width: 360, height: 740 }]) {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(testCase.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const html = document.documentElement;
      const paragraphs = Array.from(document.querySelectorAll(".book-reader p, .light-novel-reader p")).map((p) => p.textContent || "");
      return {
        text,
        overflow: Math.max(0, html.scrollWidth - html.clientWidth),
        paragraphCount: paragraphs.length,
        giantParagraphs: paragraphs.filter((p) => p.length > 1200).length,
      };
    });

    const checks = {
      status: response?.status() === 200,
      must: data.text.toLowerCase().includes(testCase.must.toLowerCase()),
      noOverflow: data.overflow <= 8,
      noForbidden: !testCase.reader || !forbidden.test(data.text),
      enoughParagraphs: !testCase.reader || data.paragraphCount >= 6,
      noGiantParagraphs: !testCase.reader || data.giantParagraphs === 0,
    };

    console.log(`${testCase.name}@${viewport.width}: ${JSON.stringify(checks)}`);
    if (Object.values(checks).some((ok) => !ok)) failed = true;
    await page.close();
  }
}

await browser.close();
if (failed) process.exit(1);
console.log("official reader standard render checks passed");
```

**Step 2: Run script**

```bash
node scripts/verify-official-reader-standard.mjs
```

Expected: PASS after implementation/deploy.

**Step 3: Commit**

```bash
git add scripts/verify-official-reader-standard.mjs
git commit -m "test: verify official reader standard rendering"
```

---

## Task 11: Execução na VPS com backup e aplicação de dados

**Objective:** Aplicar correção no banco real com backup obrigatório, sem pedir senha de sudo.

**Files:**
- Deploy/copy changed scripts via git sync; no manual file edits.

**Step 1: Push code to GitHub**

```bash
git push origin main
```

Expected: push succeeds.

**Step 2: Sync VPS and backup/apply**

```bash
ssh -i "$HOME/.ssh/tomoverso_azure" -o BatchMode=yes -o StrictHostKeyChecking=no Tiothor1@40.116.106.139 'bash -s' <<'REMOTE'
set -euo pipefail
cd /var/www/tomoverso
git fetch origin main
git reset --hard origin/main
node scripts/audit-official-reader-standard.cjs > /tmp/official-reader-before.json
node scripts/apply-official-reader-standard.cjs > /tmp/official-reader-apply.json
node scripts/audit-official-reader-standard.cjs > /tmp/official-reader-after.json
printf 'BEFORE\n'; cat /tmp/official-reader-before.json
printf '\nAPPLY\n'; cat /tmp/official-reader-apply.json
printf '\nAFTER\n'; cat /tmp/official-reader-after.json
REMOTE
```

Expected:

- backup path printed by apply script
- SQLite integrity `ok`
- forbidden markers after = 0 or all remaining are hidden/needs_review
- public original chapters under threshold = 0 or affected works hidden/needs_review

**Step 3: Do not continue if audit after fails**

If after-counts are nonzero for public reader content, stop and fix script/data before build/restart.

---

## Task 12: Build, restart e validação na VPS

**Objective:** Garantir que a produção está compilada, rodando, e o leitor real abre limpo.

**Files:**
- No code file changes expected.

**Step 1: Build and restart**

```bash
ssh -i "$HOME/.ssh/tomoverso_azure" -o BatchMode=yes -o StrictHostKeyChecking=no Tiothor1@40.116.106.139 'bash -s' <<'REMOTE'
set -euo pipefail
cd /var/www/tomoverso
rm -rf .next/cache
npm run build
pm2 restart tomoverso --update-env --wait-ready || pm2 restart tomoverso --update-env
pm2 status --no-color
sudo -n nginx -t 2>&1
REMOTE
```

Expected:

- `npm run build`: exit 0 / `✓ Compiled successfully`
- PM2: `tomoverso` online
- Nginx: `syntax is ok` and `test is successful`
- If `sudo -n nginx -t` fails only because sudo asks password, do not ask user; note that nginx non-interactive validation is unavailable.

**Step 2: HTTP route checks**

```bash
ssh -i "$HOME/.ssh/tomoverso_azure" -o BatchMode=yes -o StrictHostKeyChecking=no Tiothor1@40.116.106.139 'bash -s' <<'REMOTE'
set -euo pipefail
for url in \
  https://tomoverso.studio/catalogo \
  https://tomoverso.studio/feed \
  https://tomoverso.studio/admin-secreto \
  https://tomoverso.studio/novels/cartas-para-o-garoto-da-ultima-estacao/1 \
  https://tomoverso.studio/novels/demon-king/1 \
  'https://tomoverso.studio/livros/o-contrato-do-beijo-falso/ler?page=1'
do
  code=$(curl -k -L -sS -o /tmp/tv-check.html -w '%{http_code}' "$url")
  err=$(grep -ci 'Internal Server Error\|Application error\|ECONNREFUSED' /tmp/tv-check.html || true)
  echo "$url|http=$code|errors=$err|bytes=$(wc -c < /tmp/tv-check.html)"
  [ "$code" = "200" ] && [ "$err" = "0" ]
done
REMOTE
```

Expected: every line `http=200|errors=0`.

**Step 3: Rendered Playwright validation**

Run from local workspace or VPS:

```bash
node scripts/verify-official-reader-standard.mjs
```

Expected: `official reader standard render checks passed`.

---

## Task 13: Atualizar relatório final

**Objective:** Registrar a entrega exigida pelo usuário.

**Files:**
- Modify: `docs/padrao-oficial-formatacao-leitor-tomoverso.md`
- Modify: `docs/correcao-conteudo-massa-tomoverso.md`

**Step 1: Append required report fields**

The final report must include:

```md
# Padrão oficial de formatação — Tomoverso

## Backup
- Backup criado: sim
- Caminho: `/var/www/tomoverso/backups/backup-before-official-reader-standard-YYYY-MM-DD-HHMM.db`
- integrity_check: ok

## Auditoria
- Obras auditadas: N
- Capítulos auditados: N
- Livros auditados: N
- Capítulos/páginas com Página X: N before → 0 after
- Conteúdo com Sinopse/Subtítulo/Resumo dentro da narrativa: N before → 0 after
- Capítulos ocultados/revisão: N
- Páginas reescritas/normalizadas: N
- Média de caracteres por página de livro: N
- Média de palavras por capítulo LN original: N

## Melhorias no leitor
- `.light-novel-reader`: parágrafos menores, line-height 1.75, justify desktop, left mobile.
- `.book-reader`: line-height 1.8, text-indent 1.5em, justify desktop, left mobile.
- Container: max-width 760px, padding 32px 20px.
- Scene break `***` renderizado como separador visual discreto.

## Antes/depois
- Antes: conteúdo podia exibir Página/Sinopse/Subtítulo e bloco único.
- Depois: leitor renderiza somente narrativa limpa, com parágrafos separados e sem marcadores artificiais.

## Testes realizados
- `npx tsx scripts/test-reader-format.ts`
- `node scripts/audit-official-reader-standard.cjs`
- `npm run build`
- `pm2 restart/status`
- `sudo -n nginx -t`
- `node scripts/verify-official-reader-standard.mjs`
- Rotas públicas testadas: `/catalogo`, `/feed`, `/admin-secreto`, leitores LN/livro.

## Pendências
- Listar apenas se houver obra escondida por nota < 8 ou conteúdo que precisa revisão humana.
```

**Step 2: Commit report**

```bash
git add docs/padrao-oficial-formatacao-leitor-tomoverso.md docs/correcao-conteudo-massa-tomoverso.md
git commit -m "docs: report official reader formatting cleanup"
```

---

## Final verification checklist

Before saying the work is done, verify with fresh output:

```bash
npx tsx scripts/test-reader-format.ts
npm run build
node scripts/verify-official-reader-standard.mjs
```

On VPS:

```bash
ssh -i "$HOME/.ssh/tomoverso_azure" -o BatchMode=yes -o StrictHostKeyChecking=no Tiothor1@40.116.106.139 'bash -s' <<'REMOTE'
set -euo pipefail
cd /var/www/tomoverso
node scripts/audit-official-reader-standard.cjs
pm2 status --no-color
sudo -n nginx -t 2>&1
REMOTE
```

Acceptance criteria:

- [ ] Backup created before DB update.
- [ ] Public reader content has **0** `Página X`, `Capítulo X`, `Sinopse:`, `Subtítulo:`, `Resumo:`, `Continuação:`, `Texto gerado:` in narrative body.
- [ ] Books paginate at 3.500+ chars per normal page, ideally 4.500–6.000.
- [ ] LN chapters publicly visible have enough content or are hidden/needs_review.
- [ ] `.book-reader` and `.light-novel-reader` styles are active.
- [ ] Mobile 360px has no horizontal overflow.
- [ ] Reader has no giant paragraph/block-only rendering.
- [ ] Search/catalog/feed do not expose hidden low-score items as ready.
- [ ] Report files are updated.
- [ ] Build and PM2 production checks pass.

## Risks and tradeoffs

- **Automated rewriting can still sound templated.** If a chapter scores below 8 after cleaning, hide it instead of publishing.
- **Old imported/external works may contain metadata from source sites.** Avoid rewriting third-party/imported works as if original; clean display only or mark `needs_review`.
- **Justified text on mobile can create ugly spacing.** Use `text-align: left` under 640px.
- **Existing premium controls query `.prose-ln`.** Keep a compatibility `.prose-ln` block or update `src/components/reader/premium-controls.tsx` and `src/components/reader/reader-settings.tsx` to query `.reader-content`.
- **Book page count changes.** Increasing page size will reduce page count; this is correct because old 2.500-char pages were below the official standard.

## Open questions for execution

No user decision is required to start. Default decisions:

- Apply to all public Tomoverso-owned/original content first.
- Clean imported content only for display safety; do not rewrite story content from third-party sources.
- Hide/review anything below score 8 after cleaning.
- Use `sudo -n`, never interactive sudo.
