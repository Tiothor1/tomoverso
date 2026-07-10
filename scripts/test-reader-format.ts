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

console.log("reader-format standards tests passed");
