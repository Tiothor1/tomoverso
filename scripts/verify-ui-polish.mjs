import { chromium } from 'playwright';

const base = process.env.BASE || 'https://tomoverso.studio';
const failures = [];
function ok(name, cond, detail='') { if (!cond) failures.push(`${name}${detail ? `: ${detail}` : ''}`); else console.log(`OK ${name}${detail ? ` — ${detail}` : ''}`); }

const api = await fetch(`${base}/api/tomomusic/tracks`);
const payload = await api.json();
ok('api has 130+ tracks', payload.tracks.length >= 130, String(payload.tracks.length));
ok('licenses safe', payload.tracks.every(t => t.license_url && !/\/nc\/|\/nd\/|noncommercial|no derivatives/i.test(`${t.license_url} ${t.license_name}`)));
ok('lofi variety', payload.tracks.filter(t => `${t.mood} ${t.genre}`.toLowerCase().includes('lofi')).length >= 40, String(payload.tracks.filter(t => `${t.mood} ${t.genre}`.toLowerCase().includes('lofi')).length));

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await desktop.addInitScript(() => localStorage.clear());
  await desktop.goto(`${base}/tomomusic`, { waitUntil: 'domcontentloaded' });
  await desktop.waitForSelector('text=Música de fundo para ler', { timeout: 20000 });
  const body = await desktop.locator('body').innerText();
  ok('tomomusic page loaded', body.includes('Música de fundo para ler'));
  ok('no storage/stat text on catalog', !/\b\d+(?:[,.]\d+)?\s*MB\b|baixados|músicas ativas/i.test(body));
  const catalogImgs = await desktop.locator('main article img, main [class*="aspect"] img').count();
  ok('catalog does not use cover cards', catalogImgs === 0, String(catalogImgs));
  await desktop.getByPlaceholder('Buscar lofi, chuva, piano, artista...').fill('lofi');
  await desktop.waitForTimeout(500);
  ok('catalog search shows rows', await desktop.locator('text=Lofi').count() > 0 || (await desktop.locator('button[title^="Tocar"]').count()) > 3);
  await desktop.locator('button[title^="Tocar"]').first().click();
  await desktop.waitForFunction(() => !!document.querySelector('audio')?.getAttribute('src'), { timeout: 10000 });
  const playerBox = await desktop.locator('section[aria-label="TomoMusic player global"]').boundingBox();
  ok('global player compact desktop', !!playerBox && playerBox.width <= 380 && playerBox.height <= 230, playerBox ? `${Math.round(playerBox.width)}x${Math.round(playerBox.height)}` : 'missing');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.addInitScript(() => localStorage.clear());
  await mobile.goto(`${base}/tomomusic`, { waitUntil: 'domcontentloaded' });
  await mobile.waitForSelector('text=Música de fundo para ler', { timeout: 20000 });
  await mobile.locator('button[title^="Tocar"]').first().click();
  await mobile.waitForTimeout(1200);
  const mobileBox = await mobile.locator('section[aria-label="TomoMusic player global"]').boundingBox();
  ok('global player compact mobile', !!mobileBox && mobileBox.width <= 370 && mobileBox.height <= 230, mobileBox ? `${Math.round(mobileBox.width)}x${Math.round(mobileBox.height)}` : 'missing');

  const reader = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await reader.addInitScript(() => localStorage.clear());
  await reader.goto(`${base}/manga/fui-jogado-em-um-manga-desconhecido/capitulo-1`, { waitUntil: 'domcontentloaded' });
  await reader.waitForTimeout(1500);
  ok('manga reader side arrow visible', await reader.locator('button[title="Esconder barra"]').count() >= 1);
  await reader.locator('button[title="Esconder barra"]').first().click();
  await reader.waitForTimeout(300);
  ok('manga side bar hides', await reader.locator('button[title="Mostrar barra"]').count() >= 1 && await reader.locator('button[title="Capítulos"]').count() === 0);

  const novel = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await novel.addInitScript(() => localStorage.clear());
  await novel.goto(`${base}/novels`, { waitUntil: 'domcontentloaded' });
  const firstNovelHref = await novel.locator('a[href^="/novels/"]').first().getAttribute('href').catch(() => null);
  if (firstNovelHref) {
    await novel.goto(`${base}${firstNovelHref}`, { waitUntil: 'domcontentloaded' });
    const chapterHref = await novel.locator('a[href*="/novels/"]').filter({ hasText: /cap|Cap|Capítulo|Ler/i }).first().getAttribute('href').catch(() => null);
    if (chapterHref) {
      await novel.goto(chapterHref.startsWith('http') ? chapterHref : `${base}${chapterHref}`, { waitUntil: 'domcontentloaded' });
      await novel.waitForTimeout(1000);
      ok('novel side arrow visible', await novel.locator('button[title="Esconder ícones"]').count() >= 1);
      await novel.locator('button[title="Esconder ícones"]').first().click();
      await novel.waitForTimeout(300);
      ok('novel side icons hide', await novel.locator('button[title="Mostrar ícones"]').count() >= 1);
    } else {
      console.log('SKIP novel chapter route not discovered');
    }
  } else {
    console.log('SKIP novel route not discovered');
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('VERIFY_UI_POLISH_FAILED');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('VERIFY_UI_POLISH_OK');
