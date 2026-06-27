# EXAMPLES

Exemplos de uso da skill. São modelos originais; não copiar cenas/páginas existentes.

## 1. Página de diálogo — mangá tradicional

**Formato:** PB, direita→esquerda, 5 painéis.  
**Objetivo:** protagonista decide enfrentar o rival.  
**Continuidade herdada:** corredor destruído, protagonista com manga rasgada e corte no rosto, rival à direita.

### Page Script

1. **Painel 1 — plano geral:** corredor com lâmpadas quebradas. Protagonista à esquerda, rival à direita. Balão do rival no topo direito: “Ainda vai fugir?”
2. **Painel 2 — close no protagonista:** olho tremendo, sangue no rosto. Sem fala.
3. **Painel 3 — detalhe:** mão do protagonista apertando espada rachada.
4. **Painel 4 — meio-corpo do rival:** sorriso confiante. Balão: “Você sempre escolhe tarde demais.”
5. **Painel 5 — painel largo:** protagonista ergue a espada. Balão pequeno: “Hoje não.”

### QA esperado

- Corte no rosto aparece em todos os closes.
- Espada continua rachada.
- Rival permanece à direita até mudança de câmera.
- Balões não cobrem olhos nem espada.

## 2. Página de luta — mangá tradicional

**Formato:** PB, 4 painéis, ação rápida.

1. Plano médio estabelece distância.
2. Pé do atacante avança; linhas de velocidade.
3. Painel diagonal grande: golpe cruza a página com SFX.
4. Consequência: defensor recua, parede racha, sangue no ombro.

**Regra aplicada:** intenção → movimento → impacto → consequência.

## 3. Página dramática

1. Chuva no chão, sem personagem.
2. Close na mão segurando carta molhada.
3. Rosto da personagem; olhos vermelhos, boca fechada.
4. Balão pequeno: “Eu esperei.”
5. Painel silencioso da carta rasgando.

**Regra aplicada:** objeto + silêncio + frase curta = drama.

## 4. Página de comédia

1. Personagem declara: “Meu plano é perfeito.”
2. Painel pequeno mostra o plano escrito de cabeça para baixo.
3. Reação deformada do grupo.
4. Grito pontiagudo: “VOCÊ NEM LEU?!”
5. Retorno ao modelo normal com vergonha.

**Regra aplicada:** deformação temporária não altera Character Lock permanente.

## 5. Página de revelação

1. Plano de sala aparentemente normal.
2. Close em relógio parado.
3. Personagem nota poeira formando símbolo.
4. Espaço silencioso.
5. Painel grande: sombra atrás dele. Balão: “Você voltou.”

**Regra aplicada:** preparar pista antes da revelação.

## 6. Bloco vertical manhwa — ação

**Formato:** colorido, topo→baixo.

1. Bloco de localização: telhado à noite, chuva, neon azul.
2. Respiro escuro.
3. Protagonista pousa no telhado, capa rasgada do capítulo anterior.
4. Balão no espaço vazio: “Cheguei tarde?”
5. Close do vilão, aura vermelha consistente.
6. Longo respiro vertical.
7. Ataque desce em diagonal com SFX integrado.
8. Consequência: chão rachado, protagonista protegendo braço ferido.

### Prompt resumido

```text
Full-color vertical manhwa scroll block. Continue from previous scene on rainy rooftop at night. Protagonist same face, black short hair, torn dark cape, cut on left cheek, injured right forearm, holding cracked sword in right hand. Villain same red aura, white coat, golden eyes. Preserve rain, neon blue lighting, rooftop tiles. Leave empty space above protagonist for bubble. No changed outfit, no healed wounds, no random characters, no text baked into bubbles.
```

## 7. Bubble Script exemplo

| Ordem | Painel | Falante | Texto | Tipo | Posição | Não cobrir |
|---|---|---|---|---|---|---|
| 1 | 1 | Rival | Ainda vai fugir? | normal | topo direito | rosto do rival |
| 2 | 4 | Rival | Você sempre escolhe tarde demais. | normal | superior | sorriso |
| 3 | 5 | Protagonista | Hoje não. | baixo esquerdo | espada e olhos |

## 8. Mini QA aplicado

- [x] Personagem mantém roupa/ferimento.
- [x] Cenário continua.
- [x] Balões seguem leitura.
- [x] Cada painel tem função.
- [x] Último painel puxa próxima ação.
