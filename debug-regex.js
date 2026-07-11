const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

const slug = 'a-chef-e-o-critico-desastrado';
const n = s.prepare("SELECT id, title, synopsis, is_original FROM novels WHERE slug = ?").get(slug);
console.log(`is_original: ${n.is_original}`);
console.log(`title: ${n.title}`);
console.log(`First 200 chars: "${n.synopsis.slice(0,200)}"`);

// Test regex against it
const regex = /é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre/i;
console.log(`\nRegex test: ${regex.test(n.synopsis)}`);

// Show where the match would be
const match = n.synopsis.match(regex);
if (match) {
  console.log(`Match: "${match[0]}" at index ${match.index}`);
} else {
  // Try broader search
  console.log(`\nContains "obra original Tomo Verso": ${n.synopsis.includes('obra original Tomo Verso')}`);
  console.log(`Contains "Tomo Verso": ${n.synopsis.includes('Tomo Verso')}`);
  
  // Show text around where it should be
  const idx = n.synopsis.indexOf('uma obra');
  console.log(`'uma obra' at index: ${idx}`);
  if (idx > 0) console.log(`Context: "${n.synopsis.slice(idx-5, idx+50)}"`);
}

s.close();
