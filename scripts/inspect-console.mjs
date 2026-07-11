import { chromium } from 'playwright';
const BASE='https://tomoverso.studio';
const browser=await chromium.launch({headless:true});
for (const p of ['/auth/login','/contato']) {
  const page=await browser.newPage({viewport:{width:390,height:844}, isMobile:true});
  console.log('PAGE',p);
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  page.on('requestfailed', req => console.log('REQFAILED', req.method(), req.url(), req.failure()?.errorText));
  page.on('response', res => { if (res.status() >= 400) console.log('RESP', res.status(), res.url()); });
  await page.goto(BASE+p,{waitUntil:'networkidle', timeout:30000}).catch(e=>console.log('GOTOERR', e.message));
  await page.waitForTimeout(2500);
  console.log((await page.locator('body').innerText().catch(()=>'' )).slice(0,300).replace(/\s+/g,' '));
  await page.close();
}
await browser.close();
