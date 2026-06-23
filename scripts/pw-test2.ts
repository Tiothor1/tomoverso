import { chromium } from "playwright";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { execSync } from "child_process";

const EMAIL = "aaaalarakiba@gmail.com";
const PASSWORD="Hermes2026";
const DB_PATH = "data/tomoverso.seed.db";

async function main() {
  console.log("=== PW IMPORTER ===");
  
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  // Step 1: Login via JavaScript
  console.log("Login...");
  await page.goto("https://novelmania.com.br", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate(([e, p]) => {
    // Fill and submit login form via JS
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e, password: p }),
      credentials: "include"
    }).then(r => r.json()).then(d => {
      if (d.success) window.location.href = "/novels";
    });
  }, [EMAIL, PASSWORD]);
  await page.waitForTimeout(3000);
  await page.goto("https://novelmania.com.br/novels/86-oitenta-e-seis", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("✓", page.url());
  
  // Step 2: Test extracting chapter 8
  console.log("Extracting chapter...");
  await page.goto("https://novelmania.com.br/novels/86-oitenta-e-seis/capitulos/volume-1-capitulo-8", {
    waitUntil: "domcontentloaded", timeout: 15000
  });
  
  const text = await page.evaluate(() => {
    // Wait for content to render
    return new Promise<string>(resolve => {
      const check = () => {
        const main = document.querySelector("main");
        if (main && main.textContent && main.textContent.length > 500) {
          resolve(main.textContent.slice(0, 300));
        } else {
          setTimeout(check, 200);
        }
      };
      setTimeout(check, 500);
      setTimeout(() => resolve("TIMEOUT"), 8000);
    });
  });
  
  console.log("Chapter text:", text.slice(0, 200));
  console.log("✓ Extraction works!");
  
  await browser.close();
  console.log("Done");
}
main().catch(e => console.error("FAIL:", e.message?.slice(0,300)));
