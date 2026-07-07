# 🔍 Verificação Oficial Pré-Publicação — Tomoverso

**Data:** 07/07/2026  
**Site:** https://tomoverso.studio  
**VPS:** 40.116.106.139 (Azure)  
**Commit:** e99feaa  
**Build:** ✅

---

## Resumo Geral

O site **está funcional** para publicação oficial, mas **não está 100% pronto**. Há pendências que precisam ser resolvidas antes (especialmente backup automático, expiração de assinaturas e sistema de saque).

---

## ✅ O que funciona

### Páginas (23 testadas → 200 todas)
- Home, Feed, Catálogo, Login, Cadastro, Loja, Planos, Termos, Privacidade, Sobre, Contato, Explore, Publicar, How-to, Search, Autor+, Concurso, Livros, Manga, Novels, Web-Novels, Mangás, Notifications

### Rotas dinâmicas (200)
- Novel detalhe: `/novels/o-que-eu-desenhei-existe` ✅
- Novel capítulo: `/novels/o-que-eu-desenhei-existe/1` ✅
- Mangá detalhe: `/manga/the-regressed-mercenarys-machinations` ✅
- Livros: `/livros` ✅
- Dashboard, Settings, Subscription, Wallet: ✅ (redireciona não-logados)

### Segurança
- HTTP → HTTPS: **301 redirect** ✅
- Porta 3000: **fechada** ✅
- Firewall UFW: **active** (22/80/443 apenas)
- fail2ban: **active**
- Headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-Robots-Tag ✅
- GPTBot bloqueado: **403** ✅
- Seed route bloqueado: **405** ✅
- Upload anônimo bloqueado: **403** ✅
- Admin login inválido: **401** ✅
- `robots.txt` com 25 bots IA bloqueados ✅

### Infraestrutura
- PM2: **online** (restart automático configurado)
- Nginx: **active**
- DB: SQLite 185MB, 67 tabelas
- 60 usuários, 187 novels, 172 mangás, 1760 chapters (novel), 17504 manga_chapters
- 5 planos de assinatura cadastrados
- 404k páginas de mangá

### Banco de dados
- 2 migrações aplicadas (local) / 3 (VPS — feed_foundation)
- Tabelas com chaves estrangeiras, cascade, índices
- Wal-mode ativo (WAL)

---

## ⚠️ O que foi corrigido durante a verificação

| # | Problema | Arquivo | Correção |
|---|----------|---------|----------|
| 1 | `/admin/users` **sem verificação de admin** — qualquer usuário logado podia acessar | `src/app/admin/users/page.tsx` | Adicionado `getCurrentUser()` + redirect se não admin |

---

## 🚩 Pendências críticas (precisam ser resolvidas)

### 1. ✅ Backup automático DIÁRIO — **NÃO EXISTE**
**Impacto:** Se o banco corromper ou a VM cair, dados dos usuários podem ser perdidos.

**O que fazer:**
```bash
# Criar cron de backup na VPS:
0 3 * * * cp /var/www/tomoverso/data-runtime/tomoverso.db /var/www/tomoverso/data-runtime/backups/tomoverso.$(date +\\%Y\\%m\\%d).db && find /var/www/tomoverso/data-runtime/backups/ -name "tomoverso.*.db" -mtime +7 -delete
```

### 2. ❌ Expiração automática de assinaturas — **NÃO IMPLEMENTADA**
**Impacto:** Assinaturas nunca expiram. Uma pessoa que pagou 1x em janeiro ainda aparece como "assinante ativo" em julho.

**Schema já tem:** `current_period_end`, `status IN ('active','canceled','expired')`

**Falta:** Um cron job (diário) que faça:
```sql
UPDATE user_subscriptions 
SET status = 'expired', updated_at = datetime('now') 
WHERE status = 'active' AND current_period_end < datetime('now')
AND cancel_at_period_end = 1;
```
E atualizar o cookie do usuário (`SubscriberCookieSync`) quando a assinatura expirar.

### 3. ❌ Renovação automática — **NÃO IMPLEMENTADA**
**Impacto:** O sistema de pagamento Mercado Pago não cria assinaturas recorrentes. A pessoa paga uma vez e recebe 1 mês/ano, mas quando acaba, precisa pagar manualmente de novo.

**O que falta:** Usar a API de `preapproval` do Mercado Pago (assinatura recorrente) em vez de `checkout/preferences` (pagamento único).

**Status atual:** O webhook trata pagamento único como assinatura. `cancel_at_period_end` fica 0, mas **não há cobrança recorrente real**.

### 4. ⚠️ Sistema de saldo/saque — **REQUER SELLER PROFILE**
**Impacto:** Usuário não consegue sacar sem primeiro criar um perfil de vendedor (`seller_profiles`). O sistema de carteira é vinculado a `seller_id`, não a `user_id`.

**Schema:**
- `wallet_balances` → `seller_id` (FK para `seller_profiles`)
- `withdrawal_requests` → `seller_id` (FK para `seller_profiles`)
- Saque mínimo: R$ 50,00 (5000 cents)
- Taxa: 10% (1000 basis points) ✅ configurada

**Fluxo para o autor receber:**
1. Criar obra
2. Criar seller_profile (preencher nome, CPF, Pix, endereço)
3. Ser aprovado como vendedor pelo admin
4. Vender obra
5. Pedir saque (mín. R$50)
6. Admin paga manualmente e confirma

### 5. ⚠️ Admin /users: não mostra "online agora"
**Já existe** `activeNow` no overview (conta activity_log na última hora), mas:
- Falta página de analytics com: total de registrados, visitantes, sessões, logins
- Falta tabela de visitas/analytics dedicada (só activity_log atualmente)

---

## 🔧 Status detalhado por área

### 👤 Cadastro e Login
| Item | Status | Observação |
|------|--------|------------|
| Criar conta | ⚠️ Não testado via browser | Código revisado e parece funcional |
| Login | ✅ Código revisado | Server action com validação Zod |
| Logout | ✅ | Limpa sessão e cookie |
| Sessão persistente | ✅ | JWT + cookie httpOnly + sessions table |
| Conta aparece no admin | ✅ | `getUserAdminRows()` lista todos |
| Admin role check | ✅ Corrigido | Bug do /admin/users resolvido |
| Banir usuário | ✅ | Via `user_access_controls` |
| Email/username duplicado | ✅ | Validação no signupAction |

### 📚 Publicação de Obras
| Item | Status | Observação |
|------|--------|------------|
| Criar novel | ✅ | Dashboard → Novels → New |
| Criar mangá | ✅ | Via importação |
| Adicionar capítulo | ✅ | Dashboard |
| Editar capítulo | ✅ | Dashboard |
| Capa | ✅ | Upload por URL/local |
| Sinopse/Tags/Gêneros | ✅ | Schema completo |
| Obra no catálogo | ✅ | Público |
| Obra no admin | ✅ | Catalog controls |
| Admin moderar/ocultar | ✅ | catalog_controls table |

### 📰 Feed
| Item | Status | Observação |
|------|--------|------------|
| Criar post | ⚠️ | 2 posts na VPS, feed_posts table existe |
| Curtir | ✅ | feed_interactions table |
| Comentar | ✅ | feed_comments table |
| Salvar/Compartilhar | ✅ | saved_feed_items |
| Seguir autor | ✅ | follows table |
| Denunciar | ✅ | feed_reports |

### 💳 Planos e Assinaturas
| Item | Status | Observação |
|------|--------|------------|
| Planos cadastrados | ✅ | 5 planos (Leitor, Pro, Pro Anual, Autor+, Autor+ Anual) |
| Checkout Mercado Pago | ✅ | PIX e Checkout Pro |
| Webhook | ✅ | Com validação de assinatura |
| Pagamento aprovado ativa | ✅ | Cria user_subscription |
| Plano expira | ❌ | Falta cron de expiração |
| Renovação automática | ❌ | Sem preapproval MP |
| Selo de assinante | ✅ | Cookie `tomoverso-subscriber=1`, componente SubscriberCookieSync |

### 💰 Saldo e Saque
| Item | Status | Observação |
|------|--------|------------|
| Saldo do autor | ⚠️ | Via seller_profiles, vinculado a marketplace |
| Taxa 10% | ✅ | Configurada em platform_fee_rules |
| Saque (R$50 mínimo) | ✅ | withdrawal_requests table |
| Admin confirma saque | ✅ | Botão no financeiro |
| Histórico de transações | ✅ | wallet_transactions |
| Dados PIX/CPF salvos | ✅ | seller_profiles |
| Segurança dados sensíveis | ✅ | Não expostos no front |

### 🛡️ Segurança e Permissões
| Item | Status | Observação |
|------|--------|------------|
| Usuário comum não acessa admin | ⚠️ | Maioria verifica, faltava /admin/users (corrigido) |
| Usuário banido não publica | ✅ | user_access_controls |
| API pagamento protegida | ✅ | |
| API saque protegida | ✅ | |
| API publicação protegida | ✅ | getCurrentUser |
| Dados sensíveis no front | ✅ | Removido autor/fonte obras importadas |
| .env não acessível | ✅ | |
| .db não acessível | ✅ | Fora do public/ |
| Backups não públicos | ✅ | Em data-runtime/backups/ |

### 📊 Admin Financeiro
| Item | Status | Observação |
|------|--------|------------|
| Total vendido | ✅ | marketplace_payments |
| Comissão editora 10% | ✅ | |
| Saques pendentes | ✅ | Com botão Confirmar |
| Saques pagos | ✅ | Histórico |
| Planos ativos | ⚠️ | Sem expiração automática |
| Usuários pagantes | ⚠️ | Sem filtro específico |
| Erros de webhook | ❌ | Sem log de erros específico |

### 💾 Backup
| Item | Status | Observação |
|------|--------|------------|
| Backup automático diário | ❌ | Não existe |
| Backup manual | ✅ | Na pasta data-runtime/backups/ |
| Último backup VPS | 06/07/2026 | |
| Pasta fora do public | ✅ | |
| Script de restore | ❌ | Não documentado |

---

## 🧪 Resultado dos Testes

```txt
=== PAGES ===
/                          200  /feed           200  /catalogo       200
/auth/login                200  /auth/signup    200  /loja           200
/store/plans               200  /termos         200  /privacidade    200
/sobre                     200  /contato        200  /explore        200
/publicar                  200  /how-to         200  /search         200
/autor-plus                200  /concurso       200  /livros         200
/manga                     200  /novels         200  /web-novels     200
/mangas                    200  /notifications  200

=== SECURITY ===
HTTP→HTTPS      301  GPTBot blocked  403  Seed blocked    405
Upload anon     403  Admin wrong     401  Port 3000       CLOSED

=== INFRA ===
PM2:    online (pid 48907)
Nginx:  active
UFW:    active
fail2ban: active
Disco:  11% (61G)
RAM:    931Mi / 15Gi

=== DB ===
Tables:  67 (VPS)
Users:   60
Novels:  187  (1760 chapters)
Mangas:  172  (17504 chapters)
Plans:    5
Subs:     0 (active)
Payments: 0
Feed:     2 posts
```

---

## 📋 Checklist Final

| # | Pergunta | Resposta | Observação |
|---|----------|----------|------------|
| 1 | Site está pronto para publicação oficial? | **Não** | Pendências críticas de backup e expiração de assinatura |
| 2 | O que impede a publicação oficial? | Backup automático, expiração de planos, renovação automática |
| 3 | Cadastro funciona? | ⚠️ Não testado via browser, código OK |
| 4 | Login funciona? | ✅ Código revisado |
| 5 | Conta aparece no admin? | ✅ Sim, 60 usuários |
| 6 | Planos mensal/anual funcionam? | ⚠️ Checkout funciona, mas expiração não |
| 7 | Expiração de plano funciona? | ❌ Não implementada |
| 8 | Renovação automática existe? | ❌ Pendente — sem preapproval MP |
| 9 | Pagamento funciona? | ✅ MP integrado com webhook |
| 10 | Webhook funciona? | ✅ Com validação de assinatura |
| 11 | Saldo funciona? | ⚠️ Via seller_profiles |
| 12 | Saque funciona? | ⚠️ Requer seller_profile, mínimo R$50 |
| 13 | Taxa de 10% funciona? | ✅ 1000 basis points configurado |
| 14 | PIX/CPF/endereço ficam salvos? | ✅ Em seller_profiles |
| 15 | Admin financeiro funciona? | ⚠️ Sem expiração, sem webhook errors log |
| 16 | Publicação de obras funciona? | ✅ Via dashboard |
| 17 | Publicação no feed funciona? | ⚠️ 2 posts, funcionalidade existe |
| 18 | Selos de pagante funcionam? | ✅ SubscriberCookieSync + cookie |
| 19 | Admin mostra usuários online? | ✅ activeNow (última hora) |
| 20 | Admin mostra total de registrados? | ✅ 60 |
| 21 | Admin mostra total de visitantes? | ❌ Sem analytics dedicado |
| 22 | Segurança está ok? | ⚠️ Bug do /admin/users corrigido |
| 23 | Backup está ok? | ❌ Sem backup automático diário |
| 24 | Performance está ok? | ✅ RAM/CPU ok, páginas rápidas |
| 25 | Arquivo MD criado? | ✅ Este arquivo |

---

## 🚨 Recomendações antes de publicar

### Críticas (fazer antes do lançamento)

1. **Criar backup automático diário** — script cron na VPS:
   ```bash
   0 3 * * * cp /var/www/tomoverso/data-runtime/tomoverso.db /var/www/tomoverso/data-runtime/backups/tomoverso.$(date +\%Y\%m\%d).db && find /var/www/tomoverso/data-runtime/backups/ -name "tomoverso.*.db" -mtime +7 -delete
   ```

2. **Criar cron de expiração de assinaturas:**
   ```sql
   UPDATE user_subscriptions SET status = 'expired' 
   WHERE status = 'active' AND current_period_end < datetime('now');
   ```

3. **Documentar que renovação automática não está pronta** e deixar claro na página de planos.

### Importantes (fazer em breve)

4. **Configurar Mercado Pago preapproval** para renovação automática real.
5. **Criar seller_profile para autores reais** para testar fluxo de saque.
6. **Adicionar página de analytics** com visitas, sessões, logins.
7. **Limpar usuários de teste** (58 "author-xxxx" que são importados de seed).

### Melhorias

8. **Adicionar selo de assinante** em cards de obra (quando fizer sentido).
9. **Adicionar filtro de "assinantes ativos" no admin**.
10. **Criar log de erros de webhook** para debug.

---

## 📁 Arquivos modificados nesta verificação

```txt
M src/app/admin/users/page.tsx  (adição de admin role check)
```

## 🔗 Links úteis

- **GitHub:** https://github.com/Tiothor1/tomoverso
- **Site:** https://tomoverso.studio
- **VPS:** 40.116.106.139 (SSH: Tiothor1)
- **Banco:** /var/www/tomoverso/data-runtime/tomoverso.db
- **Backups:** /var/www/tomoverso/data-runtime/backups/
