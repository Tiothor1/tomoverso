# 📥 Sistema de Ingestão — Tomoverso

> Como importar novels de fontes externas, manter o catálogo atualizado automaticamente e adicionar novas fontes.

## Sumário

1. [Visão geral](#visão-geral)
2. [Fontes suportadas](#fontes-suportadas)
3. [Importação inicial (CLI)](#importação-inicial-cli)
4. [Sincronização automática (Cron)](#sincronização-automática-cron)
5. [Painel admin de importações](#painel-admin-de-importações)
6. [Adicionar uma nova fonte](#adicionar-uma-nova-fonte)
7. [Schema do banco (tabelas de ingestão)](#schema-do-banco-tabelas-de-ingestão)
8. [Troubleshooting](#troubleshooting)
9. [Comandos úteis](#comandos-úteis)

---

## Visão geral

O sistema de ingestão importa metadados de novels de fontes externas (APIs públicas) e mantém o catálogo atualizado automaticamente.

**Características:**
- ✅ Múltiplas fontes (VNDB, JIKAN, futuras: Royal Road, AniList, MangaDex)
- ✅ Deduplicação automática (mesma obra em fontes diferentes → uma única entrada)
- ✅ Logs persistidos em `sync_runs` + `sync_errors`
- ✅ Cron semanal (toda quinta 03:00 UTC) + diário (06:00 UTC)
- ✅ Painel admin pra forçar sync e ver erros
- ✅ Idempotência (rodar várias vezes não duplica)

**O que NÃO é importado:**
- ❌ Texto completo dos capítulos (risco de ToS)
- ❌ Capas baixadas localmente (URL externa é mantida)
- ❌ Dados de fontes não-oficiais / scraping sem API

---

## Fontes suportadas

| Fonte | Tipo | Auth | Rate | Cobertura |
|---|---|---|---|---|
| **VNDB** ([api.vndb.org/kana](https://api.vndb.org/kana)) | Visual novels | Sem auth | 5 req/s | ~500 VNs top |
| **JIKAN / MAL** ([jikan.moe](https://jikan.moe)) | Light novels + novels | Sem auth | 2 req/s | ~500 LNs + novels top |
| **MangaDex** ([api.mangadex.org](https://api.mangadex.org)) | Manga + Light novels (tagged) | Sem auth | 5 req/s | ~500 top por popularity |
| **AniList** ([graphql.anilist.co](https://graphql.anilist.co)) | Light novels | API key opcional (recomendado) | 2 req/s (sem auth) / ~5 (com auth) | ~300 top por popularity |
| Royal Road | Webnovels EN | API descontinuada 2024 | (N/A) | — |

Para adicionar uma fonte nova, veja [Adicionar uma nova fonte](#adicionar-uma-nova-fonte).

---

## Importação inicial (CLI)

### Setup

```bash
cd D:\Site-LN
npm install
# Garante que o DB tem as tabelas de ingestão
npm run migrate
```

### Importar VNDB (visual novels)

```bash
# Top 500 VNs por votecount (~10s)
npm run import:vndb -- --limit=500

# Top 2000 VNs (~30s)
npm run import:vndb -- --limit=2000

# Customizado: top 100 com páginas de 50
npm run import:vndb -- --limit=100 --page-size=50
```

### Importar JIKAN (light novels + novels)

```bash
# Top 500 (light novels + novels, padrão)
npm run import:jikan -- --limit=500

# Só light novels
npm run import:jikan -- --limit=300 --type=lightnovel

# Só novels (web novels)
npm run import:jikan -- --limit=300 --type=novel
```

### Importar MangaDex (manga + light novels)

```bash
# Top 500 por popularidade (followedCount)
npm run import:mangadex -- --limit=500

# Apenas 100 (teste rápido)
npm run import:mangadex -- --limit=100
```

NOTA: MangaDex classifica a maioria dos títulos como `web-novel` por padrão. Títulos com tag "Light Novel" são classificados como `light-novel`.

### Importar AniList (light novels)

```bash
# Top 300 por popularidade (6 páginas de 50)
npm run import:anilist -- --limit=300

# Sem ANILIST_TOKEN = 90 req/min (~1.5 req/s, mais lento)
# Com ANILIST_TOKEN = rate-limit maior

# Pra ter token: https://anilist.co/settings/developer (free)
export ANILIST_TOKEN=*** tsx scripts/import-anilist.ts --limit=500
```

### O que acontece durante o import

1. **Adapter** busca a página de obras da API externa (rate-limit respeitado)
2. **Para cada obra**: `upsertNovel()` decide se é nova, atualização, ou duplicata
3. **Logging**: cada execução vira 1 linha em `sync_runs`, cada erro em `sync_errors`
4. **Source registration**: 1ª execução registra a fonte em `sources` automaticamente

### Como saber se funcionou

```bash
# Stats rápidos
npx tsx scripts/final-summary.ts

# Logs detalhados
sqlite3 data/tomoverso.db "SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 5"
sqlite3 data/tomoverso.db "SELECT * FROM sync_errors ORDER BY created_at DESC LIMIT 10"
```

---

## Sincronização automática (Cron)

### Configuração no Vercel

Os cron jobs são declarados em `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/sync-chapters", "schedule": "0 6 * * *" },     // diário 03:00 BRT
    { "path": "/api/cron/sync-weekly",   "schedule": "0 3 * * 4" }      // quinta 00:00 BRT
  ]
}
```

Para ativar no deploy:

1. **Push pro GitHub** (Vercel já conectado)
2. **Adicionar env var** `CRON_SECRET` no painel Vercel (Settings → Environment Variables):
   ```
   CRON_SECRET = <gere-um-token-aleatório-forte>
   ```
3. Vercel vai disparar automaticamente os crons

### O que cada cron faz

**`/api/cron/sync-chapters` (diário):**
- Heartbeat: registra que cada fonte foi checada
- Atualiza `sources.last_run_at`
- Loga em `sync_runs` com `mode="daily"`
- Quando tivermos fontes com capítulos (LN), vai detectar novos volumes/capítulos

**`/api/cron/sync-weekly` (semanal):**
- Para cada fonte habilitada (`sources.enabled = 1`):
  - Importa top 200 obras por score/popularidade
  - Atualiza metadados (capa, sinopse, status, score)
- Loga em `sync_runs` com `mode="weekly"`

### Autenticação

Os endpoints exigem header:
```
Authorization: Bearer <CRON_SECRET>
```

Vercel adiciona isso automaticamente. Se você chamar manualmente:

```bash
# Teste local (dev server com CRON_SECRET=mysecret)
curl -H "Authorization: Bearer mysecret" \
  http://localhost:3000/api/cron/sync-weekly
```

Resposta esperada:
```json
{
  "ok": true,
  "message": "Sync semanal concluído",
  "duration_ms": 1704,
  "sources_run": 1,
  "totals": { "imported": 0, "updated": 200, "failed": 0 }
}
```

### Limites

- **Vercel Hobby**: 10s timeout (suficiente pra 200 itens em ~3s)
- **Vercel Pro**: 60s timeout (~1000+ itens)
- Para imports grandes (>1000), use o CLI em vez do cron

---

## Painel admin de importações

Acesse `/admin/imports` (requer login como admin).

**Funcionalidades:**
- 📊 **Stats globais**: total de novels, importados de APIs, runs na semana, erros
- 🗄 **Cards por fonte**: status atual, contadores, badge, link pra API
- ⚡ **Botão "Sync 100"**: dispara sync manual de 100 itens dessa fonte
- 🔘 **Botão Power**: habilita/desabilita fonte (desabilitada = cron ignora)
- 📈 **Lista das últimas 20 runs** com cores por status
- ⚠️ **Lista dos últimos 30 erros** com botão "Dispensar"
- 💡 **Comandos CLI úteis** no rodapé

**Quando usar:**
- Sync manual de uma fonte específica (botão "Sync 100")
- Investigar erros (lista de erros + dispensar)
- Ver contadores e status sem entrar no DB
- Habilitar/desabilitar fonte temporariamente

---

## Adicionar uma nova fonte

### Passo a passo

**1. Criar o adapter**

Crie `src/lib/ingest/adapters/<nome>.ts`:

```typescript
import type { ExternalSource, ExternalNovel, ExternalPage } from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

export class MeuAdapter implements ExternalSource {
  readonly name = "meu_adapter"; // usado em novels.source
  readonly displayName = "Meu Adapter";
  readonly type = "api" as const;
  readonly baseUrl = "https://api.example.com";
  readonly rateLimitPerSec = 3; // respeite o rate-limit da API
  readonly userAgent = "Tomoverso-Ingest/1.0 (...)";

  private client = new HttpClient({ userAgent: this.userAgent, /* ... */ });
  private bucket = getBucket("meu_adapter", this.rateLimitPerSec, this.rateLimitPerSec);

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    // Implementar paginação
    // - Converter response da API → ExternalNovel[]
    // - Retornar { items, nextCursor, total }
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    // Fetch individual
  }
}
```

**2. Registrar no registry**

Edite `src/lib/ingest/adapters/index.ts`:

```typescript
import { MeuAdapter } from "./meu_adapter";

const adapters: Record<string, () => ExternalSource> = {
  vndb: () => new VndbAdapter(),
  jikan: () => new JikanAdapter(),
  meu_adapter: () => new MeuAdapter(),  // <-- adicionar
};
```

**3. Criar script de import (opcional mas recomendado)**

Copie `scripts/import-vndb.ts` → `scripts/import-meu.ts` e ajuste args + filter.

**4. Adicionar script no package.json**

```json
"scripts": {
  "import:meu": "tsx scripts/import-meu.ts"
}
```

**5. Testar**

```bash
# Smoke test rápido
npx tsx scripts/test-meu.ts

# Import pequeno (10 itens) pra validar end-to-end
npx tsx scripts/import-meu.ts --limit=10

# Verificar DB
sqlite3 data/tomoverso.db "SELECT id, slug, title, source, external_score FROM novels WHERE source='meu_adapter' LIMIT 10"

# Ver painel admin (deve aparecer o card da nova fonte)
# Iniciar dev: npm run dev, abrir http://localhost:3000/admin/imports
```

**6. Deploy**

Push pra `main`. O cron semanal (`/api/cron/sync-weekly`) vai automaticamente incluir a nova fonte (se estiver habilitada).

---

## Schema do banco (tabelas de ingestão)

### `sources`
Registro das fontes externas.

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- "vndb", "jikan", etc.
  display_name TEXT NOT NULL,
  type TEXT CHECK (type IN ('api', 'scrape')),
  base_url TEXT,
  rate_limit_per_sec REAL,
  enabled INTEGER DEFAULT 1,            -- 1 = participa do cron
  last_run_at TEXT,
  last_run_status TEXT,                 -- success | partial | failed
  config TEXT DEFAULT '{}'              -- JSON livre
);
```

### `source_links`
Mapeamento fonte ↔ obra (deduplicação).

```sql
CREATE TABLE source_links (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL,               -- FK novels.id
  source_id TEXT NOT NULL,              -- FK sources.id
  external_id TEXT NOT NULL,            -- ID da obra na fonte externa
  external_url TEXT,
  match_confidence REAL DEFAULT 1.0,    -- 1.0 = match exato, 0.85 = match heurístico
  last_synced_at TEXT,
  UNIQUE (source_id, external_id)
);
```

### `sync_runs`
Log de cada execução de sincronização.

```sql
CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  source_name TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('initial', 'weekly', 'daily', 'manual')),
  status TEXT CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  items_found INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,      -- duplicatas
  items_failed INTEGER DEFAULT 0
);
```

### `sync_errors`
Erros individuais por run.

```sql
CREATE TABLE sync_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,                 -- FK sync_runs.id
  external_id TEXT,                     -- ID na fonte externa (se conhecido)
  error_type TEXT,                      -- ex: "UpsertError", "NetworkError"
  error_message TEXT,
  stack_trace TEXT,
  context TEXT                          -- JSON com info adicional
);
```

### Colunas adicionadas em `novels`

```sql
ALTER TABLE novels ADD COLUMN source TEXT;
ALTER TABLE novels ADD COLUMN source_id TEXT;
ALTER TABLE novels ADD COLUMN source_url TEXT;
ALTER TABLE novels ADD COLUMN last_synced_at TEXT;
ALTER TABLE novels ADD COLUMN cover_source_url TEXT;
ALTER TABLE novels ADD COLUMN cover_local_path TEXT;
ALTER TABLE novels ADD COLUMN external_score REAL;
ALTER TABLE novels ADD COLUMN ...
-- E o CHECK de type foi expandido pra incluir 'visual-novel':
CHECK (type IN ('light-novel', 'web-novel', 'short', 'visual-novel'))
```

---

## Troubleshooting

### Cron retorna 401 Unauthorized

- O `CRON_SECRET` não está configurado no Vercel, OU
- O valor no `.env` local não bate com o do header

**Solução:**
```bash
# Verificar local
echo $CRON_SECRET

# Verificar Vercel: Dashboard → Settings → Environment Variables
```

### Cron retorna 500 ou timeout

- A fonte demorou demais (>10s Hobby / >60s Pro)
- API externa está fora do ar

**Solução:**
1. Veja os logs em `/admin/imports` (painel admin → aba "Erros")
2. Reduza o `limit` (e.g., 200 → 50)
3. Tente de novo — pode ser transient

### Import CLI não grava no DB

- WAL mode: o SQLite pode ter transações pendentes. Tente:
  ```bash
  sqlite3 data/tomoverso.db ".timeout 5000" "PRAGMA wal_checkpoint(TRUNCATE);"
  ```
- Permissões do diretório `data/`
- Conflito de schema (rode `npm run migrate`)

### Capa não aparece

- A URL externa é mantida (não fazemos download). Se a URL da API externa quebrar, a capa quebra.
- VNDB: URLs em `https://***.vndb.org/...` podem mudar.
- JIKAN: URLs em `https://cdn.myanimelist.net/...` são estáveis.
- **Solução**: futuro — usar Vercel Blob pra cachear capas localmente.

### Duplicatas aparecem no catálogo

- Deduplicação é por título normalizado (heurístico)
- Pode falhar com grafias muito diferentes entre fontes

**Solução:**
1. Veja `source_links` no DB pra ver os mapeamentos
2. Use a flag `match_confidence` (<1.0 indica match heurístico)
3. Merge manual via painel admin (a implementar)

### Banco de produção está vazio após deploy

- SQLite em `/tmp` no Vercel é volátil entre cold starts
- **Solução definitiva**: migrar pra Turso ou Vercel Postgres

---

## Comandos úteis

```bash
# Migrations
npm run migrate                  # Aplica migrations pendentes
npm run migrate:status           # Vê o que já foi aplicado
npm run migrate:down             # Reverte última migration

# Imports
npm run import:vndb -- --limit=500
npm run import:jikan -- --limit=500 --type=both
npm run import:mangadex -- --limit=500
npm run import:anilist -- --limit=300

# Repair
npx tsx scripts/repair-md-covers.ts    # Recupera capas faltantes de Mangas antigos

# Validação
npx tsx scripts/validate-db.ts          # Estrutura do DB
npx tsx scripts/final-summary.ts        # Stats gerais
npx tsx scripts/validate-import.ts     # Stats pós-import
npx tsx scripts/verify-admin-data.ts   # Estado das fontes

# DB queries úteis (sqlite3)
sqlite3 data/tomoverso.db "SELECT COUNT(*) FROM novels"
sqlite3 data/tomoverso.db "SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 5"
sqlite3 data/tomoverso.db "SELECT source, COUNT(*) FROM novels GROUP BY source"
sqlite3 data/tomoverso.db "SELECT * FROM sync_errors ORDER BY created_at DESC LIMIT 10"

# Dev
npm run dev                       # Dev server
npm run build                     # Build de produção
```

---

## Roadmap

- [ ] Scribble Hub adapter (webnovels EN)
- [ ] Syosetu / Kakuyomu adapter (JP web novels)
- [ ] Capa cache local (Vercel Blob)
- [ ] Detecção automática de novos capítulos (LN)
- [ ] Merge manual via painel admin
- [ ] Estatísticas de crescimento por semana
- [ ] Migração para Turso (SQLite serverless) ou Postgres

---

**Última atualização:** 2026-06-21
**Versão:** 1.0
