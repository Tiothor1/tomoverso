# 🚀 HANDOFF — Tomoverso (NOVEL SITE)

> **Pra retomar:** abre o Hermes, fala "continuar com site" e o agente lê este arquivo antes de propor o próximo passo.

---

## TL;DR

- **Projeto:** Tomoverso (light novels BR)
- **Local:** `D:\Site-LN\` (nome do package = `tomoverso`)
- **Stack:** Next.js 16 + React 19 + TypeScript + Tailwind 4 + shadcn + better-sqlite3 + jose + bcryptjs + fuse.js + zod + supabase-js (preparado, não usado)
- **Repo:** `github.com/Tiothor1/tomoverso`
- **Deploy:** Vercel (push em `main` → auto-deploy)
- **Admin separado:** `D:\tomoverso-admin\` (mesmo stack, **localStorage** em vez de DB, ZIP em `D:\tomoverso-admin-final.zip`)

**Estado:** site rodando localmente, painel admin pronto, **faltando o coração do produto — conteúdo**.

---

## O que travou (lição aprendida — NÃO REPETIR)

A sessão `20260619_130708_d3fb5c` (titulo "NOVEL SITE") travou em 21/06/2026 depois do user pedir:

> *"vai ser o trabalho pesado: importar todas as novels, setar sistema de update toda quinta, só pare quando tudo estiver perfeito"*

O agente tentou aceitar a task inteira → renderer do Hermes travou com 274MB RAM e ~10min de CPU → user teve que abrir nova sessão pra pedir socorro.

**Regra de ouro pra retomar:**
- ❌ **NUNCA** aceitar "faça tudo até ficar perfeito" numa sessão só
- ✅ Quebrar em **chunks de 1 fonte por vez** (MAL → AniList → VNDB → NovelUpdates → Royal Road → LN Pub)
- ✅ Validar entre cada chunk (build OK + DB tem registros)
- ✅ Cronjob de quinta só depois que o import base estiver sólido

---

## Estado atual (verificado em 21/06/2026)

### Rotas funcionando (`src/app/`)
- **Público:** `/`, `/explore`, `/search`, `/sobre`, `/how-to`
- **Novels:** `/novels/[slug]`, `/novels/[slug]/[chapter]`
- **Autores:** `/authors/[username]`
- **Auth:** `/auth/login`, `/auth/signup`
- **Leitor:** `/library` (estante + progresso)
- **Autor:** `/dashboard`, `/dashboard/novels/new`, `/dashboard/novels/[id]/chapters/new`, `/dashboard/settings`
- **Admin:** `/admin`, `/admin-bootstrap`
- **API REST:** `/api/auth/logout`, `/api/bookmarks/[chapterId]`, `/api/comments/[chapterId]`, `/api/follow/[username]`, `/api/likes/[chapterId]`, `/api/progress`, `/api/seed`

### Banco (`D:\Site-LN\data\tomoverso.db`)
- Arquivos presentes: `tomoverso.db`, `tomoverso.db-shm`, `tomoverso.db-wal` (WAL ativo = banco em uso)
- Auto-seed na primeira execução: 1 admin + 3 novels mock
- ⚠️ **No Vercel:** SQLite roda em `/tmp` (volátil). Pra escalar: Vercel Postgres / Turso / Supabase

### Funcionalidades prontas
- [x] Auth próprio (bcrypt + JWT cookie httpOnly via jose)
- [x] CRUD novels/capítulos pelo painel do autor
- [x] Comentários persistentes
- [x] Likes, bookmarks, favoritos, follows
- [x] Reading progress ("continue de onde parou")
- [x] Busca fuzzy com Fuse.js
- [x] Command Palette (Cmd+K)
- [x] 3 paletas + dark/light
- [x] Painel admin completo (12 páginas, em `D:\tomoverso-admin\`)

### O que **falta** (o "trabalho pesado")
1. **Importador de novels existentes** de APIs externas
2. **Sistema de atualização semanal** (cronjob toda quinta)
3. **Camada de paginação/capítulos** atualizada diariamente
4. **Página de visual novels** separada (VNDB é a fonte padrão)

---

## APIs candidatas pra importar (perguntar pro user antes)

| Fonte | Tipo | Auth | Notas |
|---|---|---|---|
| **MyAnimeList (JIKAN)** | LN + manga | Sem auth (rate-limited) | API pública, fácil, boa cobertura |
| **AniList** | LN + anime | API key grátis | GraphQL, melhor metadata |
| **NovelUpdates** | LN (EN/JP) | Scraping (sem API oficial) | Maior catálogo de novels EN |
| **VNDB** | Visual novels | Sem auth | **A melhor** pra VN, schema aberto |
| **Royal Road** | Webnovels | Sem auth | Sinopse, tags, capítulos |
| **Light Novel Pub** | LN | Scraping | Backup se NovelUpdates bloquear |
| **Kakuyomu / Narou** | LN JP | Scraping | Pra novels japoneses originais |

**Recomendação inicial:** começar com **VNDB + JIKAN (MAL)** — sem auth, dados limpos, cobrem LN + VN.

---

## Como retomar (primeiros comandos)

```bash
cd /d/Site-LN

# 1. Confirmar que builda
npm run build

# 2. Subir dev pra checar visual
npm run dev   # http://localhost:3000

# 3. Ver estado do DB (read-only)
python -c "import sqlite3; c=sqlite3.connect('data/tomoverso.db'); \
  print([r[0] for r in c.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")])"

# 4. Conferir o que tá em novels/capitulos
python -c "import sqlite3; c=sqlite3.connect('data/tomoverso.db'); \
  [print(t, c.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]) \
   for t in ['novels','chapters','users','comments']]"
```

Antes de qualquer código novo, **perguntar ao user**:
1. Qual API priorizar (1ª, 2ª, 3ª)?
2. Quantas novels importar agora (50? 500? 5000?)?
3. Quer visual novels junto ou separar?
4. Cron: quinta 00:00 BR? quinta 09:00? tem dia/horário específico?

---

## Credenciais e paths

| Item | Valor |
|---|---|
| Admin username | `fabio_tx` |
| Admin email | `fabio@tomoverso.com` |
| Admin senha | `tomoverso2026` |
| Site path | `D:\Site-LN\` |
| Admin path | `D:\tomoverso-admin\` |
| Admin ZIP | `D:\tomoverso-admin-final.zip` (65 arquivos, 724KB) |
| DB | `D:\Site-LN\data\tomoverso.db` |
| Repo GitHub | `github.com/Tiothor1/tomoverso` |
| GitHub user | `Tiothor1` |
| Conta Vercel | conectada, importa pelo browser |

---

## Preferências do user (relevante pro projeto)

- 🇧🇷 Idioma: PT-BR (código/comandos em inglês, copy/conversa em PT-BR)
- 🖼️ Imagens: `image_generate` (FAL) **NÃO funciona neste env** — usar SVG inline ou pegar URL externa
- 🚀 Deploy: prefere Vercel + GitHub (PAT com scope `public_repo`); gh CLI instala via `winget install --id GitHub.cli -e`
- 🔐 Credenciais: pedir 1x máx, não fazer wizards de auth que falham silencioso
- 😤 **Sinal de frustração crítica:** vírgula solta, "esquece isso", "só faz a droga do site" → **PARAR de debugar, ir pra alternativa** (ZIP, manual, sem auth)
- 🎨 Modo polish: quando user pedir "MUITO bom", "cara profissional", adicionar sem pedir (animações, glass, SVG, multi-paleta)

---

## Comandos úteis

```bash
# Build
cd /d/Site-LN && npm run build

# Dev
cd /d/Site-LN && npm run dev

# Limpar cache Next
cd /d/Site-LN && rm -rf .next

# Resetar banco (cuidado — apaga tudo)
cd /d/Site-LN && rm data/tomoverso.db*

# Deploy (assume gh CLI logado)
cd /d/Site-LN && git add -A && git commit -m "feat: ..." && git push origin main
```

---

## Próxima sessão — script de abertura

Quando o user digitar "continuar com site" numa sessão nova, o agente deve:

1. **Ler este HANDOFF.md inteiro**
2. **Rodar** os 4 comandos da seção "Como retomar"
3. **Confirmar** que tudo bate com este arquivo (rotas, DB, dependências)
4. **Apresentar** ao user:
   - Resumo de 3 linhas do estado
   - Lista de APIs candidatas com recomendação
   - Pergunta única: "qual fonte priorizar e quantas novels importar agora?"
5. **Esperar resposta** antes de qualquer código novo

**NÃO** tentar retomar a task gigante sem quebrar. **NÃO** importar tudo de uma vez.