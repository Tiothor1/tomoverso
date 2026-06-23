/**
 * NovelMania Batch Scraper - RUN THIS IN BROWSER_CONSOLE
 * 
 * Baixa TUDO do NovelMania via API + fetch e salva no localStorage.
 * Depois exporta para JSON.
 * 
 * Instruções:
 * 1. Faça login em https://novelmania.com.br
 * 2. Cole e execute esta função no browser_console
 * 3. Aguarde (pode levar horas para 429 novels)
 * 4. Execute exportStep() para gerar JSON
 */

// ===== CONFIG =====
const CONFIG = {
  MAX_NOVELS: 429,       // Total de novels no catálogo
  MAX_CHARS_PER_NOVEL: 50, // Máx capítulos por novel
  SLEEP_MS: 300,          // Delay entre requests
  STORAGE_KEY: 'nm_data',  // Chave no localStorage
};

// ===== HELPERS =====
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function extractText(html) {
  // Extrai texto do <main>
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!m) return '';
  
  let text = m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{4,}/g, '\n\n')
    .trim();
  
  // Find content boundaries
  const lines = text.split('\n');
  let start = lines.findIndex(l => l.length > 40 || l.includes('—') || l.includes('Capítulo'));
  let end = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Comentários') || lines[i].includes('Denunciar')) {
      end = i;
      break;
    }
  }
  
  if (start > 0 && end > start) {
    text = lines.slice(start, end).join('\n');
  }
  
  // Remove footer artifacts
  text = text.replace(/© 2026 Novel Mania.*$/s, '').trim();
  
  return text;
}

// ===== MAIN SCAVER =====
async function scrapeAll() {
  const results = { novels: [], chapters: [], errors: [], stats: { novels: 0, chapters: 0, chars: 0 } };
  
  console.log('=== NovelMania Batch Scraper ===');
  
  // Step 1: Get all novels
  console.log('Fetching novel list...');
  const novelsRes = await fetch('/api/novels?limit=' + CONFIG.MAX_NOVELS);
  const novelsData = await novelsRes.json();
  const novels = novelsData.data || [];
  console.log(`Found ${novels.length} novels`);
  
  // Step 2: For each novel, get chapters
  for (let n = 0; n < novels.length; n++) {
    const novel = novels[n];
    const novelSlug = novel.slug;
    const novelTitle = novel.title;
    const novelId = novel.id;
    
    // Get chapters from API
    let chapters = [];
    try {
      const chRes = await fetch(`/api/novels/${novel.id.split('--')[0]}/chapters`);
      const chData = await chRes.json();
      chapters = chData.data || [];
    } catch (e) {
      results.errors.push(`${novelTitle}: chapters API error - ${e.message}`);
      continue;
    }
    
    if (chapters.length === 0) continue;
    
    // Limit chapters
    const chSlice = chapters.slice(0, CONFIG.MAX_CHARS_PER_NOVEL);
    
    console.log(`[${n+1}/${novels.length}] ${novelTitle} - ${chSlice.length} chapters`);
    
    const novelChapters = [];
    
    for (let c = 0; c < chSlice.length; c++) {
      const ch = chSlice[c];
      const slug = ch.slug;
      
      await sleep(CONFIG.SLEEP_MS);
      
      try {
        const url = `/novels/${novelSlug}/capitulos/${slug}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 419) throw new Error('Session expired');
          continue;
        }
        
        const html = await res.text();
        const content = extractText(html);
        
        if (content.length < 100) continue;
        
        const title = ch.longTitle || ch.title || `Chapter ${ch.position}`;
        
        novelChapters.push({
          title,
          chapterNumber: Math.round(ch.position || (c + 1)),
          content: content.slice(0, 100000),
          wordCount: content.split(/\s+/).filter(Boolean).length,
          url: url.replace('/novels/', 'https://novelmania.com.br/novels/'),
        });
        
        results.stats.chapters++;
        results.stats.chars += content.length;
      } catch (e) {
        if (e.message?.includes('Session expired')) {
          console.log('  SESSION EXPIRED! Partial save.');
          break;
        }
      }
      
      if ((c + 1) % 5 === 0) process.stdout?.write('.');
    }
    
    if (novelChapters.length > 0) {
      results.novels.push({
        slug: novelSlug,
        title: novelTitle,
        author: novel.author || '',
        kind: novel.kind || '',
        nationality: novel.nationality || '',
        status: novel.status || '',
        chapters: novelChapters,
      });
      results.stats.novels++;
    }
    
    // Save checkpoint every 10 novels
    if (results.stats.novels > 0 && results.stats.novels % 10 === 0) {
      localStorage.setItem(CONFIG.STORAGE_KEY + '_checkpoint', JSON.stringify({
        novelsCount: results.stats.novels,
        chaptersCount: results.stats.chapters,
        timestamp: Date.now(),
      }));
      console.log(`\n  CHECKPOINT: ${results.stats.novels} novels, ${results.stats.chapters} chapters`);
    }
  }
  
  console.log(`\n\n=== DONE ===`);
  console.log(`${results.stats.novels} novels, ${results.stats.chapters} chapters, ${Math.round(results.stats.chars/1024)}KB`);
  
  // Save to localStorage
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(results));
  console.log('Saved to localStorage. Run exportStep() to create import file.');
  
  return results;
}

// ===== EXPORT =====
function exportStep() {
  const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!raw) return 'No data found in localStorage!';
  
  const data = JSON.parse(raw);
  console.log(`Data: ${data.stats.novels} novels, ${data.stats.chapters} chapters`);
  
  // Generate the JSON string
  const json = JSON.stringify(data.novels);
  console.log(`JSON size: ${Math.round(json.length/1024)}KB`);
  console.log(`\n=== COPY THE JSON BELOW ===`);
  console.log(json);
  console.log(`\n=== END OF JSON ===`);
  
  return `JSON is ${Math.round(json.length/1024)}KB - copy it from console output`;
}

// If you want to run right away:
// scrapeAll().then(r => console.log('Done'))
