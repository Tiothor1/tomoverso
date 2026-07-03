# Admin Hub V2 — Tomo Verso Editora

Revamp geral do hub administrativo secreto da Tomo Verso Editora.

## Status

Implementado no código local em `src/app/admin-secreto/*` com novo visual dark premium, navegação lateral, topbar, cards, ações com confirmação, estados vazios e consultas resilientes.

## Segurança preservada

O revamp **não substitui nem altera o sistema de entrada do admin**.

Mantido exatamente o fluxo existente:

- `ADMIN_SECRET_PATH` continua sendo lido no middleware.
- O link secreto continua sendo reescrito para `/admin-secreto`.
- `src/middleware.ts` não foi alterado.
- `/api/admin/login` não foi alterada.
- Cookie `admin_validated` continua sendo exigido pelas páginas secretas.
- Cookie `tomoverso-session` continua sendo validado via autenticação existente.
- Usuário precisa continuar com `role = 'admin'`.
- Tabela `admin_auth` e fluxo de setup/2FA/CPF existentes não foram trocados.
- Nenhum login novo foi criado.
- Nenhuma rota pública nova substitui o admin secreto.

### Novo helper de proteção

Foi criado `src/lib/admin/admin-v2-auth.ts` apenas para reutilizar a validação já existente nas novas páginas/actions:

- lê `ADMIN_SECRET_PATH`;
- verifica `admin_validated`;
- chama `getCurrentUser()`;
- exige `user.role === 'admin'`;
- redireciona para o link secreto quando necessário.

Esse helper não muda a segurança; ele só evita duplicação no Admin Hub V2.

## O que foi refeito

### Layout secreto

Novo layout compartilhado em `src/components/admin-v2/`:

- `admin-hub-shell.tsx` — shell geral com sidebar/topbar/responsividade.
- `admin-hub-badge.tsx` — badges de status.
- `admin-hub-card.tsx` — cards de métricas e ações.
- `admin-hub-empty.tsx` — estados vazio/erro.
- `admin-hub-section.tsx` — blocos editoriais.
- `admin-upload-zone.tsx` — upload drag-and-drop para `/api/admin/uploads`.
- `confirm-submit-button.tsx` — botão client-side com confirmação para ações perigosas.

### Páginas secretas renovadas

Rotas revampadas:

- `/{ADMIN_SECRET_PATH}` → dashboard V2.
- `/{ADMIN_SECRET_PATH}/novels` → gestão de novels.
- `/{ADMIN_SECRET_PATH}/mangas` → gestão de mangás.
- `/{ADMIN_SECRET_PATH}/usuarios` → usuários, e-mail inline, ban/desban, delete.
- `/{ADMIN_SECRET_PATH}/comentarios` → comentários recentes e soft delete.
- `/{ADMIN_SECRET_PATH}/finance` → financeiro, BRL, saques e pagamentos.
- `/{ADMIN_SECRET_PATH}/upload` → upload moderno e histórico de imports.
- `/{ADMIN_SECRET_PATH}/analise` → análise/fila de importações.

Rotas secretas novas integradas ao hub:

- `/{ADMIN_SECRET_PATH}/feed` → administração visual do feed.
- `/{ADMIN_SECRET_PATH}/moderacao` → denúncias/moderação resiliente.

## Funcionalidades mantidas

### Dashboard

Mantém e reorganiza métricas principais:

- usuários;
- novels;
- mangás;
- capítulos;
- comentários;
- sessões;
- autores/vendedores;
- receita;
- saques pendentes;
- views quando disponíveis;
- alertas de importações, denúncias e saúde.

### Novels

Mantém:

- listagem;
- busca por título/slug/autor;
- contagem de capítulos;
- status visual;
- abrir obra no site;
- ver leitor/capítulos quando disponível;
- excluir com cascade seguro via server action.

### Mangás

Mantém:

- listagem;
- busca por título/slug;
- capa/preview;
- contagem de capítulos;
- abrir mangá no site;
- excluir com confirmação.

### Usuários

Mantém:

- busca por username/e-mail/display name;
- filtro por role/status;
- ignora autores externos `%@external.author`;
- edição inline de e-mail;
- banir/desbanir;
- excluir usuário;
- destaque para admins.

### Comentários

Mantém:

- listagem de comentários recentes;
- usuário;
- obra vinculada;
- preview;
- filtro por busca;
- ocultar/remover por soft delete.

### Financeiro

Mantém:

- total vendido;
- recebido líquido;
- pago a autores;
- saldo/saques pendentes;
- confirmar pagamento de saque;
- tabelas/histórico de pagamentos.

### Upload/importações

Mantém:

- upload de PDF, TXT, EPUB, DOCX e MD;
- POST `/api/admin/uploads`;
- últimos imports;
- aprovar/concluir import;
- excluir import.

## Funcionalidades novas/melhoradas

- Visual dark premium editorial/tecnológico.
- Sidebar organizada por Conteúdo, Comunidade, Financeiro, Importações e Site/Sistema.
- Topbar com busca global, botão voltar para o site, status admin e ambiente.
- Cards inteligentes com ícones, cor e descrição.
- Estados vazios e erros amigáveis.
- Confirmações client-side para ações destrutivas.
- Tabelas transformadas em cards responsivos no mobile.
- Botões para abrir páginas públicas do site principal.
- Feed admin preparado para posts, engajamento, denúncias e ocultação.
- Moderação resiliente para `reports` e `feed_reports`.
- Queries seguras com fallback quando tabelas não existem.
- Helper `src/lib/admin/admin-v2-data.ts` com:
  - `safeCount`;
  - `safeSum`;
  - `safeAll`;
  - `safeGet`;
  - `safeRun`;
  - `tableExists`;
  - formatadores BRL/número/texto.

## Integração com o site principal

O hub aponta ações para o site público:

- abrir site principal;
- abrir feed;
- abrir novel pública;
- abrir mangá público;
- abrir leitor/capítulo quando houver slug;
- abrir perfil de usuário;
- administrar curadoria em `/admin/catalog/curation`;
- administrar site em `/admin/site`;
- acessar commerce/sellers/integrations/imports/stats pelo menu.

Ações com reflexo público:

- ocultar comentário atualiza status/soft delete;
- banir usuário altera controles de acesso;
- excluir novel/mangá remove conteúdo e dependências principais;
- ocultar post do feed muda status/visibilidade quando tabelas existem;
- confirmar saque atualiza status financeiro;
- concluir import atualiza fila.

## Admin público `/admin`

O `/admin` existente foi mantido separado para não quebrar funcionalidades já protegidas por role admin.

Ele foi integrado visualmente por links no novo hub secreto:

- `/admin`;
- `/admin/site`;
- `/admin/catalog/curation`;
- `/admin/users`;
- `/admin/sellers`;
- `/admin/commerce`;
- `/admin/integrations`;
- `/admin/imports`;
- `/admin/stats`.

## Arquivos principais alterados/criados

### Alterados

- `src/app/admin-secreto/page.tsx`
- `src/app/admin-secreto/novels/page.tsx`
- `src/app/admin-secreto/mangas/page.tsx`
- `src/app/admin-secreto/usuarios/page.tsx`
- `src/app/admin-secreto/comentarios/page.tsx`
- `src/app/admin-secreto/finance/page.tsx`
- `src/app/admin-secreto/upload/page.tsx`
- `src/app/admin-secreto/analise/page.tsx`

### Criados

- `src/app/admin-secreto/feed/page.tsx`
- `src/app/admin-secreto/moderacao/page.tsx`
- `src/components/admin-v2/admin-hub-shell.tsx`
- `src/components/admin-v2/admin-hub-badge.tsx`
- `src/components/admin-v2/admin-hub-card.tsx`
- `src/components/admin-v2/admin-hub-empty.tsx`
- `src/components/admin-v2/admin-hub-section.tsx`
- `src/components/admin-v2/admin-upload-zone.tsx`
- `src/components/admin-v2/confirm-submit-button.tsx`
- `src/lib/admin/admin-v2-auth.ts`
- `src/lib/admin/admin-v2-data.ts`
- `src/lib/admin/admin-v2-actions.ts`
- `docs/admin-hub-v2.md`

## Como testar

### Build/TypeScript

```bash
npx tsc --noEmit
npm run build
```

### Rotas secretas

Acesse pelo link secreto real:

```txt
/{ADMIN_SECRET_PATH}
/{ADMIN_SECRET_PATH}/novels
/{ADMIN_SECRET_PATH}/mangas
/{ADMIN_SECRET_PATH}/usuarios
/{ADMIN_SECRET_PATH}/comentarios
/{ADMIN_SECRET_PATH}/finance
/{ADMIN_SECRET_PATH}/upload
/{ADMIN_SECRET_PATH}/analise
/{ADMIN_SECRET_PATH}/feed
/{ADMIN_SECRET_PATH}/moderacao
```

### Rotas públicas admin mantidas

```txt
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

## Observações técnicas

- `redirect()` foi mantido fora de blocos que engolem `NEXT_REDIRECT` nos helpers novos.
- `searchParams` é tratado aceitando Promise ou objeto comum.
- Server actions validam admin no servidor antes de ações perigosas.
- Tabelas opcionais usam helpers resilientes para mostrar "Dados indisponíveis neste ambiente" em vez de quebrar.
- A rota de upload continua usando a API existente `/api/admin/uploads`.
- Não foram feitas exclusões destrutivas nos testes.

## Pendências futuras opcionais

- Unificar visual do `/admin` público com o shell V2 caso queira um único admin totalmente padronizado.
- Adicionar colunas específicas para destaque/feed se ainda não existirem em alguns ambientes.
- Criar auditoria de logs detalhada por ação admin.
- Evoluir confirmação para modal custom em vez de `window.confirm`.
