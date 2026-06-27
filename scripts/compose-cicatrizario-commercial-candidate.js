const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const BLOCK_DIR = path.join(OUT, 'final-blocks');
const W = 1080;
const H = 1920;
const GAP = 64;

const lines = [
  [{type:'narration', x:60, y:70, w:520, text:'O abismo não me matou.\nEle me arquivou.'}],
  [{type:'narration', x:58, y:70, w:450, text:'Trinta dias antes.'}, {type:'bubble', x:650, y:95, w:330, text:'Sai daí!'}],
  [{type:'sfx', x:62, y:1350, w:360, text:'VRUUUM'}, {type:'narration', x:590, y:70, w:390, text:'Um segundo antes da luz.'}],
  [{type:'bubble', x:72, y:78, w:430, text:'Heróis da Aurora... ajoelhem.'}, {type:'bubble', x:650, y:1460, w:300, text:'Onde... eu tô?'}],
  [{type:'narration', x:62, y:78, w:390, text:'A bênção dele coube\nnuma placa de cobre.'}, {type:'bubble', x:650, y:1250, w:300, text:'F-0...?'}],
  [{type:'bubble', x:70, y:80, w:300, text:'F-zero?'}, {type:'bubble', x:700, y:185, w:300, text:'Nem bênção tem.'}],
  [{type:'bubble', x:600, y:84, w:380, text:'Levanta. Eles gostam de esmagar o que não entendem.'}],
  [{type:'bubble', x:60, y:90, w:330, text:'Ele precisa de cura!'}, {type:'bubble', x:660, y:150, w:300, text:'Afaste-se.'}],
  [{type:'narration', x:64, y:74, w:430, text:'Pátio de Testes.'}, {type:'bubble', x:675, y:126, w:300, text:'Só toque a pedra.'}],
  [{type:'sfx', x:70, y:120, w:260, text:'TOK'}, {type:'bubble', x:700, y:128, w:300, text:'Foi isso?'}],
  [{type:'bubble', x:560, y:82, w:420, text:'Cura não se desperdiça em erro.'}],
  [{type:'narration', x:60, y:70, w:460, text:'Então era assim\nque esse mundo pesava.'}],
  [{type:'narration', x:60, y:70, w:520, text:'No dormitório dos sem classe,\na noite tinha dentes.'}],
  [{type:'system', x:650, y:92, w:330, text:'CICATRIZÁRIO\nREGISTRO ABERTO'}],
  [{type:'narration', x:60, y:70, w:430, text:'Toda dor deixa endereço.'}],
  [{type:'system', x:60, y:70, w:420, text:'DÍVIDA PEQUENA\nRECONHECIDA'}],
  [{type:'narration', x:60, y:70, w:520, text:'O abismo ficou acordado comigo.'}],
  [{type:'narration', x:60, y:70, w:520, text:'Ao amanhecer,\nchamaram os inúteis.'}],
  [{type:'bubble', x:610, y:80, w:370, text:'Você vai se acostumar.'}, {type:'narration', x:62, y:1560, w:430, text:'Então ele sorriu de novo.'}],
  [{type:'system', x:62, y:70, w:520, text:'DÍVIDA FUTURA:\nILEGÍVEL'}, {type:'narration', x:640, y:1480, w:350, text:'E o livro respirou.'}],
];

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function wrap(text, maxChars){
  const parts = String(text).split(/\n/);
  const out=[];
  for(const part of parts){
    let line='';
    for(const word of part.split(/\s+/)){
      if(!word) continue;
      if((line+' '+word).trim().length>maxChars){ if(line) out.push(line); line=word; }
      else line=(line+' '+word).trim();
    }
    if(line) out.push(line);
  }
  return out;
}
function overlaySvg(items){
  const elements=[];
  for(const item of items){
    const font = item.type==='sfx' ? 88 : item.type==='system' ? 38 : item.type==='narration' ? 34 : 36;
    const maxChars = Math.max(8, Math.floor(item.w/(font*0.48)));
    const wrapped = wrap(item.text, maxChars);
    const lineH = Math.round(font*1.22);
    const padX = item.type==='sfx' ? 8 : 28;
    const padY = item.type==='sfx' ? 0 : 22;
    const boxH = wrapped.length*lineH + padY*2;
    if(item.type==='sfx'){
      elements.push(`<g transform="translate(${item.x} ${item.y}) rotate(-8)"><text x="0" y="0" font-family="Impact, Arial Black, sans-serif" font-size="${font}" font-weight="900" fill="#dff9ff" stroke="#02040a" stroke-width="10" paint-order="stroke">${esc(item.text)}</text></g>`);
      continue;
    }
    const fill = item.type==='bubble' ? '#f8fafc' : item.type==='system' ? 'rgba(2,8,23,.88)' : 'rgba(2,6,23,.82)';
    const stroke = item.type==='bubble' ? '#0f172a' : item.type==='system' ? '#22d3ee' : '#334155';
    const color = item.type==='bubble' ? '#020617' : item.type==='system' ? '#a5f3fc' : '#f8fafc';
    const radius = item.type==='bubble' ? 38 : 16;
    elements.push(`<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${boxH}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="4" opacity=".96"/>`);
    if(item.type==='bubble') elements.push(`<path d="M${item.x+item.w*.45} ${item.y+boxH-2} l42 42 l-8 -46" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`);
    wrapped.forEach((ln, idx)=>{
      const weight = item.type==='system' ? 900 : item.type==='narration' ? 700 : 800;
      elements.push(`<text x="${item.x+padX}" y="${item.y+padY+font+idx*lineH}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${font}" font-weight="${weight}" fill="${color}">${esc(ln)}</text>`);
    });
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${elements.join('\n')}</svg>`);
}
async function letterPanel(i){
  const f=path.join(BLOCK_DIR,`block-${String(i+1).padStart(2,'0')}.jpg`);
  const img=await sharp(f).resize(W,H,{fit:'cover',position:'attention'}).composite([{input:overlaySvg(lines[i]||[]),left:0,top:0}]).jpeg({quality:93}).toBuffer();
  return img;
}
async function main(){
  const panelBuffers=[];
  for(let i=0;i<20;i++) panelBuffers.push(await letterPanel(i));
  const panelMeta=[]; for(const b of panelBuffers) panelMeta.push(await sharp(b).metadata());
  const totalH = panelMeta.reduce((s,m)=>s+m.height,0) + GAP*(panelBuffers.length-1);
  const comps=[]; let y=0;
  for(let i=0;i<panelBuffers.length;i++){ comps.push({input:panelBuffers[i],left:0,top:y}); y += H + GAP; }
  const scroll=path.join(OUT,'chapter1-commercial-candidate-scroll.jpg');
  await sharp({create:{width:W,height:totalH,channels:3,background:'#02040a'}}).composite(comps).jpeg({quality:92}).toFile(scroll);
  await sharp(scroll).resize({width:540}).jpeg({quality:88}).toFile(path.join(OUT,'chapter1-commercial-candidate-preview.jpg'));
  fs.writeFileSync(path.join(OUT,'chapter1-commercial-candidate.html'),`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cicatrizário do Abismo — Capítulo 1 Comercial Candidate</title><style>body{margin:0;background:#02040a;color:#e5e7eb;font-family:Inter,Arial,sans-serif}.wrap{max-width:1080px;margin:auto;background:#02040a}header{position:sticky;top:0;z-index:5;padding:18px 22px;background:linear-gradient(180deg,#020617,#02040add);border-bottom:1px solid #164e63}h1{margin:0;font-size:clamp(24px,5vw,52px)}.sub{color:#67e8f9;font-weight:900}.note{color:#94a3b8;font-size:14px;margin-top:6px}img{display:block;width:100%;height:auto}</style></head><body><main class="wrap"><header><h1>Cicatrizário do Abismo</h1><div class="sub">Capítulo 1 — Commercial Candidate / Pollo GPT Image 2</div><div class="note">20 blocos com referência fixa do Ren, enquadramentos variados e lettering local.</div></header><img src="chapter1-commercial-candidate-scroll.jpg" alt="Capítulo 1 commercial candidate"></main></body></html>`, 'utf8');
  const thumbs=[]; for(let i=0;i<20;i++){const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="216" height="384"><rect width="216" height="44" fill="#020617" opacity=".86"/><text x="10" y="28" font-family="Arial" font-size="24" font-weight="900" fill="#fff">${String(i+1).padStart(2,'0')}</text></svg>`); thumbs.push(await sharp(panelBuffers[i]).resize(216,384,{fit:'cover',position:'attention'}).composite([{input:label,left:0,top:0}]).jpeg({quality:90}).toBuffer()); }
  await sharp({create:{width:1080,height:1536,channels:3,background:'#111827'}}).composite(thumbs.map((input,i)=>({input,left:(i%5)*216,top:Math.floor(i/5)*384}))).jpeg({quality:92}).toFile(path.join(OUT,'chapter1-commercial-candidate-contact.jpg'));
  const meta=await sharp(scroll).metadata(); console.log(JSON.stringify({scroll, width:meta.width, height:meta.height, preview:'chapter1-commercial-candidate-preview.jpg', html:'chapter1-commercial-candidate.html', contact:'chapter1-commercial-candidate-contact.jpg'}));
}
main().catch(e=>{console.error(e); process.exit(1);});
