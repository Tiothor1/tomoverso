# Cicatrizário do Abismo — Style Bible

## Status
Criado após auditoria do `PILOTO VISUAL V1`. Este arquivo é obrigatório antes de qualquer nova geração.

## Estilo visual geral
- Formato: manhwa vertical / webtoon mobile, 900 px de largura base.
- Gênero visual: dark fantasy isekai com drama psicológico.
- Técnica alvo sem FAL_KEY: fundo painterly/AI-looking + personagem principal controlado por character lock e pós-produção local.
- Técnica alvo com FAL_KEY: geração com referência fixa de personagem, seed controlada, style reference e prompt base imutável.

## Paleta principal
- Abismo: preto azulado `#020617`, azul petróleo `#0f4c81`, ciano frio `#38bdf8`, vermelho seco `#7f1d1d`.
- Mundo real: azul chuva, cinza asfalto, neon frio, reflexos molhados.
- Invocação: dourado falso, branco litúrgico, marrom catedral, sombras quentes opressivas.
- Humilhação: dourado sujo, sombras duras no rosto, cinza da túnica F-0.
- Despertar sombrio: azul-preto, bordas frias, interface como página rachada.

## Paleta fixa do Ren
- Cabelo: preto profundo `#050509`, reflexos azulados mínimos em chuva/sombra.
- Olhos: castanho-escuro/avelã `#3b241c` com brilho pequeno.
- Pele: oliva clara `#c9a58a` em luz neutra, mais fria em abismo.
- Roupa Terra: jaqueta preta `#10131a`, faixas azuis `#1e9bff`, moletom cinza `#5f6672`.
- Roupa Arvhal: túnica cinza-ash `#8a8d92`, sujeira `#4b5563`, tag F-0 cobre/dourado `#d97706`.
- Aura: Ren não possui aura dourada. Cicatrizário usa azul-preto `#0ea5e9` + preto.

## Sombras e luz
- Sombras pesadas, formato cinematográfico, contraste alto.
- Rosto de Ren pode ficar parcialmente coberto por cabelo/sombra, mas olhos e cicatriz devem existir quando o rosto aparece.
- Luz dourada pertence à Igreja/sistema opressor, não ao poder de Ren.
- Luz azul-preta pertence ao Cicatrizário/abismo.

## Olhos
- Manhwa semi-realista: olhos expressivos, mas cansados; pálpebras pesadas; brilho pequeno.
- Não usar olhos grandes infantis nem olhar de protagonista overpower antes do abismo.

## Cenários
- Mundo real: cidade chuvosa noturna, rua molhada, faróis, neon.
- Catedral de Orvalis: colunas altas, círculos mágicos dourados, sacerdotes em branco/dourado, escala opressiva.
- Dormitório: estreito, frio, janela pequena, sombras azuis.
- Pátio: pedra clara, soldados/heróis ao fundo, luz de manhã dura.

## Interface do Cicatrizário
- Deve parecer página/registro rachado, não HUD moderno genérico.
- Cor: preto, azul-petróleo, ciano frio, rachaduras finas.
- Texto de sistema preferencialmente adicionado em pós-produção, nunca confiado ao modelo.

## Balões
- Adicionar balões localmente via SVG/sharp.
- Fonte sugerida: Arial/Inter Bold ou equivalente, 26–32 px em 900 px de largura.
- Balões de fala: branco quente `#fffaf2`, borda preta 4–5 px.
- Pensamento/narração: caixa escura translúcida, borda ciano.
- Margem mínima: 36 px das bordas.
- Nunca cobrir: rosto, olhos, cicatriz, F-0, mãos importantes, impacto, página do Cicatrizário, sorriso de Darian.

## Ritmo vertical
- Blocos dramáticos com 120–300 px de respiro visual.
- Cliffhangers com composição vertical limpa e última imagem escura.
- Textos curtos; leitura topo → baixo sem zigue-zague confuso.

## Regra de produção
Sem FAL_KEY, qualquer versão é preview/piloto avançado. Para versão comercial superior, usar modelo com referência fixa ou LoRA/personagem treinado. Enquanto isso, a prioridade é consistência via: prompt fixo + background controlado + overlay local de Ren + QA de contato entre blocos.
