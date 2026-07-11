# Correção Estrutural das Sinopses — Tomoverso

**Data:** 2026-07-11  
**Status:** ✅ Concluído  
**DB inicial:** 237 obras em `novels` (50 originais TomoVerso + 187 importadas)  
**DB após correção:** 237 `novels` + 50 `books` + 172 `mangas` = **459 obras verificadas**

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
## Escopo expandido

Após o usuário reportar que o problema persistia, a correção foi expandida para **todas as tabelas**:

| Tabela | Obras | Contaminação | Status |
|---|---|---|---|
| `novels` | 237 | Boilerplate + classificação + avisos + fontes | ✅ Limpo |
| `books` | 50 | Subtítulo + Sinopse + Tom + Público + Tags + Classificação | ✅ Limpo |
| `mangas` | 172 | Nenhuma contaminação detectada | ✅ OK |

### Tabela `books` — Correção adicional

As obras em `books` tinham um formato diferente: **todos os metadados embutidos no campo `synopsis`** com labels explícitos:

```
Subtítulo: ... Sinopse: ... Frase de impacto: ... Público: ... Tom: ... Tags: ... Classificação: ...
```

Foram adicionadas as mesmas 7 colunas da `novels` e cada metadado extraído para seu campo. As sinopses ficaram apenas com o texto narrativo, e o público-alvo (target_audience) foi populado com base em padrões como "Leitores de..." e "Fãs de...".

## Quantidade total de alterações

```
Total obras auditadas: 459 (237 novels + 50 books + 172 mangas)
Sinopses reescritas: 50 (obras originais TomoVerso)
Notas de fonte removidas: 39 (obras importadas)
Metadados extraídos: 50 books (subtítulo, tagline, tom, público)
Classificação extraída: 2 obras (novels)
Avisos extraídos: 52 obras (2 novels + 50 books)
Tones extraídos: 100 obras (50 novels + 50 books)
Sinopses mantidas intactas: 318 obras (já estavam limpas)
```

## Exemplo (books)

**Antes:**
> Subtítulo: O jogo acabou. A escola começou. Sinopse: Depois de zerar o RPG mais difícil do mundo, Theo acorda na segunda-feira e encontra o chefe final sentado na carteira ao lado... Frase de impacto: "Ele derrotou o chefão. Agora precisa dividir lanche com ele." Público: Leitores gamers... Tom: Caótico... Tags: #chefefinal... Status: conceito · Classificação: 12+

**Depois (sinopse limpa):**
> Depois de zerar o RPG mais difícil do mundo, Theo acorda na segunda-feira e encontra o chefe final sentado na carteira ao lado, usando uniforme e tentando entender matemática. Ninguém mais parece notar que o aluno novo já destruiu continentes digitais. Para impedir que a realidade vire uma fase secreta, Theo terá que ensinar o vilão a sobreviver ao ensino médio — e descobrir por que o jogo escolheu justamente sua vida para continuar.

**Metadados separados:**
- Subtítulo: O jogo acabou. A escola começou.
- Tagline: "Ele derrotou o chefão. Agora precisa dividir lanche com ele."
- Tom: Caótico, engraçado, cheio de ação e amizade improvável
- Público: Leitores gamers, fãs de fantasia moderna, comédia escolar

