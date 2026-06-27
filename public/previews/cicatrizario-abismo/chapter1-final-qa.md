# Capítulo 1 Final — QA Rígido

Arquivos avaliados:

- `chapter1-final-scroll.jpg`
- `chapter1-final-scroll-preview.jpg`
- `chapter1-final-scroll.html`
- `chapter1-final-audit-contact.jpg`

## Contexto
`FAL_KEY` está ausente. A versão final candidata foi reconstruída em modo fallback reforçado: fundos tratados do piloto V1 + Ren determinístico em pós-produção + balões locais + F-0 fixo.

Uma tentativa V3 com face canônica única foi testada, mas criou artefatos de “face colada” e foi descartada. O arquivo final atual voltou para a versão V2 controlada, mais limpa e consistente, porém ainda não atinge qualidade comercial.

## Avaliação por categoria

| Categoria | Nota | Diagnóstico |
|---|---:|---|
| Personagem | 2.75 | Ren ficou muito mais consistente que no V1; mesmo corpo/roupa/F-0. Porém o desenho controlado é simplificado/cartoon e não tem acabamento manhwa comercial. |
| Continuidade | 2.65 | Sequência e estados principais funcionam; F-0 e túnica permanecem. Dano/sujeira ainda são simplificados. |
| Balões | 2.70 | Legíveis, ordem vertical clara, adicionados localmente. Alguns painéis ainda ficam graficamente simples. |
| Composição | 2.45 | Mobile legível; porém a reconstrução com personagem vetorial reduz impacto de vários blocos. |
| Narrativa | 2.70 | Capítulo continua compreensível e completo. |
| Prompt | 2.75 | Prompt V2, Style Bible e Character Lock existem; pipeline melhorou. |
| Emoção | 2.35 | Perdeu parte da intensidade emocional do V1 painterly por causa do overlay vetorial. |
| Gancho | 2.70 | Gancho existe, mas não atinge o mínimo 2.8 visualmente. |
| Qualidade comercial | 1.80 | Não aprovado como final comercial. Ainda parece uma versão de produção técnica/animatic premium, não capítulo comercial de manhwa. |

Média geral calculada:

```txt
2.54
```

## Critérios exigidos

| Critério | Resultado |
|---|---|
| média geral >= 2.7 | FALHOU |
| personagem >= 2.6 | PASSOU |
| continuidade >= 2.6 | PASSOU |
| balões >= 2.5 | PASSOU |
| gancho >= 2.8 | FALHOU |

## Resultado

```txt
REPROVADO
```

## Motivo da reprovação
O problema original de drift foi corrigido em grande parte, mas a correção via pós-produção local reduziu a qualidade artística. Sem `FAL_KEY` ou outro gerador com referência fixa/ControlNet/LoRA/IP-Adapter equivalente, não é possível produzir com segurança um Ren literalmente consistente e ao mesmo tempo painterly/comercial em todos os painéis.

## Próxima correção necessária
- Habilitar gerador oficial (`FAL_KEY`) ou outro backend com referência fixa.
- Usar `ren-reference-portrait.jpg` como character reference.
- Regenerar blocos 4–20 com referência fixa e seed/control image.
- Manter balões e F-0 em pós-produção local.
- Rodar novo contact sheet antes de aprovar.
