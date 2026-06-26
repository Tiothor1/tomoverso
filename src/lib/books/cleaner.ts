/**
 * Clean scraped book content: strip HTML/CSS/JS, extract meaningful text.
 */
export function cleanBookContent(raw: string): string {
  if (!raw) return "";

  // Remove scripts, style blocks, noscript
  let text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Replace block-level closing tags with paragraph break markers
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr|td)>/gi, "\n\nPARA_BREAK\n\n");
  text = text.replace(/<(br|hr)\s*\/?>/gi, "\n\nPARA_BREAK\n\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "—")
    .replace(/&#8212;/g, "—")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

  // Normalize all kinds of line breaks to \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into paragraphs (preserve structure)
  let paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Remove known metadata/footer paragraphs
  const skipPrefixes = [
    "eBook", "e-book", "ebook",
    "Título:", "Autor:", "Editora:", "Ano:", "Páginas:",
    "Tipo:", "Formato:", "Licença:", "ISBN:",
    "Instituição:", "Fonte:", "Idioma:",
    "Baixar", "Download",
    "Compartilhe", "Compartilhar",
    "Reportar Erro", "Denunciar Abuso",
    "Leia também", "Ver mais livros",
    "O que os leitores acharam",
    "Recomendaria",
  ];
  const skipEmptyOrSingle = ["—", "", " "];

  paragraphs = paragraphs.filter((p) => {
    const lower = p.toLowerCase();
    // Skip short/empty
    if (p.length < 5) return false;
    // Skip known metadata lines
    for (const prefix of skipPrefixes) {
      if (lower.startsWith(prefix.toLowerCase())) return false;
    }
    // Skip CSS/JS fragments
    if (p.startsWith("{") || p.startsWith("}") || p.startsWith(".") || p.startsWith("#")) return false;
    if (p.includes("getElementById") || p.includes("push({})")) return false;
    if (p.includes("adsbygoogle") || p.includes("betterads_")) return false;
    if (p.startsWith("var ") || p.startsWith("let ") || p.startsWith("const ")) return false;
    if (p.startsWith("function ")) return false;
    if (p.startsWith("if ") || p.startsWith("else ")) return false;
    if (p.startsWith("document.") || p.startsWith("window.")) return false;
    return true;
  });

  // Find content start: look for the first paragraph that contains "sobre a obra" or similar
  // and keep everything from there
  const contentMarkers = ["sobre a obra", "sinopse", "resumo", "descrição"];
  let contentStartIdx = paragraphs.length;
  for (const marker of contentMarkers) {
    const idx = paragraphs.findIndex(
      (p) => p.toLowerCase().includes(marker)
    );
    if (idx >= 0 && idx < contentStartIdx) {
      contentStartIdx = idx;
    }
  }

  if (contentStartIdx < paragraphs.length) {
    paragraphs = paragraphs.slice(contentStartIdx);
  }

  // Remove trailing promotional paragraphs
  const promoMarkers = [
    "leia também", "ver mais livros", "baixar livro",
    "download seguro", "reportar erro", "denunciar abuso",
    "compartilhe", "compartilhar", "o que os leitores acharam",
    "recomendaria", "bo(a|a) qualidade", "leitura agradável",
  ];
  const lastGoodIdx = paragraphs.length - 1;
  for (let i = paragraphs.length - 1; i >= Math.max(0, Math.floor(paragraphs.length * 0.7)); i--) {
    const lower = paragraphs[i].toLowerCase();
    const isPromo = promoMarkers.some((m) => lower.includes(m));
    if (isPromo) {
      paragraphs.splice(i);
      break;
    }
  }

  // Hard cutoff at "Leia também" or "Ver detalhes" patterns
  for (let i = 0; i < paragraphs.length; i++) {
    const lower = paragraphs[i].toLowerCase();
    if (lower.includes("leia também") && i >= Math.floor(paragraphs.length * 0.5)) {
      paragraphs = paragraphs.slice(0, i);
      break;
    }
    if ((lower.includes("ver detalhes") || lower.includes("gratuita")) && i >= Math.floor(paragraphs.length * 0.7)) {
      // Check if this looks like a recommendation list
      const remaining = paragraphs.slice(i, i + 5).join(" ");
      const hasMultipleBooks = (remaining.match(/gratuita|ver detalhes/gi) || []).length >= 2;
      if (hasMultipleBooks) {
        paragraphs = paragraphs.slice(0, i);
        break;
      }
    }
    // Pipe-separated recommendation lists: "Title1||Free||View||Title2||Author||..."
    if (lower.includes("gratuita") && paragraphs[i].includes("||") && i >= Math.floor(paragraphs.length * 0.5)) {
      paragraphs = paragraphs.slice(0, i);
      break;
    }
  }

  // Remove tail of very short lines that look like recommendation lists
  // If we find 4+ consecutive paragraphs under 40 chars each after 60% of the content
  let shortRunStart = -1;
  for (let i = Math.floor(paragraphs.length * 0.6); i < paragraphs.length; i++) {
    if (paragraphs[i].length < 40 && paragraphs[i].length >= 2) {
      if (shortRunStart < 0) shortRunStart = i;
      // If we have 4+ consecutive short lines, this is probably a recommendation list
      if (i - shortRunStart >= 3) {
        paragraphs = paragraphs.slice(0, shortRunStart);
        break;
      }
    } else {
      shortRunStart = -1;
    }
  }

  const joined = paragraphs.join("\n\n");

  // Fallback for single-paragraph content: try inline extraction
  if (joined.length < 200 || paragraphs.length <= 2) {
    const extracted = extractSingleParagraph(raw);
    if (extracted.length > joined.length) {
      return extracted;
    }
  }

  return joined;
}

/**
 * When content has very few paragraphs (no proper line breaks),
 * try to extract content by cutting at mid-text markers.
 */
function extractSingleParagraph(raw: string): string {
  if (!raw) return "";

  // Strip HTML (less aggressive) but preserve text content
  let text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "—")
    .replace(/&#8212;/g, "—")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

  // Find "Sobre a obra" or equivalent (mid-text)
  const markers = [
    "Sobre a obra", "Sinopse", "Resumo", "Descrição",
    "Sobre o livro", "Sobre",
  ];
  let startPos = -1;
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      if (startPos < 0 || idx < startPos) startPos = idx;
    }
  }

  // Cut at start marker if found
  if (startPos >= 0) {
    text = text.substring(startPos);
  }

  let endPos = text.length;

  // Cut at markers that are never actual book content
  const earlyEndMarkers = [
    "Baixar Livro", "Download Seguro",
    "Reportar Erro", "Denunciar Abuso",
    "Facebook Twitter", "Facebook Twitter LinkedIn",
  ];
  for (const marker of earlyEndMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= 0 && idx < endPos) {
      endPos = idx;
    }
  }

  // Also cut at markers found after 25% into text (these could look like content at start)
  const lateEndMarkers = [
    "O que os leitores acharam",
    "Leia também", "Ver mais livros", "Compartilhe", "Compartilhar",
    "Recomendaria", "Boa qualidade",
  ];
  const minCutPos = Math.floor(text.length * 0.25);
  for (const marker of lateEndMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= minCutPos && idx < endPos) {
      endPos = idx;
    }
  }

  text = text.substring(0, endPos).trim();

  // Remove orphaned punctuation, numbers, and file-size suffixes at the end
  text = text.replace(/[\s,;:.\-–—|]+$/, "");
  text = text.replace(/\d+\.?\d*\s*(MB|Kb|kb|GB)?\s*$/g, "").trim();
  text = text.replace(/^(?:[\s,;:.\-–—|]+|MB|Kb|kb)+/, "").trim();

  return text;
}

/**
 * Clean scraped book content: strip HTML/CSS/JS, extract meaningful text.
 */
export function paginateText(
  text: string,
  charsPerPage = 2500
): { pages: string[]; pageCount: number } {
  const paragraphs = text.split("\n\n").filter(Boolean);
  if (paragraphs.length === 0) {
    return { pages: [""], pageCount: 1 };
  }

  const pages: string[] = [];
  let currentPage: string[] = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    if (currentLen + para.length > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage.join("\n\n"));
      currentPage = [para];
      currentLen = para.length;
    } else {
      currentPage.push(para);
      currentLen += para.length;
    }
  }
  if (currentPage.length > 0) {
    pages.push(currentPage.join("\n\n"));
  }

  return { pages, pageCount: Math.max(1, pages.length) };
}
