# Tomoverso

Plataforma brasileira de **Light Novels** — onde autores iniciantes e leitores apaixonados se encontram.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui**
- **SQLite** (better-sqlite3) — banco local persistente
- **Auth próprio** com bcrypt + JWT em cookie httpOnly
- **Vercel** pra deploy + Cron jobs
- **Sistema de ingestão automático** de fontes externas (VNDB, JIKAN, ...)

## Funcionalidades

- 📚 **Catálogo** com 1000+ novels (visual novels, light novels, web novels) de fontes públicas
- ⚡ **Ingestão automática**: cron semanal + diário, painel admin pra forçar sync manual
- ✍️ **Painel do autor** — criar/editar novels e capítulos
- 💬 **Sistema de comentários** persistente
- ❤️ **Likes, bookmarks, favoritos, follows** — tudo no DB
- 📊 **Reading progress** — "continue de onde parou"
- 🔍 **Busca fuzzy** com Fuse.js
- ⚡ **Command Palette** (Cmd+K)
- 🎨 **3 paletas de cor** + dark/light mode
- 👑 **Painel admin** (`/admin`) — gestão de usuários, novels, reports
- 📥 **Painel de importações** (`/admin/imports`) — gerenciar fontes externas, ver logs, forçar sync
- 🛠 **API REST** completa

## Setup local

```bash
npm install
npm run migrate                  # Cria tabelas de ingestão (idempotente)
npm run dev
# abre http://localhost:3000
```

Na primeira vez, o banco é auto-populado com admin + 3 novels.

## Credenciais do admin (criado pelo seed)

- **Username:** `fabio_tx`
- **Email:** `fabio@tomoverso.com`
- **Senha:** `tomoverso2026`

## Sistema de ingestão

Para importar novels de fontes externas (VNDB, JIKAN, ...) e configurar atualizações automáticas, veja **[INGEST.md](./INGEST.md)**.

**TL;DR:**

```bash
# Import inicial (top 500 de cada fonte)
npm run import:vndb -- --limit=500
npm run import:jikan -- --limit=500

# Cron jobs (configurados em vercel.json)
# - Quinta 03:00 UTC: sync-weekly (atualiza metadados)
# - Diário 06:00 UTC: sync-chapters (heartbeat)
```

Requer env var `CRON_SECRET` configurada no Vercel.

## Estrutura

```
src/
├── app/                       # páginas (App Router)
│   ├── auth/                  # login/signup
│   ├── admin/                 # painel admin + importações
│   ├── dashboard/             # painel do autor
│   ├── library/               # estante do leitor
│   ├── novels/                # páginas de novels/capítulos
│   └── api/
│       ├── cron/              # endpoints de cron jobs
│       └── ...
├── components/                # componentes UI
└── lib/
    ├── db.ts                  # SQLite + schema + auto-seed
    ├── auth.ts                # JWT + bcrypt + sessions
    ├── actions/               # server actions
    └── ingest/                # sistema de ingestão
        ├── types.ts
        ├── http-client.ts
        ├── rate-limiter.ts
        ├── logger.ts
        ├── upserter.ts
        ├── run-sync.ts
        └── adapters/          # VNDB, JIKAN, futuras fontes

scripts/
├── migrate.ts                 # runner de migrations
├── migrations/                # migrations versionadas
├── import-vndb.ts             # CLI de import VNDB
├── import-jikan.ts            # CLI de import JIKAN
├── test-*.ts                  # smoke tests
└── validate-*.ts              # scripts de validação
```

## Importante sobre o banco em produção

No **Vercel**, o SQLite roda em `/tmp` que é **volátil** (limpa entre cold starts). Pra MVP serve perfeitamente. Pra escalar, migrar pra:
- **Turso** (SQLite hospedado) — recomendado, free tier 1GB
- **Vercel Postgres** (Neon)
- **Supabase**

Veja INGEST.md para mais detalhes.

## Deploy

Push pra `main` → Vercel auto-deploya.

```bash
git push origin main
```

## Licença

MIT
