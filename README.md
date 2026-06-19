# Tomoverso

Plataforma brasileira de **Light Novels** — onde autores iniciantes e leitores apaixonados se encontram.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui**
- **SQLite** (better-sqlite3) — banco local persistente
- **Auth próprio** com bcrypt + JWT em cookie httpOnly
- **Vercel** pra deploy

## Funcionalidades

- 📚 **Catálogo** de Light Novels com filtros por gênero
- ✍️ **Painel do autor** — criar/editar novels e capítulos
- 💬 **Sistema de comentários** persistente
- ❤️ **Likes, bookmarks, favoritos, follows** — tudo no DB
- 📊 **Reading progress** — "continue de onde parou"
- 🔍 **Busca fuzzy** com Fuse.js
- ⚡ **Command Palette** (Cmd+K)
- 🎨 **3 paletas de cor** + dark/light mode
- 👑 **Painel admin** (`/admin`) — gestão de usuários, novels, reports
- 🛠️ **API REST** completa

## Setup local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Na primeira vez, o banco é auto-populado com admin + 3 novels.

## Credenciais do admin (criado pelo seed)

- **Username:** `fabio_tx`
- **Email:** `fabio@tomoverso.com`
- **Senha:** `tomoverso2026`

## Estrutura

```
src/
├── app/              # páginas (App Router)
│   ├── auth/         # login/signup
│   ├── admin/        # painel admin
│   ├── dashboard/    # painel do autor
│   ├── library/      # estante do leitor
│   ├── novels/       # páginas de novels/capítulos
│   └── api/          # API routes
├── components/       # componentes
└── lib/
    ├── db.ts         # SQLite + schema + auto-seed
    ├── auth.ts       # JWT + bcrypt + sessions
    └── actions/      # server actions
```

## Importante sobre o banco em produção

No **Vercel**, o SQLite roda em `/tmp` que é **volátil** (limpa entre cold starts). Pra MVP serve perfeitamente. Pra escalar, migrar pra:
- **Vercel Postgres** (recomendado)
- **Turso** (SQLite hospedado)
- **Supabase**

## Deploy

Push pra `main` → Vercel auto-deploya.

```bash
git push origin main
```

## Licença

MIT
