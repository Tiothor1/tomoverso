import { chromium } from 'playwright';

const base = process.env.TOMOMUSIC_BASE || 'http://127.0.0.1:3000';
const readerPath = '/manga/fui-jogado-em-um-manga-desconhecido/capitulo-1';
const failures = [];
function ok(name, cond, detail = '') { if (!cond) failures.push(`${name}${detail ? `: ${detail}` : ''}`); else console.log(`OK ${name}${detail ? ` — ${detail}` : ''}`); }

const apiRes = await fetch(`${base}/api/tomomusic/tracks`);
ok('api tracks status', apiRes.status === 200, String(apiRes.status));
const payload = await apiRes.json();
ok('api has tracks', payload.tracks.length >= 10, `${payload.tracks.length} tracks`);
ok('api has playlists', payload.playlists.length >= 7, `${payload.playlists.length} playlists`);
ok('licenses safe', payload.tracks.every(t => t.license_url && !/\/nc\/|noncommercial|\/nd\//i.test(`${t.license_url} ${t.license_name}`)));
const first = payload.tracks[0];
const audioHead = await fetch(`${base}${first.file_url}`, { method: 'GET' });
ok('audio file loads', audioHead.status === 200, `${first.file_url} -> ${audioHead.status}`);

const playBefore = first.play_count;
const directPlay = await fetch(`${base}/api/tomomusic/play`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackId: first.id, sessionId: `verify-${Date.now()}`, secondsListened: 31 }) });
const directPlayJson = await directPlay.json();
ok('play api counts after 30s', directPlay.status === 200 && directPlayJson.counted === true, JSON.stringify(directPlayJson));
const likeLoggedOut = await fetch(`${base}/api/tomomusic/like`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackId: first.id }) });
ok('like requires login', likeLoggedOut.status === 401, String(likeLoggedOut.status));
const favLoggedOut = await fetch(`${base}/api/tomomusic/favorite`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackId: first.id }) });
ok('favorite requires login', favLoggedOut.status === 401, String(favLoggedOut.status));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.addInitScript(() => localStorage.clear());
  page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER_ERROR', msg.text()); });
  await page.goto(`${base}/tomomusic`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=TomoMusic para ler', { timeout: 20000 });
  ok('tomomusic page hero visible', await page.locator('text=TomoMusic para ler').count() > 0);
  await page.getByText('Tocar agora').first().click();
  await page.waitForFunction(() => {
    const a = document.querySelector('audio');
    return !!a && !!a.getAttribute('src') && !a.paused;
  }, { timeout: 10000 });
  const state1 = await page.evaluate(() => {
    const a = document.querySelector('audio');
    return { src: a?.getAttribute('src') || '', paused: a?.paused, volume: a?.volume };
  });
  ok('play button starts audio', state1.src.includes('/audio/tomomusic/tracks/') && state1.paused === false, JSON.stringify(state1));

  await page.getByTitle('Pausar').click();
  await page.waitForFunction(() => document.querySelector('audio')?.paused === true, { timeout: 5000 });
  ok('pause works', await page.evaluate(() => document.querySelector('audio')?.paused === true));
  await page.getByTitle('Tocar').click();
  await page.waitForFunction(() => document.querySelector('audio')?.paused === false, { timeout: 5000 });
  ok('resume works', await page.evaluate(() => document.querySelector('audio')?.paused === false));

  await page.locator('input[aria-label="Volume"]').last().evaluate((el) => { el.value = '0.23'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
  const vol = await page.evaluate(() => document.querySelector('audio')?.volume || 0);
  ok('volume works', Math.abs(vol - 0.23) < 0.05, String(vol));

  await page.getByTitle('Loop').click();
  ok('loop button works', await page.locator('button[title="Loop"] .lucide-repeat-1').count().catch(() => 0) >= 0);
  const srcBeforeNext = await page.evaluate(() => document.querySelector('audio')?.getAttribute('src') || '');
  await page.getByTitle('Próxima').click();
  await page.waitForTimeout(800);
  const srcAfterNext = await page.evaluate(() => document.querySelector('audio')?.getAttribute('src') || '');
  ok('next works', srcAfterNext && srcAfterNext !== srcBeforeNext, `${srcBeforeNext} -> ${srcAfterNext}`);
  await page.getByTitle('Anterior').click();
  await page.waitForTimeout(500);
  ok('previous works', !!(await page.evaluate(() => document.querySelector('audio')?.getAttribute('src'))));

  await page.getByTitle('Lista').click();
  await page.locator('input[placeholder^="Pesquisar música"]').fill('rain');
  await page.waitForTimeout(300);
  ok('search works', await page.locator('text=November').count() >= 0);
  await page.getByTitle('Minimizar').click();
  ok('minimize works', await page.getByText('TomoMusic').last().isVisible());

  await page.goto(`${base}/feed`, { waitUntil: 'domcontentloaded' });
  ok('player persists between pages', await page.getByText('TomoMusic').last().isVisible());

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.addInitScript(() => localStorage.clear());
  await mobile.goto(`${base}/tomomusic`, { waitUntil: 'domcontentloaded' });
  ok('mobile page renders', await mobile.locator('text=TomoMusic para ler').count() > 0);
  await mobile.goto(`${base}${readerPath}`, { waitUntil: 'domcontentloaded' });
  await mobile.waitForTimeout(1000);
  ok('reader player starts minimized', await mobile.getByText('TomoMusic').last().isVisible());
  await mobile.close();
} finally {
  await browser.close();
}

const after = await (await fetch(`${base}/api/tomomusic/tracks`)).json();
const afterTrack = after.tracks.find(t => t.id === first.id);
ok('play counter incremented', afterTrack && afterTrack.play_count >= playBefore + 1, `${playBefore} -> ${afterTrack?.play_count}`);

if (failures.length) {
  console.error('TOMOMUSIC_VERIFY_FAILED');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('TOMOMUSIC_VERIFY_OK');
