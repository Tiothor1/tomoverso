import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://tomoverso.studio';
const issues = [];
const notes = [];
const tested = [];
function issue(severity, area, msg, data={}) { issues.push({ severity, area, msg, ...data }); console.error(`[${severity}] ${area}: ${msg}`); }
function note(msg) { notes.push(msg); console.log(`[note] ${msg}`); }
function ok(msg) { tested.push(msg); console.log(`[ok] ${msg}`); }

async function fetchText(path, opts={}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = await res.text().catch(() => '');
  return { url, path, status: res.status, headers: res.headers, text, ms: Date.now() - t0, location: res.headers.get('location') };
}

function visible404(text) {
  return /Página perdida|página perdida|404|not found/i.test(text) && /Voltar|início|Inicio/i.test(text);
}
function extractLinks(html) {
  const out = new Set();
  for (const m of html.matchAll(/href=["']([^"'#?]+)(?:[?#][^"']*)?["']/gi)) {
    const href = m[1];
    if (href.startsWith('/')) out.add(href.replace(/\/$/, '') || '/');
    else if (href.startsWith(BASE)) out.add(new URL(href).pathname.replace(/\/$/, '') || '/');
  }
  return [...out].filter(p => !p.startsWith('/api/') && !p.startsWith('/_next/') && !/\.(png|jpg|jpeg|webp|gif|svg|ico|css|js|mp3|woff)$/i.test(p));
}

const coreRoutes = [
  '/', '/feed', '/explore', '/catalogo', '/novels', '/manga', '/mangas', '/livros', '/tomomusic', '/musicas/creditos',
  '/loja', '/store', '/store/plans', '/publicar', '/autor-plus', '/concurso', '/sobre', '/termos', '/privacidade', '/contato',
  '/auth/login', '/auth/signup', '/search', '/how-to', '/web-novels'
];

console.log('=== policy/seo ===');
const robots = await fetchText('/robots.txt');
if (robots.status !== 200) issue('HIGH','SEO','robots.txt não retorna 200', {status: robots.status}); else ok('robots.txt 200');
if (!robots.text.includes(`${BASE}/sitemap.xml`)) issue('HIGH','SEO','robots.txt não aponta para sitemap do domínio atual'); else ok('robots sitemap domain atual');
const sitemap = await fetchText('/sitemap.xml');
if (sitemap.status !== 200) issue('HIGH','SEO','sitemap.xml não retorna 200', {status: sitemap.status}); else ok('sitemap.xml 200');
if (sitemap.text.includes('tomoversoeditora.com')) issue('HIGH','SEO','sitemap ainda contém domínio antigo'); else ok('sitemap sem domínio antigo');
if (!sitemap.text.includes(BASE)) issue('HIGH','SEO','sitemap não contém domínio atual'); else ok('sitemap com domínio atual');

const homeHead = await fetchText('/');
const requiredHeaders = ['x-content-type-options','x-frame-options','strict-transport-security','content-security-policy','referrer-policy'];
for (const h of requiredHeaders) {
  if (!homeHead.headers.get(h)) issue('HIGH','Security',`Header ausente: ${h}`); else ok(`header ${h}`);
}
const ai = await fetchText('/', { headers: { 'user-agent': 'GPTBot' }});
if (ai.status !== 403) issue('MEDIUM','Security',`AI crawler não bloqueado: ${ai.status}`); else ok('AI crawler bloqueado');
const csrf = await fetchText('/api/contact', { method:'POST', headers: { 'content-type':'application/json', origin:'https://evil.example' }, body: JSON.stringify({}) });
if (csrf.status !== 403) issue('HIGH','Security',`CSRF/origin externo não bloqueado em API mutation: ${csrf.status}`); else ok('CSRF/origin externo bloqueado');
const contactBot = await fetchText('/api/contact', { method:'POST', headers: { 'content-type':'application/json', origin:BASE }, body: JSON.stringify({ name:'Teste', email:'teste@example.com', subject:'Teste', message:'Mensagem de teste sem turnstile' }) });
if (contactBot.status !== 403) issue('MEDIUM','Abuse',`Contato sem Turnstile não bloqueado: ${contactBot.status}`); else ok('Contato sem Turnstile bloqueado');

console.log('=== route crawl ===');
let routes = new Set(coreRoutes);
for (const u of sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)) {
  try { const url = new URL(u[1]); if (url.origin === BASE) routes.add(url.pathname.replace(/\/$/, '') || '/'); } catch {}
}
// discover a few links from core pages
for (const r of coreRoutes.slice(0, 10)) {
  const res = await fetchText(r);
  for (const l of extractLinks(res.text).slice(0, 20)) routes.add(l);
}
// keep crawl bounded but broad
routes = new Set([...routes].filter(p => !p.includes('/admin-secreto')).slice(0, 90));
let badRoutes = 0;
for (const route of routes) {
  const res = await fetchText(route);
  const acceptableRedirect = [301,302,303,307,308].includes(res.status);
  if (res.status >= 500 || res.status === 404) {
    badRoutes++; issue('HIGH','Routes',`Rota problemática ${route}: HTTP ${res.status}`);
  } else if (res.status >= 400 && !acceptableRedirect && !['/dashboard','/library','/notifications'].includes(route)) {
    badRoutes++; issue('MEDIUM','Routes',`Rota pública retornou ${res.status}: ${route}`);
  }
}
if (!badRoutes) ok(`crawl HTTP sem 404/500 em ${routes.size} rotas`);

console.log('=== APIs ===');
const apiExpect = [
  ['/api/tomomusic/tracks', 200],
  ['/api/search?q=tomoverso', 200],
  ['/api/notifications', [200,401]],
  ['/api/user/works-count', [200,401]],
];
for (const [path, expected] of apiExpect) {
  const res = await fetchText(path);
  const exps = Array.isArray(expected) ? expected : [expected];
  if (!exps.includes(res.status)) issue('MEDIUM','API',`${path} retornou ${res.status}, esperado ${exps.join('/')}`); else ok(`${path} ${res.status}`);
}
const tracks = await (await fetch(`${BASE}/api/tomomusic/tracks`)).json();
if (!tracks?.tracks || tracks.tracks.length < 120) issue('MEDIUM','TomoMusic',`Poucas músicas na API: ${tracks?.tracks?.length || 0}`); else ok(`TomoMusic API ${tracks.tracks.length} faixas`);
if (tracks.tracks?.some(t => !t.license_url || !t.source_url)) issue('HIGH','Legal','TomoMusic tem faixa sem licença/fonte'); else ok('TomoMusic licenças/fontes presentes');

console.log('=== browser smoke ===');
const browser = await chromium.launch({ headless: true });
const pageErrors = [];
async function testPage(path, viewport={width:1366,height:900}, interactions=async()=>{}) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600 });
  const consoleErrors = [];
  page.on('console', msg => { if (['error'].includes(msg.type())) consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  const resp = await page.goto(`${BASE}${path}`, { waitUntil:'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(900);
  const text = await page.locator('body').innerText().catch(()=>'');
  if (!resp || resp.status() >= 500) issue('HIGH','Browser',`${path} status ${resp?.status()}`);
  if (/Página perdida/i.test(text)) issue('HIGH','Browser',`${path} renderizou página perdida`);
  await interactions(page, text);
  if (consoleErrors.some(e => !/favicon|ResizeObserver|Failed to load resource.*(ads|googlesyndication)|Cloudflare Turnstile.*110200|server responded with a status of 400/i.test(e))) {
    pageErrors.push({path, consoleErrors});
    issue('MEDIUM','Console',`${path} console errors: ${consoleErrors.slice(0,2).join(' | ')}`);
  } else ok(`browser ${path} ${viewport.width}w`);
  await page.close();
}
await testPage('/', {width:1366,height:900}, async (page, text) => {
  if (!/Tomo|novel|mang/i.test(text)) issue('HIGH','Home','Home sem conteúdo esperado');
});
await testPage('/tomomusic', {width:390,height:844}, async (page, text) => {
  if (/\b\d+(?:[,.]\d+)?\s*MB\b|músicas ativas/i.test(text)) issue('LOW','UX','TomoMusic ainda mostra MB ou músicas ativas');
  await page.locator('button[title^="Tocar"]').first().click();
  await page.waitForTimeout(1200);
  const box = await page.locator('section[aria-label="TomoMusic player global"]').boundingBox();
  if (!box || box.height > 240 || box.width > 380) issue('MEDIUM','UX',`Player TomoMusic grande no mobile: ${box?.width}x${box?.height}`); else ok(`TomoMusic player compacto mobile ${Math.round(box.width)}x${Math.round(box.height)}`);
});
await testPage('/manga/fui-jogado-em-um-manga-desconhecido/capitulo-1', {width:390,height:844}, async (page) => {
  if (await page.locator('button[title="Esconder barra"]').count() < 1) issue('MEDIUM','Reader','Leitor mangá sem setinha lateral');
  else { await page.locator('button[title="Esconder barra"]').first().click(); await page.waitForTimeout(300); if (await page.locator('button[title="Mostrar barra"]').count() < 1) issue('MEDIUM','Reader','Setinha do mangá não reabre/fecha'); else ok('lateral mangá esconde'); }
});
await testPage('/novels', {width:390,height:844}, async (page, text) => {
  if (!/novel|capítulo|leitura/i.test(text)) issue('MEDIUM','Novels','/novels sem conteúdo esperado');
});
await testPage('/auth/login', {width:390,height:844}, async (page, text) => {
  if (/Muitas tentativas|error/i.test(text) && !/entrar|login/i.test(text)) issue('HIGH','Auth','Login GET parece rate-limited ou quebrado');
});
await testPage('/contato', {width:390,height:844}, async (page, text) => {
  if (!/contato|mensagem|email|e-mail/i.test(text)) issue('MEDIUM','Contato','Página contato sem formulário/texto esperado');
});
await browser.close();

console.log('=== summary ===');
console.log(JSON.stringify({ tested: tested.length, issues }, null, 2));
if (issues.some(i => ['HIGH','CRITICAL'].includes(i.severity))) process.exit(2);
if (issues.length) process.exit(1);
console.log('LAUNCH_AUDIT_OK');
