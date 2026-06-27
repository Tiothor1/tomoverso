# RELATORIO_ESTUDO_MANGAS_MANHWAS

## 1. Corpus estudado

O estudo foi feito sobre o conteúdo de mangá/manhwa disponível no Tomoverso local (`D:\Site-LN`, banco `data/tomoverso.db`) e sobre amostras visuais reais baixadas de páginas de capítulos.

### Números do banco

- Obras mapeadas em `mangas`: **172**.
- Obras com páginas visíveis: **103**.
- Obras com capítulos cadastrados mas sem páginas baixadas/visíveis: **69**.
- Capítulos cadastrados em `manga_chapters`: **15.076**.
- Páginas cadastradas em `manga_pages`: **262.242**.
- Fonte dominante: **mangaonline.blue**.
- Capítulos sem páginas: **3.264**.
- Capítulos compactos, 1–8 páginas: **1.570**.
- Capítulos com comportamento de página tradicional, 9–25 páginas: **7.133**.
- Capítulos longos/scroll, acima de 25 páginas: **3.109**.
- Mediana de páginas por capítulo: **14**.
- P75 de páginas por capítulo: **23**.
- P90 de páginas por capítulo: **37**.
- Máximo encontrado em capítulo: **389** páginas.

### Amostragem visual

Foram baixadas e estudadas **154 páginas reais** de **18 obras representativas**, incluindo:

- Lookism
- Solo Leveling
- Omniscient Reader's Viewpoint
- Eleceed
- Nano Machine
- Mercenary Enrollment
- Blue Lock
- Jujutsu Kaisen
- Demon Slayer
- Dandadan
- One Punch-Man
- O Soldado Esqueleto Não Pôde Proteger a Masmorra
- The Ancient Sovereign of Eternity
- Login Murim
- Reaper of the Drifting Moon
- Sobrevivendo no Jogo como um Bárbaro
- The Mage: Swallowed the Dragon
- Worthless Profession: Dragon Tamer

Observação de direitos: páginas e recortes visuais foram usados apenas como material temporário de análise técnica. As imagens amostradas não fazem parte da skill final para evitar armazenamento/reutilização de páginas protegidas. O que foi preservado na skill são estatísticas, padrões estruturais, regras de continuidade, templates e checklists originais.

### Falhas de carregamento registradas

Algumas URLs de páginas de `omniscient-readers-viewpoint` retornaram HTTP 404:

- Capítulo 2, páginas 1–3.
- Capítulo 218, páginas 16–18.

Isso deve ser tratado como problema de origem/hotlink, não como ausência conceitual da obra.

## 2. Estilos encontrados

### Mangá tradicional PB

Exemplos observados: Blue Lock, Dandadan, Demon Slayer, Jujutsu Kaisen, One Punch-Man.

Padrões:

- Página vertical isolada, geralmente proporção próxima de 0.65–0.75 largura/altura.
- Preto e branco com alto contraste.
- 3 a 7 painéis por página em média.
- Grelha assimétrica: painel grande para impacto, faixas horizontais para diálogo/reação.
- Close de olhos/rosto como gatilho dramático.
- Onomatopeias integradas à arte, com letras grandes e inclinadas.
- Balões ovais com texto centralizado e rabicho claro.
- Fundo detalhado para localização; fundo simplificado/abstrato em emoção ou velocidade.

### Manhwa/webtoon vertical colorido

Exemplos observados: Solo Leveling, Lookism, Eleceed, Nano Machine, Mercenary Enrollment, Login Murim, Reaper of the Drifting Moon, Skeleton Soldier.

Padrões:

- Imagens longas e estreitas, frequentemente com altura 5×, 10×, 15× ou até 22× maior que a largura.
- Leitura topo→baixo por rolagem.
- Cor intensa e iluminação dramática.
- Grandes espaços brancos/pretos entre blocos para controlar timing.
- Balões distribuídos verticalmente, raramente em excesso no mesmo bloco.
- Ação com diagonais fortes, raios de energia, blur, rastros e SFX grandes.
- Close-ups usados como batida emocional antes ou depois de impacto.
- Cenas de diálogo alternam corpo inteiro/ambiente, close de reação e balão isolado.

## 3. Padrões visuais identificados

### Personagens

- Personagens são reconhecíveis por silhueta antes dos detalhes: cabelo, altura, roupa e postura.
- Protagonistas têm elementos âncora: cabelo específico, cor/forma dos olhos, uniforme, arma ou aura.
- Em webtoons coloridos, a paleta do personagem é repetida: cabelo + roupa + aura + sombra.
- Em mangás PB, a consistência depende mais de cabelo, formato dos olhos, uniforme, proporção facial e contraste de retícula.
- Close, meio-corpo e corpo inteiro mantêm a mesma lógica de rosto e roupa; quando a arte simplifica, preserva cabelo e silhueta.

### Cenários

- Cenas começam com painel de localização ou pelo menos pista espacial.
- Ambientes urbanos usam perspectiva e objetos reconhecíveis para orientar o leitor.
- Cenas de luta alternam fundo detalhado e fundo abstrato: o detalhe localiza, o abstrato acelera.
- Quando há destruição, os capítulos/páginas seguintes mantêm poeira, rachaduras, corpos no chão ou marcas de impacto até haver transição.

### Linha, cor e acabamento

- Mangá PB usa contraste, retícula, hachura, manchas pretas e linhas de velocidade.
- Manhwa usa cor, glow, gradiente, partículas, iluminação de aura, reflexo e profundidade atmosférica.
- Efeitos de impacto precisam ter direção: linhas convergem para golpe, magia ou reação.
- A página precisa funcionar sem texto: se os balões forem removidos, a ação ainda deve ser legível.

## 4. Padrões de balões

- Balões normais são ovais/arredondados, com texto centralizado e margem interna confortável.
- Gritos usam balões pontiagudos, tremidos ou com borda agressiva.
- Pensamentos/narração são diferenciados por caixa, borda suave ou balão separado.
- Balões tendem a ficar no topo do painel ou na zona de menor informação visual.
- Rabichos apontam para boca/cabeça, nunca para corpo genérico quando há mais de um personagem.
- Em manhwa, balões seguem leitura topo→baixo e aproveitam espaços em branco entre painéis/blocos.
- Em mangá tradicional, balões seguem a direção da página; para mangá JP, priorizar direita→esquerda.
- Falas longas são divididas em vários balões; não lotar um balão.

## 5. Padrões de sequência

### Diálogo

Sequência típica:

1. Painel de localização ou plano médio mostrando quem está na cena.
2. Primeiro balão estabelece assunto.
3. Close/reação do ouvinte.
4. Contraplano do falante.
5. Pequena pausa visual ou detalhe de mão/objeto.
6. Frase de impacto ou revelação.

### Luta

Sequência típica:

1. Estabelecer posição inicial dos lutadores.
2. Mostrar intenção antes do ataque.
3. Mostrar movimento com direção clara.
4. Mostrar impacto com painel maior/SFX.
5. Mostrar consequência: dano, recuo, sangue, poeira, arma quebrada.
6. Mostrar reação emocional.
7. Atualizar estratégia ou estado físico.

### Drama

Padrões:

- Close no rosto ou olhos.
- Silêncio e espaço vazio antes de fala importante.
- Fundo simplificado para isolar emoção.
- Mãos, postura e olhar carregam subtexto.
- Frases curtas têm mais força que balões longos.

### Comédia

Padrões:

- Quebra de expectativa visual.
- Reação exagerada em painel menor.
- Deformação estilizada temporária, voltando ao estilo normal depois.
- Timing depende de painel de preparação + painel de reação.

## 6. Continuidade visual

O principal aprendizado do corpus é que continuidade não depende apenas de “desenhar igual”; ela depende de manter estado.

Regras práticas:

- A página seguinte herda roupa, ferimentos, sujeira, iluminação, posição e emoção da página anterior.
- Se personagem segura uma arma na direita, a arma continua na direita até haver troca mostrada.
- Se uma parede quebra, a parede permanece quebrada enquanto o cenário existir.
- Se o personagem está sentado, não aparece em pé no próximo painel sem transição de levantar.
- Se a cena ocorre à noite, o próximo bloco continua noite até passagem de tempo explícita.
- Em luta, manter distância e eixo espacial; não teleportar personagens para posições convenientes.
- Em diálogo, manter quem está à esquerda/direita ou explicar inversão com mudança de câmera.

## 7. Erros comuns a evitar

1. Protagonista muda de rosto entre páginas.
2. Cabelo muda de corte/comprimento sem motivo.
3. Roupa some ou troca por estética aleatória.
4. Ferimentos desaparecem.
5. Objeto importante troca de mão.
6. Cenário reinicia limpo após destruição.
7. Balão cobre rosto ou golpe.
8. Balão sem rabicho em cena com múltiplos falantes.
9. Ordem de leitura confusa.
10. Página tem ação bonita mas sem consequência narrativa.
11. Prompt de imagem não carrega estado anterior.
12. Cada painel parece de uma obra/modelo diferente.
13. Manhwa vertical sem respiro entre impactos.
14. Mangá tradicional sem hierarquia de painéis.
15. Texto demais em um único balão.

## 8. Boas práticas finais transformadas em skill

- Criar Character Bible antes de roteiro visual.
- Criar Continuity Bible antes de continuação de cena.
- Criar Scene Map para localização e lutas.
- Criar Page Script antes de qualquer imagem.
- Criar Panel Script para cada painel.
- Criar Bubble Script antes de letrar.
- Criar Image Prompt com visual fixo, continuidade herdada e negativos.
- Revisar por checklist antes de aprovar.
- Separar regras de mangá tradicional e manhwa vertical.
- Manter referências como estudo técnico, nunca como cópia literal.


## 9. Matriz técnica por macroformato

| Elemento | Mangá tradicional | Manhwa/Webtoon vertical | Regra para produção original |
|---|---|---|---|
| Unidade de leitura | Página/painel | Bloco de rolagem | Planejar antes em roteiro visual, nunca gerar imagem solta |
| Ritmo | Gutter + virada de página | Espaço vertical + scroll | Usar pausa visual como ferramenta narrativa |
| Cor | PB, retícula, hachura | Cor, luz, glow, gradiente | Fixar paleta por cena/personagem |
| Ação | Painéis inclinados, linhas, SFX | Diagonais verticais, blur, aura | Sempre mostrar intenção → movimento → impacto → consequência |
| Diálogo | Alternância de painel e balões | Balões espaçados de cima para baixo | Dividir fala longa por emoção e tempo de leitura |
| Continuidade | Rosto/cabelo/roupa + posição de painel | Estado visual repetido em blocos distantes | Character Lock + Continuity Bible antes de cada página |
| Impacto | Painel grande ou página inteira | Bloco alto com respiro antes/depois | Não esconder impacto com balões |
| Localização | Painel de estabelecimento | Fundo contínuo ou establishing block | Mostrar onde a cena acontece antes de confundir o leitor |

## 10. Padrões extraídos de páginas consecutivas

1. **Âncora visual imediata:** uma sequência profissional não redesenha o protagonista como “uma pessoa parecida”; ela repete âncoras visuais. Em close, o cabelo/franja/olhos seguram identidade. Em corpo inteiro, roupa/silhueta/postura seguram identidade.
2. **Estado físico persistente:** sangue, poeira, bandagens, roupa rasgada, suor e expressão de cansaço funcionam como memória visual da cena.
3. **Câmera com continuidade:** mesmo quando muda para close, a direção do olhar e a posição relativa dos personagens preservam o espaço.
4. **Reação depois de impacto:** páginas boas não pulam do golpe para novo golpe; mostram dano, surpresa, recuo, queda ou mudança emocional.
5. **Balão como trilho de leitura:** o balão conduz o olho para o próximo foco. Quando mal posicionado, quebra o painel.
6. **Silêncio planejado:** quadros vazios, fundo branco/preto ou close sem fala criam tempo dramático; não são “falta de conteúdo”.
7. **Estabelecimento antes de complexidade:** cenas de rua, escola, masmorra ou escritório mostram uma pista espacial antes de sequência densa de diálogo/ação.

## 11. Heurísticas de criação derivadas do estudo

- Se a página tem luta, comece pelo mapa de posições; se não houver mapa, a luta vira ruído bonito.
- Se a página tem diálogo emocional, planeje microexpressões e pausas; não resolva tudo com texto.
- Se a página tem revelação, use preparação visual: detalhe suspeito → reação → silêncio → revelação.
- Se a página tem comédia, use timing: setup visual → quebra → reação exagerada → retorno ao modelo normal.
- Se a página é vertical, pense em “metros de scroll”, não em “quadros colados”.
- Se a página é PB, contraste e silhueta precisam carregar a cena sem depender de cor.
- Se usar IA de imagem, repetir o visual fixo em todo prompt não é redundância: é controle de produção.

## 12. Conclusão operacional

A skill final transforma o estudo em um pipeline: Character Bible → Continuity Bible → Scene Map → Page Script → Panel Script → Bubble Script → Image Prompt → QA. Esse fluxo é obrigatório porque cada etapa resolve uma falha típica de geração automática: personagem inconsistente, cenário que reinicia, página sem ritmo, balões confusos e prompts que não carregam estado anterior.
