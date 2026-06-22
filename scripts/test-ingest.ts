/**
 * Smoke test da camada de ingestão.
 *
 * Valida:
 * 1) HttpClient — bate em jsonplaceholder (API pública estável)
 * 2) TokenBucket — verifica que rate-limiting bloqueia corretamente
 * 3) SyncLogger — cria run, loga erro, finaliza; confere DB
 *
 * Rodar com: npx tsx scripts/test-ingest.ts
 */

import { HttpClient, TokenBucket, SyncLogger, upsertSource, getBucket } from "../src/lib/ingest";
import { getDb } from "../src/lib/db";

let passed = 0;
let failed = 0;
const log = (msg: string) => console.log(msg);

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  log("\n=== TESTE 1: HttpClient ===");

  const client = new HttpClient({
    userAgent: "Tomoverso-SmokeTest/1.0",
    timeoutMs: 10_000,
    maxRetries: 2,
    initialBackoffMs: 200,
    onLog: (msg, meta) => log(`    [http:${msg}] ${JSON.stringify(meta ?? {})}`),
  });

  // 1a) GET simples em jsonplaceholder
  try {
    const t0 = Date.now();
    const response = await client.get<{ id: number; title: string }>(
      "https://jsonplaceholder.typicode.com/posts/1"
    );
    check("GET jsonplaceholder/posts/1 retorna 200", response.status === 200, `status=${response.status}`);
    check("resposta tem estrutura esperada", typeof response.data.id === "number" && typeof response.data.title === "string", `id=${response.data.id} title="${response.data.title}"`);
    check("durationMs > 0", response.durationMs > 0, `${response.durationMs}ms`);
    check("attempts = 1 (sem retry)", response.attempts === 1, `attempts=${response.attempts}`);
  } catch (e: any) {
    check("GET jsonplaceholder/posts/1", false, e.message);
  }

  // 1b) POST com body
  try {
    const response = await client.post<{ id: number }>(
      "https://jsonplaceholder.typicode.com/posts",
      { title: "teste", body: "conteúdo", userId: 1 }
    );
    check("POST jsonplaceholder/posts retorna 201", response.status === 201, `status=${response.status}`);
  } catch (e: any) {
    check("POST jsonplaceholder/posts", false, e.message);
  }

  // 1c) 404 deve lançar HttpError sem retry
  try {
    await client.get("https://jsonplaceholder.typicode.com/posts/999999");
    check("404 esperado como erro", false, "não lançou exceção");
  } catch (e: any) {
    check("404 lança HttpError", e.constructor.name === "HttpError", `tipo=${e.constructor.name}`);
    check("status code = 404", e.status === 404, `status=${e.status}`);
  }

  // 1d) URL inexistente → network error → retried → falha após maxRetries
  try {
    await client.get("https://this-domain-definitely-does-not-exist-xyz123.invalid/foo", { maxRetries: 1, timeoutMs: 2000 });
    check("URL inválida falha", false, "não lançou exceção");
  } catch (e: any) {
    check("URL inválida lança erro após retries", true, `erro: ${e.code ?? e.message?.slice(0, 50)}`);
  }

  // ─────────────────────────────────────────────────────────────────

  log("\n=== TESTE 2: TokenBucket ===");

  // 2a) Bucket de 5 req/s, capacity 5 → 5 chamadas imediatas devem passar
  const bucket = new TokenBucket({ name: "test", rate: 5, capacity: 5 });
  const t0 = Date.now();
  let consecutiveImmediate = 0;
  for (let i = 0; i < 5; i++) {
    const before = Date.now();
    await bucket.acquire();
    if (Date.now() - before < 50) consecutiveImmediate++;
  }
  check("5 chamadas imediatas após capacity=5", consecutiveImmediate === 5, `${consecutiveImmediate}/5 imediatas`);

  // 2b) 6ª chamada deve bloquear ~200ms (1/5s = 200ms pra próximo token)
  const before6 = Date.now();
  await bucket.acquire();
  const wait6 = Date.now() - before6;
  check("6ª chamada bloqueia ~200ms", wait6 >= 150 && wait6 < 500, `esperou ${wait6}ms`);

  // 2c) tryAcquire sem bloqueio (consome 1 token por chamada)
  bucket.reset();
  check("tryAcquire retorna true quando há tokens", bucket.tryAcquire() === true);
  // Drena todos os tokens restantes (capacity=5, 1 já consumido → 4)
  bucket.tryAcquire(); bucket.tryAcquire(); bucket.tryAcquire(); bucket.tryAcquire();
  check("tryAcquire retorna false quando acabou", bucket.tryAcquire() === false, "0 tokens");

  // 2d) getBucket registry
  const b1 = getBucket("vndb", 5);
  const b2 = getBucket("vndb", 5); // mesma instância
  check("getBucket retorna mesma instância", b1 === b2, "registry funcionando");

  // ─────────────────────────────────────────────────────────────────

  log("\n=== TESTE 3: SyncLogger ===");

  // Registra uma source fake
  const testSourceId = "test-source-" + Date.now();
  upsertSource({
    id: testSourceId,
    name: "test-source",
    displayName: "Test Source",
    type: "api",
    baseUrl: "https://example.com",
    rateLimitPerSec: 5,
    config: { test: true },
  });
  const source = getDb().prepare("SELECT * FROM sources WHERE id = ?").get(testSourceId) as any;
  check("upsertSource criou registro", !!source, `name=${source?.name}`);

  // Cria run
  const logger = new SyncLogger({
    sourceId: testSourceId,
    sourceName: "test-source",
    mode: "manual",
    metadata: { test: true },
    consoleLogger: { info: () => {}, warn: () => {}, error: () => {} }, // silencia
  });

  logger.incFound(10);
  logger.incImported(5);
  logger.incUpdated(3);
  logger.incSkipped(1);
  logger.incFailed(0);
  logger.logError({
    externalId: "test-1",
    errorType: "NetworkError",
    error: new Error("Conexão recusada"),
    context: { url: "https://test.invalid" },
  });
  logger.logError({
    externalId: "test-2",
    error: "Erro genérico",
  });

  const summary = logger.finish();
  check("finish retorna summary", summary.status === "partial", `status=${summary.status}`);
  check("summary importa 5", summary.itemsImported === 5, `imported=${summary.itemsImported}`);
  check("summary atualiza 3", summary.itemsUpdated === 3, `updated=${summary.itemsUpdated}`);
  check("summary skipped 1", summary.itemsSkipped === 1, `skipped=${summary.itemsSkipped}`);
  check("summary failed 2", summary.itemsFailed === 2, `failed=${summary.itemsFailed}`);
  check("durationMs > 0", summary.durationMs >= 0, `${summary.durationMs}ms`);

  // Verifica no DB
  const run = getDb().prepare("SELECT * FROM sync_runs WHERE id = ?").get(summary.runId) as any;
  check("sync_runs tem registro", !!run, `status=${run?.status}`);
  check("sync_runs.status = partial", run?.status === "partial");
  check("sync_runs.items_failed = 2", run?.items_failed === 2);

  const errors = getDb().prepare("SELECT * FROM sync_errors WHERE run_id = ?").all(summary.runId) as any[];
  check("sync_errors tem 2 registros", errors.length === 2, `encontrados=${errors.length}`);
  check("erro 1 tem external_id", errors[0]?.external_id === "test-1" || errors[1]?.external_id === "test-1");
  check("erro tem stack_trace", errors.some((e) => e.stack_trace && e.stack_trace.length > 0));

  // Verifica que last_run_at da source foi atualizado
  const updatedSource = getDb().prepare("SELECT last_run_at, last_run_status FROM sources WHERE id = ?").get(testSourceId) as any;
  check("source.last_run_at atualizado", !!updatedSource?.last_run_at);
  check("source.last_run_status = partial", updatedSource?.last_run_status === "partial");

  // Limpa o teste do DB
  getDb().prepare("DELETE FROM sync_errors WHERE run_id = ?").run(summary.runId);
  getDb().prepare("DELETE FROM sync_runs WHERE id = ?").run(summary.runId);
  getDb().prepare("DELETE FROM sources WHERE id = ?").run(testSourceId);
  check("cleanup OK", true, "dados de teste removidos");

  // ─────────────────────────────────────────────────────────────────

  log("\n=== RESULTADO ===");
  log(`  Passou: ${passed}`);
  log(`  Falhou: ${failed}`);
  log(failed === 0 ? "\n  ✅ TODOS OS TESTES PASSARAM\n" : "\n  ❌ FALHAS ENCONTRADAS\n");

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
