/**
 * Importador CLI — kakuyomu.jp (JP Web Novels)
 *
 * Uso:
 *   npx tsx scripts/import-kakuyomu.ts <workId>                      # 1 obra
 *   npx tsx scripts/import-kakuyomu.ts <workId> --max-episodes=3
 *   npx tsx scripts/import-kakuyomu.ts --latest --max=5
 *   cat ids.txt | npx tsx scripts/import-kakuyomu.ts
 */

import { readFileSync } from "fs";
import { importKakuyomuWork, listKakuyomuLatest } from "../src/lib/manga/adapters/kakuyomu";

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 100);
  });
}

function ts() {
  return new Date().toLocaleTimeString("pt-BR");
}

async function main() {
  const argv = process.argv.slice(2);
  let workId: string | null = null;
  let maxEpisodes: number | null = null;
  let latest = false;
  let maxFromLatest: number | null = null;
  let filePath: string | null = null;

  for (const a of argv) {
    if (a.startsWith("--max-episodes=")) maxEpisodes = parseInt(a.split("=")[1], 10);
    else if (a === "--latest") latest = true;
    else if (a.startsWith("--max=")) maxFromLatest = parseInt(a.split("=")[1], 10);
    else if (!a.startsWith("--")) {
      if (a.endsWith(".txt") || a.includes("/") || a.includes("\\")) filePath = a;
      else workId = a;
    }
  }

  console.log(`\n[${ts()}] === Importador kakuyomu.jp ===`);
  console.log(`Args: latest=${latest} workId=${workId} maxEpisodes=${maxEpisodes}\n`);

  const targets: string[] = [];
  if (latest) {
    console.log(`[${ts()}] Listando top do Kakuyomu (max ${maxFromLatest ?? 10})...`);
    const list = await listKakuyomuLatest(maxFromLatest ?? 10);
    for (const w of list) {
      console.log(`  - ${w.id} — ${w.title.slice(0, 60)}`);
      targets.push(w.id);
    }
  } else if (workId) {
    targets.push(workId);
  } else if (filePath) {
    targets.push(
      ...readFileSync(filePath, "utf8")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"))
    );
  } else if (!process.stdin.isTTY) {
    const data = await readStdin();
    targets.push(
      ...data
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"))
    );
  } else {
    console.error("ERRO: informe workId OU --latest OU arquivo");
    process.exit(1);
  }

  let total = { works: 0, episodes: 0, errors: 0 };
  for (const id of targets) {
    console.log(`[${ts()}] → ${id}`);
    try {
      const r = await importKakuyomuWork(id, {
        maxEpisodes,
        onProgress: (m) => console.log(`   ${m}`),
      });
      total.works++;
      total.episodes += r.episodesAdded;
      total.errors += r.errors.length;
      console.log(`[${ts()}] ✓ ${id} — ${r.isNew ? "novo" : "atualizado"} | +${r.episodesAdded} eps\n`);
    } catch (e: any) {
      console.error(`[${ts()}] ✗ ${id} — ${e.message}\n`);
      total.errors++;
    }
  }

  console.log(`\n[${ts()}] === RESUMO ===`);
  console.log(`  Obras processadas: ${total.works}`);
  console.log(`  Episódios adicionados: ${total.episodes}`);
  console.log(`  Erros: ${total.errors}`);
  process.exit(total.errors > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});