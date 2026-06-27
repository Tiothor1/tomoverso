const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/novels/demon-king/illustration-prompts.json'), 'utf8'));
const outDir = path.join(ROOT, 'public/uploads/novels/demon-king/illustrations');
fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

async function download(url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 TomoversoIllustrationBot/1.0' },
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (!type.startsWith('image/') || buf.length < 25000) throw new Error(`bad response type=${type} bytes=${buf.length}`);
      return buf;
    } catch (err) {
      last = err;
      console.log(`retry ${i + 1}/${attempts}: ${err.message}`);
      await sleep(5000 * (i + 1));
    }
  }
  throw last;
}

async function generate(key, data) {
  const filename = data.path.split('/').pop();
  const outPath = path.join(outDir, filename);
  const seed = hash(`demon-king-${key}-final-v1`) % 999999;
  const prompt = `${data.prompt}. Negative prompt: ${data.negative}.`;
  const urls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1216&height=768&model=flux&nologo=true&private=true&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1216&height=768&nologo=true&private=true&seed=${seed + 11}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1800))}?width=1216&height=768&model=turbo&nologo=true&private=true&seed=${seed + 29}`,
  ];
  let raw;
  let last;
  for (const url of urls) {
    try {
      raw = await download(url, 1);
      break;
    } catch (err) {
      last = err;
      console.log(`${key} url failed: ${err.message}`);
      await sleep(8000);
    }
  }
  if (!raw) throw last || new Error(`${key} failed`);
  await sharp(raw)
    .resize(1216, 768, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 1.06, brightness: 1.01 })
    .webp({ quality: 93, effort: 5 })
    .toFile(outPath);
  console.log(`${key} -> ${outPath}`);
}

(async () => {
  for (const [key, data] of Object.entries(prompts)) {
    await generate(key, data);
    await sleep(18000);
  }
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.webp'));
  console.log(JSON.stringify({ generated: files.length, files }, null, 2));
})();
