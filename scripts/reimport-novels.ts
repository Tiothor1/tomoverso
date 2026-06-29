/** Reimporta novels sem capítulos com o adaptador corrigido */
import { importNovel } from "../src/lib/manga/adapters/centralnovel";

const slugs = [
  "a-returners-magic-should-be-special", "a-will-eternal-20230516",
  "against-the-gods-20230516", "ancient-godly-monarch-20230928",
  "battle-through-the-heavens-20230516", "birth-of-the-demonic-sword-20230928",
  "bringing-the-farm-to-live-in-another-world-20230928", "classroom-of-the-elite",
  "coiling-dragon-20230516", "commanding-wind-and-cloud-20230928",
  "cult-of-the-sacred-runes", "dual-cultivation-20230516",
  "king-of-gods-20240505", "lord-of-mysteries-20240505",
  "martial-world-20230928", "overgeared-20230516",
  "release-that-witch-20230516", "shadow-slave-20230928",
  "supreme-magus-20230928", "yahari-ore-no-seishun-love-comedy-wa-machigatteiru",
];

async function main() {
  console.log(`Reimportando ${slugs.length} novels...\n`);
  let ok = 0, fail = 0;
  for (const slug of slugs) {
    process.stdout.write(`[${ok+fail+1}/${slugs.length}] ${slug}... `);
    try {
      const r = await importNovel(slug, { maxChapters: null });
      if (r.chaptersAdded > 0) {
        console.log(`✓ ${r.chaptersAdded} caps`);
        ok++;
      } else {
        console.log(`⚠ 0 caps (pode ser preciso debugar)`);
        fail++;
      }
    } catch (e: any) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\nFinalizado: ${ok} ok, ${fail} falhas`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
