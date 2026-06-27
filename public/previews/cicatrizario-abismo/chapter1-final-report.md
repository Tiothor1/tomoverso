# Capítulo 1 Final — Relatório

## Status

```txt
Capítulo 1 ainda não aprovado para produção contínua.
```

## O que foi corrigido
- V1 foi auditado bloco por bloco.
- Foram criados:
  - `chapter1-visual-audit.md`
  - `ren-character-reference-sheet.md`
  - `style-bible.md`
  - `visual-continuity-lock.md`
  - `ren-fixed-prompt.md`
  - `chapter1-block-prompts-v2.md`
  - `chapter1-regeneration-plan.md`
- Foi criado um retrato canônico de referência:
  - `reference-assets/ren-reference-portrait.jpg`
  - `reference-assets/ren-face-canonical.png`
- Foi reconstruída uma versão final candidata:
  - `chapter1-final-scroll.jpg`
  - `chapter1-final-scroll-preview.jpg`
  - `chapter1-final-scroll.html`
- O piloto V1 não foi sobrescrito.

## Blocos mantidos como referência de composição
- 01 Cold open
- 02 Trinta dias antes
- 03 O acidente
- 15 O olho no escuro
- 20 Dívida futura

## Blocos reconstruídos/corrigidos
Todos os blocos 1–20 foram recompostos na versão final candidata com:
- fundo tratado do V1;
- Ren determinístico;
- F-0 local e fixo;
- balões locais;
- interface do Cicatrizário local.

## Blocos problemáticos no V1
- 04, 05, 06, 07, 09, 10, 11, 13, 19 foram os piores em drift.
- Problemas recorrentes: joias, roupa branca/nobre, roupa preta, colares, idade variando, rosto mudando, F-0 remendado.

## Melhorias na consistência do Ren
- Roupa Arvhal agora é sempre cinza simples.
- F-0 aparece de forma constante quando o peito aparece.
- Corpo e proporção foram padronizados.
- Cabelo/face foram estabilizados no pipeline, ainda que com acabamento simples.

## Melhorias nos balões
- Balões são locais e legíveis.
- Texto não depende mais do modelo de imagem.
- Ordem vertical ficou clara.

## Limitações restantes
- A versão final candidata perdeu acabamento painterly/manhwa comercial.
- A emoção e impacto visual caíram em alguns painéis por causa da solução vetorial.
- A tentativa V3 com face canônica painterly foi descartada por parecer colagem.
- Sem `FAL_KEY`, não há referência fixa real em geração; fallback público não garante consistência profissional.

## Dependência de FAL_KEY

```txt
Sem FAL_KEY, esta versão pode ser boa para preview/piloto técnico, mas a versão comercial final ideal exige geração com referência fixa ou modelo controlado.
```

## Nota final

```txt
2.54 / 3.00
```

## Aprovação

```txt
REPROVADO
```

## O que falta para aprovação
1. Ativar `FAL_KEY` ou backend equivalente com referência fixa.
2. Usar `ren-reference-portrait.jpg` como character reference.
3. Regenerar os blocos críticos mantendo balões em pós-produção.
4. Rodar novo QA e atingir:
   - média >= 2.7;
   - personagem >= 2.6;
   - continuidade >= 2.6;
   - balões >= 2.5;
   - gancho >= 2.8.
