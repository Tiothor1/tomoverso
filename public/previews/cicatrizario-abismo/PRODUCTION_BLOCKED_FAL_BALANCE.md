# Produção Comercial Bloqueada — FAL sem saldo

## Status

```txt
Capítulo 1 ainda não aprovado para produção contínua. Backend FAL detectado, mas conta sem saldo/créditos.
```

## Verificação executada

Após instalar a chave no arquivo do Hermes e recarregar a sessão, o `image_generate` passou a alcançar a FAL. A falha atual não é mais ausência de chave.

Resultado seguro, sem expor segredo:

```txt
FAL_KEY detectada: SIM
Backend FAL alcançado: SIM
Reference image disponível no tool: SIM
Seed/control disponível no schema atual: NÃO
Pronto para regenerar arte final: NÃO
Motivo: saldo/créditos FAL esgotados
```

Erro retornado pelo backend:

```txt
User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing.
```

## Próxima ação necessária

Acessar:

```txt
https://fal.ai/dashboard/billing
```

Adicionar saldo/créditos na conta FAL usada pela chave configurada.

## Depois de adicionar saldo

Rodar novamente a validação de imagem. Se passar, seguir para:

1. usar `ren-reference-portrait.jpg` como referência fixa;
2. regenerar os blocos críticos do Capítulo 1;
3. evitar composição de visual novel/slideshow;
4. criar `chapter1-commercial-candidate-scroll.jpg`;
5. rodar QA reforçado com:

```txt
variação de enquadramento >= 2.7
presença de ambiente >= 2.6
dinâmica visual >= 2.7
```

## Decisão atual

Não usar fallback.
Não aprovar Capítulo 1.
Não avançar para Capítulo 2 visual.
