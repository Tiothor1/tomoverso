# Prompt Chaining Workflow

## Objetivo

Passar estado visual de uma página/painel para o próximo para evitar drift.

## Cadeia mínima

1. `Previous State`: o que está igual.
2. `Changed State`: o que mudou neste painel.
3. `Locked Character`: visual fixo.
4. `Locked Scene`: local, hora, luz, dano.
5. `Action Continuation`: continuação direta da ação anterior.
6. `Bubble Zone`: onde deixar espaço.
7. `Negative Drift`: proibições específicas.

## Modelo

“Continuation from page X panel Y: [state]. Keep [character lock]. Changed only: [change]. Scene remains [scene lock]. Compose [camera]. Reserve [bubble space]. Do not [negative drift].”

## Memória visual

Quando possível, usar imagem de referência autorizada/própria. Se não houver, reforçar descritores fixos e revisar cada saída contra a ficha.

## Exemplo Lua de Ferro
P4 painel 4 continua P4 painel 3: Ícaro avançou com lâmina na mão direita; Caio bloqueou com lança; brasas subiram; corte esquerdo ainda sangra. Mudança: a corrente prende na lança. Não mudar roupa/rosto/arma.

## Checklist
- [ ] Estado anterior explícito.
- [ ] Mudança única clara.
- [ ] Negativos específicos.
- [ ] Área de balão.
## Cicatrizário do Abismo — prompt chaining aprendido em produção

Não encadear prompts com `same character` apenas. Cada prompt de painel deve repetir o character lock completo do protagonista e o negative prompt completo. Para Ren: rosto fino, cabelo preto médio bagunçado, olhos castanho-escuros cansados, cicatriz no lábio inferior, corpo magro, túnica cinza simples em Arvhal e F-0 visível. A cadeia deve carregar também proibições: joias, colares, armadura, roupa nobre, idade diferente e corpo musculoso.
