const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'previews', 'cicatrizario-abismo');
fs.mkdirSync(OUT, { recursive: true });

const W = 900;
const blocks = [];
let y = 0;

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function wrap(text, max = 24) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines;
}
function bubble(x, y, w, text, opts = {}) {
  const lines = wrap(text, opts.max || 25);
  const h = Math.max(62, 28 + lines.length * 25);
  const fill = opts.fill || '#fffaf2';
  const stroke = opts.stroke || '#121015';
  const color = opts.color || '#111';
  const fontSize = opts.size || 22;
  const radius = opts.thought ? 28 : 20;
  const tail = opts.tail ? `<path d="${opts.tail}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` : '';
  return `<g class="bubble">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
    ${tail}
    ${lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 34 + i * 25}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${color}">${esc(l)}</text>`).join('')}
  </g>`;
}
function caption(x, y, text, opts = {}) {
  const lines = wrap(text, opts.max || 28);
  return `<g>
    <rect x="${x}" y="${y}" width="${opts.w || 520}" height="${36 + lines.length * 30}" rx="14" fill="rgba(0,0,0,.72)" stroke="rgba(103,232,249,.35)"/>
    ${lines.map((l, i) => `<text x="${x + 24}" y="${y + 40 + i * 29}" font-family="Inter, Arial, sans-serif" font-size="${opts.size || 24}" font-weight="800" fill="${opts.color || '#e9f8ff'}">${esc(l)}</text>`).join('')}
  </g>`;
}
function renSilhouette(cx, baseY, scale = 1, mode = 'weak') {
  const coat = mode === 'future' ? '#07070b' : '#868894';
  const accent = mode === 'future' ? '#0ea5e9' : '#67e8f9';
  const face = '#c9a58a';
  return `<g transform="translate(${cx} ${baseY}) scale(${scale})">
    <ellipse cx="0" cy="0" rx="54" ry="14" fill="#000" opacity=".45"/>
    <path d="M-44,-142 Q0,-188 42,-142 L58,-12 Q18,16 -22,10 L-60,-14 Z" fill="${coat}" stroke="#0d0d14" stroke-width="5"/>
    <path d="M-34,-146 Q0,-176 34,-146 L24,-104 Q0,-86 -24,-104 Z" fill="${face}" stroke="#0d0d14" stroke-width="4"/>
    <path d="M-46,-151 Q-8,-204 43,-155 Q16,-167 8,-130 Q-8,-166 -40,-132 Z" fill="#08070a"/>
    <circle cx="-13" cy="-128" r="4" fill="#211b1a"/><circle cx="13" cy="-128" r="4" fill="#211b1a"/>
    <path d="M-8,-109 Q0,-105 8,-109" stroke="#7b332d" stroke-width="3" fill="none"/>
    <path d="M-4,-105 L16,-100" stroke="#7b332d" stroke-width="3" opacity=".7"/>
    <rect x="-27" y="-72" width="54" height="30" rx="6" fill="${mode === 'future' ? '#020407' : '#a16207'}" stroke="#f8fafc" stroke-width="2" opacity="${mode === 'future' ? .55 : .95}"/>
    ${mode !== 'future' ? `<text x="0" y="-50" text-anchor="middle" font-size="20" font-family="Arial" font-weight="900" fill="#111827">F-0</text>` : ''}
    ${mode === 'future' ? `<path d="M-72,-42 C-32,-66 8,-54 70,-91" stroke="${accent}" stroke-width="8" fill="none" opacity=".9"/><path d="M-74,-42 C-40,-26 0,-28 50,-6" stroke="#7f1d1d" stroke-width="5" fill="none" opacity=".72"/>` : ''}
  </g>`;
}
function priest(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-50,-10 L-32,-130 Q0,-170 32,-130 L50,-10 Z" fill="#f8fafc" stroke="#d4af37" stroke-width="5"/>
    <path d="M-28,-128 Q0,-158 28,-128 L18,-96 Q0,-84 -18,-96 Z" fill="#d8b89d"/>
    <path d="M-35,-145 L35,-145 L22,-105 Q0,-92 -22,-105 Z" fill="#d4af37" opacity=".88"/>
  </g>`;
}
function darian(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cx="0" cy="8" rx="64" ry="13" fill="#000" opacity=".32"/>
    <path d="M-48,-136 Q0,-190 48,-136 L66,-8 Q8,28 -60,-8 Z" fill="#f8fafc" stroke="#d4af37" stroke-width="5"/>
    <path d="M-34,-150 Q0,-180 34,-150 L26,-108 Q0,-88 -26,-108 Z" fill="#e7c0a1" stroke="#1b130d" stroke-width="4"/>
    <path d="M-43,-156 Q-8,-206 46,-158 Q20,-166 10,-135 Q-12,-166 -38,-130 Z" fill="#5b3b12"/>
    <circle cx="-13" cy="-130" r="4" fill="#2b1b12"/><circle cx="13" cy="-130" r="4" fill="#2b1b12"/>
    <path d="M-12,-111 Q0,-101 16,-112" stroke="#7c2d12" stroke-width="4" fill="none"/>
    <path d="M50,-96 L168,-242" stroke="#fef08a" stroke-width="10" filter="url(#glowGold)"/>
    <path d="M-4,-185 Q0,-238 6,-185" stroke="#fde68a" stroke-width="8" opacity=".8"/>
  </g>`;
}
function liora(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-44,-122 Q0,-170 44,-122 L54,-10 Q4,20 -52,-10 Z" fill="#f6ead8" stroke="#fbbf24" stroke-width="4"/>
    <path d="M-32,-138 Q0,-165 32,-138 L23,-102 Q0,-86 -23,-102 Z" fill="#d7a98b" stroke="#17110d" stroke-width="3"/>
    <path d="M-43,-144 Q-8,-190 44,-146 Q24,-162 15,-132 Q-18,-168 -38,-126 Z" fill="#9a5a27"/>
    <circle cx="-12" cy="-123" r="4" fill="#8a4b0f"/><circle cx="12" cy="-123" r="4" fill="#8a4b0f"/>
    <path d="M-38,-60 Q-12,-34 28,-54" stroke="#fff" stroke-width="13" stroke-linecap="round"/>
  </g>`;
}
function addBlock(id, h, title, body) {
  blocks.push({ id, y, h, title, body });
  y += h;
}

addBlock(1, 720, 'Cold open', `
  <rect width="${W}" height="720" fill="url(#abyss)"/>
  <circle cx="450" cy="160" r="260" fill="url(#blueGlow)" opacity=".35"/>
  ${Array.from({length: 70}).map((_,i)=>`<path d="M${(i*137)%900} ${680-((i*73)%600)} l${-20+(i%7)*7} ${-70-(i%9)*18}" stroke="#0ea5e9" opacity="${.08+(i%5)*.035}" stroke-width="${1+(i%4)}"/>`).join('')}
  <path d="M262 525 Q340 462 436 492 Q543 529 612 460" stroke="#0b1220" stroke-width="120" fill="none" opacity=".82"/>
  ${renSilhouette(452, 625, 1.08, 'future')}
  ${caption(82, 64, 'Eles me chamaram de erro.', {w: 520, size: 30})}
  <text x="624" y="548" font-family="Arial Black" font-size="42" fill="#67e8f9" opacity=".75" transform="rotate(-13 624 548)">KRRRK</text>
`);

addBlock(2, 620, 'Trinta dias antes', `
  <rect width="${W}" height="620" fill="url(#rainCity)"/>
  ${Array.from({length:16}).map((_,i)=>`<rect x="${i*64-12}" y="${90+(i%5)*42}" width="46" height="${300+(i%4)*55}" fill="#0f172a" opacity=".74"/><rect x="${i*64}" y="${120+(i%5)*42}" width="8" height="10" fill="#38bdf8" opacity=".42"/>`).join('')}
  ${Array.from({length:70}).map((_,i)=>`<line x1="${(i*89)%900}" y1="${(i*47)%620}" x2="${((i*89)%900)-36}" y2="${((i*47)%620)+74}" stroke="#bfdbfe" opacity=".26" stroke-width="2"/>`).join('')}
  <path d="M0 540 Q210 500 420 542 T900 532 L900 620 L0 620 Z" fill="#111827" opacity=".86"/>
  ${renSilhouette(420, 558, .72, 'earth')}
  <rect x="375" y="382" width="85" height="56" rx="12" fill="#111827" stroke="#38bdf8" stroke-width="4"/>
  <path d="M345 478 L492 508" stroke="#94a3b8" stroke-width="7"/><circle cx="344" cy="478" r="24" fill="none" stroke="#94a3b8" stroke-width="7"/><circle cx="492" cy="508" r="24" fill="none" stroke="#94a3b8" stroke-width="7"/>
  ${caption(62, 58, 'Trinta dias antes, sobreviver era só chegar até amanhã.', {w: 710, size: 25})}
  ${bubble(516, 312, 245, 'Só mais uma entrega.', {thought:true, size:20})}
`);

addBlock(3, 630, 'O acidente', `
  <rect width="${W}" height="630" fill="#0b1020"/>
  <path d="M0 460 L900 320 L900 630 L0 630 Z" fill="#1e293b"/>
  <path d="M120 492 L850 376" stroke="#f8fafc" stroke-width="8" opacity=".35" stroke-dasharray="70 42"/>
  <ellipse cx="642" cy="372" rx="188" ry="86" fill="#fff" opacity=".75" filter="url(#blurHeavy)"/>
  <rect x="620" y="250" width="210" height="146" rx="14" fill="#111827" stroke="#e5e7eb" stroke-width="5" transform="rotate(-8 620 250)"/>
  <circle cx="656" cy="397" r="24" fill="#020617"/><circle cx="793" cy="374" r="24" fill="#020617"/>
  <g transform="translate(455 455) rotate(-22)">${renSilhouette(0,0,.73,'earth')}</g>
  <g transform="translate(292 430) scale(.46)"><circle cx="0" cy="-115" r="28" fill="#d6a486"/><path d="M-32,-84 L32,-84 L44,-10 L-44,-10 Z" fill="#facc15"/></g>
  ${bubble(110, 82, 250, 'Sai daí!', {stroke:'#7f1d1d', size:30, tail:'M278 141 L358 232 L240 154 Z'})}
  <text x="548" y="218" font-family="Arial Black" font-size="68" fill="#f8fafc" opacity=".86" transform="rotate(-10 548 218)">SKREEE</text>
`);

addBlock(4, 680, 'Um segundo a mais', `
  <rect width="${W}" height="680" fill="url(#whiteGold)"/>
  <circle cx="450" cy="300" r="280" fill="#fff" opacity=".88"/>
  <g transform="translate(450 438) scale(1.34)">
    <path d="M-92,-158 Q0,-238 92,-158 L62,-60 Q0,-20 -62,-60 Z" fill="#d9b396" stroke="#17110d" stroke-width="5" opacity=".94"/>
    <path d="M-112,-176 Q-10,-285 116,-172 Q54,-190 24,-130 Q-38,-214 -100,-120 Z" fill="#050509"/>
    <circle cx="-30" cy="-114" r="8" fill="#261a18"/><circle cx="34" cy="-112" r="8" fill="#261a18"/>
    <path d="M-18,-62 Q0,-50 26,-63" stroke="#8a2c2c" stroke-width="5" fill="none"/>
    <path d="M-5,-55 L35,-45" stroke="#8a2c2c" stroke-width="4" opacity=".8"/>
  </g>
  ${bubble(235, 82, 430, 'Pelo menos... deu tempo.', {thought:true, size:24})}
  <text x="392" y="628" font-family="Arial Black" font-size="62" fill="#a16207" opacity=".45">WHUM</text>
`);

addBlock(5, 780, 'Salão da Aurora', `
  <rect width="${W}" height="780" fill="url(#cathedral)"/>
  <path d="M90 710 L220 175 L310 710 Z" fill="#f8fafc" opacity=".15"/><path d="M590 710 L690 175 L830 710 Z" fill="#f8fafc" opacity=".13"/>
  <circle cx="450" cy="505" r="210" fill="none" stroke="#facc15" stroke-width="9" opacity=".82"/><circle cx="450" cy="505" r="142" fill="none" stroke="#fde68a" stroke-width="4" opacity=".72"/>
  ${priest(450, 238, .76)}
  ${renSilhouette(452, 612, .9, 'weak')}
  ${Array.from({length:6}).map((_,i)=>renSilhouette(165+i*112, 635 + (i%2)*24, .52, 'weak')).join('')}
  ${bubble(250, 46, 400, 'Heróis da Aurora... despertem.', {tail:'M450 116 L452 186 L430 118 Z', size:22})}
  <text x="62" y="724" fill="#fde68a" font-family="Arial Black" font-size="52" opacity=".55">VMMMM</text>
`);

addBlock(6, 735, 'As Graças', `
  <rect width="${W}" height="735" fill="#15101b"/>
  <circle cx="242" cy="210" r="130" fill="#22c55e" opacity=".25" filter="url(#blurHeavy)"/><circle cx="650" cy="190" r="150" fill="#f59e0b" opacity=".28" filter="url(#blurHeavy)"/><circle cx="450" cy="450" r="190" fill="#60a5fa" opacity=".16" filter="url(#blurHeavy)"/>
  <g transform="translate(235 350) scale(.78)">${darian(0,0,1)}</g>
  <g transform="translate(635 365) scale(.78)">${darian(0,0,1)}</g>
  ${renSilhouette(454, 644, .72, 'weak')}
  <path d="M450 418 C424 502 418 552 450 628" stroke="#0f172a" stroke-width="28" opacity=".75"/>
  ${bubble(82, 48, 308, 'A Lança do Meio-Dia!', {size:22})}
  ${bubble(516, 64, 300, 'Coroa Invicta!', {size:22})}
  ${caption(260, 548, 'Ren ficou sem brilho.', {w: 400, size: 25})}
`);

addBlock(7, 700, 'Cicatrizário F-0', `
  <rect width="${W}" height="700" fill="#22160d"/>
  <circle cx="450" cy="330" r="260" fill="#facc15" opacity=".18" filter="url(#blurHeavy)"/>
  <rect x="188" y="132" width="524" height="318" rx="30" fill="#0b0b12" stroke="#fbbf24" stroke-width="7"/>
  <path d="M230 190 H670 M230 256 H620 M230 322 H680 M230 388 H580" stroke="#f8fafc" opacity=".22" stroke-width="9" stroke-linecap="round"/>
  <path d="M205 146 L696 432" stroke="#0ea5e9" stroke-width="6" opacity=".55"/><path d="M690 145 L222 430" stroke="#7f1d1d" stroke-width="5" opacity=".5"/>
  ${renSilhouette(450, 660, .76, 'weak')}
  ${bubble(584, 476, 220, 'F... zero?', {size:22, tail:'M627 536 L533 596 L610 540 Z'})}
  ${caption(206, 40, 'Cicatrizário — Registro de Feridas', {w: 488, size: 25})}
`);

addBlock(8, 710, 'A risada', `
  <rect width="${W}" height="710" fill="#2a1c12"/>
  <circle cx="450" cy="330" r="300" fill="#f59e0b" opacity=".16" filter="url(#blurHeavy)"/>
  ${Array.from({length:8}).map((_,i)=>`<g transform="translate(${90+i*105} ${225+(i%3)*26}) scale(.55)">${darian(0,0,.8)}</g>`).join('')}
  ${renSilhouette(450, 620, 1.05, 'weak')}
  ${bubble(68, 70, 306, 'Ele ganhou um diário de machucado?', {size:20})}
  ${bubble(532, 98, 262, 'Isso cura?', {size:22})}
  ${bubble(342, 278, 160, 'Não.', {size:28, fill:'#111827', color:'#f8fafc', stroke:'#fbbf24'})}
  <text x="155" y="398" font-family="Arial Black" font-size="58" fill="#fef3c7" opacity=".42" transform="rotate(-8 155 398)">ha... ha...</text>
`);

addBlock(9, 690, 'Liora', `
  <rect width="${W}" height="690" fill="url(#corridor)"/>
  <path d="M0 580 Q218 500 450 560 T900 548 L900 690 L0 690 Z" fill="#0b1020" opacity=".76"/>
  ${renSilhouette(335, 582, .92, 'weak')}
  ${liora(590, 575, .95)}
  <path d="M526 456 Q485 482 448 500" stroke="#fff" stroke-width="18" stroke-linecap="round"/>
  ${bubble(565, 104, 250, 'Você está sangrando.', {size:21, tail:'M625 168 L594 318 L602 171 Z'})}
  ${bubble(120, 235, 240, 'Não é nada.', {size:22, tail:'M273 296 L329 424 L244 301 Z'})}
`);

addBlock(10, 770, 'A página abre', `
  <rect width="${W}" height="770" fill="#05060a"/>
  <circle cx="450" cy="366" r="270" fill="#0284c7" opacity=".17" filter="url(#blurHeavy)"/>
  ${renSilhouette(450, 705, .94, 'weak')}
  <rect x="165" y="110" width="570" height="360" rx="28" fill="#080912" stroke="#0ea5e9" stroke-width="6"/>
  ${Array.from({length:12}).map((_,i)=>`<path d="M${206+i*39} 145 C${190+i*42} ${225+i%2*22} ${235+i*24} ${300+i%3*19} ${210+i*43} 438" stroke="#0ea5e9" opacity="${.18+(i%4)*.08}" stroke-width="${2+(i%3)}" fill="none"/>`).join('')}
  <path d="M256 196 H642 M256 260 H590 M256 324 H676 M256 386 H532" stroke="#e0f2fe" stroke-width="8" opacity=".22" stroke-linecap="round"/>
  ${caption(216, 504, 'Humilhação registrada. Dívida social reconhecida.', {w: 480, size: 23})}
  ${bubble(322, 35, 260, 'Isso... não é cura.', {fill:'#0f172a', color:'#e0f2fe', stroke:'#0ea5e9', size:20})}
`);

const H = y;
const defs = `<defs>
  <linearGradient id="abyss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#02030a"/><stop offset="55%" stop-color="#06111f"/><stop offset="100%" stop-color="#000"/></linearGradient>
  <radialGradient id="blueGlow"><stop offset="0%" stop-color="#38bdf8" stop-opacity=".88"/><stop offset="100%" stop-color="#020617" stop-opacity="0"/></radialGradient>
  <linearGradient id="rainCity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="70%" stop-color="#111827"/><stop offset="100%" stop-color="#030712"/></linearGradient>
  <linearGradient id="whiteGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff7ed"/><stop offset="60%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
  <linearGradient id="cathedral" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b260c"/><stop offset="45%" stop-color="#7c4a03"/><stop offset="100%" stop-color="#171008"/></linearGradient>
  <linearGradient id="corridor" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="55%" stop-color="#4c2d0a"/><stop offset="100%" stop-color="#080a13"/></linearGradient>
  <filter id="blurHeavy"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="glowGold"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <style>
    text { paint-order: stroke; stroke: rgba(0,0,0,.12); stroke-width: .6px; }
  </style>
</defs>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
  <rect width="${W}" height="${H}" fill="#050505"/>
  ${blocks.map((b, i) => `<g transform="translate(0 ${b.y})">
    ${b.body}
    <rect x="0" y="${b.h-3}" width="${W}" height="6" fill="#020617" opacity=".9"/>
    <text x="34" y="${b.h-26}" font-family="Inter, Arial" font-size="18" font-weight="900" fill="#94a3b8" opacity=".78">BLOCO ${String(b.id).padStart(2,'0')} — ${esc(b.title)}</text>
  </g>`).join('\n')}
</svg>`;

fs.writeFileSync(path.join(OUT, 'pilot-scroll.svg'), svg, 'utf8');

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Cicatrizário do Abismo — Piloto Visual</title><style>
  :root{color-scheme:dark} body{margin:0;background:#030407;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:900px;margin:0 auto;background:#050505;box-shadow:0 0 80px #000}header{padding:28px 24px 22px;background:linear-gradient(180deg,#050816,#030407);position:sticky;top:0;z-index:2;border-bottom:1px solid #172033}h1{margin:0;font-size:clamp(28px,6vw,54px);letter-spacing:-.04em}.sub{margin-top:6px;color:#93c5fd;font-weight:800}.note{margin-top:12px;color:#94a3b8;font-size:14px;line-height:1.45}.scroll{display:block;width:100%;height:auto}footer{padding:30px 24px 60px;background:#030407;color:#94a3b8;line-height:1.6}.pill{display:inline-block;border:1px solid #164e63;border-radius:999px;padding:5px 10px;color:#67e8f9;background:#082f49;margin-right:8px;font-size:12px;font-weight:800}</style></head><body><main class="wrap"><header><div class="pill">PILOTO VISUAL</div><div class="pill">CAPÍTULO 1</div><h1>Cicatrizário do Abismo</h1><div class="sub">Webtoon vertical — primeiros 10 blocos em produção</div><div class="note">Fallback visual em SVG/HTML porque o gerador oficial de imagem está sem FAL_KEY. A composição, balões, continuidade, paleta e leitura mobile já estão montadas para produção.</div></header><img class="scroll" src="pilot-scroll.svg" alt="Piloto visual vertical de Cicatrizário do Abismo"/><footer><strong>Continuidade travada:</strong> Ren começa comum, morre salvando alguém, chega em Arvhal, recebe F-0, é humilhado, encontra Liora e vê o Cicatrizário abrir. Próximo bloco de produção: Darian oferecendo falsa amizade e o primeiro gatilho de dívida.</footer></main></body></html>`;
fs.writeFileSync(path.join(OUT, 'pilot.html'), html, 'utf8');

(async () => {
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(path.join(OUT, 'pilot-scroll.png'));
  await sharp(Buffer.from(svg)).resize({ width: 520 }).jpeg({ quality: 88 }).toFile(path.join(OUT, 'pilot-scroll-preview.jpg'));
  const meta = await sharp(path.join(OUT, 'pilot-scroll.png')).metadata();
  console.log(JSON.stringify({ out: OUT, svg: 'pilot-scroll.svg', html: 'pilot.html', png: 'pilot-scroll.png', preview: 'pilot-scroll-preview.jpg', width: meta.width, height: meta.height, blocks: blocks.length }, null, 2));
})();
