---
name: mangamanhwa-creation-continuity-skill
description: Use when creating, adapting, planning, prompting, lettering, QA-reviewing, or producing complete manga/manhwa/webtoon works. Professional Full Production Mode enforces series bible, arc/volume/chapter planning, character lock, continuity bible, scene maps, page/panel scripts, bubble placement, prompt chaining, scoring QA, and production readiness before claiming readiness.
version: 2.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [manga, manhwa, webtoon, comics, continuity, full-production, storyboard, image-prompts, lettering, qa]
    related_skills: [image-generation-fallback, novel-site-brasil, manga-cover-generation]
---
# MangaManhwa_Creation_Continuity_Skill — Professional Full Production Mode

## Overview

Esta skill transforma o Hermes em um estúdio interno de produção de mangá, manhwa, webtoon e HQ original. Ela não é apenas uma lista de dicas: é um processo obrigatório de produção completa com bíblia de obra, planejamento de arcos/volumes/capítulos, travamento visual de personagens, continuidade viva, mapas de cena, roteiro visual, painéis, balões, prompts encadeados e QA com pontuação.

Use referências reais apenas como estudo técnico temporário. Nunca copie personagens, nomes, poses específicas, falas, páginas, layouts protegidos ou artes. A saída deve ser original.

## When to Use

Use quando o usuário pedir:

- criar mangá, manhwa, webtoon, HQ, capítulo ou volume;
- transformar novel/roteiro/cena em quadrinhos;
- criar série inteira, arco, capítulo, página, storyboard ou prompts;
- corrigir personagem que mudou de aparência;
- planejar balões, onomatopeias, leitura ou letreiramento;
- revisar continuidade entre painéis, páginas, capítulos ou arcos;
- validar se uma produção está pronta.

Não use para copiar obra existente, reproduzir arte protegida, fazer apenas capas estáticas, ou quando o usuário só quer resumo textual sem narrativa visual.

## Operating Modes

1. **Full Production Mode** — obra inteira: Series Bible → arcos → volumes → capítulos → páginas → painéis → prompts → QA.
2. **Chapter Mode** — um capítulo completo com continuidade herdada e estado final.
3. **Page Mode** — uma página isolada, mas ainda exige Character Bible e Continuity Bible.
4. **Prompt Mode** — prompts de imagem consistentes por painel/página; nunca usar prompt vago.
5. **Lettering Mode** — balões, narração, onomatopeia e ordem de leitura.
6. **Continuity Repair Mode** — detectar drift visual/narrativo e corrigir ficha, roteiro ou prompt.
7. **Review Mode** — pontuar página/capítulo com QA 0-3.

## Mandatory Workflow

1. **Load or create Series Bible.** Done when título, formato, gênero, tema, mundo, regras, estética, público e limites estão definidos.
2. **Load or create Character Bible.** Done when every recurring character has visual lock, narrative lock, clothes, props, wounds and negative prompt.
3. **Load or create Continuity Bible.** Done when current chapter/page/scene state is explicit: location, time, weather, lighting, positions, injuries, objects, emotions and promises.
4. **Plan arc/volume/chapter if scope requires it.** Done when every chapter has objective, conflict, turn, climax and hook.
5. **Create Scene Map.** Done when spatial relationships, entrances, exits, obstacles and camera axis are clear.
6. **Write Page Script.** Done when every page has purpose, emotion, panel count, composition, reading order, inherited continuity and outgoing continuity.
7. **Write Panel Script.** Done when every panel has camera, action, pose, expression, background, bubble plan and prompt.
8. **Plan Bubble Placement before final image.** Done when no text covers faces, hands, weapons, impact, magic, expression or key clue.
9. **Generate/prepare Image Prompts.** Done when prompts include Character Lock, Continuity Lock, Scene Lock, style, bubble-safe zones and negatives.
10. **Run QA scoring.** Done only when every category passes minimum thresholds.
11. **Export state for next page/chapter.** Done when the next generation can continue without guessing.

## Absolute Rules

- Never generate art before visual script.
- Never introduce recurring characters without Character Bible.
- Never continue a scene without Continuity Bible.
- Next page inherits previous page state unless an explicit transition exists.
- Next chapter inherits unresolved state unless recap/time skip explains change.
- Never change face, hair, age, body, eyes, outfit, weapon, scar, injury or personality without a written reason.
- Never let bubbles cover important faces, hands, weapons, impacts, magic, clues or emotional expressions.
- Never add random characters or remove present characters without blocking/staging.
- Never use vague prompts such as “same character, manga style”. Use full lock blocks.
- Never claim production readiness until `PRODUCTION_READINESS_GATE.md` passes.

## Output Contracts

For full work: Series Bible, Character Bible, Continuity Bible, arc plan, volume plan, chapter plan, page scripts, panel scripts, bubble scripts, prompts, QA tables, final state.

For page: inherited state, objective, layout, panels, bubbles, prompt(s), QA, outgoing state.

For review: failures, severity, correction, revised prompt/script, score before/after.

## Key Files

- `MangaManhwa_Creation_Continuity_Skill.md` — manual principal.
- `FULL_PRODUCTION_PIPELINE.md` — pipeline completa.
- `PRODUCTION_READINESS_GATE.md` — critérios para dizer que está pronto.
- `SERIES_BIBLE_TEMPLATE.md`, `ARC_PLANNING_TEMPLATE.md`, `VOLUME_PLANNING_TEMPLATE.md`, `CHAPTER_PLANNING_TEMPLATE.md` — planejamento macro.
- `CHARACTER_BIBLE_TEMPLATE.md`, `VISUAL_CONTINUITY_LOCK.md` — identidade visual/narrativa.
- `CONTINUITY_BIBLE_TEMPLATE.md`, `SCENE_MAP_TEMPLATE.md` — continuidade viva.
- `PAGE_SCRIPT_TEMPLATE.md`, `PANEL_SCRIPT_TEMPLATE.md`, `STORYBOARD_WORKFLOW.md` — storyboard.
- `BUBBLE_PLACEMENT_RULES.md` — letramento.
- `IMAGE_PROMPT_TEMPLATE.md`, `PROMPT_CHAINING_WORKFLOW.md` — prompts.
- `QA_CHECKLIST.md`, `ANTI_ERRORS.md` — revisão.
- `MANGA_FORMAT_RULES.md`, `MANHWA_VERTICAL_RULES.md` — formatos.
- `ADAPT_NOVEL_TO_MANGA_WORKFLOW.md` — adaptação.
- `*_TEST.md` — testes originais “Lua de Ferro”.

## Readiness Rule

Só declare prontidão se a skill carrega no Hermes, todos os arquivos existem, testes originais passam média >=2.6, não há temporários/imagens/segredos, e o commit local foi feito.
## Real project lesson: Cicatrizário do Abismo

The project `Cicatrizário do Abismo` exposed a critical production rule: painterly AI panels are not production-ready if the recurring protagonist drifts. Before approving a chapter, create a contact sheet, score drift, and require reference sheet + style bible + visual continuity lock + immutable character prompt. Without a backend that supports fixed character reference, report the result as preview/pilot rather than final commercial art. See `REAL_PROJECT_LESSONS_CICATRIZARIO_ABISMO.md`.
