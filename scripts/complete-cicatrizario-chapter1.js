const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const AI = path.join(OUT, 'ai-panels');
fs.mkdirSync(AI, { recursive: true });

const W = 900;
const REN_LOCK = 'Ren Avel, slim tired 20 year old man, olive light skin, thin face, dark hazel exhausted eyes, messy black hair with uneven fringe, small old scar on lower lip, insecure slightly hunched posture, plain rough ash-gray summoned tunic, copper F-0 tag pinned on chest, no weapon, no armor, no jewelry, powerless and humiliated';
const NEG_REN = 'do not change Ren face, do not change messy black hair, do not remove lower lip scar, do not remove copper F-0 tag, do not give Ren armor, do not give Ren a weapon, do not make him muscular, do not add jewelry, do not make him confident yet, no readable text, no logo, no watermark';

const existing = [
  { file: '01-abyss.webp', h: 1280, title: 'Eles me chamaram de erro.' },
  { file: '02-rain.webp', h: 1180, title: 'Trinta dias antes' },
  { file: '03-accident.webp', h: 1120, title: 'Sai daí!' },
  { file: '04-summon-final.webp', h: 1280, title: 'Salão da Aurora' },
  { file: '05-f0-final.webp', h: 1180, title: 'Cicatrizário F-0' },
  { file: '06-humiliation-final.webp', h: 1260, title: 'A risada' },
];

const newPanels = [
  {
    id: '07-tag', h: 1040, title: 'Etiqueta F-0', caption: null,
    speech: [{text:'Setor de apoio. Sem prioridade de cura.', x:70, y:72, w:520, tail:'M340 150 L392 320 L305 155 Z'}],
    badge: {x: 388, y: 560},
    prompt: `Original dark fantasy Korean manhwa vertical panel, cold church registration desk, close-up of a copper rank tag being pinned onto Ren Avel chest. ${REN_LOCK}. A cold church scribe in white-gold robe attaches the humiliating F-0 tag. Bureaucratic cruelty, desaturated gold and gray palette, cinematic close shot, mobile webtoon composition, empty area at top for speech bubble. ${NEG_REN}`
  },
  {
    id: '08-liora', h: 1120, title: 'Liora', caption: null,
    speech: [
      {text:'Você está sangrando.', x:510, y:70, w:330, tail:'M642 146 L606 410 L677 150 Z'},
      {text:'Não é nada.', x:92, y:280, w:260, tail:'M258 352 L342 562 L225 360 Z'}
    ],
    badge: {x: 250, y: 650},
    prompt: `Original dark fantasy manhwa vertical panel, quiet side corridor of a grand cathedral, Liora Senn young apprentice healer with short light brown hair, amber eyes, white gloves, simple cream healer robe, offering cloth to Ren Avel. ${REN_LOCK}. Ren looks embarrassed and guarded, small blood on his hand from blessing test, warm side light contrasting cold stone, intimate emotional composition, no romance exaggeration, high detail Korean webtoon style, no text, no logo, no watermark.`
  },
  {
    id: '09-training-yard', h: 1120, title: 'O pátio de teste', caption: null,
    speech: [{text:'De novo.', x:88, y:82, w:240, tail:'M230 155 L362 340 L202 162 Z'}, {text:'Ele vai quebrar antes do boneco.', x:475, y:120, w:360, tail:'M580 198 L624 376 L540 206 Z'}],
    badge: {x: 395, y: 648},
    prompt: `Original Korean manhwa vertical panel, outdoor cathedral training yard, Ren Avel falling hard after failing to strike a wooden magic training dummy. ${REN_LOCK}. His right shoulder is bruised from impact, F-0 tag visible, other radiant heroes watching and laughing in background, pale sun, cinematic humiliation, mobile webtoon composition, no text, no logo, no watermark.`
  },
  {
    id: '10-pain-register', h: 1040, title: 'Registro de dor', caption: 'Dor registrada: ombro direito. Origem: impacto contuso.',
    speech: [{text:'Dívida...?', x:560, y:80, w:240, tail:'M630 150 L600 300 L665 154 Z'}],
    badge: null,
    prompt: `Original dark fantasy Korean manhwa vertical close-up, Ren Avel on training yard floor, ${REN_LOCK}, close-up of his dark hazel eye reflecting a dark cracked book-like status page, blue-black scar lines around his bruised right shoulder, ominous first clue of power, background blurred, cinematic psychological supernatural moment, no text, no logo, no watermark.`
  },
  {
    id: '11-darian-hand', h: 1120, title: 'A mão de Darian', caption: null,
    speech: [
      {text:'Não liga para eles. Todo herói começa de algum lugar.', x:48, y:72, w:520, tail:'M368 154 L420 365 L330 160 Z'},
      {text:'...Obrigado.', x:580, y:380, w:250, tail:'M640 450 L560 600 L686 456 Z'}
    ],
    badge: {x: 300, y: 650},
    prompt: `Original dark fantasy Korean manhwa vertical panel, charismatic hero Darian Vohl with dark blond hair, warm smile, white-gold early hero outfit, offering his hand to help Ren Avel up from training yard floor. ${REN_LOCK}. Ren is bruised on right shoulder and hesitant, visual power imbalance, golden sunlight suspiciously warm, cinematic composition, no text, no logo, no watermark.`
  },
  {
    id: '12-dormitory', h: 1050, title: 'Dormitório dos sem classe', caption: null,
    speech: [{text:'Se eu não consigo ser forte... então eu preciso aguentar mais que eles.', x:70, y:70, w:680, tail:null, thought:true}],
    badge: {x: 388, y: 610},
    prompt: `Original dark fantasy Korean manhwa vertical panel, small servant dormitory at night, Ren Avel sitting alone on a narrow bed, ${REN_LOCK}, holding or looking at his copper F-0 tag, bruised right shoulder, moonlight through narrow window, lonely composition with lots of empty dark space, emotional silence, no text, no logo, no watermark.`
  },
  {
    id: '13-door', h: 1040, title: 'Conversa atrás da porta', caption: null,
    speech: [
      {text:'F-0 não justifica recursos.', x:430, y:70, w:360, tail:'M580 145 L635 315 L540 150 Z'},
      {text:'Na próxima Ferida Cinza, coloque-o na frente.', x:380, y:220, w:440, tail:'M560 300 L600 410 L515 304 Z'}
    ],
    badge: {x: 185, y: 560},
    prompt: `Original dark fantasy Korean manhwa vertical panel, Ren Avel hidden behind a half-open dormitory door, ${REN_LOCK}, shocked fearful expression, two church priests in white-gold robes whispering in corridor light, Ren in dark room foreground, spying composition, political cruelty, cinematic lighting, no text, no logo, no watermark.`
  },
  {
    id: '14-page-opens', h: 1040, title: 'A página abre', caption: 'Humilhação registrada. Dívida social reconhecida.',
    speech: [{text:'Isso... não é cura.', x:280, y:70, w:340, tail:'M430 145 L456 340 L398 150 Z'}],
    badge: {x: 388, y: 615},
    prompt: `Original dark fantasy Korean manhwa vertical panel, dark servant dormitory, Ren Avel sitting in moonlit shadow, ${REN_LOCK}, bruised right shoulder, dark cracked book-like status window opening above his hands, blue-black light drawing thin scar lines in the air, fearful realization, high detail webtoon, no text, no logo, no watermark.`
  },
  {
    id: '15-eye', h: 1080, title: 'O olho no escuro', caption: 'Toda ferida tem origem.',
    speech: [], badge: null,
    prompt: `Original dark fantasy Korean manhwa vertical close-up, Ren Avel frightened face half-lit by abyssal blue, messy black hair, dark hazel eyes, lower lip scar, reflection of a giant eye made of black handwriting inside a dark cracked book page, surreal ominous power awakening, intense cinematic horror, no text, no logo, no watermark.`
  },
  {
    id: '16-betrayal-line', h: 1080, title: 'Primeira cobrança', caption: 'Primeira cobrança disponível quando o devedor sorrir novamente.',
    speech: [{text:'Devedor...?', x:570, y:720, w:250, tail:'M650 790 L592 940 L682 796 Z'}], badge: {x: 388, y: 610},
    prompt: `Original dark fantasy Korean manhwa vertical panel, Ren Avel small beneath a huge dark cracked supernatural book page floating in the small dormitory, ${REN_LOCK}, terrified expression, bruised right shoulder, copper F-0 tag, black-blue glow, ominous status interface shaped like torn page, cliffhanger composition, no readable text, no logo, no watermark.`
  },
  {
    id: '17-nightmare', h: 1080, title: 'A noite não acaba', caption: null,
    speech: [{text:'Só mais uma noite.', x:90, y:90, w:320, tail:null, thought:true}], badge: {x: 388, y: 615},
    prompt: `Original dark fantasy Korean manhwa vertical panel, Ren Avel lying awake in narrow servant bed, ${REN_LOCK}, moonlight stripes across face, the dark Cicatrizarío page hovering faintly above him like a nightmare, blue-black scar lines in the shadows, claustrophobic dormitory, emotional exhaustion, no text, no logo, no watermark.`
  },
  {
    id: '18-morning-bell', h: 1080, title: 'Sino da manhã', caption: null,
    speech: [{text:'Todos os invocados ao pátio.', x:80, y:70, w:430, tail:'M280 145 L360 330 L250 152 Z'}], badge: {x: 388, y: 600},
    prompt: `Original dark fantasy Korean manhwa vertical panel, cold morning in cathedral servant corridor, bell light through tall windows, Ren Avel exhausted walking alone, ${REN_LOCK}, bruised right shoulder, F-0 tag visible, priests silhouettes in distance calling invocados to courtyard, cinematic lonely walk, no text, no logo, no watermark.`
  },
  {
    id: '19-darian-smile', h: 1120, title: 'O sorriso do devedor', caption: null,
    speech: [
      {text:'Você parece que viu um fantasma.', x:455, y:70, w:390, tail:'M650 145 L605 360 L690 150 Z'},
      {text:'Só... não dormi bem.', x:88, y:420, w:310, tail:'M240 492 L330 654 L205 500 Z'}
    ], badge: {x: 250, y: 650},
    prompt: `Original dark fantasy Korean manhwa vertical panel, Darian Vohl smiling warmly at Ren Avel near cathedral training courtyard, close-up composition with Darian charming dark blond hair, white-gold hero outfit, warm smile, Ren Avel in foreground or side, ${REN_LOCK}, exhausted and uneasy, split warm gold and cold blue lighting, subtle ominous tone, no text, no logo, no watermark.`
  },
  {
    id: '20-final-debt', h: 1180, title: 'Dívida futura ilegível', caption: 'Devedor: Darian Vohl. Dívida futura: ilegível.',
    speech: [{text:'Por que reagiu... duas vezes?', x:70, y:70, w:420, tail:null, thought:true}], badge: null,
    prompt: `Original dark fantasy Korean manhwa vertical final cliffhanger panel, close-up of a white handkerchief stained with Ren Avel blood, subtle solar embroidery almost hidden, dark cracked Cicatrizarío page opening behind it with blue-black light, Ren trembling hand visible, ominous corridor darkness, intense webtoon cliffhanger, no readable text, no logo, no watermark.`
  }
];

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function seedFor(id){return parseInt(crypto.createHash('md5').update('cicatrizario-ch1-'+id).digest('hex').slice(0,8),16);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function wrap(text,n=24){const words=text.split(/\s+/); const lines=[]; let line=''; for(const word of words){ if((line+' '+word).trim().length>n){ if(line) lines.push(line.trim()); line=word;} else line=(line+' '+word).trim(); } if(line) lines.push(line.trim()); return lines;}
function bubbleSvg(b){
  const lines=wrap(b.text,b.max||24); const x=b.x,y=b.y,w=b.w||360,h=Math.max(72,48+lines.length*33);
  const fill=b.thought?'#eff6ff':'#fffaf2'; const stroke=b.thought?'#38bdf8':'#111827';
  const tail=b.tail?`<path d="${b.tail}" fill="${fill}" stroke="${stroke}" stroke-width="5"/>`:'';
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${b.thought?30:26}" fill="${fill}" stroke="${stroke}" stroke-width="5"/>${tail}${lines.map((l,i)=>`<text x="${x+w/2}" y="${y+43+i*33}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${b.size||28}" font-weight="900" fill="#111827">${esc(l)}</text>`).join('')}</g>`;
}
function badgeSvg(){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="126" height="76"><defs><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs><rect x="12" y="10" width="102" height="56" rx="10" fill="url(#g)" stroke="#fff7ed" stroke-width="4" filter="url(#s)"/><text x="63" y="49" text-anchor="middle" font-family="Arial Black, Arial" font-size="30" fill="#111827">F-0</text></svg>`)}
function overlaySvg(panel){
  const parts=[];
  if(panel.caption){const lines=wrap(panel.caption,32); const h=50+lines.length*33; parts.push(`<rect x="42" y="42" width="790" height="${h}" rx="22" fill="rgba(0,0,0,.72)" stroke="rgba(103,232,249,.48)" stroke-width="3"/>`); lines.forEach((l,i)=>parts.push(`<text x="72" y="${98+i*36}" font-size="31" font-weight="900" font-family="Arial" fill="#f0f9ff">${esc(l)}</text>`));}
  for(const b of (panel.speech||[])) parts.push(bubbleSvg(b));
  parts.push(`<rect x="0" y="${panel.h-70}" width="900" height="70" fill="rgba(0,0,0,.66)"/><text x="32" y="${panel.h-25}" font-size="24" font-weight="900" font-family="Arial" fill="#cbd5e1">${esc(panel.title)}</text>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${panel.h}">${parts.join('')}</svg>`);
}
async function generatePanel(panel){
  const out=path.join(AI,`${panel.id}.webp`);
  if(fs.existsSync(out) && fs.statSync(out).size>30000) return out;
  const url=`https://image.pollinations.ai/prompt/${encodeURIComponent(panel.prompt)}?width=900&height=${panel.h}&model=flux&nologo=true&private=true&seed=${seedFor(panel.id)}`;
  let lastErr;
  for(let attempt=1; attempt<=3; attempt++){
    try{
      const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(90000)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw=Buffer.from(await r.arrayBuffer());
      const base=await sharp(raw).resize(900,panel.h,{fit:'cover',position:'attention'}).webp({quality:92}).toBuffer();
      const composites=[{input:overlaySvg(panel),left:0,top:0}];
      if(panel.badge) composites.push({input:badgeSvg(),left:panel.badge.x,top:panel.badge.y});
      await sharp(base).composite(composites).webp({quality:94}).toFile(out);
      return out;
    }catch(e){ lastErr=e; console.error('attempt failed',panel.id,attempt,e.message); await sleep(8000*attempt); }
  }
  throw lastErr;
}
async function makeFallback(panel){
  const out=path.join(AI,`${panel.id}.webp`);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${panel.h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset=".55" stop-color="#172554"/><stop offset="1" stop-color="#030712"/></linearGradient><radialGradient id="r"><stop offset="0" stop-color="#38bdf8" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="900" height="${panel.h}" fill="url(#g)"/><circle cx="450" cy="${panel.h/2}" r="360" fill="url(#r)"/><text x="52" y="${panel.h/2}" font-family="Arial Black" font-size="52" fill="#e0f2fe">${esc(panel.title)}</text></svg>`;
  const composites=[{input:overlaySvg(panel),left:0,top:0}]; if(panel.badge) composites.push({input:badgeSvg(),left:panel.badge.x,top:panel.badge.y});
  await sharp(Buffer.from(svg)).composite(composites).webp({quality:94}).toFile(out);
  return out;
}
async function compose(outputs,name){
  const metas=[]; for(const o of outputs) metas.push(await sharp(o).metadata());
  const H=metas.reduce((s,m)=>s+m.height,0); let y=0; const comps=[];
  for(let i=0;i<outputs.length;i++){ comps.push({input:outputs[i],left:0,top:y}); y+=metas[i].height; }
  await sharp({create:{width:900,height:H,channels:3,background:'#02040a'}}).composite(comps).jpeg({quality:91}).toFile(path.join(OUT,`${name}.jpg`));
  await sharp(path.join(OUT,`${name}.jpg`)).resize({width:520}).jpeg({quality:88}).toFile(path.join(OUT,`${name}-preview.jpg`));
  fs.writeFileSync(path.join(OUT,`${name}.html`),`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cicatrizário do Abismo — Capítulo 1 Completo</title><style>body{margin:0;background:#02040a;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:900px;margin:auto;background:#000}header{position:sticky;top:0;z-index:5;background:linear-gradient(180deg,#020617,#02040a);border-bottom:1px solid #164e63;padding:22px 24px}h1{margin:0;font-size:clamp(28px,6vw,56px)}.sub{color:#67e8f9;font-weight:900;margin-top:4px}.note{color:#94a3b8;margin-top:8px;font-size:14px}img{display:block;width:100%;height:auto}</style></head><body><main class="wrap"><header><h1>Cicatrizário do Abismo</h1><div class="sub">Capítulo 1 — O Herói F-0</div><div class="note">Produção visual completa em scroll vertical. Balões e F-0 aplicados em pós-produção para legibilidade e continuidade.</div></header><img src="${name}.jpg" alt="Capítulo 1 completo de Cicatrizário do Abismo"></main></body></html>`);
  return {width:900,height:H,file:`${name}.jpg`,preview:`${name}-preview.jpg`,html:`${name}.html`};
}
(async()=>{
  const generated=[]; const failures=[];
  for(const panel of newPanels){
    console.log('generating',panel.id);
    try{ generated.push(await generatePanel(panel)); }
    catch(e){ console.error('fallback',panel.id,e.message); failures.push({id:panel.id,error:e.message}); generated.push(await makeFallback(panel)); }
    await sleep(6000);
  }
  const all=[...existing.map(p=>path.join(AI,p.file)),...generated];
  for(const f of all) if(!fs.existsSync(f)) throw new Error('missing panel '+f);
  const result=await compose(all,'chapter1-complete-scroll');
  console.log(JSON.stringify({newGenerated:generated.length,failures, ...result},null,2));
})();
