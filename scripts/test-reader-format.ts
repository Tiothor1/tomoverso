import { strict as assert } from "node:assert";
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

import { scoreNarrativeQuality } from "../src/lib/reader-format/quality-score";

const goodPage = Array.from({ length: 32 }, (_, i) =>
  i % 4 === 0
    ? "— Você também sentiu? — Clara perguntou. O corredor parecia prender a respiração junto com eles."
    : "Davi percebeu que o corredor estava silencioso demais. A luz da manhã atravessava as janelas, mas nada parecia ocupar o mesmo lugar de antes, e cada passo empurrava os dois para uma escolha que nenhum deles queria nomear."
).join("\n\n");

const score = scoreNarrativeQuality(goodPage, { minChars: 3500, minWords: 500 });
assert(score.media >= 8, JSON.stringify(score));

const badScore = scoreNarrativeQuality("Página 1\n\nSinopse: teste", { minChars: 3500, minWords: 500 });
assert(badScore.media < 8, JSON.stringify(badScore));

import { paginateText, cleanBookContent } from "../src/lib/books/cleaner";

const bookText = Array.from({ length: 90 }, (_, i) =>
  `Parágrafo ${i + 1}. Clara puxou a cadeira ao lado dele sem pedir permissão. Davi fingiu que não percebeu, mas seus dedos pararam sobre o teclado. O silêncio tinha peso de escolha.`
).join("\n\n");

const pages = paginateText(bookText);
assert(pages.pages.length > 1);
assert(pages.pages.slice(0, -1).every((p) => p.length >= 3500 && p.length <= 6000));
assert(!cleanBookContent("Página 1\n\nSubtítulo: teste\n\nNarrativa real.").includes("Subtítulo:"));

const inlineMeta = normalizeNarrativeText("Narrativa antes.\n\nO conflito continuava no centro de tudo: Subtítulo: O jogo acabou. Sinopse: Isso é ficha, não narrativa.\n\n— Agora a cena continua — ela disse.");
assert(!/Subtítulo:|Sinopse:|O conflito continuava no centro de tudo/i.test(inlineMeta));
assert(inlineMeta.includes("— Agora a cena continua — ela disse."));

const inlineChapterMeta = normalizeNarrativeText("Davi chegou na sala. Capítulo 12: esse marcador não deve ficar. Página 3 — outro marcador também precisa sair.\n\n— Agora sim — Clara disse.");
assert(!/Capítulo\s+12|Página\s+3/i.test(inlineChapterMeta));
assert(inlineChapterMeta.includes("— Agora sim — Clara disse."));

console.log("reader-format standards tests passed");
