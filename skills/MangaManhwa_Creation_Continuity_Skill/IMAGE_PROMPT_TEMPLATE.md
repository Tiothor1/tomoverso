# IMAGE_PROMPT_TEMPLATE

Prompts de mangá/manhwa precisam carregar continuidade, não apenas estética. Use este template por página ou painel.

## 1. Prompt mestre

```text
Original [manga/manhwa/webtoon] artwork for [TITLE], chapter [CHAPTER], page/block [PAGE], panel [PANEL].
Format: [traditional black-and-white manga page / full-color vertical Korean manhwa scroll / webtoon block].
Reading order: [right-to-left / left-to-right / top-to-bottom].

CONTINUITY LOCK — mandatory:
Direct continuation from previous panel/page: [LAST ACTION]. Preserve the same location, time of day, lighting, weather, character positions, clothing state, wounds, dirt, blood, weapons, emotional state, and camera logic unless explicitly changed. Do not reset the scene.

CHARACTER LOCKS:
[Character A]: [age apparent], [height/body], [skin], [face shape], [eyes color+shape], [hair color+cut+length], [current outfit], [accessories], [weapon/object], [wounds/dirt], [posture], [personality expression]. Must look like the exact same person as previous pages.
[Character B]: ...

SCENE MAP:
Location: [specific place].
Background anchors: [doors/windows/ruins/classroom/street/castle/etc.].
Positions: [A left/right/front/back, B ...].
Movement direction: [direction].
Lighting: [source, color, contrast].
Atmosphere: [rain, dust, smoke, silence, crowd noise].

VISUAL ACTION:
[Describe what happens in this panel/page.]
Emotion: [dominant emotion].
Camera: [close-up / medium / wide / low angle / high angle / over-the-shoulder].
Composition: [main focal point, eye path, secondary focal point].
Effects/SFX: [if any; no random text].

BUBBLE SAFE AREAS:
Leave clean readable empty space for planned speech bubbles at [positions]. Do not put faces, hands, weapons, impact, magic, important props, or mystery clues in those areas.

STYLE LOCK:
[black-and-white manga: ink, screentone, hatching, high contrast] OR [full-color manhwa: cinematic lighting, gradients, glow, polished rendering]. Keep style consistent with previous page.

NEGATIVE CONSISTENCY RULES:
No changed face, no changed hairstyle, no changed hair color, no changed eye color, no changed outfit, no random accessories, no random extra characters, no age change, no body proportion change, no weapon hand swap, no healed wounds, no clean clothes if previously damaged, no unrelated background, no text baked into dialogue balloons, no watermark, no logo, no confusing panel order.
```

## 2. Compact prompt for repeated panels

```text
Continue same scene and same Character Locks. [Character] remains [visual lock]. Current state: [wounds/clothes/object/emotion]. Panel: [camera/action/background/light]. Reserve [area] for bubbles. Negative: no design changes, no random characters, no text in art.
```

## 3. Prompt for full traditional manga page

Add:

- exact number of panels;
- panel hierarchy;
- gutters;
- page direction;
- each panel’s short action;
- zones reserved for dialogue;
- black/white treatment.

## 4. Prompt for vertical manhwa block

Add:

- vertical scroll composition;
- top-to-bottom rhythm;
- breathing space before/after impact;
- continuous background or transition background;
- color palette and lighting;
- balloon spaces between blocks.

## 5. Prompt QA

- [ ] Character Lock repeated in full?
- [ ] Continuity state included?
- [ ] Scene map included?
- [ ] Bubble safe areas included?
- [ ] Negatives block design drift?
- [ ] Prompt forbids random text/watermark?
