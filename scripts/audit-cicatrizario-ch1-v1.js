const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const src = path.join(OUT, 'chapter1-complete-scroll.jpg');
const blocks = [1280,1180,1120,1280,1180,1260,1040,1120,1120,1040,1120,1050,1040,1040,1080,1080,1080,1080,1120,1180];
const names = ['Cold open','Trinta dias antes','Acidente','Salão da Aurora','Cicatrizário F-0','A risada','Etiqueta F-0','Liora','Pátio de teste','Registro de dor','Mão de Darian','Dormitório','Atrás da porta','Página abre','Olho no escuro','Primeira cobrança','Noite não acaba','Sino da manhã','Sorriso do devedor','Dívida futura'];
const cropDir = path.join(OUT, 'audit-crops-v1');
fs.rmSync(cropDir, {recursive:true, force:true});
fs.mkdirSync(cropDir, {recursive:true});
(async()=>{
  const meta = await sharp(src).metadata();
  let y = 0; const thumbs=[];
  for(let i=0;i<blocks.length;i++){
    const h = blocks[i];
    const crop = path.join(cropDir, `block-${String(i+1).padStart(2,'0')}.jpg`);
    await sharp(src).extract({left:0, top:y, width:meta.width, height:h}).jpeg({quality:92}).toFile(crop);
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="320"><rect width="220" height="42" fill="#020617" opacity=".86"/><text x="8" y="18" font-family="Arial" font-size="13" font-weight="900" fill="#fff">${String(i+1).padStart(2,'0')} ${names[i]}</text><text x="8" y="34" font-family="Arial" font-size="11" fill="#67e8f9">${h}px</text></svg>`);
    const thumb = await sharp(crop).resize(220,320,{fit:'cover',position:'attention'}).composite([{input:label,left:0,top:0}]).jpeg({quality:90}).toBuffer();
    thumbs.push(thumb);
    y += h;
  }
  const cols=5, tw=220, th=320, rows=Math.ceil(thumbs.length/cols);
  await sharp({create:{width:cols*tw,height:rows*th,channels:3,background:'#111827'}})
    .composite(thumbs.map((input,i)=>({input,left:(i%cols)*tw,top:Math.floor(i/cols)*th})))
    .jpeg({quality:92}).toFile(path.join(OUT,'chapter1-v1-audit-contact.jpg'));
  console.log(JSON.stringify({src, width:meta.width, height:meta.height, blocks:blocks.length, contact:path.join(OUT,'chapter1-v1-audit-contact.jpg'), cropDir}, null, 2));
})();
