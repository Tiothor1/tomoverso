# Relatório Técnico de Estudo — Tomoverso Manga/Manhwa

## Metodologia

O estudo usou o catálogo local do Tomoverso como fonte técnica temporária. Foram consultados metadados do banco SQLite e amostras visuais baixadas apenas em diretório temporário, removidas antes da validação final. O material foi usado para extrair princípios técnicos de leitura, ritmo, continuidade e balões, sem copiar páginas, personagens, cenas, poses ou textos.

## Escopo medido

- Obras mapeadas: 172.
- Obras com páginas visíveis: 103.
- Capítulos cadastrados: 15.076.
- Páginas cadastradas: 262.242.
- Capítulos vazios/sem páginas: 3.264.
- Média de páginas por capítulo: 17,7.
- Máximo observado: 389 páginas em capítulo longo.
- Reestudo avançado: 236 páginas candidatas; 235 baixadas temporariamente; 1 falha HTTP 500.
- Classificação da amostra avançada: 98 páginas tradicionais/híbridas; 125 páginas verticais/long-scroll.
- Razão altura/largura da amostra: mediana 4,75; p90 18,75; máximo 22,16, confirmando forte presença de webtoon/manhwa vertical.

## Limitações

O estudo não tenta reproduzir estilos autorais protegidos. Algumas primeiras páginas são créditos/capas de scan e não servem como amostra narrativa; por isso o estudo considerou páginas iniciais, intermediárias, finais e recortes de páginas longas. Uma URL retornou HTTP 500 e foi registrada como indisponível.

## Padrões encontrados — mangá tradicional

1. Páginas PB trabalham hierarquia forte: uma página pode ter 4-7 painéis, mas sempre existe foco dominante.
2. Close de olhos/rosto é usado para emoção, ameaça e revelação.
3. Planos gerais estabelecem local antes de conversas ou partidas/lutas.
4. Hachura, retícula e áreas pretas controlam clima e profundidade.
5. Onomatopeias frequentemente participam da composição e indicam direção do movimento.
6. Diálogos longos são quebrados em balões menores com reações entre falas.
7. Viradas de página seguram revelação/impacto para o final de página ou começo da próxima.

## Padrões encontrados — manhwa/webtoon vertical

1. O scroll é ritmo: grandes espaços brancos/escuros antes de impacto criam pausa dramática.
2. Painéis pequenos alternam com closes grandes e corpos inteiros para controle de velocidade.
3. Fundo contínuo, gradientes, céu, fumaça e energia conectam blocos separados.
4. Balões seguem topo→baixo e muitas vezes flutuam em áreas vazias do painel.
5. Cenas de luta usam direção vertical: queda, salto, explosão e impacto descendo pelo scroll.
6. Revelações aparecem após respiro visual, não grudadas ao diálogo anterior.
7. Cliffhanger tende a ficar no fim do scroll com imagem forte e pouco texto.

## Continuidade de personagens

Personagens permanecem reconhecíveis por uma combinação de silhueta, rosto, cabelo, roupa, acessórios e linguagem corporal. Close, meio-corpo e corpo inteiro mudam detalhe, mas não podem mudar proporções básicas. Em produção por IA, a ficha deve repetir descritores fixos em todo prompt, incluindo negativos contra envelhecer, trocar cabelo, mudar roupa e alterar arma.

## Continuidade entre painéis

O painel seguinte deve carregar pelo menos um conector visível: direção do olhar, objeto na mão, ferimento, pose iniciada, fala interrompida, cenário, iluminação ou consequência física. Sem conector, a cena parece reiniciada.

## Continuidade entre páginas e capítulos

A página seguinte herda estado por padrão. Capítulo seguinte precisa de resumo de estado: quem está presente, ferido, ausente, onde estão, o que carregam, que conflito ficou aberto e qual emoção domina. Time skip e mudança de roupa precisam ser marcados explicitamente.

## Balões e letramento

Balões bons guiam a leitura antes do leitor perceber. Regras extraídas: alinhar ao fluxo, usar espaço vazio, evitar rostos/mãos/impactos, dividir falas longas, variar forma para grito/pensamento/sussurro/narração e manter rabicho claro. Em webtoon, balões precisam respeitar scroll vertical e respiros.

## Erros comuns de IA e correções

- Protagonista muda de rosto: corrigir com Character Lock + prompt negativo + comparação com ficha.
- Cena reinicia: corrigir com Continuity Bible e outgoing/incoming state.
- Luta vira colagem: corrigir com Scene Map e sequência intenção→movimento→impacto→consequência.
- Balão cobre rosto: corrigir com área reservada antes da imagem.
- Prompt vago: corrigir com template por painel incluindo personagem, cenário, câmera, continuidade e negativos.
- Capítulo não sustenta arco: corrigir com Arc/Volume/Chapter Planning.

## Conclusões práticas incorporadas

A versão Professional Full Production Mode acrescenta planejamento macro, testes de produção, stress tests, pontuação 0-3, pipeline de prompt chaining, adaptação de novel, readiness gate e validação contra arquivos temporários/material protegido.
