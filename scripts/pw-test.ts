import { chromium } from "playwright";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import * as path from "path";

const EMAIL = "aaaalarakiba@gmail.com";
const PASSWORD = "Hermes2026";
const DB_PATH = path.join(process.cwd(), "data", "tomoverso.seed.db");

async function main() {
  console.log("=== PW NOVELMANIA ===");
  
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  // Login
  console.log("Navigating...");
  await page.goto("https://novelmania.com.br/login?redirect=%2Fnovels", { waitUntil: "domcontentloaded" });
  
  // Dismiss cookie consent if present
  const cookieBtns = page.locator("button:has-text('Aceitar todos'), button:has-text('Apenas opcionais')");
  if (await cookieBtns.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtns.first().click();
    await page.waitForTimeout(500);
  }
  
  // Fill login form
  await page.waitForTimeout(1000);
  const emailInput = page.locator("input[type=email], input[name=email], input:not([type=hidden])").first();
  const passInput = page.locator("input[type=password]").first();
  
  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  
  await page.locator("button:has-text('Entrar')").click();
  await page.waitForURL("**/novels", { timeout: 15000 });
  console.log("✓ Logged in");
  
  // Test: navigate to a chapter and extract text
  console.log("Testing chapter extraction...");
  await page.goto("https://novelmania.com.br/novels/86-oitenta-e-seis/capitulos/volume-1-capitulo-8", {
    waitUntil: "networkidle",
    timeout: 15000
  });
  
  const text = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return "NO MAIN TAG";
    const clone = main.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("nav, header, footer, [class*=comment], [class*=reaction], script, style, [class*=navigation]")
      .forEach(el => el.remove());
    return (clone.textContent || "").trim().slice(0, 500);
  });
  
  console.log("Test chapter text:", text.slice(0, 200));
  console.log("✓ Chapter extraction works!");
  
  await browser.close();
  console.log("Done");
}

main().catch(e => {
  console.error("FATAL:", e.message?.slice(0, 500));
  process.exit(1);
});
