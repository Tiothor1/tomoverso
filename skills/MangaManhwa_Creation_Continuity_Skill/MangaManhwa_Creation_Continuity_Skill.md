# Manual Principal — Professional Full Production Mode

## 1. Visão geral

A skill opera como um estúdio de quadrinhos dentro do Hermes. Ela transforma uma ideia em obra original por camadas: mundo, personagens, continuidade, planejamento narrativo, páginas, painéis, balões, prompts, revisão e exportação de estado. O objetivo é impedir drift visual e narrativo, especialmente quando a produção envolve muitas páginas.

## 2. Módulos internos

### Series Bible Engine
Cria as regras da obra: promessa narrativa, público, tom, estética, mundo, sistema de poder, facções, limites e temas. Sem isso, capítulos ficam episódicos e inconsistentes.

### Character Lock System
Trava identidade visual e narrativa. Cada personagem tem prompt base, prompt negativo, silhueta, proporção, roupa, acessórios, modo de falar, gestos típicos, ferimentos e variações permitidas.

### Continuity Bible
Estado vivo. A cada página/painel, atualize roupas, danos, sangue, objetos, direção de movimento, emoções, relações, mistérios e consequências.

### Scene Continuity Map
Mapa físico. Define posições, distância, obstáculos, portas, luz, destruição e eixo de câmera. Obrigatório em luta, perseguição, diálogo de múltiplos personagens e cenas com objetos importantes.

### Storyboard Engine
Converte cena em página, página em painéis, e painéis em prompts. Nunca pula direto para imagem.

### Bubble Placement System
Planeja fala como parte da composição, não como pós-processo improvisado. Define ordem, posição, formato, rabicho, divisão de texto e zonas proibidas.

### Prompt Chaining System
Encadeia prompts com estado anterior. Todo prompt deve declarar o que permanece igual, o que mudou e o que é proibido mudar.

### QA Scoring System
Pontua personagem, continuidade, balões, composição, narrativa e prompt de 0 a 3. Página só passa se: nenhuma categoria 0, média >=2.4, personagem/continuidade/balões >=2. Produção completa só passa com média dos testes >=2.6.

## 3. Fluxo para obra inteira

1. Criar Series Bible.
2. Criar elenco principal e secundário.
3. Definir estética por formato: mangá PB, manhwa colorido, webtoon vertical ou híbrido.
4. Planejar arcos.
5. Planejar volumes ou temporadas.
6. Planejar capítulos.
7. Para cada capítulo: scene beats → páginas → painéis → balões → prompts → QA.
8. Após cada capítulo, exportar estado final para o próximo.
9. Após cada arco, atualizar evolução visual/emocional e consequências permanentes.

## 4. Fluxo para capítulo

1. Ler resumo anterior e estado final.
2. Definir objetivo do capítulo, emoção dominante, conflito e gancho.
3. Dividir em cenas: abertura, desenvolvimento, virada, clímax, fechamento/gancho.
4. Alocar páginas/blocos por cena.
5. Escrever Page Script de cada página.
6. Escrever Panel Script e Bubble Script.
7. Gerar prompts.
8. Rodar QA e corrigir.
9. Exportar `Chapter Final State`.

## 5. Fluxo para página única

Mesmo uma página isolada precisa de: personagem travado, cenário, estado herdado, objetivo, emoção, composição, painéis, balões, prompt e estado deixado.

## 6. Fluxo para corrigir inconsistência

1. Identificar o drift: rosto, cabelo, roupa, cenário, objeto, emoção, leitura ou balão.
2. Localizar a fonte: Character Bible ausente, prompt vago, continuidade não herdada, balão sem área, cena sem mapa.
3. Corrigir a ficha/template primeiro.
4. Reescrever roteiro/prompt.
5. Reaplicar QA.

## 7. Fluxo para adaptar novel em mangá/manhwa

1. Identificar núcleo visual da cena.
2. Cortar narração expositiva e transformar em imagem, ação ou reação.
3. Preservar frases essenciais.
4. Criar ritmo visual: estabelecer, tensão, ação/revelação, consequência.
5. Definir formato: página tradicional ou scroll vertical.
6. Gerar roteiro visual antes de imagem.

## 8. Estados internos obrigatórios

- `SeriesState`: mundo, regras, tema, estética.
- `ArcState`: conflito, evolução, revelações, consequências.
- `ChapterState`: objetivo, personagens, local, ganchos, pendências.
- `SceneState`: posição, emoção, câmera, ambiente.
- `CharacterState`: aparência, roupa, ferimento, objeto, emoção.
- `PageState`: entrada, ação, saída.
- `PanelState`: câmera, ação, foco, balão, prompt.

## 9. Regra de herança

A página seguinte herda tudo da página anterior por padrão. Mudanças exigem transição explícita: corte de tempo, mudança de local, troca de roupa, cura, deslocamento, perda/ganho de objeto, chegada/saída de personagem.

## 10. Limites

A skill não garante que um gerador de imagem externo respeite tudo. Ela reduz risco criando prompts encadeados, negativos, QA e correções. Quando o modelo não sustentar identidade, use referência visual autorizada, imagem-semente própria ou refaça Character Lock com descritores mais rígidos.
