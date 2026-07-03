# SISTEMA ADMIN — Tomo Verso Editora

## Documentação completa para rebuild

> **Importante:** O sistema de SEGURANÇA/LOGIN (admin-secreto) está funcionando e você quer manter.
> O resto (páginas internas, queries, componentes) você vai refazer.

---

## 1. ARQUITETURA GERAL

Existem **DOIS sistemas admin**:

### A) Admin Secreto (protegido por URL secreta + cookie)
```
/adm1n-c0ntr0l-...
```
- Roteiro: `/admin-secreto/*` (rewrite via middleware)
- Login próprio com cookie `admin_validated`
- Tema escuro vermelho/preto
- Funções: dashboard, novels, mangás, usuários, comentários, financeiro, upload, análise, setup

### B) Admin Público (protegido por role 'admin')
```
/admin
/admin/site
/admin/catalog/curation
/admin/users
/admin/sellers
/admin/commerce
/admin/integrations
/admin/imports
/admin/stats
```
- Usa autenticação normal do site (sessão)
- Tema claro com `AdminShell`
- Funções: config site, curadoria, loja, sellers, integrações, estatísticas

---

## 2. SEGURANÇA — O QUE VOCÊ QUER MANTER

### Middleware (`src/middleware.ts`)
```typescript
// Rewrite de URL secreta → /admin-secreto
const adminSecret = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-...";
if (pathname === `/${adminSecret}` || pathname.startsWith(`/${adminSecret}/`)) {
    const newPath = pathname.replace(`/${adminSecret}`, "/admin-secreto");
    // NextResponse.rewrite
}
```

### Login (`src/app/admin-secreto/login.tsx`)
- Componente client-side
- POST para `/api/admin/login` (username/email + password)
- Se ok, seta cookie: `document.cookie = "admin_validated=1; path=/; max-age=3600"`
- Recarrega a página

### API Login (`src/app/api/admin/login/route.ts`)
- Busca user por email OU username com `role = 'admin'`
- Verifica password com bcrypt
- Cria sessão no banco + JWT token
- Seta cookie `tomoverso-session`

### Dashboard principal (`src/app/admin-secreto/page.tsx`)
- Server component
- Verifica cookie `admin_validated` e role do user
- Se não validado → renderiza `<AdminSecretoLogin />`
- Se validado → mostra dashboard com stats + acesso rápido

### Tabela `admin_auth`
```sql
CREATE TABLE IF NOT EXISTS admin_auth (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    twofa_secret TEXT,
    admin_cpf TEXT,
    login_count INTEGER DEFAULT 0,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### Setup de segurança (`src/app/admin-secreto/setup/page.tsx`)
- CPF + 2FA (Google Authenticator) — **opcional**
- Usa `speakeasy` pra gerar secret 2FA

### Funções de auth (`src/lib/admin/admin-auth.ts`)
- `ensureAdminAuthTable()` — cria tabela se não existe
- `generate2FASecret(userId)` — gera secret 2FA
- `verify2FAToken(secret, token)` — valida código 2FA
- `is2FAEnabled(userId)` — check
- `enable2FA(userId, secret)` — ativa
- `getAdminCPF(userId)` / `setAdminCPF(userId, cpf)`
- `getAdminSecretPath()` — retorna path secreto
- `isAdminPath(pathname)` — verifica se é path admin

---

## 3. PÁGINAS DO ADMIN SECRETO (pra refazer)

### 3.1 Dashboard (`/admin-secreto/page.tsx`)
**Arquivo:** `src/app/admin-secreto/page.tsx`
**Queries:**
- `SELECT COUNT(*) FROM users`
- `SELECT COUNT(*) FROM novels`
- `SELECT COUNT(*) FROM mangas`
- `SELECT COUNT(*) FROM chapters`
- `SELECT COUNT(*) FROM manga_chapters`
- `SELECT COUNT(*) FROM comments`
- `SELECT COUNT(*) FROM sessions`
- `SELECT COUNT(*) FROM seller_profiles WHERE status='approved'`
- `SELECT COALESCE(SUM(gross_amount_cents),0) FROM marketplace_payments WHERE status='approved'`
- `SELECT COUNT(*), COALESCE(SUM(amount_cents),0) FROM withdrawal_requests WHERE status='pending'`
- `SELECT COALESCE(SUM(views),0) FROM novels`

**Componentes:** Cards de estatística, grid de acesso rápido (8 botões)

### 3.2 Novels (`/admin-secreto/novels`)
**Arquivo:** `src/app/admin-secreto/novels/page.tsx`
**Funções:**
- Listar novels com busca (por título/slug)
- Excluir novel (cascade: chapters, comments, bookmarks)
- Server action: `deleteNovelAction`

**Queries:**
- `SELECT n.*, u.display_name FROM novels n LEFT JOIN users u ... WHERE n.title LIKE ? OR n.slug LIKE ?`
- `SELECT novel_id, COUNT(*) FROM chapters GROUP BY novel_id`

### 3.3 Mangás (`/admin-secreto/mangas`)
**Arquivo:** `src/app/admin-secreto/mangas/page.tsx`
**Funções:**
- Listar mangás com busca
- Excluir mangá
- Server action: `deleteMangaAction`

**Queries:**
- `SELECT * FROM mangas WHERE title LIKE ? OR slug LIKE ?`
- `SELECT manga_id, COUNT(*) FROM manga_chapters GROUP BY manga_id`

### 3.4 Usuários (`/admin-secreto/usuarios`)
**Arquivo:** `src/app/admin-secreto/usuarios/page.tsx`
**Funções:**
- Listar usuários (filtra `%@external.author`)
- Buscar por username, email, display_name
- Editar email inline
- Banir/desbanir (muda role pra 'banned')
- Excluir usuário (cascade sessions)
- Server actions: `deleteUserAction`, `banUserAction`, `updateEmailAction`

**Queries:**
- `SELECT * FROM users WHERE email NOT LIKE '%@external.author'`
- `UPDATE users SET role = ? WHERE id = ?` (ban/unban)
- `UPDATE users SET email = ? WHERE id = ?`

### 3.5 Comentários (`/admin-secreto/comentarios`)
**Arquivo:** `src/app/admin-secreto/comentarios/page.tsx`
**Funções:**
- Listar últimos 200 comentários
- Remover (soft delete: marca `is_hidden = 1` e troca conteúdo)
- Server action: `deleteCommentAction`

**Queries:**
```sql
SELECT c.*, u.display_name, u.username, n.title, n.slug
FROM comments c
LEFT JOIN users u ON u.id = c.user_id
LEFT JOIN novels n ON n.id = c.novel_id
ORDER BY c.created_at DESC LIMIT 200
```

### 3.6 Financeiro (`/admin-secreto/finance`)
**Arquivo:** `src/app/admin-secreto/finance/page.tsx`
**Funções:**
- Mostrar total vendido, pago a autores, pendente, saldo
- Listar saques pendentes com dados PIX
- Confirmar pagamento de saque
- Server action: `adminConfirmWithdrawalAction` (de `marketplace-actions.ts`)

**Queries (com safeSum — retorna 0 se tabela não existir):**
```sql
SELECT COALESCE(SUM(gross_amount_cents),0) FROM marketplace_payments WHERE status='approved'
SELECT COALESCE(SUM(amount_cents),0) FROM withdrawal_requests WHERE status='paid'
SELECT COALESCE(SUM(amount_cents),0) FROM withdrawal_requests WHERE status='pending'
```

### 3.7 Upload/Importar (`/admin-secreto/upload`)
**Arquivo:** `src/app/admin-secreto/upload/page.tsx`
**Funções:**
- Upload de arquivo (PDF, TXT, EPUB, DOCX, MD)
- POST para `/api/admin/uploads`
- Listar últimos 10 imports da `import_queue`

**Queries:** `SELECT * FROM import_queue ORDER BY created_at DESC LIMIT 10`

### 3.8 Análise de Importações (`/admin-secreto/analise`)
**Arquivo:** `src/app/admin-secreto/analise/page.tsx`
**Funções:**
- Listar todos os imports (pendentes, processando, concluídos, erros)
- Aprovar import (marca como completed)
- Excluir import
- Server actions: `deleteImportAction`, `markCompletedAction`

**Queries:** `SELECT * FROM import_queue ORDER BY created_at DESC LIMIT 50`

---

## 4. PÁGINAS DO ADMIN PÚBLICO (pra refazer ou ignorar)

### 4.1 Visão Geral (`/admin`)
**Arquivo:** `src/app/admin/page.tsx`
**Componentes:** `AdminShell`, `getAdminOverview`, `getRecentAdminActivity`
**Queries em `src/lib/admin/queries.ts`:** Contagens de users, novels, mangás, chapters, comments, reports, sessions, catalog_controls, store_products, etc.

### 4.2 Site Config (`/admin/site`)
**Arquivo:** `src/app/admin/site/page.tsx`
**Componentes:** `SiteConfigForm`
**Funções:** Editar site_name, tagline, hero texts, email, footer, storefront

### 4.3 Curadoria (`/admin/catalog/curation`)
**Arquivo:** `src/app/admin/catalog/curation/page.tsx`
**APIs:** `/api/admin/catalog-items` (GET), `/api/admin/catalog-control` (POST)
**Funções:** Marcar obras como original, esconder, featured, curation_label

### 4.4 Usuários (`/admin/users`)
**Componente:** `UsersTable`
**Queries:** `getUserAdminRows` — busca com join em `user_access_controls`

### 4.5 Sellers (`/admin/sellers`)
**Arquivo:** `src/app/admin/sellers/page.tsx`
**Funções:** Aprovar/rejeitar vendedores

### 4.6 Commerce (`/admin/commerce`)
**Componentes:** `StoreProductsTable`, `StoreProductForm`
**Queries:** `getCommerceStats`, `getStoreProducts`, `getStoreCollections`

### 4.7 Integrações (`/admin/integrations`)
**Componente:** `VercelIntegrationCard`
**Queries:** `getVercelIntegration` — tabela `admin_integrations`

### 4.8 Importações (`/admin/imports`)
**Arquivo:** `src/app/admin/imports/page.tsx`
**Funções:** Gerenciar fontes de importação (CentralNovel, MangaOnline)

### 4.9 Stats (`/admin/stats`)
**Arquivo:** `src/app/admin/stats/page.tsx`
**Queries:** Tabelas `sync_runs`, `ingest_sources`, crescimento por semana

---

## 5. APIS ADMIN

| Rota | Método | Função |
|------|--------|--------|
| `/api/admin/login` | POST | Login admin (retorna userId + cookie) |
| `/api/admin/validate` | POST | Valida 2FA + CPF (não usado mais) |
| `/api/admin/catalog-items` | GET | Lista obras para curadoria |
| `/api/admin/catalog-control` | POST | Atualiza catalog_controls |
| `/api/admin/uploads` | POST | Upload de arquivo |
| `/api/notifications` | GET/POST | Notificações do admin |
| `/api/follow/[username]` | GET/POST | Seguir/deixar de seguir |
| `/api/contact` | POST | Formulário de contato |

---

## 6. DATABASE — TABELAS RELEVANTES

```sql
-- Auth / Admin
admin_auth         -- 2FA + CPF dos admins
sessions           -- Sessões ativas
user_access_controls -- Suspensão/bloqueio

-- Conteúdo
novels             -- Light novels
chapters           -- Capítulos de novels
mangas             -- Mangás
manga_chapters     -- Capítulos de mangás
manga_pages        -- Páginas de mangás
comments           -- Comentários
bookmarks          -- Bookmarks
reading_progress   -- Progresso de leitura

-- Catálogo
catalog_controls   -- is_hidden, is_featured, is_original, curation_label
novel_tags         -- Tags de novels
manga_tags         -- Tags de mangás

-- Marketplace / Finanças
marketplace_payments    -- Pagamentos
withdrawal_requests     -- Saques de autores
seller_profiles         -- Perfis de vendedor
store_products          -- Produtos da loja
store_collections       -- Coleções da loja

-- Importação
import_queue        -- Fila de uploads
sources             -- Fontes de importação
sync_runs           -- Log de sincronizações
sync_errors         -- Erros de sincronização

-- Engajamento
follows             -- Seguir autores
notifications       -- Notificações
activity_log        -- Log de atividades
reports             -- Denúncias

-- Site
site_settings       -- Configurações do site
```

---

## 7. COMPONENTES ADMIN

| Componente | Arquivo | Função |
|-----------|---------|--------|
| `AdminShell` | `components/admin/admin-shell.tsx` | Layout padrão das páginas /admin/* |
| `AdminSidebar` | `components/admin/admin-sidebar.tsx` | Sidebar de navegação |
| `AdminStatCard` | `components/admin/admin-stat-card.tsx` | Card de estatística |
| `CatalogTable` | `components/admin/catalog-table.tsx` | Tabela de catálogo |
| `SiteConfigForm` | `components/admin/site-config-form.tsx` | Form de config do site |
| `UsersTable` | `components/admin/users-table.tsx` | Tabela de usuários |
| `StoreProductsTable` | `components/admin/store-products-table.tsx` | Tabela de produtos |
| `StoreProductForm` | `components/admin/store-product-form.tsx` | Form de produto |
| `VercelIntegrationCard` | `components/admin/vercel-integration-card.tsx` | Card de integração Vercel |
| `AdminPromoteBanner` | `components/admin/admin-promote-banner.tsx` | Banner de promoção admin |

---

## 8. LIBS ADMIN

| Arquivo | Função |
|---------|--------|
| `lib/admin/admin-auth.ts` | Autenticação 2FA + CPF (manter) |
| `lib/admin/defaults.ts` | Constantes: site_name, nav items |
| `lib/admin/queries.ts` | Queries: overview, catalog, users, commerce |
| `lib/admin/types.ts` | Tipos TypeScript |
| `lib/admin/vercel.ts` | Integração Vercel API |

---

## 9. FLUXO DE LOGIN (MANTER)

```
Usuário acessa /{SECRET}
  → middleware.ts reescreve pra /admin-secreto
  → AdminSecretoPage() verifica:
     a) cookie "admin_validated" existe e é "1"?
     b) user logado e role === 'admin'?
  → Se não: renderiza <AdminSecretoLogin />
  → Se sim: renderiza dashboard

Login:
  → Usuário preenche username + password
  → POST /api/admin/login
  → API busca user por email/username com role='admin'
  → Verifica bcrypt
  → Cria sessão + JWT
  → Client seta: document.cookie = "admin_validated=1; path=/; max-age=3600"
  → Recarrega página → entra no dashboard
```

---

## 10. OBSERVAÇÕES PARA O REBUILD

1. **redirect() dentro de try/catch NÃO FUNCIONA** — o catch engole o `NEXT_REDIRECT`. Sempre colocar redirect FORA do try.

2. **searchParams** no Next.js 16 pode ser Promise ou objeto. Tratar com:
   ```typescript
   const sp = props.searchParams instanceof Promise
     ? await props.searchParams
     : await Promise.resolve(props.searchParams || {});
   ```

3. **safeSum()** — usar wrapper pra queries que podem falhar se a tabela não existir:
   ```typescript
   function safeSum(db, sql) {
     try { const row = db.prepare(sql).get(); return Number(Object.values(row)[0]) || 0; }
     catch { return 0; }
   }
   ```

4. **ENV VAR:** `ADMIN_SECRET_PATH` — path secreto do admin (fallback: `adm1n-c0ntr0l-...`)

5. **Cookie:** `admin_validated` expira em 1 hora. Usar `Secure` em produção.
