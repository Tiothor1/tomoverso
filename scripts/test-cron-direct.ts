// Teste direto - chama os handlers dos cron routes com mock request
import { GET as weeklyGET } from "../src/app/api/cron/sync-weekly/route";
import { GET as chaptersGET } from "../src/app/api/cron/sync-chapters/route";

const SECRET="cron-secret-abc-123";
process.env.CRON_SECRET=SECRET;

async function main() {
  console.log("\n=== Test 1: sem auth (esperado 401) ===");
  const r1 = await weeklyGET(new Request("http://localhost/api/cron/sync-weekly"));
  console.log("Status:", r1.status);
  console.log("Body:", await r1.text());

  console.log("\n=== Test 2: auth errado (esperado 401) ===");
  const r2 = await weeklyGET(new Request("http://localhost/api/cron/sync-weekly", {
    headers: { authorization: "Bearer wrong-secret" }
  }));
  console.log("Status:", r2.status);

  console.log("\n=== Test 3: auth correto - sync-weekly ===");
  const r3 = await weeklyGET(new Request("http://localhost/api/cron/sync-weekly", {
    headers: { authorization: `Bearer ${SECRET}` }
  }));
  console.log("Status:", r3.status);
  const body3 = await r3.text();
  console.log("Body (primeiros 800 chars):");
  console.log(body3.length > 800 ? body3.slice(0, 800) + "..." : body3);

  console.log("\n=== Test 4: auth correto - sync-chapters (heartbeat) ===");
  const r4 = await chaptersGET(new Request("http://localhost/api/cron/sync-chapters", {
    headers: { authorization: `Bearer ${SECRET}` }
  }));
  console.log("Status:", r4.status);
  const body4 = await r4.text();
  console.log("Body:");
  console.log(body4.length > 800 ? body4.slice(0, 800) + "..." : body4);
}

main().catch(e => { console.error("ERRO:", e); process.exit(1); });
