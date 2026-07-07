# 🔍 Verificação Oficial Pré-Publicação — Tomoverso

**Data:** 07/07/2026 (atualizado 10:39)  
**Site:** https://tomoverso.studio  
**VPS:** 40.116.106.139 (Azure)  
**Commit final:** 97b7ab3  
**Build:** ✅

---

## Resumo Geral

O site **está pronto para publicação oficial.** Todas as pendências críticas foram resolvidas durante esta verificação.

- ✅ Backup automático diário instalado (3am)
- ✅ Expiração automática de assinaturas instalada (2am)
- ✅ `getUserActiveSubscription` agora verifica `current_period_end` em tempo real
- ✅ Preapproval MP (renovação recorrente via cartão) implementado
- ✅ 9 contas anônimas importadas suspensas
- ✅ Bug de segurança `/admin/users` corrigido
- ✅ Bug de segurança `/admin-bootstrap` corrigido
- ✅ Documentação de renovação manual adicionada à página de planos

---

## ✅ O que funciona

### Páginas (23 testadas → 200 todas)
- Home, Feed, Catálogo, Login, Cadastro, Loja, Planos, Termos, Privacidade, Sobre, Contato, Explore, Publicar, How-to, Search, Autor+, Concurso, Livros, Manga, Novels, Web-Novels, Mangás, Notifications

### Rotas dinâmicas (200)
- Novel: `/novels/o-que-eu-desenhei-existe` ✅
- Capítulo: `/novels/o-que-eu-desenhei-existe/1` ✅
- Mangá: `/manga/the-regressed-mercenarys-machinations` ✅
- Dashboard, Wallet, Subscription, Seller: ✅

### Segurança
- HTTP → HTTPS: 301 ✅ | Porta 3000: fechada ✅
- UFW: active (22/80/443) | fail2ban: active ✅
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-Robots-Tag ✅
- GPTBot bloqueado: 403 ✅ | Seed: 405 ✅ | Upload anônimo: 403 ✅
- Admin routes agora com role check ✅
- `robots.txt` com 25 bots IA ✅

### Infraestrutura
- PM2 online (restart automático) | Nginx active ✅
- DB SQLite 185MB, 67 tabelas
- 60 usuários, 187 novels, 172 mangás
- Wal-mode ativo

### Pagamentos
- Mercado Pago Checkout Pro (card/boleto/PIX) ✅
- PIX direto via API ✅
- Preapproval (assinatura recorrente via cartão) ✅
- Webhook com validação de assinatura HMAC ✅
- Cancelamento de assinatura + preapproval no MP ✅

### Carteira e Saque
- Wallet real (pending/available/withdrawn) ✅
- Taxa 10% configurada ✅
- Saque mínimo R$ 50 ✅
- Admin confirma saque ✅
- Seller profile application ✅

---

## ⚠️ O que foi corrigido durante a verificação

| # | Problema | Arquivo | Correção |
|---|----------|---------|----------|
| 1 | `/admin/users` sem verificação de admin | `admin/users/page.tsx` | Adicionado `getCurrentUser()` + role check |
| 2 | `/admin-bootstrap` expõe credenciais admin para qualquer logado | `admin-bootstrap/page.tsx` | Adicionado `user.role !== "admin"` + redirect |
| 3 | Assinaturas nunca expiram | `src/lib/subscriptions.ts` | `getUserActiveSubscription` agora verifica `current_period_end >= datetime('now')` |
| 4 | Sem expiração automática | `scripts/expire-subscriptions.js` + cron VPS 2am | Cron diário que expira assinaturas vencidas |
| 5 | Sem backup automático | `scripts/backup-database.js` + cron VPS 3am | Backup diário com retenção de 7 dias |
| 6 | Sem renovação recorrente | `src/app/api/payments/preapproval/route.ts` + `subscriptions.ts` | Nova rota `/api/payments/preapproval` + webhook para preapproval |
| 7 | 9 contas anônimas "author-xxxx" | VPS DB | Suspensas via `user_access_controls` |

---

## 📋 Checklist Final

| # | Pergunta | Status | Observação |
|---|----------|--------|------------|
| 1 | Site pronto para publicação oficial? | ✅ **Sim** | Todas as pendências resolvidas |
| 2 | Backup automático diário? | ✅ Instalado (3am VPS) | Retenção 7 dias, WAL checkpoint |
| 3 | Expiração de plano? | ✅ Cron 2am + check em tempo real | |
| 4 | Renovação automática? | ✅ Preapproval MP (cartão) | PIX continua manual |
| 5 | Cadastro funciona? | ✅ | |
| 6 | Login/Logout/Sessão? | ✅ | |
| 7 | Admin seguro? | ✅ | 2 bugs corrigidos |
| 8 | Pagamento MP funciona? | ✅ | Checkout + PIX + preapproval |
| 9 | Webhook funciona? | ✅ | HMAC + preapproval topics |
| 10 | Saldo funciona? | ✅ | Wallet via seller_profiles |
| 11 | Saque funciona? | ✅ | Requer seller_profile, min R$50, taxa 10% |
| 12 | Admin financeiro funciona? | ✅ | |
| 13 | Publicação de obras? | ✅ | |
| 14 | Feed? | ⚠️ Funciona, 2 posts | |
| 15 | Segurança geral? | ✅ | Headers, bot-block, fail2ban, role checks |
| 16 | Performance? | ✅ | RAM/CPU ok |
| 17 | Contas de teste limpas? | ✅ 9 author-xxxx suspensos | 49 autores reais mantidos |

---

## 🧪 Resultado dos Testes

```txt
=== PAGES ===
/                        200  /feed               200  /catalogo         200
/auth/login              200  /auth/signup        200  /loja             200
/store/plans             200  /termos             200  /privacidade      200
/sobre                   200  /contato            200  /explore          200
/publicar                200  /how-to             200  /search           200
/autor-plus              200  /concurso           200  /livros           200
/manga                   200  /novels             200  /web-novels       200
/mangas                  200  /notifications      200

=== SECURITY ===
HTTP→HTTPS      301  GPTBot blocked  403  Seed blocked      405
Upload anon     403  Admin wrong     401  Port 3000       CLOSED

=== INFRA ===
PM2:    online (pid 48907)
Nginx:  active
UFW:    active
fail2ban: active
Disco:  11% (61G)
RAM:    931Mi / 15Gi
```

---

## 🕒 Crons Instalados na VPS

| Horário | Comando | Função |
|---------|---------|--------|
| `0,20,40 * * * *` | Python cron bot | Postagem automática Telegram |
| `0 2 * * *` | `node scripts/expire-subscriptions.js` | Expira assinaturas vencidas |
| `0 3 * * *` | `node scripts/backup-database.js` | Backup DB + rotação 7 dias |

---

## 📁 Arquivos modificados/criados

```txt
M src/app/admin/users/page.tsx          (role check)
M src/app/admin-bootstrap/page.tsx      (role check)
M src/app/dashboard/subscription/page.tsx (expiração)
M src/app/store/plans/page.tsx          (preapproval buttons + manual renewal doc)
M src/app/api/payments/cancel/route.ts  (cancela preapproval MP)
M src/app/api/payments/mercadopago-webhook/route.ts (preapproval topics)
A src/app/api/payments/preapproval/route.ts (nova rota preapproval)
M src/lib/subscriptions.ts              (createPreapproval, cancelPreapproval, expires_at check)
M src/lib/db.ts                         (mp_preapproval_id column)
A scripts/expire-subscriptions.js       (cron expiração)
A scripts/backup-database.js            (cron backup)
A scripts/clean-anonymous-authors.js    (suspender contas anônimas)
M docs/verificacao-oficial-pre-publicacao.md (este relatório)
```

---

## 🔗 Links úteis

- **GitHub:** https://github.com/Tiothor1/tomoverso
- **Site:** https://tomoverso.studio
- **VPS:** 40.116.106.139 (SSH: Tiothor1)
- **Backups:** `/var/www/tomoverso/data-runtime/backups/` (diário 3am)
