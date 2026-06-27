# FAL_KEY Setup Checklist — Cicatrizário do Abismo

## Objetivo
Desbloquear a produção comercial do Capítulo 1 com backend de imagem capaz de usar referência fixa do Ren.

## Checklist

### 1. Obter chave FAL
- Criar/abrir conta em FAL.ai.
- Criar API key.
- Não colar a chave em chat público.
- Não commitar a chave no repositório.

### 2. Adicionar chave ao ambiente Hermes
Opção recomendada: usar o env file do Hermes.

Comando para descobrir o caminho correto:

```bash
hermes config env-path
```

Adicionar no arquivo retornado:

```env
FAL_KEY=coloque_a_chave_aqui
```

Alternativa se o backend usar o nome antigo:

```env
FAL_API_KEY=coloque_a_chave_aqui
```

### 3. Reiniciar sessão/app
Depois de editar `.env`:

- reiniciar Hermes Desktop/TUI;
- ou usar `/reload` se disponível;
- confirmar novamente com verificação sem expor o segredo.

### 4. Verificação esperada

```txt
FAL_KEY detectada: SIM
Backend com reference image: SIM
Seed/control disponível: depende do endpoint/modelo exposto
Pronto para regenerar arte final: SIM, se reference_image_urls funcionar
```

### 5. Assets de referência já preparados
Usar estes arquivos como referência do Ren e do estilo:

```txt
D:\Site-LN\public\previews\cicatrizario-abismo\reference-assets\ren-reference-portrait.jpg
D:\Site-LN\public\previews\cicatrizario-abismo\ren-character-reference-sheet.md
D:\Site-LN\public\previews\cicatrizario-abismo\style-bible.md
D:\Site-LN\public\previews\cicatrizario-abismo\ren-fixed-prompt.md
D:\Site-LN\public\previews\cicatrizario-abismo\chapter1-block-prompts-v2.md
```

### 6. Próximo pipeline após FAL_KEY
Quando a chave estiver ativa:

1. Não usar fallback público.
2. Usar `image_generate` com `reference_image_urls` apontando para `ren-reference-portrait.jpg` quando suportado.
3. Regenerar blocos críticos com variação de enquadramento:
   - close dramático;
   - meio corpo com ação;
   - plano aberto/world building;
   - ângulo baixo;
   - ângulo alto;
   - silhueta/sombra;
   - interação com objeto/ambiente.
4. Evitar padrão `Ren centralizado + fundo vazio + texto`.
5. Aplicar balões localmente em pós-produção.
6. Rodar QA reforçado com métricas novas:

```txt
variação de enquadramento >= 2.7
presença de ambiente >= 2.6
dinâmica visual >= 2.7
```

### 7. Critério para aprovação
Só declarar:

```txt
Capítulo 1 aprovado para produção contínua.
```

se:

- FAL_KEY estiver ativa;
- Ren estiver consistente;
- visual não parecer visual novel/slideshow;
- houver ritmo visual real;
- QA final passar todos os thresholds;
- novos arquivos finais forem gerados e verificados.
