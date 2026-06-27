# Real Project Lessons — Cicatrizário do Abismo

## Contexto real
Durante a produção do Capítulo 1 de `Cicatrizário do Abismo`, o primeiro piloto visual V1 alcançou bom impacto painterly, mas falhou no requisito mais importante para manhwa com IA: continuidade literal do protagonista entre painéis.

## Problemas encontrados no piloto
- Ren mudava de rosto entre blocos.
- A idade aparente variava de adolescente a adulto mais velho.
- A roupa de Arvhal mudava sem justificativa: túnica cinza virava camisa branca nobre, roupa preta, colares, medalhões, luvas e ornamentos.
- A etiqueta F-0 foi aplicada como overlay, mas não estava integrada à cena.
- Blocos com boa pintura ainda eram inválidos porque o protagonista parecia outra pessoa.
- O fallback público gerou imagens impactantes, mas não respeitou character lock de forma profissional.

## Como o drift apareceu
- Prompts longos citavam Ren, mas o modelo reinterpretou o personagem em cada painel.
- A frase “same character” ou descrições parciais não bastam.
- Mudança de cenário/luz fez o modelo redesenhar roupa e status social do personagem.
- Painéis de catedral adicionaram joias/ornamentos porque o modelo associou “summoned hero” a roupa nobre.
- Painéis de humilhação e pátio trocaram a túnica por roupas modernas ou genéricas.

## Correções aplicadas
- Auditoria bloco por bloco com nota 0–3.
- Character Reference Sheet do Ren.
- Style Bible da obra.
- Visual Continuity Lock.
- Prompt fixo imutável do Ren.
- Prompt V2 por bloco.
- F-0 e balões em pós-produção local.
- Reconstrução técnica com Ren determinístico para eliminar drift.

## Resultado prático
A reconstrução técnica corrigiu a consistência, mas reduziu a qualidade painterly/comercial. Tentativa de aplicar face canônica única por cima criou artefato de colagem. Portanto:

```txt
Sem backend com referência fixa, dá para fazer piloto técnico consistente, mas não garantir final comercial de manhwa.
```

## Regra nova para próximos capítulos
1. Nunca gerar capítulo final sem antes criar `ren-character-reference-sheet.md`, `style-bible.md`, `visual-continuity-lock.md` e `ren-fixed-prompt.md`.
2. Nunca aceitar painel painterly se Ren parece outra pessoa.
3. Nunca aceitar roupa de Ren com joias, colar, armadura ou capa nobre quando o lock diz túnica cinza simples.
4. Sempre gerar contact sheet antes de aprovação.
5. Sempre separar:
   - qualidade artística;
   - consistência de personagem;
   - legibilidade de balões;
   - continuidade narrativa.
6. Se `FAL_KEY` estiver ausente, reportar explicitamente que a versão é preview/piloto, não final comercial.
7. Para versão comercial, exigir referência fixa/ControlNet/IP-Adapter/LoRA/modelo com character reference.

## Prompting melhorado
- Repetir descrição completa do Ren em todos os blocos.
- Incluir negative prompt explícito: `different face`, `different hairstyle`, `different outfit`, `missing F-0 mark`, `jewelry`, `armor`, `older appearance`, `younger appearance`.
- Usar “plain rough ash-gray tunic, copper F-0 tag pinned on chest, no jewelry, no armor, no heroic glow” sempre em Arvhal.
- Não confiar no modelo para texto legível; adicionar texto localmente.

## Pós-produção melhorada
- F-0 deve ser overlay determinístico quando o modelo falha.
- Balões devem ser SVG local com margem e ordem clara.
- Interface de sistema/Cicatrizário deve ser overlay local.
- Face colada por cima só é aceitável se tiver máscara, escala e iluminação perfeitas; caso contrário reprovar.

## QA novo obrigatório
- `personagem >= 2.6` não basta se `qualidade_comercial` cair abaixo de 2.4.
- Se a solução de continuidade transformar a arte em animatic/cartoon, marcar como preview técnico, não final comercial.
- A aprovação só pode ocorrer se consistência e qualidade painterly coexistirem.
