const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_BASE = 'https://pollo.ai/api/platform';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadPolloKey() {
  loadEnvFile(path.join(ROOT, '.env.local'));
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile('C:/Users/Fábio Teixeira/AppData/Local/hermes/.env');
  const key = process.env.POLLO_API_KEY;
  if (!key || !key.startsWith('pollo_')) {
    throw new Error('POLLO_API_KEY missing or invalid-looking. Value is never printed.');
  }
  return key;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: '',
    aspectRatio: '9:16',
    resolution: '1K',
    quality: 'medium',
    out: 'public/previews/cicatrizario-abismo/pollo-test.jpg',
    imageUrl: '',
    images: [],
    timeoutMs: 240000,
    pollMs: 5000,
    taskId: '',
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => args[++i];
    if (a === '--prompt') options.prompt = next();
    else if (a === '--aspect') options.aspectRatio = next();
    else if (a === '--resolution') options.resolution = next();
    else if (a === '--quality') options.quality = next();
    else if (a === '--out') options.out = next();
    else if (a === '--image-url') options.imageUrl = next();
    else if (a === '--image') options.images.push(next());
    else if (a === '--timeout-ms') options.timeoutMs = Number(next());
    else if (a === '--poll-ms') options.pollMs = Number(next());
    else if (a === '--task-id') options.taskId = next();
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!options.prompt && !options.taskId) throw new Error('Missing --prompt or --task-id');
  return options;
}

function redactErrorText(text) {
  return String(text || '').replace(/pollo_[A-Za-z0-9_-]+/g, '[REDACTED]');
}

async function postGeneration(key, options) {
  const input = {
    prompt: options.prompt,
    aspectRatio: options.aspectRatio,
    resolution: options.resolution,
    quality: options.quality,
  };
  if (options.imageUrl) input.imageUrl = options.imageUrl;
  if (options.images.length) input.images = options.images;
  const res = await fetch(`${API_BASE}/generation/openai/gpt-image-2-0/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify({ input, clientSource: 'tomoverso-cicatrizario' }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Pollo create failed HTTP ${res.status}: ${redactErrorText(JSON.stringify(data))}`);
  }
  const taskId = data.taskId || data?.data?.taskId;
  const status = data.status || data?.data?.status;
  if (!taskId) throw new Error(`Pollo create response missing taskId: ${redactErrorText(JSON.stringify(data))}`);
  return { taskId, status, raw: data };
}

async function pollStatus(key, taskId, options) {
  const started = Date.now();
  while (Date.now() - started < options.timeoutMs) {
    const res = await fetch(`${API_BASE}/generation/${encodeURIComponent(taskId)}/status`, {
      headers: { 'x-api-key': key },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(`Pollo status failed HTTP ${res.status}: ${redactErrorText(JSON.stringify(data))}`);
    const body = data?.data && Array.isArray(data.data.generations) ? data.data : data;
    const generations = Array.isArray(body.generations) ? body.generations : [];
    const failed = generations.find((g) => g.status === 'failed');
    if (failed) throw new Error(`Pollo generation failed: ${redactErrorText(failed.failMsg || JSON.stringify(failed))}`);
    const image = generations.find((g) => g.status === 'succeed' && g.mediaType === 'image' && g.url);
    if (image) return { status: data, imageUrl: image.url };
    const status = generations.map((g) => g.status).join(',') || body.status || data.status || 'waiting';
    console.log(JSON.stringify({ taskId, status, elapsedSec: Math.round((Date.now() - started) / 1000) }));
    await new Promise((r) => setTimeout(r, options.pollMs));
  }
  throw new Error(`Timed out waiting for Pollo task ${taskId}`);
}

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const abs = path.resolve(ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    const sharp = require('sharp');
    await sharp(buffer).jpeg({ quality: 94 }).toFile(abs);
    const stat = fs.statSync(abs);
    return { abs, bytes: stat.size };
  }
  fs.writeFileSync(abs, buffer);
  return { abs, bytes: buffer.length };
}

(async () => {
  const options = parseArgs();
  const key = loadPolloKey();
  console.log(JSON.stringify({ provider: 'pollo', model: 'gpt-image-2-0', keyLoaded: true, key: '[REDACTED]' }));
  const created = options.taskId ? { taskId: options.taskId, status: 'existing' } : await postGeneration(key, options);
  console.log(JSON.stringify({ created: !options.taskId, taskId: created.taskId, status: created.status }));
  const result = await pollStatus(key, created.taskId, options);
  const file = await download(result.imageUrl, options.out);
  console.log(JSON.stringify({ done: true, taskId: created.taskId, out: file.abs, bytes: file.bytes, imageUrlHost: new URL(result.imageUrl).host }));
})().catch((err) => {
  console.error(redactErrorText(err.stack || err.message || String(err)));
  process.exit(1);
});
