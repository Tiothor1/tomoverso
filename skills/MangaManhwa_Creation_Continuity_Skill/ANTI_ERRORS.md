# Anti-Erros Profissionais

## Formato de cada erro
Causa → como detectar → como corrigir → regra preventiva.

## 1. Personagem mudou de rosto
Causa: ficha visual fraca ou prompt sem lock. Detectar comparando formato do rosto, olhos, cabelo e silhueta. Corrigir reforçando Character Bible e negativos. Prevenir repetindo visual fixo em todo prompt.

## 2. Cabelo mudou
Causa: “anime boy/girl” genérico. Detectar cor/comprimento/franja diferentes. Corrigir com descrição de corte e mecha. Prevenir com “do not change hair color/length/style”.

## 3. Roupa mudou sem explicação
Causa: prompt esqueceu roupa atual. Detectar paleta/peças diferentes. Corrigir atualizando Continuity Bible. Prevenir: roupa atual obrigatória em todo prompt.

## 4. Idade/proporção mudou
Causa: modelo estilizou demais. Detectar corpo adulto/criança fora da ficha. Corrigir com idade aparente e build. Prevenir negativos contra age up/age down/body type change.

## 5. Arma/acessório sumiu
Causa: objeto não foi registrado como fixo. Detectar painel sem arma. Corrigir prompt e Scene Map. Prevenir com objects carried.

## 6. Cicatriz/ferimento sumiu
Causa: continuity não herdada. Detectar ferida ausente antes de cura. Corrigir prompt e estado. Prevenir com wounds current.

## 7. Cenário trocou sem transição
Causa: prompt foca só personagem. Detectar fundo/local diferentes. Corrigir Scene Map. Prevenir com location/time/weather/lighting.

## 8. Cena reiniciada
Causa: página nova não herdou saída anterior. Detectar emoção/posição zerada. Corrigir incoming/outgoing state. Prevenir regra de herança.

## 9. Balão cobre rosto
Causa: balão não planejado antes da imagem. Detectar sobreposição em olhos/boca/expressão. Corrigir bubble-safe zone. Prevenir Bubble Script.

## 10. Fala fora de ordem
Causa: balões posicionados contra fluxo. Detectar leitura ambígua. Corrigir posição. Prevenir direção de leitura explícita.

## 11. Texto longo demais
Causa: adaptar novel literalmente. Detectar balões cheios. Corrigir cortando texto para ação/reação. Prevenir limite de palavras.

## 12. Painel sem função
Causa: imagem bonita sem beat. Detectar não muda emoção/ação/info. Corrigir função do painel. Prevenir Panel Script.

## 13. Luta sem consequência
Causa: sequência de poses. Detectar golpe não altera distância/dano/emoção. Corrigir intenção→movimento→impacto→consequência. Prevenir Scene Map.

## 14. Estilo muda
Causa: prompts com estilos conflitantes. Detectar página parece outra obra. Corrigir Style Guide/paleta. Prevenir style block fixo.

## 15. Personagem aleatório aparece
Causa: modelo preenche multidão. Detectar figura sem função. Corrigir negative prompt. Prevenir lista de presentes/ausentes.

## 16. Personagem presente é ignorado
Causa: página foca só protagonista. Detectar aliado/vilão some sem saída. Corrigir staging. Prevenir Continuity Bible.

## 17. Manhwa sem respiro
Causa: blocos colados. Detectar scroll cansativo. Corrigir espaços antes de impacto. Prevenir Manhwa Vertical Rules.

## 18. Mangá sem hierarquia
Causa: grade uniforme. Detectar todos painéis iguais. Corrigir painel dominante. Prevenir Manga Format Rules.

## 19. Prompt vago
Causa: confiar em “manga style”. Detectar ausência de personagem/cenário/continuidade. Corrigir Image Prompt Template. Prevenir checklist prompt.

## 20. Capítulo sem estado final
Causa: não exportar continuidade. Detectar próximo capítulo precisa adivinhar. Corrigir resumo final. Prevenir Chapter Planning Template.
## Erro real — aceitar piloto painterly com drift

Não confundir impacto visual com prontidão. O piloto V1 de Cicatrizário parecia forte, mas Ren mudava de rosto e roupa. Isso deve reprovar final comercial.

Correção obrigatória:
1. Auditar bloco por bloco.
2. Criar reference sheet/style bible/visual lock.
3. Regenerar com referência fixa quando possível.
4. Se sem FAL_KEY, declarar preview/piloto técnico, não final comercial.
5. Não esconder reprovação com frases como “consistente o suficiente”.
