export const authorPlusBenefits = [
  "Central de ideias para premissas, personagens, poderes e arcos",
  "Assistente editorial para titulo, sinopse, tags e gancho",
  "Pack de assets com capas, banners, divisorias, fichas e prompts",
  "Trilhas guiadas para criar sua primeira obra",
  "Estatisticas avancadas de autor",
  "Perfil premium com selo Autor+",
  "Destaque leve de descoberta sem bloquear autores gratuitos",
];

export const authorPlusAssets = [
  { id: "cover-dark-fantasy", type: "Capa", title: "Capa fantasia sombria", description: "Template 1600×2400 com brilho violeta, castelo distante e área segura para título.", format: "SVG" },
  { id: "chapter-divider", type: "Divisória", title: "Divisória de capítulo editorial", description: "Linha ornamental para separar cenas e deixar o capítulo com cara de livro.", format: "SVG" },
  { id: "character-sheet", type: "Ficha", title: "Ficha de personagem", description: "Template para objetivo, ferida emocional, poderes, segredo e evolução.", format: "TXT" },
  { id: "synopsis-template", type: "Template", title: "Modelo de sinopse vendável", description: "Estrutura pronta para transformar ideia confusa em chamada de catálogo.", format: "TXT" },
  { id: "promo-banner", type: "Banner", title: "Banner de lançamento", description: "Banner horizontal para divulgar capítulo novo em feed/redes sociais.", format: "SVG" },
  { id: "cover-prompt-pack", type: "Prompts", title: "Pack de prompts para capa/personagem", description: "Prompts em PT-BR para capa, protagonista, vilão, cenário e item mágico.", format: "TXT" },
];

export const authorPlusTrails = [
  { id: "first-work", title: "Publique sua primeira obra", time: "7 passos", steps: ["Premissa", "Protagonista", "Conflito", "Capa", "Sinopse", "Capítulo 1", "Gancho final"] },
  { id: "sticky-romance", title: "Romance que prende", time: "5 passos", steps: ["Desejo", "Obstáculo", "Química", "Cena-chave", "Promessa emocional"] },
  { id: "power-system", title: "Sistema de poderes/evolução", time: "6 passos", steps: ["Regra", "Custo", "Rank", "Exceção", "Treino", "Virada"] },
  { id: "manhwa-hook", title: "Capítulo estilo manhwa", time: "6 passos", steps: ["Abertura forte", "Meta clara", "Humilhação", "Revelação", "Escolha", "Cliffhanger"] },
];

export function buildAssetFile(assetId: string) {
  const asset = authorPlusAssets.find((item) => item.id === assetId) || authorPlusAssets[0];
  if (asset.format === "SVG") {
    const title = asset.title.replace(/&/g, "&amp;");
    return {
      filename: `${asset.id}.svg`,
      mime: "image/svg+xml;charset=utf-8",
      content: `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2400" viewBox="0 0 1600 2400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111827"/><stop offset="0.55" stop-color="#312e81"/><stop offset="1" stop-color="#7c2d12"/></linearGradient><radialGradient id="r" cx="50%" cy="32%" r="55%"><stop stop-color="#fbbf24" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="2400" fill="url(#g)"/><rect width="1600" height="2400" fill="url(#r)"/><circle cx="1190" cy="430" r="190" fill="#f8fafc" opacity=".14"/><path d="M130 1810 C420 1510 690 1590 870 1280 C1030 1005 1220 1130 1480 770 L1480 2400 L130 2400 Z" fill="#020617" opacity=".78"/><path d="M260 370 L1340 370 L1340 2030 L260 2030 Z" fill="none" stroke="#fbbf24" stroke-opacity=".45" stroke-width="8"/><text x="800" y="1030" text-anchor="middle" font-size="94" font-family="Georgia, serif" font-weight="700" fill="#fff">${title}</text><text x="800" y="1160" text-anchor="middle" font-size="34" font-family="Arial" fill="#fde68a">Tomo Verso Autor+</text><text x="800" y="1980" text-anchor="middle" font-size="30" font-family="Arial" fill="#fff" opacity=".72">template editável • substitua título e subtítulo</text></svg>`,
    };
  }
  return {
    filename: `${asset.id}.txt`,
    mime: "text/plain;charset=utf-8",
    content: `${asset.title}\n\n${asset.description}\n\nComo usar:\n1. Copie este modelo para sua obra.\n2. Preencha sem explicar demais.\n3. Procure promessa, conflito e gancho.\n\nTemplate:\n- Título provisório:\n- Promessa da obra:\n- Protagonista:\n- Ferida/medo:\n- Desejo:\n- Antagonista/força contrária:\n- Segredo:\n- Gancho do capítulo 1:\n- Tags de catálogo:\n`,
  };
}
