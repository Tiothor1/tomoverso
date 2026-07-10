# Padrão oficial de formatação — Tomoverso

## Backup

- Backup criado: **sim**
- Caminho: `/var/www/tomoverso/backups/backup-before-official-reader-standard-2026-07-10-1302.db`
- SQLite integrity_check: **ok**

## Auditoria

- Obras/novels visíveis auditadas: **171**
- Capítulos visíveis auditados: **735**
- Livros visíveis auditados: **50**
- Capítulos com marcadores proibidos antes: **0**
- Livros com marcadores proibidos antes: **50**
- Capítulos com marcadores proibidos depois: **0**
- Livros com marcadores proibidos depois: **0**
- Capítulos originais públicos abaixo de 1500 palavras depois: **0**
- Livros públicos abaixo de 3500 caracteres depois: **0**

## Correções aplicadas

- Capítulos limpos/reformatados: **0**
- Parágrafos/páginas narrativas normalizados: **0**
- Obras/novels ocultadas para revisão por nota abaixo de 8: **18**
- Livros limpos/reformatados: **50**
- Livros ocultados para revisão por nota abaixo de 8: **0**
- Páginas de livro recalculadas: **300**
- Média de caracteres por página de livro: **5092**
- Média de palavras por capítulo LN original: **1547**

## Melhorias no leitor

- Light novel: `.light-novel-reader` com fonte 18px, line-height 1.75, parágrafos menores, justify no desktop e left no mobile.
- Livro: `.book-reader` com fonte 18px, line-height 1.8, recuo literário de 1.5em, justify no desktop e left no mobile.
- Container oficial: max-width 760px, margin auto, padding 32px 20px.
- Separador de cena `***` renderizado como elemento visual discreto.
- Cleaner compartilhado remove `Página X`, `Capítulo X`, `Sinopse:`, `Subtítulo:`, `Resumo:`, `Continuação:`, `Texto gerado:` e comentários internos de planejamento.

## Antes/depois

- Antes: conteúdo podia aparecer como bloco único ou conter metadados/comentários dentro da narrativa.
- Depois: leitor renderiza somente narrativa limpa, com parágrafos separados, diálogo preservado e sem marcador artificial no corpo do texto.

## Testes obrigatórios

- `npx tsx scripts/test-reader-format.ts`
- `node scripts/audit-official-reader-standard.cjs`
- `npm run build`
- `pm2 restart tomoverso`
- `pm2 status`
- `sudo -n nginx -t`
- `node scripts/verify-official-reader-standard.mjs`
- Rotas: `/catalogo`, `/feed`, `/admin-secreto`, leitor LN e leitor livro.

## Pendências

- Existem itens ocultados para revisão humana por não atingirem média 8 após limpeza automática.
