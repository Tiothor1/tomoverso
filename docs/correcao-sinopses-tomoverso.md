# Correção Estrutural das Sinopses — Tomoverso

**Data:** 2026-07-11  
**Status:** ✅ Concluído  
**DB:** 237 obras no total (50 originais TomoVerso + 187 importadas)

---

## Resumo

As sinopses estavam **contaminadas** com metadados misturados ao texto narrativo: classificação indicativa, avisos de conteúdo, status, notas de fonte (`[From ...]`), "O diferencial da obra é...", e o boilerplate "é uma obra original Tomo Verso sobre...". O frontend exibia tudo como um bloco único de texto.

## O que foi feito

### 1. Banco de Dados — Novas Colunas

Adicionadas 7 colunas à tabela `novels`:

| Coluna | Descrição |
|---|---|
| `subtitle` | Subtítulo da obra |
| `tagline` | Frase de impacto |
| `target_audience` | Público-alvo |
| `tone` | Gênero/estilo (ex: "comédia romântica", "romance BL") |
| `internal_notes` | Notas internas (ex: "O diferencial da obra é...") |
| `classification_rating` | Classificação indicativa (+18, +16) |
| `content_warnings` | Avisos de conteúdo |

### 2. Sinopses — Limpeza

- **50 obras originais TomoVerso**: boilerplate removido e sinopses reescritas em 2 parágrafos com narrativa própria
- **39 obras importadas**: notas de fonte `[From ...]`, `[Edited from ...]` removidas
- **2 obras**: classificação (+18) e avisos extraídos para colunas próprias (Demon King, O Que Eu Desenhei Existe)
- **237 obras verificadas**: zero contaminação residual (0 classificação, 0 avisos, 0 status, 0 diferencial, 0 fontes)

### 3. Metadados — Separados

- **Tone**: extraído do boilerplate "Ao lado de [nome], a história desenvolve um [gênero]..." → salvo na coluna `tone` (apenas o nome do gênero)
- **Internal notes**: "O diferencial da obra é..." extraído para `internal_notes`
- **Classification**: "+18" e "+16" extraídos para `classification_rating`
- **Content warnings**: avisos de conteúdo extraídos para `content_warnings`

### 4. Frontend — Página da Obra

`src/app/novels/[slug]/page.tsx` atualizado:

- **Sinopse**: texto narrativo puro, sem metadados
- **Badge de classificação**: vermelho (`+18`, `+16`) quando presente
- **Badge de tom**: badge secundário com "Tom: comédia romântica"
- **Card de avisos**: card amarelo com avisos de conteúdo quando presentes
- **Tags**: mantidas abaixo dos metadados

### 5. Quantidade de alterações

```
Total obras no DB: 237
Sinopses reescritas: 50 (obras originais TomoVerso)
Notas de fonte removidas: 39 (obras importadas)
Classificação extraída: 2 obras
Avisos extraídos: 2 obras
Tones extraídos: 50 obras
Sinopses mantidas intactas: 146 obras (já estavam limpas)
```

## Scripts usados

| Script | Função |
|---|---|
| `fix-all-synopses-v3.js` | Adicionar colunas + reescrever originais + limpar importados (primeira versão) |
| `fix-tones-v2.js` | Corrigir extração de tone (regex com âncora) |
| `fix-tones-and-synopses-v4.js` | Remover boilerplate "com conflito emocional..." do tone + corrigir gramática das sinopses |
| `fix-3-manual.js` | Reescrita manual de 3 sinopses com settings sem artigo |
| `fix-all-synopses.js` | Script inicial (v1) — substituído pelo v3 |

## Backups

| Arquivo | Timestamp |
|---|---|
| `tomoverso.backup-1783724965013.db` | 2026-07-10 — estado original pré-correção |
| `tomoverso.backup-v3-1783782857140.db` | 2026-07-11 — backup antes do v3 |
| `tomoverso.backup-synopses-1783782437177.db` | 2026-07-11 — backup do v1 |

## Verificação final

Comando executado no banco VPS:
```sql
-- Zero contaminação nas sinopses
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%Classificação indicativa%'; -- 0
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%Avisos de conteúdo%';       -- 0
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%Status:%';                  -- 0
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%O diferencial%';            -- 0
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%[From%';                    -- 0
SELECT COUNT(*) FROM novels WHERE synopsis LIKE '%[Edited%';                  -- 0
```

## Exemplo

**Antes:**
> A Chef e o Crítico Desastrado é uma obra original Tomo Verso sobre Catarina Alves, cuja rotina muda em um restaurante familiar recém-reaberto. Catarina precisa de uma crítica boa e Otto é o crítico sincero que derruba molho em tudo. Ao lado de Otto Brandão, a história desenvolve um comédia romântica com conflito emocional claro, aproximação gradual e escolhas que mudam a vida dos personagens. O diferencial da obra é comédia romântica gastronômica com rivalidade leve e família. Status: Em andamento. +. Classificação indicativa: +18. Avisos de conteúdo: romance adulto consensual; tensão sensual.

**Depois (sinopse limpa):**
> Em um restaurante familiar recém-reaberto, a vida de Catarina Alves está prestes a mudar.
> 
> Catarina precisa de uma crítica boa e Otto é o crítico sincero que derruba molho em tudo.

**Metadados separados:**
- Tone: comédia romântica
- Classificação: +18
- Tags: comédia romântica, romance leve, química...
