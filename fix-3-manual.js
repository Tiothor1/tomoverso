const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

const fixes = {
  // Each entry: original boilerplate → new proper synopsis
  // Based on original text from the backup DB
  
  'tres-minutos-antes-do-sim': 
    'Nos bastidores de casamentos em Petrópolis, Bianca Torres planeja o sim dos outros — mas há muito tempo parou de acreditar em promessas. Mateus Ferraz fotografa despedidas e verdades, e enxerga em Bianca o que ela tenta esconder.\n\nEntre buquês e cronogramas, os dois descobrem que alguns sentimentos não seguem roteiro — e que o amor pode nascer onde ninguém esperava.',
  
  'a-loja-de-discos-do-meu-rival':
    'André Nogueira e Caíque Lemos são rivais. Suas lojas de discos ocupam a mesma galeria e a disputa por cada cliente é acirrada. Mas quando a galeria inteira ameaça fechar, os dois precisam unir forças para organizar uma feira de vinil que pode salvar o lugar.\n\nEntre agulhas e LPs raros, a rivalidade dá lugar a algo que nenhum dos dois esperava — e que nenhum catálogo de discos poderia classificar.',
  
  'o-piloto-que-nao-sabia-voltar':
    'Lara Sato corta o céu em pequenos aviões, entregando mensagens através de rotas aéreas clandestinas entre ilhas independentes. Noah Ferraz carrega uma carta capaz de derrubar um governo — e sua única chance de entrega é Lara.\n\nEntre perseguições e céu aberto, Lara descobre que algumas cargas são mais perigosas do que parecem. E que há pilotos que simplesmente não sabem voltar.',
};

let count = 0;
for (const [slug, synopsis] of Object.entries(fixes)) {
  const n = s.prepare('SELECT id, title, tone FROM novels WHERE slug=?').get(slug);
  if (!n) { console.log(`  ⚠ ${slug} nao encontrado`); continue; }
  s.prepare('UPDATE novels SET synopsis=? WHERE id=?').run(synopsis, n.id);
  count++;
  console.log(`  ✅ ${n.title}`);
}

// Final global verification
const v = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synopsis LIKE '%nunca imaginou%' THEN 1 ELSE 0 END) as template_v1,
    SUM(CASE WHEN synopsis LIKE '%Classificação indicativa%' THEN 1 ELSE 0 END) as class,
    SUM(CASE WHEN synopsis LIKE '%Avisos de conteúdo%' THEN 1 ELSE 0 END) as avisos,
    SUM(CASE WHEN synopsis LIKE '%Status:%' THEN 1 ELSE 0 END) as status,
    SUM(CASE WHEN synopsis LIKE '%O diferencial%' THEN 1 ELSE 0 END) as dif,
    SUM(CASE WHEN synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%' THEN 1 ELSE 0 END) as fonte,
    SUM(CASE WHEN synopsis LIKE '%Nesta jornada%' THEN 1 ELSE 0 END) as ending_generico,
    SUM(CASE WHEN synopsis LIKE '%cada escolha revela%' THEN 1 ELSE 0 END) as ending_cliche
  FROM novels
`).get();
console.log(`\n✅ Corrigidas: ${count}`);
console.log('VERIFICACAO GLOBAL:', v);
