import { chromium } from "playwright";
import Database = require("better-sqlite3");

const baseURL = "http://localhost:3010";
const stamp = Date.now();
const username = `e2eauth${stamp}`;
const email = `${username}@example.com`;
const password = "SenhaE2E123";

async function expectHeading(page: any, pattern: RegExp) {
  await page.waitForFunction(
    (source: string) => new RegExp(source, "i").test(document.body.innerText),
    pattern.source,
    { timeout: 15000 }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseURL}/auth/signup`, { waitUntil: "networkidle" });
  await page.getByLabel("Como quer ser chamado").fill("Teste E2E");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expectHeading(page, /Olá, Teste/);

  const db = new Database("data/tomoverso.db");
  const saved = db.prepare("SELECT id,email,username,password_hash FROM users WHERE email=?").get(email) as any;
  if (!saved?.id || saved.username !== username || !String(saved.password_hash || "").startsWith("$2")) {
    throw new Error(`Usuário não salvo corretamente: ${JSON.stringify(saved)}`);
  }

  const sessionsAfterSignup = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE user_id=?").get(saved.id) as any;
  if (sessionsAfterSignup.c < 1) throw new Error("Sessão não foi criada no cadastro");

  await page.reload({ waitUntil: "networkidle" });
  await expectHeading(page, /Olá, Teste/);

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.waitForURL(baseURL + "/", { timeout: 15000 });

  await page.goto(`${baseURL}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForURL("**/auth/login", { timeout: 15000 });

  await page.getByLabel("Email ou username").fill(`@${username}`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expectHeading(page, /Olá, Teste/);

  await page.reload({ waitUntil: "networkidle" });
  await expectHeading(page, /Olá, Teste/);

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.waitForURL(baseURL + "/", { timeout: 15000 });

  await page.goto(`${baseURL}/auth/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email ou username").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expectHeading(page, /Olá, Teste/);

  console.log(JSON.stringify({ ok: true, username, email, saved: true, signupSessionCount: sessionsAfterSignup.c }));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
