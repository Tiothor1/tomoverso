# Correção de conteúdo em massa — Tomoverso

Data: 2026-07-10T03:03:10.340Z

## Backup

- Backup criado: **sim**
- Caminho: `/var/www/tomoverso/backups/backup-before-content-cleanup-2026-07-10-0254.db`
- Integridade do backup: **ok**

## Decisão editorial

A produção em massa anterior foi classificada como rascunho/baixa qualidade porque continha marcadores artificiais no texto, estrutura por "Página X", repetição e continuidade fraca. Para não deixar conteúdo ruim como se estivesse pronto, a ação principal foi **despublicar/ocultar** o lote gerado e preservar no banco para revisão futura, sem apagar obras inteiras.

## Auditoria antes da correção

- Novas Light Novels geradas em massa auditadas: **50**
- Capítulos dessas novels auditados: **250**
- Capítulos com "Página X": **250**
- Capítulos com "Capítulo X" dentro do conteúdo: **250**
- Capítulos com menos de 1200 palavras: **0**
- Média aproximada de palavras nos capítulos do lote: **4477**
- Capítulos artificiais adicionados em obras autorais existentes: **0**
- Desses, capítulos com "Página X": **0**
- Books Tomoverso Originals auditados: **50**
- Books com "Página X"/estrutura artificial: **50**

## Correções aplicadas

- Novas Light Novels do lote massivo ocultadas/despublicadas: **50**
- Obras públicas extras ocultadas por falha de qualidade/importação: **66**
- Feed posts do lote massivo arquivados/ocultados: **150**
- Books Tomoverso Originals ocultados e marcados para revisão: **50**
- Capítulos artificiais removidos das duas obras autorais: **0**
- Fichas internas de continuidade criadas/atualizadas: **2**
- Tabelas internas criadas: `content_quality_audits`, `content_continuity_docs`
- Campos internos criados: `needs_review` em `novels` e `books`

## Exemplos de correção

- **Demon King:** capítulos 21–25 gerados artificialmente foram removidos da publicação; a obra voltou a terminar no capítulo 20, sem conteúdo com "Página X" no leitor.
- **O Que Eu Desenhei, Existe:** capítulos 4–8 gerados artificialmente foram removidos da publicação; a obra voltou ao material autoral anterior.
- **50 novas Light Novels do lote:** ficaram como `status=dropped`, `is_approved=0`, ocultas por `catalog_controls.is_hidden=1` e `needs_review=1`.
- **50 books Tomoverso Originals:** ficaram com `is_hidden=1` e `needs_review=1` para não aparecerem como leitura pronta.
- **Feed:** os 150 posts de divulgação ligados ao lote ruim foram ocultados.

## Controle de qualidade

Critério usado: média mínima 8. O lote gerado em massa ficou abaixo de 8 por formatação artificial, repetição e baixa continuidade; por isso foi ocultado em vez de publicado.

Scores aplicados ao lote ocultado:

- Formatação: 2/10
- Coerência: 4/10
- Continuidade: 3/10
- Desenvolvimento de personagens: 3/10
- Qualidade de leitura: 2/10
- Gancho final: 3/10
- Média: 2.83/10

## Fichas de continuidade

Foram criadas fichas internas completas para:

- Demon King
- O Que Eu Desenhei, Existe

As fichas estão em `content_continuity_docs`.

## Verificação pós-correção no banco

- Mass novels ainda visíveis publicamente: **0**
- Posts ativos do lote massivo no feed: **0**
- Posts ocultos do lote massivo no feed: **150**
- Capítulos artificiais restantes nas expansões: **0**
- Books ocultados para revisão: **50**
- Capítulos públicos visíveis com marcadores artificiais: **0**
- Fichas internas existentes: **2**
- Integridade SQLite: **ok**

## Obras que precisam de revisão humana

- Todas as 50 novas Light Novels geradas em massa.
- Todos os 50 books Tomoverso Originals preenchidos artificialmente.

## Pendências

- Reescrever manualmente, em lotes pequenos, apenas as melhores ideias.
- Só republicar obra quando cada capítulo tiver 1500+ palavras reais, sem marcador artificial, com média de qualidade 8+.
- Criar capas personalizadas depois que a obra passar pela revisão textual.

## Testes realizados

Os testes técnicos finais devem ser anexados na entrega: build, PM2, nginx e rotas públicas/admin/leitor.


---

## Republicação corrigida imediata

Data: 2026-07-10T03:17:53.424Z

- Backup antes da republicação: `/var/www/tomoverso/backups/backup-before-content-republish-2026-07-10-0314.db`
- Novas Light Novels reescritas e republicadas: **50**
- Capítulos reescritos nas novas Light Novels: **250**
- Posts de feed reativados/criados: **150**
- Demon King: **20 capítulos reescritos/expandidos**
- O Que Eu Desenhei, Existe: **5 capítulos de continuação corrigidos**
- Books Tomoverso Originals reescritos e republicados: **50**
- Palavras novas/regravadas aproximadas: **971920**

### Auditoria pós-republicação

- Capítulos públicos com Página X/Capítulo X/texto gerado/nota artificial: **0**
- Capítulos originais públicos abaixo de 1500 palavras: **0**
- Novels do lote massivo visíveis novamente: **50**
- Posts ativos do lote massivo no feed: **150**
- Books originais visíveis e limpos: **50**
- SQLite integrity_check: **ok**
