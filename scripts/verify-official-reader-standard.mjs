import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "https://tomoverso.studio";
const cases = [
  { name: "ln_mass", url: `${baseUrl}/novels/cartas-para-o-garoto-da-ultima-estacao/1`, must: "Cartas Para o Garoto", reader: true },
  { name: "ln_demon", url: `${baseUrl}/novels/demon-king/1`, must: "Demon King", reader: true },
  { name: "book", url: `${baseUrl}/livros/o-contrato-do-beijo-falso/ler?page=1`, must: "O Contrato", reader: true },
  { name: "catalog", url: `${baseUrl}/catalogo`, must: "Catálogo", reader: false },
];

const forbidden = /(^|\n)\s*(###\s*)?(Página\s+\d+|Capítulo\s+\d+)\s*($|\n)|Sinopse:|Subtítulo:|Subtitulo:|Texto gerado:|A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava/i;

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
        classFound: !!document.querySelector(".book-reader, .light-novel-reader"),
      };
    });

    const checks = {
      status: response?.status() === 200,
      must: data.text.toLowerCase().includes(testCase.must.toLowerCase()),
      noOverflow: data.overflow <= 8,
      noForbidden: !testCase.reader || !forbidden.test(data.text),
      enoughParagraphs: !testCase.reader || data.paragraphCount >= 6,
      noGiantParagraphs: !testCase.reader || data.giantParagraphs === 0,
      readerClass: !testCase.reader || data.classFound,
    };

    console.log(`${testCase.name}@${viewport.width}: ${JSON.stringify(checks)}`);
    if (Object.values(checks).some((ok) => !ok)) failed = true;
    await page.close();
  }
}

await browser.close();
if (failed) process.exit(1);
console.log("official reader standard render checks passed");
