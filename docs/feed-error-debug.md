# Diagnóstico do erro em `/feed`

Data: 2026-06-30

## Sintoma investigado

A rota pública `/feed` podia cair em erro fatal de renderização quando qualquer etapa do feed falhava no servidor ou em Server Actions:

- abertura inicial da rota (`getDb`, `getFeedPage`, `getFeedWorkOptions`);
- criação/atualização do schema do feed em runtime;
- ações do cliente como curtir, salvar, seguir, comentar, republicar, ocultar ou registrar impressão.

## Evidências coletadas

### Produção pública

- `https://tomoverso.vercel.app/feed` respondeu 200 durante a checagem manual.
- Console do browser não mostrou erro JS na carga observada.
- Logs privados da Vercel não puderam ser coletados neste terminal porque o Vercel CLI não estava autenticado:

```text
Vercel CLI 54.18.1 (Node.js 24.16.0)
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

### Seed usado em cold start

O arquivo versionado usado como base em cold start é `data/tomoverso.seed.db.gz`. Ele foi inspecionado separadamente e não contém as tabelas auxiliares do feed antes da inicialização runtime. Isso torna obrigatório que o schema do feed seja criado de forma segura em runtime e que falhas não derrubem a rota.

### Repro controlado local

Foi simulado um cold start removendo `/tmp/tomoverso` e carregando o banco a partir do seed comprimido com `VERCEL=1 NODE_ENV=production`. O fluxo do feed precisa conseguir:

- abrir a página inicial do feed;
- criar/garantir tabelas do feed;
- listar opções de obras;
- executar ações principais quando há usuário.

Com a correção aplicada, o harness retornou:

```text
page 8 8
options 40
like true
comment true
repost true
hide true
feed tables feed_comments,feed_impressions,feed_interactions,feed_posts,feed_reports,saved_feed_items,user_reading_signals
```

## Causa raiz

A rota `/feed` era frágil contra falhas de infraestrutura/dados do próprio feed:

1. `src/app/feed/page.tsx` chamava `getDb()`, `getFeedPage()` e `getFeedWorkOptions()` diretamente no Server Component sem fallback de rota.
2. `src/lib/actions/feed-actions.ts` deixava exceções de DB/auth/feed service escaparem de Server Actions.
3. `src/components/feed/feed-scroller.tsx` assumia que Server Actions e APIs de browser (`IntersectionObserver`, `navigator.share`, `navigator.clipboard`) sempre existiriam e sempre resolveriam sem exceção.
4. `src/components/feed/feed-comment-drawer.tsx` não tinha fallback se o carregamento de comentários rejeitasse.

Resultado: uma falha pontual de DB/schema/action podia virar tela quebrada em vez de degradar para mensagem segura.

## Correção aplicada

- `src/app/feed/page.tsx`
  - adiciona fallback server-side para a rota;
  - registra erro com prefixo `[feed]`;
  - exibe tela segura com links para tentar novamente ou explorar obras.

- `src/app/feed/error.tsx`
  - adiciona error boundary específico da rota `/feed`.

- `src/lib/actions/feed-actions.ts`
  - envolve Server Actions em `try/catch`;
  - retorna `feed_unavailable`, arrays vazios ou página vazia segura quando o feed falha;
  - preserva `login_required` e validações de alvo.

- `src/components/feed/feed-scroller.tsx`
  - protege `IntersectionObserver`, refresh, paginação, compartilhar, republicar, ocultar, comentar e criar post;
  - mostra mensagens amigáveis sem crashar o client.

- `src/components/feed/feed-comment-drawer.tsx`
  - fallback para lista vazia se `loadComments` falhar.

## Comandos de verificação

```bash
cd /d/Site-LN
npm run migrate
npx tsc --noEmit
npm run build
npm run start
curl -sS -o .feed-start-after.html -w "%{http_code}" http://localhost:3000/feed
npm run dev
curl -sS -o .feed-dev-after.html -w "%{http_code}" http://localhost:3000/feed
curl -sS -o .feed-prod.html -w "%{http_code}" https://tomoverso.vercel.app/feed
```

## Resultados finais obtidos

- `npm run migrate`: exit 0.
- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
- Harness de cold start (`VERCEL=1 NODE_ENV=production` + `/tmp/tomoverso` limpo): 8 cards, 40 opções, like/comment/repost/hide OK e tabelas do feed criadas.
- `npm run dev` em porta livre: `/feed` retornou HTTP 200, HTML com 8 cards e console do browser sem erros na carga observada.
- `npm run start` em porta livre: `/feed` retornou HTTP 200, HTML com 8 cards e console do browser sem erros na carga observada.
- Produção pública antes do push: `https://tomoverso.vercel.app/feed` retornou HTTP 200, HTML com 8 cards e sem `Application error`/fallback no HTML.

Observação: `next build` ainda mostra o aviso existente de `src/lib/email.ts` sobre `nodemailer` opcional, mas compila com sucesso.

## Correção UX Shorts/Reels aplicada em 2026-06-30

### Sintoma visual real

Mesmo com `/feed` abrindo sem erro, a experiência ainda parecia uma landing page/lista:

- o layout dependia do header/footer globais;
- a rota tinha altura `calc(100dvh - 4rem)`, então o footer aparecia depois do feed;
- o contêiner era uma página rolável comum;
- cada card ocupava uma seção, mas sem shell imersivo real;
- action rail ficava dentro do fluxo do card em vez de se comportar como rail fixo do card atual;
- fechar comentários/criar post precisava preservar o scroll do card ativo.

### Causa UX

A causa não era banco, migration, auth nem Vercel. Era layout/client component:

- `src/app/layout.tsx` sempre renderiza `Navbar`, `ContinueReadingBanner` e `Footer` para todas as rotas;
- `/feed` não colocava a experiência acima do layout global em tela cheia;
- `FeedScroller` usava `h-[calc(100dvh-4rem)]`, herdando a mentalidade de página com navbar;
- `FeedCard` tinha slide vertical, mas o frame desktop não estava isolado como um celular centralizado;
- o carregamento infinito existia, mas era acionado por sentinel/fim de lista, reforçando a sensação de página comprida.

### Correção UX

- `FeedScroller` virou shell fixo `100dvh`, com `body.feed-immersive`, `overflow: hidden`, scroll interno e snap obrigatório.
- `Navbar`, `Footer` e `ContinueReadingBanner` receberam classes (`site-navbar`, `site-footer`, `continue-reading-banner`) e são escondidos só quando `body.feed-immersive` está ativo.
- `FeedCard` agora é um slide `100dvh` com card vertical centralizado no desktop (`520px`) e full-screen no mobile.
- Action rail fica ancorada ao card: ao lado no desktop, lateral direita no mobile.
- O feed carrega mais itens antes do fim quando o usuário se aproxima dos últimos cards, sem recarregar a página e sem botão obrigatório.
- Teclado no desktop: `ArrowDown`, `PageDown` e espaço avançam; `ArrowUp`/`PageUp` voltam.
- Impressões/views só registram após o card ficar visível por ~800ms.
- Comentários e criar post abrem overlay/modal sem resetar o scroll.
- `like`, `save` e `follow` agora também têm `try/catch` no client para não gerar rejection sem tratamento.
- Botões da action rail receberam `aria-label` real para acessibilidade/teste.

### Verificação UX local controlada

Todos os comandos foram rodados separadamente com timeout/log. Servidores `dev`/`start` foram iniciados em background, testados e finalizados.

```text
npm run migrate                 PASS exit 0
npx tsc --noEmit                PASS exit 0
npm run build                   PASS exit 0
GET /feed em npm run start      PASS HTTP 200
GET /feed em npm run dev        PASS HTTP 200
```

Playwright desktop `1365x768`:

```text
PASS cards>=8
PASS body immersive
PASS snap mandatory
PASS card fills viewport height
PASS footer hidden
PASS navbar hidden
PASS no app error
PASS keyboard moved feed
PASS comment dialog opens
PASS comment no reset
PASS create modal opens
PASS like no reset
PASS desktop frame vertical width: 520px
PASS desktop rail beside card
```

Playwright mobile `390x844`:

```text
PASS cards>=8
PASS body immersive
PASS snap mandatory
PASS card fills viewport height
PASS footer hidden
PASS navbar hidden
PASS no app error
PASS mobile frame full width
PASS mobile rail in viewport
PASS mobile CTA visible
PASS comment dialog opens/no reset
PASS create modal opens
PASS like no reset
```

Observação: o ambiente dev ainda mostra avisos já existentes de `nodemailer` opcional e CSP do script de ads; eles não impedem build nem `/feed`.

## Arquivos fora de escopo

Durante a correção, arquivos já modificados fora do feed foram deixados fora do commit:

- `scripts/populate-manga-authors.js`
- `src/app/api/payments/mercadopago-webhook/route.ts`
- `scripts/import-new-novels.js`
