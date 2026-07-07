import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const localeDir = path.join(root, "src/lib/i18n/locales");
const sourcePath = path.join(localeDir, "pt-BR.ts");
const sourceTs = await fs.readFile(sourcePath, "utf8");
const objectSource = sourceTs
  .replace(/import[^;]+;\s*/g, "")
  .replace(/const ptBR: NestedDict = /, "const ptBR = ")
  .replace(/export default ptBR;[\s\S]*$/, "globalThis.__dict = ptBR;");
const sandbox = {};
vm.runInNewContext(objectSource, sandbox, { filename: sourcePath });
const pt = sandbox.__dict;

const targets = {
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  ja: "ja",
  ko: "ko",
  zh: "zh-CN",
};

function collectStrings(obj, pathParts = [], out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const next = [...pathParts, key];
    if (typeof value === "string") out.push({ path: next, text: value });
    else if (value && typeof value === "object") collectStrings(value, next, out);
  }
  return out;
}

function setPath(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    cur[pathParts[i]] ||= {};
    cur = cur[pathParts[i]];
  }
  cur[pathParts[pathParts.length - 1]] = value;
}

function mask(text) {
  const placeholders = [];
  const masked = text.replace(/\{\{?\w+\}?\}/g, (m) => {
    const token = `ZXPH${placeholders.length}ZX`;
    placeholders.push([token, m]);
    return token;
  });
  return { masked, placeholders };
}

function unmask(text, placeholders) {
  let out = text;
  for (const [token, original] of placeholders) {
    out = out.replaceAll(token, original).replaceAll(token.toLowerCase(), original);
  }
  return out;
}

async function translateBatch(texts, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(texts.join("\n"))}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 TomoversoLocaleGenerator/1.0" } });
  if (!res.ok) throw new Error(`Google translate ${target} failed: ${res.status}`);
  const data = await res.json();
  const full = data[0].map((part) => part[0]).join("");
  return full.split("\n").map((s) => s.trim());
}

function chunkByLength(items, max = 4200) {
  const chunks = [];
  let current = [];
  let len = 0;
  for (const item of items) {
    const nextLen = len + item.masked.length + 1;
    if (current.length && nextLen > max) {
      chunks.push(current);
      current = [];
      len = 0;
    }
    current.push(item);
    len += item.masked.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

const entries = collectStrings(pt).map((entry) => ({ ...entry, ...mask(entry.text) }));

for (const [code, target] of Object.entries(targets)) {
  const translatedDict = {};
  for (const chunk of chunkByLength(entries)) {
    const translated = await translateBatch(chunk.map((item) => item.masked), target);
    chunk.forEach((item, index) => {
      setPath(translatedDict, item.path, unmask(translated[index] || item.text, item.placeholders));
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Keep locale names stable/native and brand name exact.
  translatedDict.common.app_name = pt.common.app_name;
  translatedDict.locale = pt.locale;

  const constName = code === "zh" ? "zh" : code;
  const content = `import type { NestedDict } from "../types";\n\nconst ${constName}: NestedDict = ${JSON.stringify(translatedDict, null, 2)};\n\nexport default ${constName};\n`;
  await fs.writeFile(path.join(localeDir, `${code}.ts`), content, "utf8");
  console.log(`${code}: ${entries.length} strings`);
}
