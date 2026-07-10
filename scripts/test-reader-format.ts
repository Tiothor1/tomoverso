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

console.log("reader-format standards tests passed");
