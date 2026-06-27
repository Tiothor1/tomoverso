# Production Readiness Gate

## Regra

O Hermes só pode dizer “estou pronto para criar mangás/manhwas inteiros” se todos os critérios passarem.

## Critérios

1. Skill aparece em `skills_list`.
2. Skill abre com `skill_view`.
3. `SKILL.md` tem frontmatter válido.
4. Todos os arquivos obrigatórios existem.
5. Todos os novos módulos existem.
6. Templates têm campos obrigatórios, opcionais, instruções, exemplo, checklist e erros comuns.
7. `EXAMPLES.md` contém diálogo, luta, drama, comédia, romance, revelação, manhwa, mangá, capítulo curto e continuidades.
8. Testes originais existem: production, continuity, bubble, manhwa vertical, manga traditional.
9. Todos os testes têm média >=2.6.
10. Não há arquivos temporários, imagens copiadas, segredos, tokens, credenciais, arquivos vazios ou duplicatas inúteis.
11. Skill principal referencia pipeline completa.
12. Commit local feito.

## Quando pode dizer pronto

Somente após validação real. Se qualquer item falhar, dizer: “Ainda não estou pronto para produção completa.” e listar falhas.

## Pontuação mínima

Página passa com média >=2.4 e personagem/continuidade/balões >=2. Produção completa passa com média dos testes >=2.6.

## Resultado dos testes Lua de Ferro
| Teste | Média | Status |
|---|---:|---|
| PRODUCTION_READINESS_TEST | 2.83 | Passa |
| CONTINUITY_STRESS_TEST | 2.86 | Passa |
| BUBBLE_PLACEMENT_STRESS_TEST | 2.78 | Passa |
| MANHWA_VERTICAL_PRODUCTION_TEST | 2.82 | Passa |
| MANGA_TRADITIONAL_PRODUCTION_TEST | 2.80 | Passa |
| **Média geral** | **2.82** | **Passa readiness >=2.6** |

## Checklist final
- [ ] `skills_list` ok.
- [ ] `skill_view` ok.
- [ ] arquivos ok.
- [ ] frontmatter ok.
- [ ] LF ok.
- [ ] sem temporários/imagens/segredos.
- [ ] testes pontuados.
- [ ] commit feito.
