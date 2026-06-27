const fs=require('fs');
const path=require('path');
const sharp=require('sharp');
const ROOT=process.cwd();
const OUT=path.join(ROOT,'public','previews','cicatrizario-abismo');
const AI=path.join(OUT,'ai-panels');
function badgeSvg(){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="126" height="76" viewBox="0 0 126 76">
<defs><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#92400e"/></linearGradient></defs>
<rect x="12" y="10" width="102" height="56" rx="10" fill="url(#g)" stroke="#fff7ed" stroke-width="4" filter="url(#s)"/>
<text x="63" y="49" text-anchor="middle" font-family="Arial Black, Arial" font-size="30" fill="#111827">F-0</text>
</svg>`)}
async function overlayBadge(src, out, left, top){await sharp(src).composite([{input:badgeSvg(),left,top}]).webp({quality:94}).toFile(out)}
(async()=>{
 const corrections=[
  ['04-summon-v2.webp','04-summon-final.webp',390,610],
  ['05-f0-v2.webp','05-f0-final.webp',388,565],
  ['06-humiliation-v2.webp','06-humiliation-final.webp',388,590],
 ];
 for(const [a,b,x,y] of corrections) await overlayBadge(path.join(AI,a),path.join(AI,b),x,y);
 const outputs=['01-abyss.webp','02-rain.webp','03-accident.webp','04-summon-final.webp','05-f0-final.webp','06-humiliation-final.webp'].map(f=>path.join(AI,f));
 const metas=[]; for(const o of outputs) metas.push(await sharp(o).metadata());
 const H=metas.reduce((s,m)=>s+m.height,0); let y=0; const comps=[]; for(let i=0;i<outputs.length;i++){comps.push({input:outputs[i],left:0,top:y}); y+=metas[i].height;}
 await sharp({create:{width:900,height:H,channels:3,background:'#02040a'}}).composite(comps).jpeg({quality:91}).toFile(path.join(OUT,'pilot-production-scroll.jpg'));
 await sharp(path.join(OUT,'pilot-production-scroll.jpg')).resize({width:520}).jpeg({quality:88}).toFile(path.join(OUT,'pilot-production-preview.jpg'));
 fs.writeFileSync(path.join(OUT,'pilot-production.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cicatrizário do Abismo — Production Pilot</title><style>body{margin:0;background:#02040a}.wrap{max-width:900px;margin:auto;background:#000}img{display:block;width:100%;height:auto}</style><div class="wrap"><img src="pilot-production-scroll.jpg" alt="Cicatrizário do Abismo piloto de produção"></div>`);
 console.log(JSON.stringify({scroll:'pilot-production-scroll.jpg',preview:'pilot-production-preview.jpg',html:'pilot-production.html',height:H},null,2));
})();
