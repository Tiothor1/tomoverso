const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
const ASSET = path.join(OUT, 'reference-assets');
fs.mkdirSync(ASSET, { recursive: true });
function seedFor(s){return parseInt(crypto.createHash('md5').update(s).digest('hex').slice(0,8),16)}
(async()=>{
 const prompt = 'Original Korean dark fantasy manhwa character reference portrait, Ren Avel, slim tired 20 year old young man, olive light skin, thin oval face, dark hazel exhausted almond eyes, straight dark brows, small straight nose, narrow mouth, small diagonal scar on lower lip right side, messy medium black hair with uneven fringe falling over right eye, fragile sleep deprived expression, plain ash-gray rough tunic collar, no jewelry, no armor, no text, plain light gray background, centered bust portrait, clean sharp face, high detail, consistent character reference, no logo, no watermark';
 const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&model=flux&nologo=true&private=true&seed=${seedFor('ren-fixed-face-v3')}`;
 const res = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(90000)});
 if(!res.ok) throw new Error('HTTP '+res.status);
 const raw = Buffer.from(await res.arrayBuffer());
 await sharp(raw).resize(768,1024,{fit:'cover',position:'attention'}).jpeg({quality:94}).toFile(path.join(ASSET,'ren-reference-portrait.jpg'));
 // Crop central head/bust and softly mask into oval-ish transparent PNG.
 const crop = await sharp(raw).resize(768,1024,{fit:'cover',position:'attention'}).extract({left:140, top:80, width:488, height:610}).png().toBuffer();
 // Manual ellipse alpha mask (avoids sharp SVG mask composite issues on this Windows build).
 const resized = await sharp(crop).resize(250,312).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
 const { data, info } = resized;
 const cx = info.width / 2, cy = info.height * 0.47, rx = info.width * 0.47, ry = info.height * 0.47;
 for (let yy = 0; yy < info.height; yy++) {
   for (let xx = 0; xx < info.width; xx++) {
     const idx = (yy * info.width + xx) * 4;
     const dx = (xx - cx) / rx;
     const dy = (yy - cy) / ry;
     const d = Math.sqrt(dx * dx + dy * dy);
     let a = 255;
     if (d > 1.02) a = 0;
     else if (d > 0.86) a = Math.max(0, Math.round(255 * (1.02 - d) / 0.16));
     data[idx + 3] = Math.min(data[idx + 3], a);
   }
 }
 const facePng = await sharp(data, { raw: info }).png().toBuffer();
 const scarSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="312"><path d="M126 215 L156 224" stroke="#7f1d1d" stroke-width="4" opacity=".9" stroke-linecap="round"/></svg>`);
 await sharp(facePng).composite([{ input: scarSvg, left: 0, top: 0 }]).png().toFile(path.join(ASSET,'ren-face-canonical.png'));
 console.log(JSON.stringify({portrait:'ren-reference-portrait.jpg', face:'ren-face-canonical.png'}, null, 2));
})();
