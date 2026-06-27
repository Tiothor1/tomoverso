const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const SRC = path.join(OUT, 'final-panels');
const DST = path.join(OUT, 'final-panels-v3');
const FACE = path.join(OUT, 'reference-assets', 'ren-face-canonical.png');
fs.mkdirSync(DST, { recursive: true });
const blocks = [1280,1180,1120,1280,1180,1260,1040,1120,1120,1040,1120,1050,1040,1040,1080,1080,1080,1080,1120,1180];
const titles = ['Cold open','Trinta dias antes','O acidente','Salão da Aurora','Cicatrizário F-0','A risada','Etiqueta F-0','Liora','Pátio de teste','Registro de dor','A mão de Darian','Dormitório dos sem classe','Conversa atrás da porta','A página abre','O olho no escuro','Primeira cobrança','A noite não acaba','Sino da manhã','O sorriso do devedor','Dívida futura ilegível'];
const placements = [
  null,
  {x:450,y:465,w:88,angle:0},
  {x:382,y:646,w:82,angle:-18},
  {x:450,y:600,w:102,angle:0},
  {x:450,y:718,w:96,angle:0},
  {x:450,y:785,w:96,angle:0},
  {x:450,y:470,w:210,angle:0},
  {x:305,y:602,w:70,angle:0},
  {x:520,y:664,w:82,angle:-22},
  {x:450,y:635,w:240,angle:0},
  {x:650,y:628,w:70,angle:0},
  {x:450,y:558,w:82,angle:0},
  {x:215,y:512,w:76,angle:0},
  {x:450,y:662,w:84,angle:0},
  {x:450,y:455,w:255,angle:0},
  {x:450,y:646,w:78,angle:0},
  {x:450,y:586,w:80,angle:0},
  {x:250,y:590,w:78,angle:0},
  {x:270,y:626,w:74,angle:0},
  null
];
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function darkSilhouetteCover(){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280"><path d="M392 320 Q450 230 510 320 L555 760 Q470 820 370 760 Z" fill="#02040a" opacity=".88"/><path d="M382 455 C440 420 485 450 535 380" stroke="#0ea5e9" stroke-width="9" opacity=".75" fill="none"/><path d="M390 535 C450 500 492 540 548 510" stroke="#7f1d1d" stroke-width="6" opacity=".7" fill="none"/></svg>`)}
async function faceBuf(p){
 const h = Math.round(p.w * 312 / 250);
 let img = await sharp(FACE).resize(p.w,h,{fit:'contain'}).png().toBuffer();
 if(p.angle){ img = await sharp(img).rotate(p.angle,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(); }
 const m = await sharp(img).metadata();
 return {input:img,left:Math.round(p.x-m.width/2),top:Math.round(p.y-m.height/2)};
}
async function processPanel(i){
 const src = path.join(SRC,`final-${String(i+1).padStart(2,'0')}.jpg`); const dst = path.join(DST,`final-${String(i+1).padStart(2,'0')}.jpg`);
 const composites=[];
 if(i===0) composites.push({input:darkSilhouetteCover(),left:0,top:0});
 const p=placements[i]; if(p) composites.push(await faceBuf(p));
 await sharp(src).composite(composites).jpeg({quality:92}).toFile(dst);
 return dst;
}
async function compose(files){
 const metas=[]; for(const f of files) metas.push(await sharp(f).metadata()); const H=metas.reduce((s,m)=>s+m.height,0); let y=0; const comps=[]; for(let i=0;i<files.length;i++){comps.push({input:files[i],left:0,top:y}); y+=metas[i].height;}
 await sharp({create:{width:900,height:H,channels:3,background:'#02040a'}}).composite(comps).jpeg({quality:91}).toFile(path.join(OUT,'chapter1-final-scroll.jpg'));
 await sharp(path.join(OUT,'chapter1-final-scroll.jpg')).resize({width:520}).jpeg({quality:88}).toFile(path.join(OUT,'chapter1-final-scroll-preview.jpg'));
 fs.writeFileSync(path.join(OUT,'chapter1-final-scroll.html'),`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cicatrizário do Abismo — Capítulo 1 Final</title><style>body{margin:0;background:#02040a;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:900px;margin:auto;background:#000}header{position:sticky;top:0;z-index:5;background:linear-gradient(180deg,#020617,#02040a);border-bottom:1px solid #164e63;padding:22px 24px}h1{margin:0;font-size:clamp(28px,6vw,56px)}.sub{color:#67e8f9;font-weight:900;margin-top:4px}.note{color:#94a3b8;margin-top:8px;font-size:14px;line-height:1.45}img{display:block;width:100%;height:auto}</style></head><body><main class="wrap"><header><h1>Cicatrizário do Abismo</h1><div class="sub">Capítulo 1 — O Herói F-0 — Final V3</div><div class="note">Versão com face canônica única do Ren, F-0 fixo, balões locais e V1 preservado como histórico.</div></header><img src="chapter1-final-scroll.jpg" alt="Capítulo 1 final de Cicatrizário do Abismo"></main></body></html>`, 'utf8');
 const thumbs=[]; for(let i=0;i<files.length;i++){const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="320"><rect width="220" height="44" fill="#020617" opacity=".88"/><text x="8" y="19" font-family="Arial" font-size="13" font-weight="900" fill="#fff">${String(i+1).padStart(2,'0')} ${esc(titles[i])}</text><text x="8" y="36" font-family="Arial" font-size="11" fill="#67e8f9">FINAL V3</text></svg>`); thumbs.push(await sharp(files[i]).resize(220,320,{fit:'cover',position:'attention'}).composite([{input:label,left:0,top:0}]).jpeg({quality:90}).toBuffer());}
 await sharp({create:{width:1100,height:1280,channels:3,background:'#111827'}}).composite(thumbs.map((input,i)=>({input,left:(i%5)*220,top:Math.floor(i/5)*320}))).jpeg({quality:92}).toFile(path.join(OUT,'chapter1-final-audit-contact.jpg'));
 return {width:900,height:H,file:'chapter1-final-scroll.jpg',preview:'chapter1-final-scroll-preview.jpg',html:'chapter1-final-scroll.html',contact:'chapter1-final-audit-contact.jpg'};
}
(async()=>{const files=[]; for(let i=0;i<blocks.length;i++) files.push(await processPanel(i)); const result=await compose(files); console.log(JSON.stringify({...result,panels:files.length},null,2));})();
