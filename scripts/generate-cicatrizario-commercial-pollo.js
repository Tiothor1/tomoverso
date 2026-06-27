const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const BLOCK_DIR = path.join(OUT, 'final-blocks');
const API_BASE = 'https://pollo.ai/api/platform';
const REN_REF_URL = 'https://files.catbox.moe/wu0k6e.jpg';
fs.mkdirSync(BLOCK_DIR, { recursive: true });

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}
function loadKey() {
  loadEnvFile(path.join(ROOT, '.env.local'));
  loadEnvFile('C:/Users/Fábio Teixeira/AppData/Local/hermes/.env');
  const key = process.env.POLLO_API_KEY;
  if (!key || !key.startsWith('pollo_')) throw new Error('POLLO_API_KEY missing/invalid-looking.');
  return key;
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function red(s){ return String(s||'').replace(/pollo_[A-Za-z0-9_-]+/g, '[REDACTED]'); }

const renLock = `Ren Avel must match the reference image: slim 20-year-old male, pale skin, thin tired face, messy medium-length black hair, dark brown exhausted eyes, no beard, no jewelry, no armor. In Arvhal he wears a rough ash-gray summoned tunic, dirty and damaged, with a small copper F-0 tag pinned on his chest when visible.`;
const styleLock = `Original Korean dark fantasy manhwa/webtoon, vertical 9:16 mobile panel, painterly cinematic lighting, detailed environment, dynamic camera, high emotional tension, no generated text, no logo, no watermark, leave clean negative space for later speech bubbles.`;
const negative = `different face, different hairstyle, blond hair, white hair, older man, child, muscular hero, noble outfit, white noble shirt, black modern jacket in Arvhal, armor, cape, jewelry, necklace, crown, missing F-0 tag when chest visible, extra scars, beard, mustache, smiling neutral pose unless specified, centered static portrait, empty generic background, visual novel composition, text, logo, watermark, speech bubbles inside art, distorted hands, extra fingers, blurry face, low detail environment`;

const blocks = [
  ['01','PLANO ABERTO / ÂNGULO ALTO', 'Abyss cold open', `Wide world-building high-angle shot into a vast cracked abyss chamber. Ren is in the lower third, crawling up broken stone, one hand gripping a ledge, body tense and afraid. Environment dominates: black-blue mist, ruined vertical pillars, deep shadows, cyan spark reflecting on cracks. F-0 tag faintly glints on chest. Upper left has dark empty space for narration.`],
  ['02','CLOSE DRAMÁTICO', 'Earth rain before death', `Close dramatic shot in modern night rain. Ren in simple dark wet school/work clothes, same face and hair from reference but without F-0 tag yet. His eyes widen in fear as reflected truck headlights streak across wet asphalt. Background is urban crosswalk blur, rain drops sharp, emotional dread. Top right empty dark area for narration.`],
  ['03','ÂNGULO BAIXO / AÇÃO SIMBÓLICA', 'The sacrifice flash', `Low-angle symbolic action shot from wet street level. Ren lunges forward through heavy rain toward an overwhelming white-blue wall of light, one arm extended in a desperate protective motion. No vehicle visible, no child visible, no collision, no gore; the moment is represented abstractly by rain, flying water droplets, broken reflection lines on asphalt, and blinding light behind him. Dynamic diagonal composition, terror and sacrifice, lower left left open for SFX overlay.`],
  ['04','PLANO ABERTO / WORLD BUILDING', 'Summoning hall', `Enormous cathedral summoning hall in Arvhal, golden-white magic circle fading under Ren's knees. Ren is small and disoriented at center-lower frame in ash-gray tunic with F-0 tag, surrounded by towering priests, banners, marble steps, and distant heroes glowing. Sense of scale and oppression. High ceiling, divine light above, shadows around Ren.`],
  ['05','CLOSE DRAMÁTICO', 'F-0 reveal', `Extreme close-up of Ren's chest and lower face: trembling mouth, dirt and sweat, copper F-0 tag pinned to torn ash-gray tunic glowing weakly cyan. His fingers clutch the fabric. Background blurred with laughing nobles. Emotion: humiliation, confusion, first spark of dread. Leave top dark band for narration.`],
  ['06','ÂNGULO ALTO / FRAGILIDADE', 'Public laughter', `High-angle shot looking down on Ren kneeling on polished cathedral floor while the crowd forms a circle around him. Their faces are partly shadowed/smirking, robes and boots encircle him. Ren's head is lowered, fists tight, F-0 tag visible. Composition shows social pressure and isolation, not a centered portrait.`],
  ['07','MEIO CORPO COM AÇÃO', 'Darian approaches', `Medium body shot with action: Darian's confident hand enters from foreground offering help while Ren looks up suspiciously from the ground. Ren is dirty in gray tunic, F-0 tag visible. Background has cathedral steps and watching priests. Camera slightly low from Ren's perspective; Darian's smile feels warm but unsettling.`],
  ['08','INTERAÇÃO COM AMBIENTE', 'Liora blocked', `Ren sits against a cold stone wall, touching his injured hand, while Liora's sleeve and healing light reach toward him from side frame but a priest's staff blocks her. Ren's face shows shame and pain. Environment: corridor outside summoning hall, candles, damp stone, narrow depth. Keep left side open for dialogue bubble.`],
  ['09','PLANO ABERTO / WORLD BUILDING', 'Training yard', `Wide shot of the training yard at dawn. Huge black monolith testing stone towers over tiny Ren. Other summoned heroes in bright uniforms practice magic in background; Ren stands alone near cracked dirt. F-0 tag visible, gray tunic dirty. Camera emphasizes scale and inferiority, strong long shadows.`],
  ['10','CLOSE DRAMÁTICO / OBJETO', 'Hand hits stone', `Close-up symbolic action shot of Ren's tense right fist pressing hard against the black monolith. No blood, no open wound, no gore; the impact is shown through trembling fingers, dust, small stone vibration, and a faint cyan crack reflection from the Cicatrizario. His gray sleeve is dirty; background blurred with laughing figures. Strong tactile impact, safe non-graphic image.`],
  ['11','ÂNGULO BAIXO / PRESSÃO', 'Soren denies cure', `Low-angle oppressive shot: Soren Valcrest stands above Ren glowing with controlled holy light, elegant silhouette partially out of frame, while Ren crouches below holding his strained hand. Ren's tired eyes look up in anger and shame. The environment is white-gold stone yard with cold shadows, power imbalance clear.`],
  ['12','CLOSE DRAMÁTICO', 'Denied healing', `Close dramatic shot of Ren's face after being denied help. Same reference face, black messy hair stuck to sweat, eyes dark with humiliation and suppressed rage. His tense knuckles are near his cheek, dirty but non-graphic, no blood. Background fades to cold gold and blue blur. No text, no neutral expression.`],
  ['13','SILHUETA / SOMBRA', 'Dormitory exile', `Silhouette composition: Ren alone in a narrow poor dormitory, sitting on the edge of a rough bed, moonlight cutting through bars. F-0 tag faintly visible as a copper glint. The room has cracked plaster, old blanket, bucket, stone floor. His posture is curled inward. Large shadow behind him shaped like an abstract scar.`],
  ['14','INTERAÇÃO COM OBJETO', 'Cicatrizario page opens', `Over-the-shoulder shot: Ren's tense fingers hover over a ghostly black-blue book/interface opening above his palm, the Cicatrizario forming from abstract scar patterns and smoke. We see part of Ren's face in profile, terrified and fascinated. Room darkness surrounds him. Interface must be abstract symbols only, no readable text.`],
  ['15','CLOSE / SOBRENATURAL', 'Eye in the dark', `Surreal close shot: Ren's eye reflected in a dark liquid-like page, cyan ring of the Cicatrizario forming in his pupil. His messy black hair frames a pale exhausted face. The background is almost black with smoke tendrils and faint abstract scar patterns. Emotional state: horror turning into focus.`],
  ['16','MEIO CORPO COM AÇÃO', 'First debt tremor', `Medium action shot: Ren jerks backward as supernatural shock registers through his body; one hand grips his chest near the F-0 tag, the other braces against the wall. Blue-black abstract scar-like lines briefly glow around him, not heroic aura. Room objects shake slightly. Dynamic diagonal body pose, no static portrait.`],
  ['17','PLANO ABERTO / AMBIENTE', 'Night does not end', `Wide interior shot of the dormitory at night. Ren is small at bottom right, collapsed beside the bed, while the huge shadow of the Cicatrizario symbol spreads across wall and ceiling. Environment tells the scene: cold moonbeam, rough bedding, cracked wall, dust. Strong negative space for narration.`],
  ['18','ÂNGULO ALTO / FRAGILIDADE', 'Morning bell', `High-angle dawn shot from above the dormitory courtyard. Ren walks alone below, tiny among stone buildings and long blue shadows. Other recruits gather in distant groups, ignoring him. His gray tunic and F-0 tag are visible, posture exhausted but moving forward. World feels large and indifferent.`],
  ['19','ÂNGULO BAIXO / PRESSÃO SOCIAL', 'Darian smiles again', `Low-angle tense composition from Ren's shoulder: Darian smiles warmly in foreground light while Ren watches from lower shadow, suspicious but vulnerable. Darian's hand holds a white cloth with a faint gray smudge, non-graphic. Background recruits blur. The smile should feel like a trigger, friendly on surface, dangerous underneath.`],
  ['20','CLIFFHANGER / SILHUETA', 'Debt future illegible', `Final cliffhanger vertical panel: Ren stands in silhouette before a huge floating black-blue Cicatrizario page, his F-0 tag glowing copper-cyan. The page emits abstract unreadable scar symbols, not real text. Darian's smiling silhouette is faint in the smoke behind him. Dramatic dark negative space, ominous hook, cinematic final image.`],
];

function promptFor(block){
  const [num, comp, title, scene] = block;
  return `${styleLock}\n\nComposition: ${comp}. Scene: ${title}. ${scene}\n\nCharacter lock: ${renLock}\n\nNegative prompt: ${negative}`;
}
async function createTask(key, prompt){
  const res = await fetch(`${API_BASE}/generation/openai/gpt-image-2-0/image`, {
    method: 'POST', headers: {'Content-Type':'application/json','x-api-key':key},
    body: JSON.stringify({input:{prompt, aspectRatio:'9:16', resolution:'1K', quality:'low', images:[REN_REF_URL]}, clientSource:'tomoverso-cicatrizario-commercial'})
  });
  const text = await res.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!res.ok) throw new Error(`create HTTP ${res.status}: ${red(JSON.stringify(data))}`);
  const taskId=data.taskId||data?.data?.taskId; const status=data.status||data?.data?.status;
  if(!taskId) throw new Error(`missing taskId: ${red(JSON.stringify(data))}`);
  return {taskId,status};
}
async function pollTask(key, taskId){
  const start=Date.now();
  while(Date.now()-start<420000){
    const res=await fetch(`${API_BASE}/generation/${encodeURIComponent(taskId)}/status`, {headers:{'x-api-key':key}});
    const text=await res.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
    if(!res.ok) throw new Error(`status HTTP ${res.status}: ${red(JSON.stringify(data))}`);
    const body = data?.data && Array.isArray(data.data.generations) ? data.data : data;
    const gens=Array.isArray(body.generations)?body.generations:[];
    const fail=gens.find(g=>g.status==='failed'); if(fail) throw new Error(`failed: ${red(fail.failMsg||JSON.stringify(fail))}`);
    const img=gens.find(g=>g.status==='succeed'&&g.mediaType==='image'&&g.url); if(img) return {url:img.url, credit:body.credit, costUsd:body.costUsd};
    const status=gens.map(g=>g.status).join(',')||body.status||'waiting';
    console.log(JSON.stringify({taskId,status,elapsedSec:Math.round((Date.now()-start)/1000)}));
    await sleep(5000);
  }
  throw new Error(`timeout ${taskId}`);
}
async function downloadToJpg(url, file){
  const res=await fetch(url); if(!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buf=Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize(1080,1920,{fit:'cover',position:'attention'}).jpeg({quality:94}).toFile(file);
}
async function generateBlock(key, block){
  const [num, comp, title] = block;
  const out=path.join(BLOCK_DIR,`block-${num}.jpg`);
  const promptPath=path.join(BLOCK_DIR,`block-${num}.prompt.md`);
  const prompt=promptFor(block);
  fs.writeFileSync(promptPath, `# Block ${num} — ${title}\n\n## Composition\n${comp}\n\n## Model\nPollo GPT Image 2.0\n\n## Reference URL\n${REN_REF_URL}\n\n## Prompt\n${prompt}\n`, 'utf8');
  if(fs.existsSync(out) && fs.statSync(out).size>100000){ console.log(JSON.stringify({block:num, skipped:true, out})); return; }
  const created=await createTask(key,prompt); console.log(JSON.stringify({block:num,created:true,taskId:created.taskId,status:created.status}));
  const result=await pollTask(key,created.taskId); console.log(JSON.stringify({block:num,taskId:created.taskId,credit:result.credit,costUsd:result.costUsd}));
  await downloadToJpg(result.url,out);
  const meta=await sharp(out).metadata(); console.log(JSON.stringify({block:num,done:true,out,width:meta.width,height:meta.height}));
}
(async()=>{
  const key=loadKey();
  console.log(JSON.stringify({provider:'pollo',model:'gpt-image-2-0',keyLoaded:true,key:'[REDACTED]',blocks:blocks.length,reference:'catbox'}));
  const startAt = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from')+1] : '01';
  for(const block of blocks){ if(block[0] < startAt) continue; await generateBlock(key, block); await sleep(1500); }
})();
