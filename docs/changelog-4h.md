# Changelog Tomoverso — Últimas 4h (12:34 → 00:07)

## 📦 Infraestrutura

### Verificação de email com código de 6 dígitos
- Nova tabela `verification_codes` no banco
- Lib `src/lib/email.ts`: envio via Resend API (ou SMTP fallback, ou console em dev)
- Lib `src/lib/verify-email.ts`: geração, envio, validação e uso único do código
- Página `/auth/verify` com 6 inputs individuais, suporte a paste, auto-submit
- APIs: `POST /api/auth/verify/send` e `POST /api/auth/verify/check`
- Código expira em 10 minutos, uso único
- Botão reenviar com cooldown de 60s
- **Integração no cadastro:** ao criar conta, redireciona para verificação (não para dashboard)
- **Integração no login:** bloqueia login se email não verificado, redireciona para `/auth/verify`

### Login confiável (cookie + redirect)
- **Bug corrigido:** `redirect()` dentro de server actions engolia o `Set-Cookie`
- Server actions (`signupAction`, `loginAction`) agora retornam `{ ok, redirect }` em vez de chamar `redirect()` internamente
- Forms fazem `window.location.href = result.redirect` no cliente
- `logoutAction` manteve `redirect()` interno (não seta cookie, só limpa)

### Sistema de assinaturas com Mercado Pago
- 4 tabelas novas: `subscription_plans`, `user_subscriptions`, `payment_transactions`
- Lib `src/lib/subscriptions.ts`: criação de preferência MP, verificação de status
- Página `/store/plans` com cards de planos
- Página `/dashboard/subscription` com gerenciamento e histórico
- API `/api/payments/checkout`: cria preferência no Mercado Pago
- API `/api/payments/mercadopago-webhook`: recebe notificações de pagamento
- API `/api/payments/cancel`: cancelar assinatura
- Navbar: badge "Pro" para assinantes, botão "Pro" para não-assinantes
- Componente `AdSlot`: bloqueia anúncios para assinantes via cookie
- Componente `PremiumReaderControls`: leitor premium com fonte, espaçamento, tema e largura
- Componente `ColorThemePicker`: +4 cores exclusivas para assinantes
- Badge nos comentários com destaque dourado + badge "Pro"/"Autor Verificado"
- Download de capítulo em .txt para assinantes
- Suporte WhatsApp no footer

### Planos de preço

**Versão 1 (primeira):** Pro R$9,90 com 9 benefícios (muita coisa por pouco)
**Versão 2 (após feedback):** 4 planos progressivos

| Plano | Preço | Benefícios |
|-------|-------|-----------|
| **Leitor** | R$ 9,90/mês | Sem anúncios, badge Leitor, tema sépia |
| **Pro** | R$ 19,90/mês | Download, leitor premium, 4 cores, badge dourado, WhatsApp |
| **Pro Anual** | R$ 179,00/ano | 3 meses grátis (economia R$ 59,70) |
| **Autor** | R$ 29,90/mês | Publicação ilimitada, analytics, badge azul |

### Limite de obras grátis
- Usuário sem plano pode publicar **até 3 obras** (novels + mangas)
- Plano Autor (R$ 29,90) libera publicações ilimitadas
- API `/api/user/works-count` retorna contagem + status do plano
- Formulário de criação mostra banner com contador `N/3` e link para assinar
- Bloqueia criação ao atingir limite com CTA para `/store/plans`

---

## 🚀 Performance

### Catálogo do explore (265KB → ~210KB)
- `SELECT *` → colunas específicas (sem `synopsis` — 2KB/livro × 24 = 48KB)
- JOIN com `users` para `author_name` (em vez de carregar objeto `author` completo)
- Adicionado `safeJsonArray` para parsear `genres` no lugar de JSON.stringify
- Page size 24 (reduzido de 60)

### Catálogo de mangá (190KB → ~140KB)
- Removido `m.synopsis` do SELECT (não usado no card do catálogo)
- Pluralização correta: "1 cap" / "N caps"

### Home page (~127KB)
- Removido `synopsis` do SELECT (não usado nos cards da home)
- Mantido `genres`, `title_jp`, `title_en` (usados por `NovelTitle`)

### Correções de alias SQL
- `buildQuery` mudou de `publicVisibleNovelSql("novels")` para `publicVisibleNovelSql("n")`
- Count query estava sem alias → **causava 500 no explore**
- Corrigido: `FROM novels n` em todas as queries que usam alias

---

## 🎨 UI/UX

### Menu mobile (hamburger)
- Criado `MobileMenu` com painel lateral deslizante
- Fundo escuro translúcido, 72% de largura máxima
- Todos os links: Light Novels, Mangás, Livros, Loja, Estante, Como criar, Pro
- Links de autenticação: Entrar/Publicar (não-logado) ou Painel/Admin (logado)
- Botão hamburger visível apenas em `lg:hidden`

### Seção Livros
- Páginas: `/livros` (catálogo), `/livros/[slug]` (detalhe), `/livros/[slug]/ler` (leitor)
- Filtro por gênero com 13 categorias
- Grid responsivo (2-6 colunas), lazy loading, fallback de capa
- Navbar: link "Livros" entre Mangás e Loja
- Busca integrada: retorna livros nos resultados de pesquisa

---

## 🧹 Limpeza

### "LER SEM FRESCURA" removido
- 3 ocorrências: `defaults.ts`, `db.ts` (seed), `site_settings` (DB existente)
- Novo: "onde histórias ganham vida."

### Seed DB atualizado
- `data/tomoverso.seed.db.gz` regenerado múltiplas vezes com as novas tabelas
- Inclui: assinaturas, verificação, livros, planos

---

## 🔧 Commits (ordem cronológica)

| Hora | Commit | Descrição |
|------|--------|-----------|
| 12:34 | `e355ccb` | feat: nomes originais JP/EN + seletor idioma |
| 13:09 | `2278d78` | feat: restaura capas reais das light novels |
| 13:09 | `8bdf84f` | chore: remove artefatos temporários |
| 14:03 | `d55b18a` | feat: transforma admin em control center |
| 14:39 | `de89f31` | fix: limpa catálogo público, reduz peso |
| 14:45 | `c140c0b` | chore: retrigger vercel deploy |
| 17:43 | `51df8f1` | feat: sistema de assinaturas + docs |
| 18:02 | `97dca6d` | fix: remove "ler sem frescura" |
| 18:56 | `f115291` | feat: planos com benefícios reais |
| 19:39 | `aed92d3` | feat: badges, download, cores, WhatsApp |
| 19:44 | `80c291a` | feat: modo leitura premium |
| 21:27 | `bceb50c` | feat: 4 planos progressivos |
| 22:15 | `24dbab6` | fix: login (redirect client-side) |
| 22:26 | `50f2fcc` | feat: verificação de email |
| 22:45 | `9da0725` | feat: limite 3 obras grátis |
| 23:30 | `b9a2017` | feat: seção Livros |
| 23:35 | `f436f4b` | fix: menu hamburger mobile |
| 23:46 | `f73ec6b` | perf: catálogo sem synopsis, SELECT específico |
| 23:50 | `62d7dd4` | perf: home sem synopsis, author_name |
| 00:07 | `2e453a4` | fix: explore 500 (alias n) + genres array |

---

## 🔗 Links úteis

- **Site:** https://tomoverso.vercel.app
- **Planos:** https://tomoverso.vercel.app/store/plans
- **Criar conta:** https://tomoverso.vercel.app/auth/signup
- **Catalogar:** https://tomoverso.vercel.app/explore
- **Mangás:** https://tomoverso.vercel.app/manga
- **Livros:** https://tomoverso.vercel.app/livros
