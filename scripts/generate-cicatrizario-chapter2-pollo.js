const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const BLOCK_DIR = path.join(OUT, 'chapter2-blocks');
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
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile('C:/Users/Fábio Teixeira/AppData/Local/hermes/.env');
  const key = process.env.POLLO_API_KEY;
  if (!key || !key.startsWith('pollo_')) throw new Error('POLLO_API_KEY missing/invalid-looking.');
  return key;
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function red(s){ return String(s||'').replace(/pollo_[A-Za-z0-9_-]+/g, '[REDACTED]'); }

const styleLock = `Original Korean dark fantasy manhwa/webtoon, vertical 9:16 mobile panel, painterly cinematic lighting, high detail, emotional acting, dark blue-black abyss palette plus oppressive white-gold church light, dynamic composition, strong foreground/midground/background, no generated text, no logo, no watermark, leave clean negative space for later local speech bubbles.`;

const renLock = `Ren Avel must match the reference image only for Ren: slim tired 20-year-old male, thin oval pale-olive face, dark hazel exhausted eyes, messy medium-length black hair with uneven fringe over the right eye, narrow shoulders, long thin hands, fragile underfed body, old small diagonal lower-lip scar if visible. He wears a rough dirty ash-gray summoned tunic with a small copper F-0 tag pinned on his upper chest whenever chest is visible. No jewelry, no armor, no heroic glow, no noble robe. Expression base: fear contained under suppressed anger.`;

const darianLock = `Darian Vohl must be visually distinct from Ren: tall athletic 22-year-old heroic noble, honey-blond to warm light-brown swept-back hair, bright amber eyes, clean face, confident arrogant posture, white-and-charcoal hero uniform with subtle gold trim, polished boots, status aura from warm light, often holding a clean white cloth. His smile is polite but predatory. He must never have Ren's messy black hair, F-0 tag, gray torn tunic, or fragile posture.`;

const sorenLock = `Soren Valcrest must be iconic and institutional: tall cold silver-haired priest-officer, pale skin, sharp blue-gray calculating eyes, severe high-collar white and gold clerical coat, black gloves, angular shoulders, long staff or ringed holy insignia, rigid silhouette, expression unreadable. He embodies church authority and political threat. He must never look like Ren or Darian.`;

const negative = `generated text, letters, logo, watermark, caption inside art, speech bubble inside art, visual novel flat composition, centered static portrait repeated, empty generic background, low detail environment, wrong face for Ren, Ren with blond hair, Ren with white hair, Ren muscular, Ren older, Ren childlike, missing F-0 tag when Ren chest visible, Ren wearing jewelry, Ren wearing armor, Ren wearing noble cloak, Darian looking like Ren, Soren looking like Ren, all characters same face, distorted hands, extra fingers, unreadable faces, gore, blood spray, graphic wound, explicit injury, modern UI HUD, copyrighted character`;

const blocks = [
  {num:'01', comp:'CLIFFHANGER CONTINUATION / SILHOUETTE', title:'The book breathes again', beat:'Continuation from Chapter 1 final frame: Ren stands small in silhouette before a massive floating black-blue Cicatrizario page inside the ruined abyss-dark dormitory vision. The page expands and contracts like lungs, sending cold mist across broken stone. His copper F-0 tag glows faintly. Strong dark negative space at upper left for narration.', balloons:[{type:'narration', x:60, y:70, w:440, text:'O livro respirou de novo.'}]},
  {num:'02', comp:'CLOSE DRAMATIC / BODY REACTION', title:'F-0 heats', beat:'Close dramatic shot of Ren clutching the copper F-0 tag on his ash-gray tunic. The tag emits blue-black heat shimmer, not flame. Ren looks terrified but trying not to scream. Hair and face match reference; background is blurred dark room with the book glow. Leave right side clear for system box.', balloons:[{type:'system', x:610, y:86, w:390, text:'F-0\nCLASSIFICAÇÃO INSTÁVEL'}]},
  {num:'03', comp:'DETAIL SYMBOLIC / OBJECT INTERACTION', title:'Pages with pulse', beat:'Extreme detail shot: Ren’s long thin fingers hover above a living black-blue page made of smoke, cracked ink, and scar-like veins. The page curls toward his hand without touching. No readable text inside art; only abstract symbols. Cinematic macro depth, hand and page are the focus.', balloons:[{type:'narration', x:58, y:72, w:460, text:'As páginas tinham pulso.'}]},
  {num:'04', comp:'OVER-THE-SHOULDER / MYSTERY', title:'Contract incomplete', beat:'Over Ren’s shoulder, the Cicatrizario page floats like a torn altar. Ren’s profile is visible, exhausted and afraid. Abstract lines on the page form around him; no real letters. The room walls bend subtly as if listening. Keep upper right safe for local system text.', balloons:[{type:'system', x:560, y:76, w:440, text:'DOR NÃO PAGA\nCONTRATO INCOMPLETO'}]},
  {num:'05', comp:'CLOSE DRAMATIC / NAME REVEAL', title:'Ren sees his record', beat:'Close on Ren’s face reflected in a liquid-black page. His eyes widen as a cyan ring appears in the reflection. His F-0 tag is barely visible at bottom edge. Emotion: realization and fear. No readable text in the generated art, only symbolic reflection.', balloons:[{type:'bubble', x:650, y:112, w:300, text:'Meu nome...?'}]},
  {num:'06', comp:'PANEL OF IMPACT / SUPERNATURAL SHOCK', title:'Pain that is not his', beat:'Dynamic impact panel: Ren jerks backward in the dormitory as invisible pressure passes through his chest. No gore, no visible wound, no blood; show only dark-blue scar-like light under the tunic and dust lifting from the floor. His hand presses the wall, body diagonal, F-0 tag glowing.', balloons:[{type:'narration', x:60, y:78, w:520, text:'Então ele sentiu uma dor\nque não era dele.'},{type:'sfx', x:660, y:1280, w:240, text:'THUM'}]},
  {num:'07', comp:'REACTION COLLECTIVE / HIGH ANGLE', title:'Dormitory wakes', beat:'High-angle view of the poor dormitory: several other classless recruits sit up in fear while Ren kneels near the bed at center, blue-black light spilling from his F-0 tag. The room is cramped, cracked, moonlit, alive with anxiety. No static portrait.', balloons:[{type:'bubble', x:68, y:88, w:300, text:'Que foi isso?'},{type:'bubble', x:690, y:170, w:300, text:'Ele fez magia?'}]},
  {num:'08', comp:'WIDE WORLD / DAWN COURTYARD', title:'Morning after the book', beat:'Wide dawn courtyard. Ren walks alone and exhausted through cold stone while groups of better-ranked heroes gather in clean uniforms. The world feels active: banners, priests, recruits, distant monoliths, servants. Ren remains small, gray, F-0 visible.', balloons:[{type:'narration', x:60, y:78, w:440, text:'De manhã, ninguém\nperguntou se ele dormiu.'}]},
  {num:'09', comp:'LOW ANGLE / DARIAN DISTINCT', title:'Darian arrives smiling', beat:'Low-angle shot from Ren’s exhausted perspective: Darian Vohl towers in warm morning light, visually distinct from Ren with honey-blond swept-back hair, amber eyes, clean white-and-charcoal hero uniform with gold trim, white cloth in hand. His smile is beautiful and cruel. Ren is lower frame in shadow.', balloons:[{type:'bubble', x:560, y:88, w:420, text:'Dormiu mal, F-zero?'}]},
  {num:'10', comp:'OVER-THE-SHOULDER / SOCIAL PRESSURE', title:'Friendly threat', beat:'Over Darian’s shoulder looking down at Ren. Darian’s gloved hand rests near Ren’s shoulder but not fully touching; recruits in background watch with smirks. Ren’s F-0 tag is visible, his jaw tense. Darian’s uniform and posture radiate status.', balloons:[{type:'bubble', x:64, y:80, w:420, text:'Você assusta fácil.'},{type:'narration', x:600, y:1530, w:380, text:'A mão dele chegou perto demais.'}]},
  {num:'11', comp:'DETAIL SYMBOLIC / FIRST POWER', title:'Debt shock transfers', beat:'Close detail panel: Darian’s elegant hand almost touches Ren’s shoulder; between the fingers and Ren’s F-0 tag, a thin blue-black thread snaps like static. Darian’s fingertips twitch. No blood, no injury, no text. Ren’s gray tunic and copper tag anchor the shot.', balloons:[{type:'sfx', x:80, y:120, w:220, text:'TIK'},{type:'bubble', x:680, y:120, w:260, text:'...'}]},
  {num:'12', comp:'CLOSE DRAMATIC / DARIAN MASK CRACK', title:'Darian feels it', beat:'Close dramatic shot of Darian Vohl, visually distinct: honey-blond hair, amber eyes, clean noble face. His polite smile cracks for one second; his eyes sharpen with anger and fascination. Warm gold backlight, cold blue reflection on fingertips. Ren is blurred low foreground.', balloons:[{type:'narration', x:58, y:82, w:460, text:'Por um segundo,\no sorriso falhou.'}]},
  {num:'13', comp:'LOW ANGLE / SOREN ICONIC', title:'Soren sees the symbol', beat:'Low-angle iconic shot of Soren Valcrest on a balcony or raised steps, silver hair, severe white-gold clerical coat, black gloves, ringed staff, cold eyes. Priests behind him freeze. He looks down at Ren as if recognizing a forbidden sign. Strong institutional silhouette.', balloons:[{type:'bubble', x:650, y:86, w:300, text:'Parem.'}]},
  {num:'14', comp:'WIDE REACTION / INSTITUTIONAL THREAT', title:'The courtyard turns', beat:'Wide shot: the training courtyard rearranges around Ren. Priests step forward, recruits back away, Darian stands to one side smiling again, Soren descends from above. Ren is small at center with blue-black glow around F-0. World alive, collective reaction visible.', balloons:[{type:'narration', x:60, y:72, w:460, text:'O pátio inteiro\nficou pequeno.'}]},
  {num:'15', comp:'OBJECT INTERACTION / TEST ORDER', title:'Mark on the stone', beat:'Ren is forced near the black monolith again but not harmed. He places his palm against the stone while the Cicatrizario’s blue-black crack pattern appears faintly beneath his hand. Soren’s staff and Darian’s boots are visible at edges, showing pressure. No gore.', balloons:[{type:'bubble', x:610, y:86, w:390, text:'Toque de novo.'}]},
  {num:'16', comp:'PANEL OF IMPACT / VOICE LOST', title:'The book answers through him', beat:'Dynamic supernatural impact: Ren bends forward with one hand gripping his throat, unable to speak, while blue-black lines ripple from the monolith into the F-0 tag. No blood, no graphic injury. The crowd blurs as if sound vanished. Composition diagonal and intense.', balloons:[{type:'system', x:56, y:76, w:450, text:'DÍVIDA DETECTADA'},{type:'narration', x:620, y:1500, w:360, text:'A voz dele sumiu.'}]},
  {num:'17', comp:'CLOSE / SOREN CALCULATING', title:'Not classified', beat:'Close shot of Soren’s cold face partly in shadow: silver hair, pale blue-gray eyes, high collar, black glove lifted toward the F-0 light. His expression is not surprised; it is calculation. Background priests appear nervous. Distinct from Ren and Darian.', balloons:[{type:'bubble', x:560, y:80, w:420, text:'Isso não é uma bênção comum.'}]},
  {num:'18', comp:'MEDIUM ACTION / DARIAN DANGEROUS', title:'Darian becomes threat', beat:'Medium action shot: Darian steps between Ren and the crowd, smiling again but more dangerous. His white-and-charcoal hero uniform, gold trim and honey hair make him clearly distinct. His hand hides the white cloth, fingers tense from the earlier shock. Ren is behind him in shadow.', balloons:[{type:'bubble', x:610, y:80, w:370, text:'Interessante.'}]},
  {num:'19', comp:'SILHOUETTE / PROPHECY VISION', title:'Ren sees himself below', beat:'Surreal vision panel: Ren sees another silhouette of himself standing deep inside a vertical abyss, surrounded by enormous broken pages chained like ruins. The current Ren is seen from behind in foreground, small. Abstract, non-graphic, dark blue-black, no readable generated text.', balloons:[{type:'narration', x:60, y:72, w:520, text:'Por trás do livro,\nhavia outro abismo.'}]},
  {num:'20', comp:'DETAIL SYMBOLIC / FORBIDDEN RECORD', title:'Name rewritten', beat:'Extreme close detail of the Cicatrizario page forming an abstract record around Ren’s reflected eye and F-0 tag. The page should have symbolic marks only, no actual readable text. Cyan cracks and black ink fold into a name-like shape. High mystery, strong focal point.', balloons:[{type:'system', x:60, y:76, w:500, text:'REN AVEL\nREGISTRO PROIBIDO'}]},
  {num:'21', comp:'LOW ANGLE / INSTITUTIONAL LOCKDOWN', title:'Soren orders containment', beat:'Low-angle wide panel: Soren stands before massive cathedral doors as priests begin closing them behind Ren. Soren’s silver hair, white-gold coat, black gloves, and ringed staff create an iconic institutional silhouette. Ren is small in foreground, trapped, F-0 glowing.', balloons:[{type:'bubble', x:610, y:78, w:370, text:'Fechem as portas.'}]},
  {num:'22', comp:'FINAL CLIFFHANGER / HUGE BOOK', title:'The collector should not wake', beat:'Final vertical cliffhanger: a colossal black-blue Cicatrizario page opens above Ren like a dark winged monument. Ren stands below, back turned, copper F-0 tag glowing through torn gray tunic. Darian’s smiling silhouette and Soren’s staff silhouette appear far behind. Massive scale, ominous negative space, no generated text.', balloons:[{type:'system', x:58, y:72, w:650, text:'O COBRADOR NÃO DEVIA\nTER SOBREVIVIDO.'},{type:'narration', x:610, y:1510, w:390, text:'E todos ouviram\no livro respirar.'}]},
];

function promptFor(block){
  const locks = [styleLock, `Composition: ${block.comp}.`, `Scene: ${block.title}. ${block.beat}`, `Ren Reference Lock: ${renLock}`];
  if (['09','10','11','12','14','18','22'].includes(block.num)) locks.push(`Darian Visual Lock: ${darianLock}`);
  if (['13','14','15','17','21','22'].includes(block.num)) locks.push(`Soren Visual Lock: ${sorenLock}`);
  locks.push(`Negative prompt: ${negative}`);
  return locks.join('\n\n');
}

function writeDocsOnly(){
  const script = [];
  script.push('# Cicatrizário do Abismo — Capítulo 2: O Livro Que Respira');
  script.push('');
  script.push('## Continuidade herdada');
  script.push('- Começa imediatamente após o final do Capítulo 1 aprovado.');
  script.push('- Ren está diante do Cicatrizário gigante.');
  script.push('- Última informação visual herdada: `DÍVIDA FUTURA: ILEGÍVEL`; o livro respirou.');
  script.push('- Ren mantém túnica cinza-ash, corpo magro, cabelo preto bagunçado, F-0 no peito e medo contido com raiva reprimida.');
  script.push('');
  script.push('## Objetivo do capítulo');
  script.push('Mostrar que o F-0 não é inútil: ele registra dívida/dor de forma perigosa, ativa involuntariamente quando Darian toca o campo de Ren e chama a atenção fria de Soren.');
  script.push('');
  script.push('## Blocos');
  for (const b of blocks) {
    script.push(`\n### Bloco ${b.num} — ${b.title}`);
    script.push(`- Composição: ${b.comp}`);
    script.push(`- Beat: ${b.beat}`);
    script.push('- Lettering local:');
    for (const item of b.balloons) script.push(`  - ${item.type}: ${item.text.replace(/\n/g, ' / ')}`);
  }
  fs.writeFileSync(path.join(OUT, 'chapter2-script.md'), script.join('\n'), 'utf8');

  const promptDoc = [];
  promptDoc.push('# Cicatrizário do Abismo — Capítulo 2 Block Prompts');
  promptDoc.push('');
  promptDoc.push('Backend: Pollo API / GPT Image 2.0');
  promptDoc.push('Reference: Ren reference portrait via HTTPS URL. Secret API key is not included.');
  promptDoc.push('');
  for (const b of blocks) {
    const prompt = promptFor(b);
    promptDoc.push(`\n## Block ${b.num} — ${b.title}`);
    promptDoc.push(`\nComposition: ${b.comp}\n`);
    promptDoc.push('```txt');
    promptDoc.push(prompt);
    promptDoc.push('```');
    fs.writeFileSync(path.join(BLOCK_DIR, `block-${b.num}.prompt.md`), `# Block ${b.num} — ${b.title}\n\n## Composition\n${b.comp}\n\n## Model\nPollo GPT Image 2.0\n\n## Reference URL\n${REN_REF_URL}\n\n## Prompt\n${prompt}\n`, 'utf8');
  }
  fs.writeFileSync(path.join(OUT, 'chapter2-block-prompts.md'), promptDoc.join('\n'), 'utf8');

  const state = `# Cicatrizário do Abismo — Chapter 2 Continuity State\n\n## Incoming state\n- Chapter 1 ended with Ren before the enormous Cicatrizario page.\n- Text/hook: DÍVIDA FUTURA: ILEGÍVEL.\n- Sensation: the book breathed.\n\n## Chapter 2 final state\n- Ren remains in Arvhal, still F-0, still wearing the ash-gray tunic with copper F-0 tag.\n- New persistent effect: the F-0 tag now has a faint blue-black hairline crack/glow after activation.\n- Ren briefly lost his voice during the monolith response; voice can return weakly in Chapter 3, but throat should feel strained.\n- Ren felt pain that did not belong to him; he understands the Cicatrizario records debts, not blessings.\n- First involuntary power sign: when Darian almost touched Ren, a blue-black static thread jumped from Ren/F-0 to Darian's fingers. Darian felt it and hid his reaction.\n- Darian is now visually/narratively more dangerous: honey/light-brown hair, white-charcoal hero uniform, gold trim, white cloth, superior smile. He is suspicious of Ren.\n- Soren recognized the F-0 symbol as something forbidden or unclassified and ordered containment.\n- The Cicatrizario wrote/communicated: O COBRADOR NÃO DEVIA TER SOBREVIVIDO.\n\n## Injuries/effects to carry forward\n- No graphic wounds.\n- Ren exhausted; throat strained from temporary voice loss.\n- F-0 tag: faint blue-black crack/glow.\n- Emotional state: terrified, humiliated, but now aware his ability has teeth.\n\n## Chapter 3 hook\n- Ren is trapped/contained after Soren orders the doors closed.\n- The institution now knows F-0 is not ordinary.\n- Darian has a private reason to test Ren again because the touch hurt him.\n- Next chapter should move into forced observation/test or Pátio dos Inúteis with Soren watching.\n`;
  fs.writeFileSync(path.join(OUT, 'chapter2-continuity-state.md'), state, 'utf8');
  console.log(JSON.stringify({docs:true, blocks:blocks.length, script:'chapter2-script.md', prompts:'chapter2-block-prompts.md', state:'chapter2-continuity-state.md'}));
}

async function createTask(key, prompt){
  const res = await fetch(`${API_BASE}/generation/openai/gpt-image-2-0/image`, {
    method: 'POST', headers: {'Content-Type':'application/json','x-api-key':key},
    body: JSON.stringify({input:{prompt, aspectRatio:'9:16', resolution:'1K', quality:'low', images:[REN_REF_URL]}, clientSource:'tomoverso-cicatrizario-chapter2'})
  });
  const text = await res.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!res.ok) throw new Error(`create HTTP ${res.status}: ${red(JSON.stringify(data))}`);
  const taskId=data.taskId||data?.data?.taskId; const status=data.status||data?.data?.status;
  if(!taskId) throw new Error(`missing taskId: ${red(JSON.stringify(data))}`);
  return {taskId,status};
}
async function pollTask(key, taskId){
  const start=Date.now();
  while(Date.now()-start<480000){
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
  const out=path.join(BLOCK_DIR,`block-${block.num}.jpg`);
  const prompt=promptFor(block);
  if(fs.existsSync(out) && fs.statSync(out).size>100000){ console.log(JSON.stringify({block:block.num, skipped:true, out})); return; }
  fs.writeFileSync(path.join(BLOCK_DIR,`block-${block.num}.prompt.md`), `# Block ${block.num} — ${block.title}\n\n## Composition\n${block.comp}\n\n## Model\nPollo GPT Image 2.0\n\n## Reference URL\n${REN_REF_URL}\n\n## Prompt\n${prompt}\n`, 'utf8');
  const created=await createTask(key,prompt); console.log(JSON.stringify({block:block.num,created:true,taskId:created.taskId,status:created.status}));
  const result=await pollTask(key,created.taskId); console.log(JSON.stringify({block:block.num,taskId:created.taskId,credit:result.credit,costUsd:result.costUsd}));
  await downloadToJpg(result.url,out);
  const meta=await sharp(out).metadata(); console.log(JSON.stringify({block:block.num,done:true,out,width:meta.width,height:meta.height}));
}

(async()=>{
  writeDocsOnly();
  if (process.argv.includes('--docs-only')) return;
  const key=loadKey();
  console.log(JSON.stringify({provider:'pollo',model:'gpt-image-2-0',keyLoaded:true,key:'[REDACTED]',blocks:blocks.length,reference:'catbox'}));
  const startAt = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from')+1] : '01';
  for(const block of blocks){ if(block.num < startAt) continue; await generateBlock(key, block); await sleep(1500); }
})().catch((err)=>{ console.error(red(err.stack || err.message || String(err))); process.exit(1); });
