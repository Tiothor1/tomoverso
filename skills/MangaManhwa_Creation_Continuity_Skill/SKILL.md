---
name: mangamanhwa-creation-continuity-skill
description: Use when creating, adapting, storyboarding, prompting, lettering, or QA-reviewing manga/manhwa/webtoon pages. Enforces visual continuity, character lock, scene maps, panel scripts, bubble placement, image prompts, and professional page review before final output.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [manga, manhwa, webtoon, comics, continuity, storyboard, image-prompts, lettering]
    related_skills: [image-generation-fallback, novel-site-brasil]
---

# MangaManhwa_Creation_Continuity_Skill

## Objetivo

Criar mangás, manhwas, webtoons e histórias em quadrinhos originais com continuidade profissional. Esta skill impede o erro clássico de IA — o protagonista mudar de rosto, cabelo, roupa, corpo, idade ou personalidade a cada página — exigindo bíblia visual, mapa de cena, roteiro de página, roteiro de painel, posicionamento de balões e revisão antes de qualquer geração de imagem.

A skill foi construída a partir de estudo técnico do corpus de mangás/manhwas disponíveis no Tomoverso: 172 obras mapeadas, 103 com páginas visíveis, 15.076 capítulos, 262.242 páginas, com amostragem visual de 154 páginas reais de 18 obras representativas. O estudo identificou dois macroformatos dominantes: mangá tradicional em páginas PB com grade de painéis e manhwa/webtoon vertical colorido com blocos de rolagem, pausas e impactos espaçados.

## Quando usar

Use quando o usuário pedir:

- criar mangá, manhwa, webtoon ou HQ;
- transformar novel/roteiro/capítulo em quadrinhos;
- criar storyboard, roteiro visual, página ou painel;
- gerar prompts de imagem para páginas/painéis sequenciais;
- corrigir continuidade visual;
- posicionar balões, onomatopeias ou caixas de narração;
- revisar páginas de quadrinho geradas por IA.

Não use para copiar páginas, personagens, poses, falas ou designs protegidos. Use referências apenas para aprender estrutura, ritmo, continuidade, composição e letramento.

## Entradas necessárias

Se o usuário não fornecer tudo, inferir o mínimo e declarar premissas. Para produção profissional, reunir:

1. Título, gênero, tom e público-alvo.
2. Formato: mangá tradicional, manhwa vertical, webtoon, HQ horizontal ou híbrido.
3. Idioma e direção de leitura: direita→esquerda, esquerda→direita ou vertical topo→baixo.
4. Sinopse, objetivo do capítulo, resumo anterior e estado atual da continuidade.
5. Character Bible dos personagens principais e secundários.
6. Continuity Bible da cena atual.
7. Quantidade de páginas ou blocos de rolagem.
8. Estilo visual desejado, paleta, nível de cor/PB e acabamento.
9. Restrições: violência, romance, humor, censura, idade, plataforma.

## Processo obrigatório

1. **Entender a obra.** Definir gênero, tom, formato, direção de leitura e promessa emocional. Concluído quando a página/capítulo tem objetivo dramático claro.
2. **Criar ou carregar Character Bible.** Nenhum personagem importante pode entrar sem ficha visual fixa. Concluído quando cada personagem tem aparência, roupa, silhueta, acessórios, fala e estado emocional.
3. **Criar ou carregar Continuity Bible.** Registrar local, hora, clima, ferimentos, objetos, posições e última ação. Concluído quando a próxima página pode continuar a anterior sem reiniciar a cena.
4. **Criar Scene Map.** Mapear espaço físico e eixo de câmera. Concluído quando se sabe onde cada personagem está e para onde se move.
5. **Dividir capítulo em páginas/blocos.** Cada página deve avançar a história. Concluído quando cada página tem objetivo, emoção e gancho.
6. **Dividir páginas em painéis.** Definir enquadramento, câmera, ação, emoção, fundo e transição. Concluído quando a página pode ser desenhada sem adivinhar.
7. **Planejar balões.** Definir texto, ordem, formato, rabicho, posição e área livre. Concluído quando nenhum balão cobre rosto, mão, arma, impacto ou expressão-chave.
8. **Criar prompts de imagem.** Usar fichas travadas, continuidade herdada e negativos de consistência. Concluído quando cada prompt força “mesmo personagem, mesma roupa, mesmo cenário, continuação direta”.
9. **Revisar coerência.** Aplicar QA checklist. Concluído apenas quando continuidade, composição, balões e narrativa passam.
10. **Corrigir antes de entregar.** Se falhar, reescrever roteiro/prompt/balão antes da arte final.

## Sistemas obrigatórios

### Character Lock System

Todo personagem recorrente precisa ter uma ficha visual e narrativa travada. Em cada página, compare o desenho/prompt com a ficha:

- mesmo rosto, idade aparente, cabelo, olhos, corpo, pele e silhueta;
- mesma roupa atual, acessórios, arma e marcas;
- ferimentos permanecem até cura explícita;
- pose e expressão combinam com personalidade e estado emocional;
- fala combina com forma de falar do personagem;
- personagem parece a mesma pessoa em close, meio corpo e corpo inteiro.

### Continuity Bible

Registro vivo que acompanha capítulo, cena, página e painel. Deve guardar:

- personagens vivos/presentes/ausentes;
- roupa atual, ferimentos, objetos carregados e perdas;
- local, hora, clima, iluminação e destruição;
- posição espacial dos personagens;
- direção de movimento e eixo de câmera;
- última ação, última fala, última emoção e próxima ação lógica;
- consequências permanentes.

### Scene Continuity Map

Mapa espacial da cena. Use especialmente em lutas, perseguições e diálogos com vários personagens. Deve responder:

- onde cada personagem está no ambiente;
- quem olha para quem;
- quem está perto/longe;
- que objetos estão entre eles;
- qual parede/porta/rua/janela foi mostrada;
- o que quebrou, caiu, queimou, molhou ou mudou;
- de onde a câmera está olhando.

### Bubble Placement System

Balões são parte da direção de cena, não decoração. Para cada balão, definir:

- falante;
- tipo: fala normal, grito, pensamento, sussurro, narração, interrupção, medo, rádio/telefone;
- texto e quebras de linha;
- posição no painel;
- rabicho apontando para a boca/rosto correto;
- ordem de leitura;
- zona proibida: rosto, olhos, mão importante, arma, impacto, magia, expressão, pista visual.

## Regras finais absolutas

1. Nunca gerar página sem roteiro visual antes.
2. Nunca gerar personagem sem ficha visual fixa.
3. Nunca continuar cena sem consultar continuidade.
4. Nunca mudar aparência, roupa, idade, cabelo, olhos ou proporções sem motivo narrativo.
5. Nunca apagar ferimento, sujeira, sangue, arma quebrada ou cenário destruído sem transição.
6. Nunca trocar cenário, hora do dia ou clima sem passagem de tempo.
7. Nunca colocar balão cobrindo rosto, expressão, golpe, arma ou mão importante.
8. Nunca quebrar a ordem de leitura.
9. Nunca adicionar personagem aleatório.
10. Nunca ignorar personagem presente na cena anterior.
11. Nunca gerar imagem que pareça de outra obra.
12. Nunca finalizar sem QA de continuidade, balões, composição e narrativa.

## Fluxo futuro de resposta

Quando solicitado a criar manga/manhwa, responder primeiro com:

A. Bíblia da obra — premissa, tom, mundo, regras visuais.  
B. Bíblia dos personagens — protagonistas, aliados, rivais, vilões.  
C. Planejamento do capítulo — cenas, clímax, gancho.  
D. Roteiro visual — páginas, painéis, falas, balões, enquadramentos.  
E. Prompts de imagem — um por página ou painel, com continuidade explícita.  
F. Revisão final — checklist e correções.

## Arquivos de apoio

- `RELATORIO_ESTUDO_MANGAS_MANHWAS.md` — estudo técnico do corpus Tomoverso.
- `STYLE_GUIDE.md` — regras visuais e narrativas extraídas do estudo.
- `CHARACTER_BIBLE_TEMPLATE.md` — ficha visual/narrativa fixa.
- `CONTINUITY_BIBLE_TEMPLATE.md` — continuidade de capítulo/cena/página.
- `SCENE_MAP_TEMPLATE.md` — mapa espacial e emocional da cena.
- `PAGE_SCRIPT_TEMPLATE.md` — roteiro de página/bloco vertical.
- `PANEL_SCRIPT_TEMPLATE.md` — roteiro de painel.
- `BUBBLE_PLACEMENT_RULES.md` — regras de balões e letramento.
- `IMAGE_PROMPT_TEMPLATE.md` — template de prompts com Character Lock.
- `QA_CHECKLIST.md` — aprovação obrigatória.
- `ANTI_ERRORS.md` — erros proibidos.
- `MANGA_FORMAT_RULES.md` — mangá tradicional.
- `MANHWA_VERTICAL_RULES.md` — manhwa/webtoon vertical.
- `EXAMPLES.md` — exemplos práticos.


## Common Pitfalls

1. **Gerar arte antes do roteiro.** Isso produz imagens bonitas mas desconectadas. Corrija criando Page Script e Panel Script antes do prompt.
2. **Confiar em “same character”.** Modelos de imagem não preservam identidade só com essa frase. Corrija repetindo Character Lock completo em todo prompt.
3. **Ignorar estado físico.** Feridas, suor, roupa rasgada e objetos são continuidade. Corrija atualizando Continuity Bible após cada ação.
4. **Balões depois da arte sem área reservada.** Isso causa rostos cobertos. Corrija planejando Bubble Script antes do prompt.
5. **Luta sem mapa.** Vira colagem de golpes. Corrija com Scene Map e sequência intenção→movimento→impacto→consequência.
6. **Manhwa sem respiro.** Scroll colado perde impacto. Corrija marcando espaços verticais antes/depois de revelações.
7. **Mangá PB sem hierarquia.** Todos os painéis iguais achatam ritmo. Corrija definindo painel dominante e gutters.
8. **Copiar referência.** Referência é estudo técnico, não molde literal. Corrija criando personagens, cenas e composições originais.

## Verification Checklist

Antes de dizer que uma página/capítulo/skill está pronto:

- [ ] Character Bible existe para todos os recorrentes.
- [ ] Continuity Bible está atualizada com roupa, ferimentos, objetos e local.
- [ ] Scene Map existe quando há luta, movimento ou múltiplos personagens.
- [ ] Page Script define objetivo, emoção, painéis e gancho.
- [ ] Panel Script define câmera, ação, composição e continuidade.
- [ ] Bubble Script define posição, ordem, rabicho e área proibida.
- [ ] Image Prompt inclui Character Lock, Continuity Lock, Scene Map e negativos.
- [ ] QA_CHECKLIST foi aplicado.
- [ ] Erros de ANTI_ERRORS não aparecem.
- [ ] Resultado é original e não copia página/personagem protegido.
