"use client";

import { useState } from "react";
import { ArrowDown, BookOpen, ChevronLeft, ChevronRight, Compass, Sparkles } from "lucide-react";
import "./runa-partida.css";

type Scene = "room" | "fracture" | "forest" | "hamlet" | "encounter";

const pages = [
  {
    number: "01",
    title: "A pior ideia da noite",
    scene: "room" as Scene,
    caption: "Caio, Davi e uma curiosidade que ele jurava não ter.",
    text: [
      "Caio Vilar tinha quinze anos e duas certezas absolutas: a primeira era que ninguém deveria ser obrigado a acordar antes das sete; a segunda era que League of Legends era jogo de gente estranha.",
      "Ele sustentava a segunda opinião com uma dedicação quase acadêmica. Sempre que Davi, seu primo, começava a gritar para o celular na sala, Caio nem precisava olhar para saber o motivo. Havia outro dragão, outra derrota injusta, outro desconhecido sendo chamado de animal por não fazer exatamente o que Davi queria.",
      "— Não é jogo — disse Caio, empurrando a mochila para baixo da mesa. — É uma doença coletiva com personagem colorido.\n\nDavi levantou os olhos do sofá. — Você fala isso sem nunca ter jogado.\n\n— Eu também nunca comi sabão e sei que é ruim.",
      "A chuva fina riscava o vidro da janela e transformava os postes da rua em borrões dourados. O apartamento era pequeno, quente, previsível. Caio gostava disso. Coisas normais obedeciam a regras: torradas queimavam; a internet caía com a chuva; Davi perdia uma partida e culpava alguém que morava do outro lado do mundo.",
      "Mas, quando o primo mostrou a tela, Caio não viu o colorido que esperava. Viu uma figura azulada, encapuzada, quase escondida entre ruínas — um homem com um pergaminho nas mãos e uma expressão que parecia cansada de salvar o mundo sozinho.\n\n— Ryze — explicou Davi, sorrindo ao notar o interesse. — Um mago. Procura runas para impedir que o mundo acabe.\n\n— Claro que procura.",
      "A luz no retrato pulsou. Uma vez. Pequena demais para Davi notar. Azul demais para ser reflexo.\n\nCaio engoliu seco, puxou o notebook para perto e colocou os fones.\n\n— Uma partida — disse. — Se for ruim, você nunca mais fala desse jogo perto de mim.\n\nDavi abriu um sorriso grande demais.\n\n— Fechado."
    ]
  },
  {
    number: "02",
    title: "O erro entre dois mundos",
    scene: "fracture" as Scene,
    caption: "Em algum lugar de Runeterra, uma runa responde à coisa errada.",
    text: [
      "O jogo abriu com música, flashes de ouro e azul, nomes demais e botões demais. Caio mal teve tempo de perguntar por que precisava escolher uma rota se nem sabia onde ficava o próprio personagem.",
      "— Só segue a seta — Davi disse, sem esconder a diversão. — E não aperta tudo ao mesmo tempo.\n\n— Excelente instrução para uma guerra de desenho animado.",
      "Na mesma hora, a tela congelou. Não travou: congelou. O som da chuva morreu. A respiração de Davi sumiu do apartamento. Até o relógio da cozinha parou entre dois segundos.",
      "Em Runeterra, muito longe daquele quarto, Ryze ajoelhava-se dentro de um círculo de pedra mais antigo que os reinos que disputavam o mundo. As Runas Mundiais não deveriam ser chamadas. Não por ele. Nunca mais. Ainda assim, uma delas vibrava sob o solo, quebrada em luz, respondendo a uma presença que não pertencia a lugar algum.",
      "Caio levou a mão ao fone. A tela do notebook não mostrava mais o jogo. Mostrava um céu inteiro rachando. Letras azuis, que ele não sabia ler, se dobravam como pássaros contra o vidro.\n\n— Davi?\n\nNinguém respondeu.",
      "Então a luz atravessou a tela. Não queimou seus olhos. Puxou alguma coisa atrás deles. Caio sentiu o corpo ficar pesado e distante, como se tivesse esquecido como respirar, enquanto uma força impossível agarrava sua alma pelo peito.\n\nO último pensamento que conseguiu formar foi simples e indignado:\n\nEu nem gostei desse jogo."
    ]
  },
  {
    number: "03",
    title: "Um céu que não devia existir",
    scene: "forest" as Scene,
    caption: "O primeiro amanhecer de Caio em Ionia não vem com respostas.",
    text: [
      "O cheiro foi a primeira coisa a alcançá-lo: terra molhada, folhas esmagadas e fumaça distante. Depois veio o frio nas costas. Por fim, o peso de uma pedra contra sua bochecha.",
      "Caio abriu os olhos e viu um céu que não devia existir. As nuvens se estendiam como seda rasgada entre picos escuros. Árvores de troncos pálidos se curvavam sobre ruínas cobertas de musgo; fitas de oração desbotadas dançavam nos galhos, mesmo quando o vento não soprava.",
      "Ele sentou de uma vez e quase vomitou. Estava de moletom, calça de moletom e tênis encharcados, no meio de uma floresta que não aparecia em nenhuma rua do seu bairro. Seu notebook não estava ali. Seu celular, sim — morto, apesar de ter saído do carregador minutos antes.",
      "— Tá. — A voz saiu pequena. — Muito engraçado. Davi, se isso é uma pegadinha, você passou do limite.",
      "Nenhuma resposta. Só um pássaro de cauda azul que o observou de um galho alto demais, girou a cabeça e foi embora como se meninos perdidos em ruínas fossem parte da paisagem.",
      "Caio tentou se levantar. A palma da mão raspou na pedra e uma dor fina correu pelo braço. Entre seus dedos surgiu uma faísca azul. Não era fogo. Eram linhas minúsculas, geométricas, que se montavam e desmontavam rápido demais para ele entender.\n\nEle fechou a mão. A luz morreu.\n\nMas, por baixo da terra, alguma coisa respondeu com um pulso grave."
    ]
  },
  {
    number: "04",
    title: "O idioma da suspeita",
    scene: "hamlet" as Scene,
    caption: "Fome, medo e uma aldeia que não quer mais um desconhecido.",
    text: [
      "A floresta terminou perto do meio-dia. Caio encontrou uma estrada estreita, depois telhados baixos e tortos, lanternas de papel apagadas pela chuva e uma pequena aldeia encolhida entre morros. Havia cheiro de caldo, pão e carne frita. Seu estômago doeu como se quisesse denunciar sua presença antes dele.",
      "Ele tentou sorrir para uma vendedora de frutas. Tentou apontar para uma maçã. Tentou explicar, com gestos desajeitados, que tinha dinheiro em casa — uma informação que não servia para absolutamente nada ali.",
      "A mulher olhou para suas roupas, para seus tênis sujos e para o modo como ele falava palavras sem sentido. Depois chamou alguém.\n\nDois guardas vieram depressa. Não usavam uniforme brilhante nem armadura de filme; vestiam couro gasto, tecido azul-esverdeado e carregavam lanças curtas. Homens cansados, não monstros. Ainda assim, Caio teve medo deles.",
      "— Eu não roubei nada — disse, recuando. — Não sei onde estou. Só preciso... de água, talvez.\n\nO guarda mais velho respondeu algo que Caio não compreendeu. A ponta da lança baixou um pouco. Não como ameaça direta. Como precaução.",
      "A injustiça não chegou com um grito. Chegou devagar, no olhar das pessoas. Estrangeiro. Mentiroso. Problema. Caio percebeu que, naquele lugar, não ser entendido era quase o mesmo que ser culpado.",
      "Quando uma das mãos dele tocou a parede úmida, uma gota de chuva parou no ar. Uma segunda subiu do chão. Entre elas, a mesma marca azul apareceu por um instante — uma runa incompleta, girando como uma fechadura procurando a chave.\n\nTodos recuaram.\n\nE Caio entendeu, sem precisar conhecer uma única palavra daquele mundo, que acabara de piorar tudo."
    ]
  },
  {
    number: "05",
    title: "Alguém que já conhecia o caminho",
    scene: "encounter" as Scene,
    caption: "Miguel sabe onde está. Isso não significa que esteja do lado de Caio.",
    text: [
      "A chuva engrossou. Os guardas decidiram levá-lo pela rua estreita, talvez para uma cela, talvez para alguém que falasse devagar o bastante para interrogá-lo. Caio não perguntou. A garganta tinha secado, e cada olhar de janela parecia pesar mais do que a lança na frente dele.",
      "Foi então que uma voz surgiu debaixo da marquise de uma oficina fechada.\n\n— Se vocês forem levá-lo para o posto oeste, vão ter de explicar por que prenderam um garoto desarmado antes de entender uma única frase dele.",
      "O português cortou a rua como outra forma de magia. Caio virou a cabeça tão rápido que doeu.",
      "O garoto sob a marquise parecia ter uns dezesseis anos. Era magro, tinha cabelo escuro preso de qualquer jeito e usava um casaco índigo grande demais, claramente roubado ou comprado de segunda mão. Um estojo de mapas pendia da cintura. Seus olhos, atentos e divertidos, não combinavam com a situação.\n\n— Você... — Caio conseguiu dizer. — Você fala português?\n\n— Falo. E, antes que pergunte: sim, isso é Ionia. Não, você não está sonhando. E não, eu também não sou daqui.",
      "Ele se aproximou dois passos, sem pressa, e avaliou a marca azul que ainda tremia perto da mão de Caio. Pela primeira vez, o sorriso dele falhou.\n\n— Ah — murmurou. — Isso é péssimo.\n\n— O quê é péssimo?\n\n— Você ter aparecido perto de uma rota de patrulha? Normal. Você usar runa sem saber? Ruim. Mas essa marca...\n\nEle levantou os olhos.\n\n— Essa marca não deveria existir.",
      "Ao longe, além dos telhados, um sino tocou três vezes. Os guardas se entreolharam. O garoto de casaco índigo deu meio passo para trás, como quem já calculava uma fuga.\n\n— Meu nome é Miguel — disse. — E, se quiser continuar vivo, Caio, precisa escolher agora: confia em mim ou confia neles?\n\nCaio olhou para as lanças. Para a rua sem saída. Para a runa brilhando contra sua pele.\n\nE percebeu que o jogo tinha começado sem pedir permissão."
    ]
  }
];

function SceneArt({ scene, cover = false }: { scene: Scene; cover?: boolean }) {
  const palettes: Record<Scene, [string, string, string]> = {
    room: ["#07142b", "#156a9c", "#e9a64c"],
    fracture: ["#100b35", "#267ada", "#f4dfad"],
    forest: ["#0b2927", "#32765d", "#78d5ca"],
    hamlet: ["#182837", "#50766f", "#d2934c"],
    encounter: ["#15142f", "#3f3e87", "#efbd63"],
  };
  const [dark, mid, light] = palettes[scene];
  const id = `${scene}-${cover ? "cover" : "page"}`;
  const isFigurePair = scene === "room" || scene === "encounter";

  return <svg viewBox="0 0 1200 700" role="img" aria-label={`Ilustração original da cena ${scene}`} className="runa-art" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={dark}/><stop offset=".52" stopColor={mid}/><stop offset="1" stopColor="#070a16"/></linearGradient>
      <radialGradient id={`${id}-moon`}><stop stopColor={light} stopOpacity=".9"/><stop offset="1" stopColor={light} stopOpacity="0"/></radialGradient>
      <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="18"/></filter>
      <filter id={`${id}-grain`}><feTurbulence baseFrequency=".65" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer></filter>
    </defs>
    <rect width="1200" height="700" fill={`url(#${id}-bg)`}/>
    <circle cx={scene === "room" ? 730 : 650} cy="220" r="260" fill={`url(#${id}-moon)`} filter={`url(#${id}-blur)`}/>
    {scene === "fracture" && <><path d="M594 0 C545 150 680 226 584 342 C491 454 649 563 580 700" stroke="#d9f3ff" strokeWidth="14" opacity=".95" fill="none"/><path d="M604 0 C555 150 690 226 594 342 C501 454 659 563 590 700" stroke="#59bfff" strokeWidth="50" opacity=".35" fill="none" filter={`url(#${id}-blur)`}/></>}
    {scene === "forest" && <><path d="M0 470 C170 350 248 444 383 373 C527 299 683 420 849 325 C1015 230 1105 285 1200 223 V700 H0Z" fill="#07171a" opacity=".92"/><path d="M60 510 Q130 280 197 514 M250 520 Q341 195 421 510 M823 510 Q931 200 1012 516 M1022 515 Q1120 284 1170 512" stroke="#162f2b" strokeWidth="34" fill="none"/><path d="M0 566 C278 460 358 582 595 503 C822 428 1001 524 1200 440 V700 H0Z" fill="#071014"/></>}
    {scene === "hamlet" && <><path d="M0 500 L195 316 L380 500 L542 276 L748 500 L945 336 L1200 525 V700 H0Z" fill="#17212a"/><path d="M0 529 L195 372 L380 529 L542 327 L748 529 L945 390 L1200 552" stroke="#9d7443" strokeWidth="12" fill="none" opacity=".85"/><path d="M0 572 H1200 V700 H0Z" fill="#0b141d"/></>}
    {scene === "room" && <><rect x="70" y="80" width="350" height="305" rx="8" fill="#07101d" stroke="#89c8e6" strokeWidth="5"/><path d="M76 132 H414 M245 86 V379" stroke="#5e9bbd" strokeWidth="3" opacity=".7"/><path d="M0 590 H1200" stroke="#c2915c" strokeWidth="12"/><rect x="690" y="420" width="310" height="170" rx="18" fill="#0a0e18"/><rect x="713" y="438" width="265" height="116" rx="8" fill="#227da1" opacity=".8"/></>}
    {scene === "encounter" && <><path d="M0 700 V412 L262 280 L510 466 L788 266 L1200 470 V700Z" fill="#0a1120"/><path d="M111 200 L111 520 M1090 180 L1090 520" stroke="#d6a356" strokeWidth="8"/><circle cx="111" cy="203" r="45" fill="#efbd63" opacity=".85"/><circle cx="1090" cy="183" r="45" fill="#efbd63" opacity=".85"/></>}
    <g fill="#05070c">{isFigurePair ? <><circle cx="468" cy="350" r="43"/><path d="M400 560 Q411 394 468 389 Q536 403 552 560Z"/><circle cx="762" cy="327" r="43"/><path d="M686 560 Q704 371 762 368 Q840 389 860 560Z"/></> : <><circle cx="602" cy="354" r="48"/><path d="M510 600 Q525 393 603 394 Q696 418 718 600Z"/></>}</g>
    {(scene === "forest" || scene === "hamlet" || scene === "encounter") && <g fill="#9cecff">{[0,1,2,3,4,5,6,7].map(i => <circle key={i} cx={415 + ((i * 97) % 390)} cy={300 + ((i * 67) % 190)} r={4 + (i % 3) * 2} opacity=".7"/>)}</g>}
    <path d="M0 0 H1200 V700 H0Z" filter={`url(#${id}-grain)`}/>
  </svg>;
}

export function RunaPartidaReader() {
  const [active, setActive] = useState(0);
  const page = pages[active];
  const change = (next: number) => {
    setActive(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <div className="runa-page">
    <section className="runa-cover">
      <SceneArt scene="fracture" cover />
      <div className="runa-cover-shade" />
      <div className="runa-cover-copy">
        <span className="runa-kicker">TOMO VERSO · ORIGINAL EM DESENVOLVIMENTO</span>
        <h1>Runa<br/><em>Partida</em></h1>
        <p>Dois garotos. Um mundo que não os chamou. E uma magia que não deveria existir.</p>
        <button className="runa-start" onClick={() => document.getElementById("leitura")?.scrollIntoView({ behavior: "smooth" })}><BookOpen size={17}/> Ler o prólogo <ArrowDown size={16}/></button>
      </div>
      <div className="runa-cover-credit">UMA FANTASIA DE RUNETERRA · CAPÍTULO ZERO</div>
    </section>

    <main id="leitura" className="runa-reader">
      <aside className="runa-rail" aria-label="Páginas do prólogo">
        <div className="runa-rail-title"><Compass size={17}/> PRÓLOGO</div>
        {pages.map((item, index) => <button key={item.number} onClick={() => change(index)} className={active === index ? "is-active" : ""}><span>{item.number}</span><small>{item.title}</small></button>)}
      </aside>

      <article className="runa-sheet">
        <header className="runa-sheet-head"><span>RUNA PARTIDA</span><span>PÁGINA {page.number} / 05</span></header>
        <div className="runa-page-number">{page.number}</div>
        <h2>{page.title}</h2>
        <div className="runa-illustration"><SceneArt scene={page.scene}/><span><Sparkles size={14}/> {page.caption}</span></div>
        <div className="runa-prose">{page.text.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <nav className="runa-navigation" aria-label="Navegar páginas">
          <button onClick={() => change(active - 1)} disabled={active === 0}><ChevronLeft size={18}/> Anterior</button>
          <div>{pages.map((_, index) => <button key={index} onClick={() => change(index)} aria-label={`Ir para a página ${index + 1}`} className={index === active ? "dot is-active" : "dot"}/>)}</div>
          <button onClick={() => change(active + 1)} disabled={active === pages.length - 1}>Próxima <ChevronRight size={18}/></button>
        </nav>
      </article>
    </main>
  </div>;
}
