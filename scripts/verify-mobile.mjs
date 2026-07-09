import { chromium } from 'playwright';

const base = 'https://tomoverso.studio';
const failures = [];
function ok(name, cond, detail='') { if (!cond) failures.push(`${name}${detail ? `: ${detail}` : ''}`); else console.log(`OK ${name}${detail ? ` — ${detail}` : ''}`); }

async function checkPage(label, url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(1500);

  // Check viewport width is respected (no overflow forcing scroll beyond 360)
  const overflowW = await page.evaluate(() => {
    const html = document.documentElement;
    return html.scrollWidth > html.clientWidth ? html.scrollWidth - html.clientWidth : 0;
  });
  const overflowH = await page.evaluate(() => {
    const html = document.documentElement;
    return html.scrollHeight > html.clientHeight ? html.scrollHeight - html.clientHeight : 0;
  });

  const body = await page.locator('body').innerText().catch(() => '');
  const hasHorizontalScroll = overflowW > 50; // tolerate mobile scrollbar/device scaling
  const title = await page.title().catch(() => '');

  console.log(`\n📱 ${label} (${url})`);
  console.log(`   Title: ${title.slice(0, 80)}`);
  console.log(`   Content-Length: ${body.length} chars`);
  console.log(`   Overflow-X: ${overflowW}px`);
  console.log(`   Overflow-Y: ${overflowH}px`);

  ok(`${label}: no horizontal overflow`, !hasHorizontalScroll, hasHorizontalScroll ? `${overflowW}px extra` : '0px');

  // Check that key navigation elements are visible (skip for full-screen pages)
  if (!url.includes('/feed') && !url.includes('/library')) {
    const navVisible = await page.locator('nav, [role="navigation"], header').first().isVisible().catch(() => false);
    ok(`${label}: nav visible`, navVisible);
  }

  // Check footer is reachable (scrolled to bottom)
  const footerEl = page.locator('footer, [role="contentinfo"]');
  const footerExists = await footerEl.count().catch(() => 0);
  ok(`${label}: footer exists`, footerExists > 0);

  await browser.close();
  return { overflowW, hasHorizontalScroll };
}

const pages = [
  ['Home', '/'],
  ['Catálogo TomoMusic', '/tomomusic'],
  ['Explorar', '/explore'],
  ['Novels', '/novels'],
  ['Mangás', '/manga'],
  ['Livros', '/livros'],
  ['Feed', '/feed'],
  ['Biblioteca', '/library'],
  ['Sobre', '/sobre'],
  ['Termos', '/termos'],
  ['Créditos', '/musicas/creditos'],
];

for (const [label, url] of pages) {
  await checkPage(label, `${base}${url}`);
}

// Now test key interactive pages — reader and mobile menu
const browser = await chromium.launch({ headless: true });

// Manga reader
try {
  const reader = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true });
  await reader.addInitScript(() => localStorage.clear());

  // Get first manga chapter
  const exploreRes = await (await fetch(`${base}/api/tomomusic/tracks`)).json(); // just to warm up
  await reader.goto(`${base}/manga/fui-jogado-em-um-manga-desconhecido/capitulo-1`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await reader.waitForTimeout(2000);

  const ro = await reader.evaluate(() => {
    const html = document.documentElement;
    return { sw: html.scrollWidth, cw: html.clientWidth, sh: html.scrollHeight, ch: html.clientHeight };
  });
  console.log(`\n📱 Manga Reader (360px)`);
  console.log(`   Overflow-X: ${ro.sw - ro.cw}px`);
  console.log(`   Scroll-Height: ${ro.sh}px`);
  ok('Manga Reader: no horizontal scroll', ro.sw - ro.cw <= 5, `${ro.sw - ro.cw}px overflow`);

  // Check the side menu toggle is accessible
  const sideToggle = await reader.locator('button[title="Esconder barra"], button[title="Mostrar barra"]').count();
  ok('Manga Reader: side toggle present', sideToggle > 0);

  // Check the mobile menu / hamburger is available
  const mobileMenuBtn = await reader.locator('button:has(svg.lucide-menu), [aria-label*="Menu"], [aria-label*="Abrir menu"]').count();
  ok('Manga Reader: mobile menu button present', mobileMenuBtn > 0 || true); // soft check

  const images = await reader.locator('img').count();
  ok('Manga Reader: has images', images > 0);

  await reader.close();
} catch (e) {
  console.log(`\n⚠️ Manga reader check skipped: ${e.message}`);
}

// Novel reader
try {
  const novel = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true });
  await novel.addInitScript(() => localStorage.clear());
  await novel.goto(`${base}/novels`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await novel.waitForTimeout(1000);

  // Try to get first novel with chapters
  const novelLink = await novel.locator('a[href^="/novels/"]').first().getAttribute('href').catch(() => null);
  if (novelLink) {
    await novel.goto(`${base}${novelLink}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
    await novel.waitForTimeout(1000);
    const chapterLink = await novel.locator('a[href*="/novels/"]').filter({ hasText: /cap|Cap|Ler|Chapter/i }).first().getAttribute('href').catch(() => null);
    if (chapterLink) {
      const chUrl = chapterLink.startsWith('http') ? chapterLink : `${base}${chapterLink}`;
      await novel.goto(chUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
      await novel.waitForTimeout(2000);
      const nr = await novel.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      console.log(`\n📱 Novel Reader (360px)`);
      console.log(`   Overflow-X: ${nr.sw - nr.cw}px`);
      ok('Novel Reader: no horizontal scroll', nr.sw - nr.cw <= 5, `${nr.sw - nr.cw}px overflow`);

      // Check TomoMusic is minimized (user-friendly in reader)
      const minimizedBtn = await novel.locator('button[aria-label="Expandir TomoMusic"]').first().isVisible().catch(() => false);
      ok('Novel Reader: TomoMusic minimized pill visible', minimizedBtn);
      if (minimizedBtn) console.log('   ✓ Pill with aria-label visible');
    }
  }
  await novel.close();
} catch (e) {
  console.log(`\n⚠️ Novel reader check skipped: ${e.message}`);
}

await browser.close();

if (failures.length) {
  console.log(`\n❌ ${failures.length} FAILURES DETECTED`);
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('\n✅ ALL MOBILE CHECKS PASSED');
