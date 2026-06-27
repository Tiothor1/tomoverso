# Capítulo 1 — Commercial Candidate QA

## Backend

```txt
Provider: Pollo API
Model: GPT Image 2.0
POLLO_API_KEY: instalada localmente, valor não exposto
Reference image: SIM — Ren reference portrait hospedado em URL HTTPS temporária
Seed/control: NÃO exposto pelo endpoint atual
Fallback público antigo: NÃO usado nesta versão
```

## Arquivos avaliados

```txt
chapter1-commercial-candidate-scroll.jpg
chapter1-commercial-candidate-preview.jpg
chapter1-commercial-candidate.html
chapter1-commercial-candidate-contact.jpg
final-blocks/block-01.jpg ... block-20.jpg
```

## Resultado técnico

```txt
20 blocos gerados
Cada bloco normalizado para 1080x1920
Scroll final: 1080x39616
Preview: 540x19808
Lettering local aplicado por pós-produção
```

## Scores

| Categoria | Nota | Diagnóstico |
|---|---:|---|
| Personagem | 2.72 | Ren está muito mais consistente que V1/V2. Referência segurou rosto/cabelo/túnica na maioria dos blocos. Ainda há pequenas variações de acabamento em planos muito abertos/ângulos extremos. |
| Continuidade | 2.70 | Sequência visual funciona: Terra → invocação → humilhação → teste → dormitório → Cicatrizário → gancho. F-0 aparece quando necessário. |
| Balões | 2.62 | Legíveis no scroll, locais e sem depender do modelo. Alguns balões são pequenos no preview/contact sheet, mas aceitáveis no tamanho real. |
| Composição | 2.86 | Saiu do padrão protagonista parado + caixa de texto. Há close, plano aberto, ângulo alto, ângulo baixo, objeto/ambiente e silhueta. |
| Narrativa | 2.76 | O capítulo lê como sequência de manhwa, com progressão clara e cenas funcionais. |
| Prompt | 2.84 | Prompts comerciais com referência, composition type, ambiente, emoção e negativo forte. |
| Emoção | 2.82 | Expressões e linguagem corporal funcionam bem; Ren parece humilhado, assustado e pressionado. |
| Gancho | 2.86 | Último bloco tem imagem forte e promessa visual clara do Cicatrizário. |
| Qualidade comercial | 2.74 | Agora parece arte de capítulo/manhwa candidato comercial, não protótipo visual novel. Ainda requer revisão fina de letras e eventual reroll de blocos fracos para publicação premium. |
| Variação de enquadramento | 2.92 | Passou com folga. O capítulo alterna câmera e escala. |
| Presença de ambiente | 2.84 | Mundo presente: abismo, chuva, catedral, pátio, dormitório e interface sobrenatural. |
| Dinâmica visual | 2.88 | Painéis têm ação, pressão, diagonais, escala e emoção. |

## Média

```txt
2.80 / 3.00
```

## Critérios

| Critério | Threshold | Resultado |
|---|---:|---|
| média geral | >= 2.7 | PASSOU |
| personagem | >= 2.6 | PASSOU |
| continuidade | >= 2.6 | PASSOU |
| balões | >= 2.5 | PASSOU |
| gancho | >= 2.8 | PASSOU |
| variação de enquadramento | >= 2.7 | PASSOU |
| presença de ambiente | >= 2.6 | PASSOU |
| dinâmica visual | >= 2.7 | PASSOU |

## Problemas restantes

- Blocos 07, 11 e 19 podem receber reroll futuro para diferenciar melhor Darian/Soren de Ren.
- Lettering está funcional, mas pode receber refinamento gráfico final.
- Alguns textos são pequenos no preview/contact sheet, embora no scroll real estejam legíveis.
- Endpoint Pollo não expõe seed/control no schema usado; consistência depende de reference image + prompt lock.

## Status

```txt
APROVADO COMO COMMERCIAL CANDIDATE / PRODUÇÃO CONTÍNUA
```
