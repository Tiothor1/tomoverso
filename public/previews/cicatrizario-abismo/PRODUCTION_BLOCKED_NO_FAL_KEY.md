# Produção Comercial Bloqueada — Sem FAL_KEY

## Status

```txt
Capítulo 1 ainda não aprovado para produção contínua. Falta backend com referência fixa.
```

## Verificação executada

Foi feita verificação local sem expor segredos:

```txt
FAL_KEY detectada: NÃO
FAL_API_KEY detectada: NÃO
Arquivo .env/config com FAL_KEY não-vazia: NÃO
Backend com reference image se FAL_KEY existir: SIM
Seed/control disponível no schema atual do image_generate: NÃO
Pronto para regenerar arte final: NÃO
```

## Motivo do bloqueio

O Capítulo 1 foi reprovado porque o problema não é apenas geração de imagem: é produção sequencial de manhwa com personagem recorrente. O fallback público/SVG consegue gerar preview, mas não garante simultaneamente:

- Ren consistente de forma profissional;
- acabamento painterly/comercial;
- reference image fixa;
- controle de personagem entre painéis;
- ritmo visual de manhwa sem virar slideshow;
- regeneração confiável bloco a bloco.

Sem um backend com referência fixa, qualquer tentativa de “melhorar” por fallback tende a cair em um dos dois erros já observados:

1. arte painterly bonita, mas Ren muda de rosto/idade/roupa;
2. Ren consistente, mas visual vira animatic/cartoon/visual novel barata.

## Decisão

Produção comercial do Capítulo 1 está bloqueada até FAL_KEY ou backend equivalente com referência fixa estar disponível.

Não avançar para Capítulo 2.
Não gerar nova versão fallback.
Não declarar aprovação.
