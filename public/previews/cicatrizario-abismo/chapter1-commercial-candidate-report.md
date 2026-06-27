# Capítulo 1 — Commercial Candidate Report

## Status

```txt
Capítulo 1 aprovado para produção contínua.
```

## O que foi destravado

A produção foi migrada do fallback/FAL bloqueado para:

```txt
Pollo API + GPT Image 2.0
```

A chave Pollo foi instalada localmente como segredo e não foi commitada.

## Backend

```txt
POLLO_API_KEY detectada: SIM
Modelo usado: GPT Image 2.0
Endpoint usado: POST /generation/openai/gpt-image-2-0/image
Status endpoint: GET /generation/{taskId}/status
Referência HTTPS do Ren: SIM
Seed/control: NÃO disponível no schema atual
```

## O que mudou visualmente

A versão anterior parecia:

```txt
protagonista parado + caixa de texto
```

A nova versão tem:

- close dramático;
- meio corpo com ação;
- plano aberto/world building;
- ângulo baixo/pressão;
- ângulo alto/fragilidade;
- silhueta/sombra;
- interação com objeto/ambiente;
- ambientes reais: chuva, abismo, catedral, pátio, dormitório;
- lettering local fora do modelo;
- Ren usando referência fixa em todos os blocos gerados.

## Blocos gerados

```txt
final-blocks/block-01.jpg
final-blocks/block-02.jpg
final-blocks/block-03.jpg
final-blocks/block-04.jpg
final-blocks/block-05.jpg
final-blocks/block-06.jpg
final-blocks/block-07.jpg
final-blocks/block-08.jpg
final-blocks/block-09.jpg
final-blocks/block-10.jpg
final-blocks/block-11.jpg
final-blocks/block-12.jpg
final-blocks/block-13.jpg
final-blocks/block-14.jpg
final-blocks/block-15.jpg
final-blocks/block-16.jpg
final-blocks/block-17.jpg
final-blocks/block-18.jpg
final-blocks/block-19.jpg
final-blocks/block-20.jpg
```

## Arquivos finais

```txt
chapter1-commercial-candidate-scroll.jpg
chapter1-commercial-candidate-preview.jpg
chapter1-commercial-candidate.html
chapter1-commercial-candidate-contact.jpg
chapter1-commercial-final-qa.md
chapter1-commercial-candidate-report.md
```

## Geração

- O bloco 03 inicial foi bloqueado por risk control por envolver acidente/caminhão/criança.
- O prompt foi reescrito como cena simbólica de sacrifício sem veículo/criança/colisão explícita.
- O bloco 10 inicial foi bloqueado por risk control por sangue/golpe.
- O prompt foi reescrito como impacto simbólico sem sangue/ferimento gráfico.
- Os demais blocos foram gerados com prompt mais seguro.

## Nota final

```txt
2.80 / 3.00
```

## Aprovação

```txt
APROVADO PARA PRODUÇÃO CONTÍNUA
```

## Próximo passo recomendado

Antes de publicar como versão premium definitiva:

1. reroll opcional dos blocos 07, 11 e 19 para diferenciar melhor Darian/Soren;
2. refinamento gráfico dos balões;
3. export web/mobile no site Tomoverso;
4. começar Capítulo 2 visual usando o mesmo pipeline Pollo + reference lock.
