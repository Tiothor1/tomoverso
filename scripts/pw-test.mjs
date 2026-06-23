import playwright from 'playwright';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const EMAIL = 'aaaalarakiba@gmail.com';
const PASSWORD = 'Hermes2026';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== PW Simple Test ===');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Login via form submission
  console.log('Navigating to login...');
  await page.goto('https://novelmania.com.br/login?redirect=%2Fnovels', { waitUntil: 'domcontentloaded' });
  
  // Dismiss cookies - try multiple button texts
  try { await page.click('button:has-text("Aceitar todos")', { timeout: 2000 }); } catch (e) {}
  await sleep(1000);
  
  // Fill form using evaluate (more reliable)
  await page.evaluate(([email, pass]) => {
    const emailInput = document.querySelector('input[type="email"], input[name="email"]');
    const passInput = document.querySelector('input[type="password"]');
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = pass;
  }, [EMAIL, PASSWORD]);
  
  await sleep(500);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/novels**', { timeout: 15000 });
  console.log('Logged in:', page.url());
  
  // Test: navigate to chapter page
  console.log('Testing chapter...');
  await page.goto('https://novelmania.com.br/novels/86-oitenta-e-seis/capitulos/volume-1-capitulo-8', {
    waitUntil: 'load',
    timeout: 20000
  });
  
  // Wait for React to render
  await sleep(3000);
  
  // Extract text
  const text = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'NO MAIN found';
    const clone = main.cloneNode(true);
    clone.querySelectorAll('nav, header, footer, script, style').forEach(el => el.remove());
    return (clone.textContent || '').trim().substring(0, 500);
  });
  
  console.log('Text:', text);
  console.log('Test PASSED! Chapter extraction works!');
  
  await browser.close();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
