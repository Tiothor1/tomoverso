const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const AI = path.join(OUT, 'ai-panels');
fs.mkdirSync(AI, { recursive: true });

const panels = [
  {
    id: '01-abyss',
    title: 'Eles me chamaram de erro.',
    caption: 'Eles me chamaram de erro.',
    h: 1280,
    prompt: 'Original dark fantasy Korean manhwa webtoon vertical panel, a slim young male protagonist only partial silhouette crawling out from a black abyss, one scarred hand gripping cracked stone, blue black glowing wound lines on the hand, black rain rising upward, abyssal blue rim light, cinematic heavy shadows, intense dark fantasy, no text, no logo, no watermark, original character, high detail digital painting, mobile webtoon composition, empty space at top for narration'
  },
  {
    id: '02-rain',
    title: 'Trinta dias antes',
    caption: 'Trinta dias antes, sobreviver era só chegar até amanhã.',
    h: 1180,
    prompt: 'Original modern dark manhwa vertical panel, rainy city night, slim tired 20 year old male delivery rider with messy black hair, dark tired eyes, small scar on lower lip, black delivery jacket with blue reflective stripes, gray hoodie, riding bicycle under cold rain, lonely urban street, neon reflections, cinematic melancholy, no text, no logo, no watermark, high detail Korean webtoon style, empty dark space for narration'
  },
  {
    id: '03-accident',
    title: 'Sai daí!',
    speech: 'Sai daí!',
    h: 1120,
    prompt: 'Original manhwa vertical action panel, rainy crosswalk at night, same slim tired delivery rider with messy black hair and black jacket with blue reflective stripes lunging to save a small child from a skidding truck, blinding headlights, dramatic diagonal motion, cinematic panic, no gore, no text, no logo, no watermark, high detail Korean webtoon digital painting, mobile readable composition'
  },
  {
    id: '04-summon',
    title: 'Salão da Aurora',
    speech: 'Heróis da Aurora... despertem.',
    h: 1280,
    prompt: 'Original dark fantasy Korean manhwa vertical panel, grand cathedral summoning hall with golden magic circles, multiple summoned heroes kneeling, slim young male protagonist Ren Avel now wearing plain ash gray summoned tunic with copper F-0 tag on chest, messy black hair, dark hazel tired eyes, lower lip scar, confused on knees, priests in white gold robes, cinematic scale, radiant golden light, no text, no logo, no watermark, mobile webtoon composition'
  },
  {
    id: '05-f0',
    title: 'Cicatrizário F-0',
    caption: 'Cicatrizário — Registro de Feridas',
    speech: 'F... zero?',
    h: 1180,
    prompt: 'Original dark fantasy manhwa vertical panel, broken fantasy status window floating above blessing stone, black cracks in golden magical interface, slim young male Ren Avel reflected anxious, ash gray summoned tunic with copper F-0 tag, messy black hair, lower lip scar, priests stunned in cathedral, gold light failing with blue black ominous lines, no readable text, no logo, no watermark, high detail digital painting'
  },
  {
    id: '06-humiliation',
    title: 'A risada',
    speech: 'Isso cura?',
    caption: 'Ren ficou sem brilho.',
    h: 1260,
    prompt: 'Original dark fantasy Korean manhwa vertical panel, slim young male Ren Avel kneeling humiliated in ash gray F-0 tunic with copper tag, messy black hair shadowing tired eyes, lower lip scar visible, other summoned heroes and priests laughing above him in distorted oppressive perspective, golden cathedral light turned cruel, emotional humiliation, cinematic composition, no text, no logo, no watermark, high detail webtoon art'
  }
];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function seedFor(id){ return parseInt(crypto.createHash('md5').update(id).digest('hex').slice(0,8),16); }
function escapeXml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function wrap(text, n=24){ const w=text.split(/\s+/); const lines=[]; let line=''; for(const word of w){ if((line+' '+word).trim().length>n){lines.push(line.trim()); line=word;} else line=(line+' '+word).trim(); } if(line) lines.push(line); return lines; }
function overlaySvg(panel){
  const chunks=[];
  if(panel.caption){
    const lines=wrap(panel.caption, 30); const h=50+lines.length*32;
    chunks.push(`<rect x="42" y="42" width="760" height="${h}" rx="22" fill="rgba(0,0,0,.72)" stroke="rgba(103,232,249,.45)" stroke-width="3"/>`);
    lines.forEach((l,i)=>chunks.push(`<text x="72" y="96" font-size="32" font-weight="900" font-family="Arial, sans-serif" fill="#eef9ff">${escapeXml(l)}</text>`.replace('y="96"',`y="${96+i*36}"`)));
  }
  if(panel.speech){
    const lines=wrap(panel.speech, 20); const bw=360, bh=68+lines.length*28, x= panel.id==='03-accident'?64:500, y= panel.id==='04-summon'?62:86;
    chunks.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="28" fill="#fffaf2" stroke="#111827" stroke-width="5"/>`);
    chunks.push(`<path d="M${x+bw/2} ${y+bh} L${x+bw/2-46} ${y+bh+105} L${x+bw/2+22} ${y+bh}" fill="#fffaf2" stroke="#111827" stroke-width="5"/>`);
    lines.forEach((l,i)=>chunks.push(`<text x="${x+bw/2}" y="${y+45+i*31}" text-anchor="middle" font-size="30" font-weight="900" font-family="Arial, sans-serif" fill="#111827">${escapeXml(l)}</text>`));
  }
  chunks.push(`<rect x="0" y="${panel.h-70}" width="900" height="70" fill="rgba(0,0,0,.66)"/><text x="32" y="${panel.h-25}" font-size="24" font-weight="900" font-family="Arial, sans-serif" fill="#cbd5e1">${escapeXml(panel.title)}</text>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${panel.h}">${chunks.join('')}</svg>`);
}
async function fetchPanel(panel){
  const out = path.join(AI, `${panel.id}.webp`);
  if(fs.existsSync(out) && fs.statSync(out).size > 20000) return out;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(panel.prompt)}?width=900&height=${panel.h}&model=flux&nologo=true&private=true&seed=${seedFor(panel.id)}`;
  const res = await fetch(url, { headers:{'User-Agent':'Mozilla/5.0'}, signal: AbortSignal.timeout(90000) });
  if(!res.ok) throw new Error(`${panel.id} HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const img = await sharp(raw).resize(900, panel.h, { fit: 'cover', position: 'attention' }).webp({ quality: 92 }).toBuffer();
  await sharp(img).composite([{input: overlaySvg(panel), left:0, top:0}]).webp({ quality: 94 }).toFile(out);
  return out;
}
(async()=>{
  const outputs=[]; const failures=[];
  for(const panel of panels){
    try{
      console.log('generating', panel.id);
      outputs.push(await fetchPanel(panel));
      await sleep(6000);
    }catch(e){
      console.error('failed', panel.id, e.message);
      failures.push({id:panel.id,error:e.message});
    }
  }
  if(!outputs.length) throw new Error('no panels generated');
  const metas=[]; for(const o of outputs) metas.push(await sharp(o).metadata());
  const totalH=metas.reduce((a,m)=>a+m.height,0);
  const comps=[]; let y=0; for(let i=0;i<outputs.length;i++){ comps.push({input:outputs[i],left:0,top:y}); y += metas[i].height; }
  await sharp({create:{width:900,height:totalH,channels:3,background:'#02040a'}}).composite(comps).jpeg({quality:91}).toFile(path.join(OUT,'pilot-ai-scroll.jpg'));
  await sharp(path.join(OUT,'pilot-ai-scroll.jpg')).resize({width:520}).jpeg({quality:88}).toFile(path.join(OUT,'pilot-ai-preview.jpg'));
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Cicatrizário do Abismo — AI Pilot</title><style>body{margin:0;background:#02040a;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:900px;margin:auto;background:#000}header{position:sticky;top:0;z-index:2;padding:24px;background:linear-gradient(180deg,#020617,#02040a);border-bottom:1px solid #164e63}h1{margin:0;font-size:clamp(28px,6vw,58px)}.sub{color:#67e8f9;font-weight:900}.note{color:#94a3b8;margin-top:10px}img{display:block;width:100%;height:auto}</style></head><body><main class="wrap"><header><h1>Cicatrizário do Abismo</h1><div class="sub">Piloto visual AI-looking — Capítulo 1</div><div class="note">Primeiros blocos em produção, com balões aplicados por cima para manter legibilidade.</div></header><img src="pilot-ai-scroll.jpg" alt="Piloto visual AI-looking de Cicatrizário do Abismo"/></main></body></html>`;
  fs.writeFileSync(path.join(OUT,'pilot-ai.html'), html, 'utf8');
  console.log(JSON.stringify({generated: outputs.length, failures, scroll:'pilot-ai-scroll.jpg', preview:'pilot-ai-preview.jpg', html:'pilot-ai.html', height:totalH}, null, 2));
})();
