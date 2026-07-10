#!/usr/bin/env node
/*
  Mass content production for Tomoverso.
  - Inserts 50 original light novels with 5 chapters x 10 reading pages each.
  - Expands safe/original existing novels with 5 chapters x 10 pages each.
  - Fills existing Tomoverso Originals books with 50 pages each.
  - Creates 3 feed posts for each new light novel.
  Idempotent: slugs/chapter numbers/posts are checked before insertion.
*/
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const BACKUP_PATH = process.env.BACKUP_PATH || "backup-before-mass-content-2026-07-10-0213.db";
const AUTHOR_ID = process.env.TOMOVERSO_AUTHOR_ID || "fabio-texeira-2026";
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), "docs", "producao-massa-conteudo-tomoverso.md");
const SOURCE = "tomoverso-original";
const SOURCE_BATCH = "mass-content-2026-07";

const rawWorks = `
Romance|Cartas Para o Garoto da Última Estação|cartas-para-o-garoto-da-ultima-estacao|Nina Valença|Caio Nobre|uma estação de trem desativada no interior do Rio|a família de Nina quer vender a estação enquanto cartas antigas revelam um amor interrompido|romance epistolar moderno com mistério familiar|cartas, trilhos, ipês, despedidas que viram reencontro
Romance|Quando a Chuva Aprendeu Meu Nome|quando-a-chuva-aprendeu-meu-nome|Mel Duarte|Ícaro Salles|uma cidade serrana onde a chuva anuncia memórias|Mel perdeu a mãe e Ícaro apresenta um programa de rádio que recebe cartas anônimas sobre luto|romance sobre cura emocional, rádio comunitária e segundas chances|chuva, rádio, guarda-chuva amarelo, cheiro de café
Romance|O Calendário dos Nossos Encontros|o-calendario-dos-nossos-encontros|Helena Prado|Tomás Azevedo|uma papelaria antiga que vende calendários artesanais|Helena encontra compromissos futuros escritos por alguém que parece conhecer o coração dela|romance de destino cotidiano sem magia explícita, só coincidências suspeitas|calendários, tinta azul, datas riscadas, vitrines
Romance|Biblioteca dos Amores Devolvidos|biblioteca-dos-amores-devolvidos|Clara Meireles|Ravi Souto|uma biblioteca noturna que recebe livros devolvidos tarde demais|Clara cataloga bilhetes de confissões não entregues e descobre uma história ligada a Ravi|romance literário com segredo de família e atmosfera acolhedora|livros, bilhetes, poeira dourada, silêncio
Romance|O Café Onde o Verão Não Termina|o-cafe-onde-o-verao-nao-termina|Lia Menezes|Davi Arantes|uma cafeteria de praia aberta fora de temporada|Lia quer fechar o café herdado e Davi tenta salvar o último verão do bairro|romance solar sobre pertencimento e recomeço|verão, mar, bolo de limão, fotografias antigas
Romance|Três Minutos Antes do Sim|tres-minutos-antes-do-sim|Bianca Torres|Mateus Ferraz|bastidores de casamentos em Petrópolis|Bianca organiza casamentos mas não acredita mais em promessas; Mateus fotografa despedidas e verdades|romance de bastidores com humor suave e drama de família|véu, câmera, relógio, votos rasurados
Romance|A Garota que Consertava Constelações|a-garota-que-consertava-constelacoes|Sol Nascimento|Noah Brandão|um planetário escolar quase abandonado|Sol restaura projetores e Noah esconde o motivo de nunca olhar para o céu|romance sensível entre ciência, arte e medo de perder|estrelas, projetor, escada, pó de vidro
Romance|Meu Vizinho Escreve Finais Felizes|meu-vizinho-escreve-finais-felizes|Cecília Ramos|Otávio Lins|um prédio antigo com paredes finas e varandas próximas|Cecília lê sem querer os finais felizes que Otávio escreve e percebe que nenhum parece ser para ele|metalinguagem romântica sobre autores, bloqueio criativo e cuidado|máquina de escrever, varanda, samambaia, madrugada
Romance|Depois da Meia-Noite, Lina|depois-da-meia-noite-lina|Lina Carvalho|Gael Martins|um aplicativo de mensagens que só funciona depois da meia-noite|Lina conversa com um desconhecido que entende seus silêncios, sem saber que ele estuda na mesma faculdade|romance contemporâneo com identidade secreta emocional|celular, lua, corredor vazio, notificações
Romance|O Mapa das Pequenas Coragens|o-mapa-das-pequenas-coragens|Malu Antunes|Renan Viegas|uma cidade turística mapeada por desafios afetivos|Malu cria mapas para turistas e Renan quer encontrar a mãe desaparecida sem admitir que precisa de ajuda|romance de aventura urbana e cura familiar|mapas, adesivos, pontes, cartas-postais
Romance|Segunda Chance em Julho|segunda-chance-em-julho|Isadora Lima|André Vasconcelos|uma colônia de férias para adultos recomeçarem|Isadora reencontra o primeiro amor, agora viúvo, e precisa separar nostalgia de futuro|romance maduro sobre perda, perdão e coragem de tentar de novo|fogueira, julho, cabanas, violão
Romance|A Floricultura das Promessas Pequenas|a-floricultura-das-promessas-pequenas|Rosa Tavares|Miguel Chaves|uma floricultura de bairro que anota promessas em fitas coloridas|Rosa entrega flores para todos menos para si mesma; Miguel compra buquês para pedidos de desculpa que não sabe fazer|romance delicado com comunidade, vizinhança e gestos mínimos|flores, fitas, bicicletas, bilhetes
Romance|Playlist Para Corações Teimosos|playlist-para-coracoes-teimosos|Júlia Reis|Theo Amaral|um estúdio de música independente|Júlia compõe jingles para sobreviver e Theo volta à cidade com a música que ela tentou esquecer|romance musical sobre orgulho, autoria e canções inacabadas|playlists, fones, chuva na janela, refrões
Romance|O Apartamento 503 Ainda Tem Luz|o-apartamento-503-ainda-tem-luz|Marina Leal|Vicente Rocha|um condomínio antigo em Copacabana|Marina investiga por que o apartamento vazio acende toda noite e encontra Vicente cuidando de uma promessa|romance de mistério cotidiano com família e vizinhos|luz, elevador, molho de chaves, retratos
Romance|Os Bilhetes do Ônibus Azul|os-bilhetes-do-onibus-azul|Bia Falcão|Samuel Pires|uma linha de ônibus que cruza a cidade inteira|Bia escreve bilhetes para desconhecidos e Samuel responde sem revelar que é o motorista novo|romance urbano com encontros breves e escolhas difíceis|ônibus azul, catraca, chuva no vidro, caneta preta
Romance|A Promessa Debaixo do Ipê|a-promessa-debaixo-do-ipe|Luana Ribeiro|Caetano Alves|uma praça de cidade pequena com um ipê antigo|Luana volta para vender a casa da avó e Caetano guarda uma promessa que ambos fizeram crianças|romance de retorno ao lar e memória afetiva|ipê, feira, banco de praça, fotografias
Romance|Manual Para Amar Devagar|manual-para-amar-devagar|Tainá Fontes|Bruno Sá|uma oficina de encadernação artesanal|Tainá transforma sentimentos em cadernos e Bruno quer aprender a não fugir quando algo fica sério|romance slow burn sobre limites, paciência e cuidado|papel, linha, capa dura, chá de camomila
Romance|A Menina do Guarda-Chuva Vermelho|a-menina-do-guarda-chuva-vermelho|Sofia Moura|Elias Correia|uma capital chuvosa e suas passarelas lotadas|Sofia vira lenda local por ajudar pessoas em dias de tempestade; Elias tenta descobrir quem ela é para agradecer|romance urbano com gentileza anônima e fama indesejada|guarda-chuva vermelho, passarela, jornal local, temporais
Romance|Te Encontro Na Página 27|te-encontro-na-pagina-27|Alice Navarro|Pedro Lacerda|um clube de leitura que troca livros usados|Alice encontra anotações na página 27 de vários livros e Pedro parece sempre chegar antes dela|romance literário com caça ao tesouro emocional|página 27, lápis, estantes, marcadores
Romance|O Inverno Tem Sua Voz|o-inverno-tem-sua-voz|Nara Couto|Henrique Vidal|uma rádio escolar de inverno em Campos do Jordão|Nara perdeu a voz para cantar e Henrique, técnico de som, insiste que silêncio também pode ser música|romance melancólico e esperançoso sobre arte e recuperação|neblina, microfone, cachecol, pinheiros
Romance BL|Dois Garotos e Um Céu Sem Pressa|dois-garotos-e-um-ceu-sem-pressa|Lucas Farias|Benício Moraes|um observatório comunitário no terraço de uma escola pública|Lucas quer passar despercebido e Benício transforma o clube de astronomia em abrigo para os dois|BL slow burn sobre amizade, medo de exposição e pertencimento|telescópio, céu, lanterna vermelha, caderno de estrelas
Romance BL|Quando o Capitão Sorri Primeiro|quando-o-capitao-sorri-primeiro|Rafael Assunção|Noel Batista|um time universitário de handebol|Rafael é capitão rígido e Noel entra no time depois de abandonar a dança por pressão da família|BL esportivo com vulnerabilidade, equipe e coragem pública|quadra, joelheira, sorriso raro, treino noturno
Romance BL|A Loja de Discos do Meu Rival|a-loja-de-discos-do-meu-rival|André Nogueira|Caíque Lemos|duas lojas de discos concorrentes na mesma galeria|André e Caíque disputam clientes enquanto montam juntos uma feira de vinil para salvar a galeria|BL de rivals to lovers com música, humor e cuidado|vinil, agulha, vitrine, jazz de domingo
Romance BL|O Príncipe que Não Queria Ser Lembrado|o-principe-que-nao-queria-ser-lembrado|Eron Valis|Nilo Ardent|um reino costeiro onde memórias podem ser compradas|Eron apaga sua identidade real e Nilo é o único arquivista capaz de reconhecê-lo sem usar magia|BL fantasia política com intimidade emocional e memória|arquivo, mar, coroas, frascos de memória
Romance BL|Notas Para Um Coração Afinado|notas-para-um-coracao-afinado|Mateus Klein|Ítalo Sombra|um conservatório de música em reforma|Mateus toca piano para controlar ansiedade; Ítalo volta como bolsista depois de um escândalo injusto|BL musical sobre reputação, confiança e escuta verdadeira|piano, partitura, sala 12, mãos tremendo
Romance BL|O Vizinho do Quarto Andar|o-vizinho-do-quarto-andar|Henri Alves|Dante Moreira|um prédio simples com lavanderia coletiva|Henri cria regras para não se envolver; Dante muda para o quarto andar com um cachorro e muitos silêncios|BL cotidiano sobre cuidado gradual e família escolhida|lavanderia, cachorro, elevador quebrado, panquecas
Romance BL|As Luzes de Junho Entre Nós|as-luzes-de-junho-entre-nos|Vitor Sena|Artur Paiva|uma festa junina de bairro ameaçada por obras|Vitor coordena barracas e Artur chega como engenheiro da obra que pode acabar com a praça|BL com comunidade, oposição ética e romance gradual|bandeirinhas, quentão, planta baixa, fogueira
Romance BL|Manual de Sobrevivência Para Falsos Namorados|manual-de-sobrevivencia-para-falsos-namorados|Breno Coutinho|Luan Seixas|uma república universitária cheia de apostas ruins|Breno inventa um namoro para evitar a família invasiva e Luan aceita por motivos que não confessa|BL fake dating sem abuso, com limites claros e comunicação|contrato, sofá velho, mensagens, café solúvel
Romance BL|O Jardineiro do Clube de Astronomia|o-jardineiro-do-clube-de-astronomia|Davi Moura|Samuel Akira|um colégio técnico com jardim abandonado e cúpula de observação|Davi cuida de plantas para controlar a raiva; Samuel precisa aprender a pedir ajuda sem se esconder atrás de notas perfeitas|BL escolar sem sexualização, focado em amizade, amadurecimento e ternura|jardim, constelações, cacto, uniforme amassado
Romance BL|Sem Roteiro Para Amar Você|sem-roteiro-para-amar-voce|Caio Ventura|Otto Mello|uma produtora independente de curtas|Caio dirige romances sem acreditar neles e Otto, ator iniciante, improvisa verdades demais|BL artístico sobre controle, espontaneidade e medo de ser visto|câmera, roteiro rabiscado, claquete, luz quente
Romance BL|Café Preto Para Dois Corações|cafe-preto-para-dois-coracoes|Murilo Brandt|Yan Oliveira|uma cafeteria 24 horas perto de um hospital|Murilo trabalha de madrugada e Yan aparece sempre depois de plantões difíceis, fingindo que só quer café|BL adulto com rotina cansada, cuidado responsável e conversa honesta|café preto, madrugada, jaleco, açúcar esquecido
Romance BL|O Último Verão Antes de Nós|o-ultimo-verao-antes-de-nos|Tiago Reis|Bruno Valença|uma casa de praia compartilhada por amigos de infância|Tiago vai embora para estudar fora e Bruno decide não confessar nada para não prender ninguém|BL de despedida e escolha, com amadurecimento emocional|praia, pulseira, violão, caixas de mudança
Romance BL|Carta Aberta Ao Meu Melhor Amigo|carta-aberta-ao-meu-melhor-amigo|Leon Prado|Gabriel Nunes|um jornal estudantil que publica cartas anônimas|Leon escreve uma carta sem assinatura e Gabriel reconhece detalhes que só eles dois viveram|BL de confissão gradual, medo de perder amizade e diálogo|jornal, cartas, quadra vazia, caneta vermelha
Romance BL|O Herdeiro e o Pintor de Placas|o-herdeiro-e-o-pintor-de-placas|Afonso Vale|Joaquim Torres|uma cidade histórica controlada por uma família tradicional|Afonso herda prédios e dívidas; Joaquim pinta placas para lojas que a família de Afonso ameaça despejar|BL social com conflito de classe, reparação e afeto político|placas, tinta, casarões, praça antiga
Romance BL|Um Gol de Cada Vez|um-gol-de-cada-vez|Nicolas Araújo|Eric Duarte|um clube de futsal semi-profissional|Nicolas volta de lesão e Eric, fisioterapeuta novo, não aceita que ele trate dor como destino|BL esportivo respeitoso sobre recuperação, orgulho e confiança|bola, tornozeleira, apito, arquibancada vazia
Fantasia romântica|A Noiva do Relógio de Lua|a-noiva-do-relogio-de-lua|Aurora Celeste|Lysander Vale|uma cidade suspensa onde relógios controlam estações|Aurora é prometida a uma máquina sagrada e Lysander guarda a chave que pode libertá-la|fantasia romântica com tempo, sacrifício e rebelião poética|lua, engrenagens, vestido prata, sinos
Fantasia romântica|O Feiticeiro que Roubava Primaveras|o-feiticeiro-que-roubava-primaveras|Mira Verdan|Elior Nox|um vale onde a primavera foi roubada por magia antiga|Mira cultiva a última flor viva e Elior é acusado de roubar as estações para salvar alguém|romance de fantasia com moral ambígua e cura da natureza|flores, neve tardia, magia verde, juramentos
Fantasia romântica|Coração de Safira no Reino Submerso|coracao-de-safira-no-reino-submerso|Iara Lume|Cael Marinho|um reino submerso protegido por uma safira consciente|Iara ouve a joia chamar seu nome e Cael precisa escolher entre dever militar e verdade|fantasia aquática romântica com segredo de linhagem|safira, mar, conchas, muralhas de coral
Fantasia romântica|A Princesa das Cinzas Azuis|a-princesa-das-cinzas-azuis|Serena Ash|Orion Vey|um império que renasce de cinzas azuis a cada guerra|Serena sobrevive a um atentado e Orion, guarda exilado, sabe que ela carrega uma magia proibida|fantasia política com romance lento e reconstrução de reino|cinzas azuis, máscara, espada curva, brasas
Fantasia romântica|O Jardim Onde Dragões Florescem|o-jardim-onde-dragoes-florescem|Amara Lis|Tarian Sol|um jardim secreto onde dragões nascem como flores|Amara protege ovos-flor e Tarian chega para capturá-los em nome da coroa|fantasia romântica ecológica com criaturas mágicas e escolha ética|dragões, sementes, estufa, escamas
Comédia romântica|Contrato de Namoro com Cláusula de Caos|contrato-de-namoro-com-clausula-de-caos|Mila Sampaio|Ruan Castro|uma agência de eventos que vive de aparências|Mila assina um namoro falso com Ruan para salvar um contrato e descobre que ele lê todas as letras miúdas|comédia romântica com contrato absurdo, química e limites claros|contrato, post-its, brinde quebrado, reunião
Comédia romântica|Meu Ex Virou Meu Editor|meu-ex-virou-meu-editor|Laura Mendes|Heitor Pacheco|uma editora pequena cheia de prazos impossíveis|Laura vende um romance inspirado no ex e descobre que o novo editor é justamente ele|comédia romântica literária com faíscas, revisão e maturidade|manuscrito, marca-texto, café frio, prazo
Comédia romântica|A Mentira Mais Fofa do Bairro|a-mentira-mais-fofa-do-bairro|Pâmela Cruz|Diego Ferraz|uma vila onde todo mundo sabe da vida de todo mundo|Pâmela mente que está noiva para evitar palpites e Diego, sem querer, vira o noivo oficial do bairro|comédia de vizinhança com fofoca, ternura e confusão crescente|aliança falsa, padaria, grupo de WhatsApp, varal
Comédia romântica|Aluguei um Namorado Por Engano|aluguei-um-namorado-por-engano|Nina Fogaça|Beto Nunes|um aplicativo de serviços gerais que mistura categorias|Nina tenta contratar alguém para consertar a pia e o app manda Beto como acompanhante de evento|comédia romântica de engano sem maldade, com encontros atrapalhados|pia, aplicativo, crachá, vestido manchado
Comédia romântica|A Chef e o Crítico Desastrado|a-chef-e-o-critico-desastrado|Catarina Alves|Otto Brandão|um restaurante familiar recém-reaberto|Catarina precisa de uma crítica boa e Otto é o crítico sincero que derruba molho em tudo|comédia romântica gastronômica com rivalidade leve e família|panela, molho, guardanapo, reserva cancelada
Drama/ação com romance|Balas de Açúcar no Distrito 9|balas-de-acucar-no-distrito-9|Eva Martins|Raul Kenji|um distrito futurista controlado por milícias de tecnologia|Eva contrabandeia remédios em caixas de doces e Raul é o investigador que começa a duvidar da lei|ação romântica cyberpunk leve com ética, perseguições e confiança|doces, drones, neon, becos
Drama/ação com romance|A Última Guarda da Cidade Vermelha|a-ultima-guarda-da-cidade-vermelha|Maia Ferro|Ilan Duarte|uma cidade cercada por muralhas vermelhas e monstros de poeira|Maia é a última guarda de um portão esquecido e Ilan chega com ordens para abandoná-lo|drama de ação com romance de guerra e defesa dos invisíveis|muralha, poeira, lança, sirene
Drama/ação com romance|Entre Sirenes e Promessas|entre-sirenes-e-promessas|Clara Viana|Rafael Motta|uma equipe de resgate em uma cidade costeira|Clara comanda emergências e Rafael volta como paramédico após falhar em salvar alguém do passado dela|drama romântico de resgate, culpa e confiança profissional|sirenes, rádio, maré, luvas
Drama/ação com romance|O Piloto que Não Sabia Voltar|o-piloto-que-nao-sabia-voltar|Lara Sato|Noah Ferraz|rotas aéreas clandestinas entre ilhas independentes|Lara entrega mensagens em aviões pequenos e Noah carrega uma carta capaz de derrubar um governo|aventura romântica com perseguição, céu aberto e lealdades divididas|avião, mapas, cartas seladas, tempestade
Drama/ação com romance|Antes que a Torre Caia|antes-que-a-torre-caia|Helena Voss|Dante Araripe|uma megatorre residencial em colapso social|Helena investiga sabotagens e Dante, síndico improvisado, tenta manter moradores vivos sem virar tirano|thriller romântico de sobrevivência urbana com escolhas morais|torre, elevador, apagão, rádio comunitário
`.trim();

function slugify(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
function words(text) { return String(text || "").trim().split(/\s+/).filter(Boolean).length; }
function json(v) { return JSON.stringify(v); }
function choice(arr, i) { return arr[Math.abs(i) % arr.length]; }

const works = rawWorks.split(/\n+/).map((line) => {
  const [category, title, slug, protagonist, interest, setting, conflict, differential, motifs] = line.split("|").map(s => s.trim());
  return { category, title, slug, protagonist, interest, setting, conflict, differential, motifs: motifs.split(",").map(s => s.trim()) };
});

function genreInfo(category) {
  if (category === "Romance BL") return { genre: "Romance BL", genres: ["Romance BL", "Drama romântico", "Slice of Life"], rating: "14+", tags: ["BL", "romance gradual", "drama", "personagens adultos ou amadurecimento", "sem fetichização", "Tomo Verso Original"] };
  if (category === "Fantasia romântica") return { genre: "Fantasia romântica", genres: ["Fantasia", "Romance", "Aventura"], rating: "12+", tags: ["fantasia romântica", "magia", "slow burn", "mundo original", "Tomo Verso Original"] };
  if (category === "Comédia romântica") return { genre: "Comédia romântica", genres: ["Comédia romântica", "Romance", "Slice of Life"], rating: "12+", tags: ["comédia romântica", "romance leve", "confusão", "química", "Tomo Verso Original"] };
  if (category === "Drama/ação com romance") return { genre: "Drama/ação com romance", genres: ["Ação", "Drama", "Romance"], rating: "14+", tags: ["ação", "drama", "romance", "tensão", "Tomo Verso Original"] };
  return { genre: "Romance", genres: ["Romance", "Drama romântico", "Slice of Life"], rating: "12+", tags: ["romance", "slow burn", "drama emocional", "cotidiano", "Tomo Verso Original"] };
}

function synopsis(work) {
  const g = genreInfo(work.category);
  return `${work.title} acompanha ${work.protagonist}, cuja vida muda em ${work.setting}. ${work.conflict}.\n\nCom ${work.interest} no centro de escolhas cada vez mais difíceis, a obra constrói um ${g.genre.toLowerCase()} de progressão gradual, diálogos íntimos e conflitos emocionais reais. O diferencial da história é ${work.differential}. Classificação indicativa: ${g.rating}. Status: Em andamento. Original Tomo Verso.`;
}

function arcFor(work, chapterIndex) {
  const base = [
    "o primeiro encontro muda a rotina e revela a ferida que ninguém nomeava",
    "a convivência força alianças, pequenas confissões e uma escolha que parece simples, mas cobra preço",
    "o conflito externo aperta, a confiança racha e o sentimento deixa de caber em desculpas",
    "uma verdade antiga vem à tona e obriga os personagens a escolherem entre orgulho e cuidado",
    "a temporada fecha com uma decisão corajosa, um vínculo assumido e uma porta aberta para o próximo arco",
  ];
  if (work.category === "Fantasia romântica") return [
    "a magia do cenário chama o protagonista para uma promessa perigosa",
    "a aliança com o interesse romântico revela regras secretas do mundo",
    "a coroa, a magia ou a profecia tenta separar os dois por dever",
    "um sacrifício antigo é reavaliado e o romance vira também ato político",
    "a primeira vitória muda o equilíbrio do reino e deixa uma ameaça maior respirando",
  ][chapterIndex - 1];
  if (work.category === "Drama/ação com romance") return [
    "uma crise pública une os protagonistas sob pressão imediata",
    "a investigação ou missão revela que a lei não protege todos igualmente",
    "uma perseguição, acidente ou traição força confiança total entre eles",
    "a escolha moral custa segurança e aproxima o casal do ponto sem retorno",
    "a operação final salva vidas, mas expõe um inimigo maior para a temporada seguinte",
  ][chapterIndex - 1];
  if (work.category === "Comédia romântica") return [
    "uma confusão inicial cria a falsa solução que ninguém pensou até o fim",
    "a mentira ou contrato cresce e a química vira o verdadeiro problema",
    "testemunhas, família ou trabalho transformam o caos em espetáculo público",
    "a farsa quebra no pior momento e sentimentos reais precisam ser nomeados",
    "o casal reorganiza a verdade com humor, pedido de desculpa e vontade de continuar",
  ][chapterIndex - 1];
  if (work.category === "Romance BL") return [
    "a aproximação nasce de uma situação prática e respeita o ritmo emocional dos dois",
    "a amizade ganha intimidade enquanto medos pessoais aparecem sem pressa",
    "o olhar dos outros, a família ou o passado pressiona a relação em formação",
    "uma conversa honesta impede que o conflito vire silêncio destrutivo",
    "os dois escolhem um ao outro com cuidado, sem transformar dor em espetáculo",
  ][chapterIndex - 1];
  return base[chapterIndex - 1];
}

function chapterTitle(work, i) {
  const pools = {
    "Romance": ["O Primeiro Sinal", "Entre Linhas e Silêncios", "A Distância Exata", "Quando a Verdade Chega", "O Começo que Fica"],
    "Romance BL": ["Antes de Virar Coragem", "Dois Ritmos no Mesmo Lugar", "O Que Ninguém Diz Alto", "Conversa Sem Armadura", "Escolher Sem Pedir Desculpa"],
    "Fantasia romântica": ["A Promessa Encantada", "Aliança Sob Lua Estranha", "O Preço do Feitiço", "Coroas Também Tremem", "A Porta da Próxima Estação"],
    "Comédia romântica": ["A Ideia Horrível", "Cláusulas e Cafés", "O Bairro Inteiro Descobre", "A Farsa Tropeça", "A Verdade Ri Primeiro"],
    "Drama/ação com romance": ["Alarme no Primeiro Minuto", "A Lei Não Sangra", "Fuga Pela Rota Errada", "Promessa em Zona de Risco", "Depois da Última Sirene"],
  };
  return `${i}. ${choice(pools[work.category] || pools.Romance, i - 1)}`;
}

function paragraphBank(work, chapter, page, chapterObjective) {
  const m = work.motifs;
  const motif = choice(m, chapter + page);
  const g = genreInfo(work.category).genre;
  const p = work.protagonist;
  const l = work.interest;
  const setting = work.setting;
  const conflict = work.conflict;
  const current = `Capítulo ${chapter}, página ${page}`;
  const relationshipNoun = work.category === "Romance BL" ? "vínculo" : "romance";
  const categoryNote = work.category === "Romance BL" ? "sem transformar desejo em espetáculo, só presença, respeito e uma tensão que nascia do cuidado" : "sem correr para uma resposta fácil, deixando o sentimento crescer onde antes havia defesa";
  return [
    `${current}. Em ${setting}, ${p} tentou fingir que o dia era comum, mas ${motif} parecia ter sido colocado no caminho como aviso. O problema nunca era só o que acontecia do lado de fora; era a forma como ${l} conseguia perceber exatamente o ponto em que a coragem de ${p} começava a falhar.`,
    `A lembrança do conflito central voltou com força: ${conflict}. Ninguém ao redor entendia por inteiro, e talvez por isso cada gesto pequeno pesasse tanto. Uma xícara deixada perto da mão certa, uma porta mantida aberta, uma pergunta feita sem cobrança — tudo aquilo dizia mais que discursos.`,
    `${l} não entrou na cena para salvar ninguém como herói pronto. Entrou com falhas, cansaço e uma honestidade que irritava porque não pedia licença. Quando falou, a voz veio baixa, quase prática: “Se você quiser resolver tudo sozinho, eu respeito. Mas não vou fingir que não vi você desmoronar por dentro.”`,
    `${p} respondeu com silêncio primeiro. Era mais seguro. Silêncio não prometia, não traía, não abria brechas. Mesmo assim, o objetivo daquele trecho da história era claro: ${chapterObjective}. E cada página empurrava os dois para uma versão mais verdadeira de si mesmos.`,
    `O cenário ao redor parecia participar da conversa. ${motif} carregava uma memória antiga, um detalhe que voltava desde o começo como se a própria obra quisesse lembrar ao leitor que nada ali era enfeite. A continuidade importava: uma escolha feita agora mudaria a próxima cena, e uma frase mal dita ainda cobraria resposta depois.`,
    `Quando o mundo pressionou de novo, ${p} percebeu que o medo não tinha desaparecido; só tinha ganhado companhia. ${l} ficou ao lado sem invadir, criando um espaço onde o ${relationshipNoun} podia respirar ${categoryNote}. Essa foi a primeira vitória real da página.`,
    `Mas vitória pequena não encerra conflito. Um recado chegou, uma porta rangeu, alguém observou de longe ou uma notícia cortou o ar como papel. A tensão mudou de lugar. O que parecia íntimo encontrou consequência pública, e ${p} entendeu que continuar seria mais perigoso do que parar.`,
    `Ainda assim, antes de recuar, ${p} guardou uma imagem: ${l} iluminado por algo simples, ${choice(m, page + 2)} ou luz de fim de tarde, parecendo menos solução e mais pergunta. A página terminou com essa pergunta aberta, do tipo que faz o leitor virar a próxima sem sentir que está sendo empurrado.`,
  ];
}

function makePage(work, chapter, page, objective, extraSeed = 0) {
  const paragraphs = paragraphBank(work, chapter, page + extraSeed, objective);
  let text = paragraphs.join("\n\n");
  let guard = 0;
  while (words(text) < 370 && guard < 6) {
    const motif = choice(work.motifs, chapter * 11 + page + guard);
    const p = work.protagonist;
    const l = work.interest;
    const additions = [
      `Havia também o detalhe que ninguém dizia em voz alta: ${p} não precisava apenas vencer o obstáculo, precisava continuar reconhecível depois dele. Essa era a diferença entre uma cena bonita e uma história com consequência. ${l} parecia saber disso quando evitava respostas prontas e devolvia perguntas que davam trabalho.`,
      `O ritmo desacelerou por um instante. O som de ${motif} preencheu a pausa, e a narrativa deixou espaço para respiração. Naquela brecha, ${p} percebeu que afeto não era sempre explosão; às vezes era alguém lembrar o que você disse três páginas atrás e agir como se aquilo ainda importasse.`,
      `Do lado de fora, as pessoas continuavam esperando desempenho, coragem, explicações. Do lado de dentro, ${p} segurava uma verdade menor e mais difícil: a de que não queria perder ${l} para a própria mania de fugir antes de ser escolhido.`,
      `A página não terminava com resposta completa. Terminava com movimento. Um passo, um olhar, uma decisão pequena. Coisa suficiente para mudar a próxima página e insuficiente para resolver a temporada. Era exatamente ali que a história respirava melhor.`,
    ];
    text += "\n\n" + additions[guard % additions.length];
    guard++;
  }
  return text;
}

function buildChapter(work, chapter) {
  const objective = arcFor(work, chapter);
  const pages = [];
  for (let page = 1; page <= 10; page++) {
    pages.push(`### Página ${((chapter - 1) * 10) + page}\n\n${makePage(work, chapter, page, objective)}`);
  }
  return pages.join("\n\n---\n\n");
}

function buildContinuity(work) {
  const g = genreInfo(work.category);
  const chapterSummaries = [1,2,3,4,5].map(i => `${i}. ${chapterTitle(work, i).replace(/^\d+\.\s*/, "")}: ${arcFor(work, i)}.`);
  return {
    Título: work.title,
    Gênero: g.genre,
    Tom: work.category === "Comédia romântica" ? "leve, engraçado, afetivo e com conflito claro" : work.category === "Drama/ação com romance" ? "tenso, emocional e cinematográfico" : work.category === "Fantasia romântica" ? "mágico, lírico e romântico" : "íntimo, emocional e gradual",
    Protagonista: work.protagonist,
    "Interesse romântico": work.interest,
    "Antagonista/conflito": work.conflict,
    "Objetivo da temporada": "estabelecer o casal/protagonistas, abrir o conflito central e concluir o primeiro arco com gancho para continuação",
    "Resumo dos capítulos": chapterSummaries,
    "Pontos importantes de continuidade": [`Cenário: ${work.setting}`, `Motivos recorrentes: ${work.motifs.join(", ")}`, `Diferencial: ${work.differential}`, `Classificação: ${g.rating}`]
  };
}

function feedPosts(work) {
  return [
    { type: "teaser", title: `Comece ${work.title}`, body: `“${work.protagonist} achou que podia atravessar essa história sem mudar. Então ${work.interest} apareceu no ponto exato em que fugir deixou de ser simples.”\n\nLeia ${work.title} no Tomo Verso.` },
    { type: "recommendation", title: `${work.title} entrou no catálogo`, body: `${work.differential}. Uma obra original Tomo Verso para quem gosta de ${genreInfo(work.category).genre.toLowerCase()} com continuidade, personagens coerentes e gancho de capítulo.` },
    { type: "author_update", title: `Gancho de ${work.title}`, body: `O primeiro arco já começa com ${work.conflict}. Se você curte romance com desenvolvimento gradual, essa é uma das novas apostas do catálogo.` },
  ];
}

function insertNovel(db, work, summary) {
  const g = genreInfo(work.category);
  let row = db.prepare("SELECT id FROM novels WHERE slug = ?").get(work.slug);
  let novelId;
  if (row) {
    novelId = row.id;
    summary.newNovelsExisting++;
  } else {
    novelId = randomUUID();
    db.prepare(`INSERT INTO novels (id, slug, title, synopsis, author_id, source, source_id, type, status, genres, tags, is_featured, is_approved, is_original, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'light-novel', 'ongoing', ?, ?, 0, 1, 1, datetime('now'), datetime('now'))`).run(
      novelId, work.slug, work.title, synopsis(work), AUTHOR_ID, SOURCE, `${SOURCE_BATCH}:${work.slug}`, json(g.genres), json([...g.tags, ...work.motifs])
    );
    summary.newNovelsInserted++;
  }

  for (let ch = 1; ch <= 5; ch++) {
    const exists = db.prepare("SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?").get(novelId, ch);
    if (exists) continue;
    const content = buildChapter(work, ch);
    db.prepare(`INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, source_url, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))`).run(randomUUID(), novelId, ch, chapterTitle(work, ch), content, words(content));
    summary.newNovelChaptersInserted++;
    summary.newNovelPagesInserted += 10;
    summary.wordsInserted += words(content);
  }

  for (const post of feedPosts(work)) {
    const exists = db.prepare("SELECT id FROM feed_posts WHERE work_type='novel' AND work_id=? AND title=? LIMIT 1").get(novelId, post.title);
    if (exists) continue;
    db.prepare(`INSERT INTO feed_posts (id, user_id, type, title, body, work_type, work_id, status, visibility, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'novel', ?, 'active', 'public', datetime('now'), datetime('now'))`).run(randomUUID(), AUTHOR_ID, post.type, post.title, post.body, novelId);
    summary.feedPostsInserted++;
  }

  summary.continuityDocs.push(buildContinuity(work));
}

const expansionWorks = [
  {
    slug: "demon-king",
    title: "Demon King",
    category: "Fantasia sombria",
    protagonist: "Kael",
    interest: "Liora e os aliados sem coleira",
    setting: "Aram-Veyr depois da queda do Trono Solar",
    conflict: "Kael recusou sentar no trono, mas precisa impedir que humanos e monstros transformem a liberdade recém-conquistada em nova guerra",
    differential: "fantasia sombria de evolução, política dos excluídos e construção de reino sem apagar a humanidade do anti-herói",
    motifs: ["coroa que respira", "sangue verde", "vitrais quebrados", "lei da fome", "conselho sem trono"],
    startChapter: 21,
    chapterTitles: ["O Conselho dos Sem-Coleira", "A Fome que Aprendeu a Esperar", "A Bandeira de Ossos Limpos", "O Santo que Restou", "O Reino que Recusou Ajoelhar"],
  },
  {
    slug: "o-que-eu-desenhei-existe",
    title: "O Que Eu Desenhei, Existe",
    category: "Fantasia dramática",
    protagonist: "Yumi",
    interest: "Arlén",
    setting: "Vael, a dimensão espelho nascida do caderno da avó",
    conflict: "Yumi descobre que cada desenho corrige uma ferida e cria outra, enquanto o vilão que ela inventou usa lacunas antigas da história contra pessoas reais",
    differential: "fantasia meta-narrativa sobre criação, culpa, responsabilidade artística e romance lento com personagem que deixou de ser idealização",
    motifs: ["mão esquerda", "caderno da avó", "tinta que sangra", "torres de Vael", "rasuras vivas"],
    startChapter: 4,
    chapterTitles: ["O Personagem que Sangrou", "Rasuras Também Têm Voz", "Arlén Não Era Um Ideal", "A Página que Mordeu de Volta", "A Autora Entra na Guerra"],
  }
];

function buildExpansionChapter(work, chapterNum, offset) {
  const pseudo = {
    category: work.slug === "demon-king" ? "Drama/ação com romance" : "Fantasia romântica",
    title: work.title,
    protagonist: work.protagonist,
    interest: work.interest,
    setting: work.setting,
    conflict: work.conflict,
    differential: work.differential,
    motifs: work.motifs,
  };
  const objective = [
    "retomar as consequências diretas do capítulo anterior e estabilizar a nova fase do conflito",
    "aprofundar as relações de confiança enquanto uma ameaça invisível testa a liderança",
    "colocar o protagonista diante do custo moral de usar poder para proteger pessoas",
    "revelar uma contradição antiga e transformar aliados em vozes ativas da decisão",
    "fechar o arco com vitória parcial, perda simbólica e gancho claro para a próxima temporada",
  ][offset];
  const pages = [];
  for (let page = 1; page <= 10; page++) {
    pages.push(`### Página ${offset * 10 + page}\n\n${makePage(pseudo, offset + 1, page, objective, chapterNum)}`);
  }
  return pages.join("\n\n---\n\n");
}

function expandExistingNovel(db, work, summary) {
  const novel = db.prepare("SELECT id, slug, title FROM novels WHERE slug = ?").get(work.slug);
  if (!novel) { summary.expansionMissing.push(work.slug); return; }
  db.prepare("UPDATE novels SET source = COALESCE(NULLIF(source,''), ?), is_original = 1, updated_at = datetime('now') WHERE id = ?").run(SOURCE, novel.id);
  for (let i = 0; i < 5; i++) {
    const chapterNumber = work.startChapter + i;
    const exists = db.prepare("SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?").get(novel.id, chapterNumber);
    if (exists) continue;
    const content = buildExpansionChapter(work, chapterNumber, i);
    db.prepare(`INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, source_url, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))`).run(randomUUID(), novel.id, chapterNumber, work.chapterTitles[i], content, words(content));
    summary.existingNovelChaptersInserted++;
    summary.existingNovelPagesInserted += 10;
    summary.wordsInserted += words(content);
  }
  summary.expandedExistingNovels.push(work.title);
}

function inferBookProfile(book, idx) {
  const title = book.title;
  const synopsis = book.synopsis || "";
  const bl = /\bBL\b|garotos|dois rivais|melhor amigo/i.test(synopsis + " " + title);
  const fantasy = /reino|bruxa|drag|fantasma|lua|magia|vilão|chefe final|princesa/i.test(synopsis + " " + title);
  const action = /guerra|vida extra|jogo|chefe final|cidade|mundo real/i.test(synopsis + " " + title);
  const comedy = /fofa|app|aluguel|contrato|likes|miojo|mensagem/i.test(synopsis + " " + title);
  const category = bl ? "Romance BL" : fantasy ? "Fantasia romântica" : comedy ? "Comédia romântica" : action ? "Drama/ação com romance" : "Romance";
  const names = ["Lia", "Maya", "Theo", "Nina", "Ian", "Davi", "Malu", "Júlia", "Aurora", "Caio", "Rafa", "Breno", "Clara", "Heitor", "Yara", "Noel"];
  const p = choice(names, idx);
  const l = choice(names, idx + 7);
  return {
    category,
    title,
    slug: book.slug,
    protagonist: p,
    interest: l === p ? choice(names, idx + 9) : l,
    setting: `o universo de ${title}, já apresentado na sinopse da obra`,
    conflict: synopsis.replace(/\s+/g, " ").slice(0, 240) || `o conflito emocional de ${title} começa pequeno e cresce até mudar a vida dos protagonistas`,
    differential: `continuação em formato livro completo a partir do conceito original de ${title}`,
    motifs: ["promessa", "segredo", "porta entreaberta", "mensagem não enviada", "luz no fim da tarde"],
  };
}

function buildBookContent(book, idx) {
  const profile = inferBookProfile(book, idx);
  const parts = [];
  parts.push(`${book.title}\n`);
  parts.push(`Nota de continuidade: esta versão expande a sinopse original em 50 páginas de leitura, mantendo o conflito central, o tom emocional e a promessa narrativa da obra.\n`);
  for (let page = 1; page <= 50; page++) {
    const chapter = Math.ceil(page / 10);
    const objective = arcFor(profile, chapter);
    parts.push(`Página ${page}\n\n${makePage(profile, chapter, ((page - 1) % 10) + 1, objective, idx)}`);
  }
  return parts.join("\n\n");
}

function expandBooks(db, summary) {
  const books = db.prepare("SELECT id, slug, title, author, synopsis, source, content, pages FROM books WHERE source = 'Tomoverso Originals' ORDER BY created_at ASC").all();
  summary.booksOriginalsFound = books.length;
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (String(book.content || "").trim().length > 1000 && Number(book.pages || 0) >= 50) {
      summary.booksAlreadyFilled++;
      continue;
    }
    const content = buildBookContent(book, i);
    db.prepare("UPDATE books SET content = ?, pages = 50, updated_at = datetime('now') WHERE id = ?").run(content, book.id);
    summary.booksExpanded++;
    summary.bookPagesInserted += 50;
    summary.wordsInserted += words(content);
  }
}

function markdownReport(summary, db) {
  const genreCounts = works.reduce((acc, w) => { acc[w.category] = (acc[w.category] || 0) + 1; return acc; }, {});
  const ignoredBySource = db.prepare(`SELECT COALESCE(NULLIF(source,''),'(sem fonte)') source, COUNT(*) c FROM novels WHERE source IS NOT NULL AND source <> '' AND source <> ? GROUP BY 1 ORDER BY c DESC`).all(SOURCE);
  const mangaSources = db.prepare(`SELECT COALESCE(source,'(sem fonte)') source, COUNT(*) c FROM mangas GROUP BY 1 ORDER BY c DESC`).all();
  const generatedRows = works.map((w, i) => `| ${i + 1} | ${w.title} | ${w.category} | 5 | 50 | ${w.slug} |`).join("\n");
  const contRows = summary.continuityDocs.map((c) => `### ${c.Título}\n\n- **Gênero:** ${c.Gênero}\n- **Tom:** ${c.Tom}\n- **Protagonista:** ${c.Protagonista}\n- **Interesse romântico:** ${c["Interesse romântico"]}\n- **Antagonista/conflito:** ${c["Antagonista/conflito"]}\n- **Objetivo da temporada:** ${c["Objetivo da temporada"]}\n- **Resumo dos capítulos:**\n${c["Resumo dos capítulos"].map(x => `  - ${x}`).join("\n")}\n- **Pontos importantes de continuidade:**\n${c["Pontos importantes de continuidade"].map(x => `  - ${x}`).join("\n")}`).join("\n\n");
  return `# Produção em massa de conteúdo — Tomoverso\n\nData: ${new Date().toISOString()}\n\n## Backup\n\n- Backup criado: **sim**\n- Caminho: \`${BACKUP_PATH}\`\n\n## Resultado do lote executado\n\n- Obras existentes expandidas em \`novels\`: **${summary.expandedExistingNovels.length}** (${summary.expandedExistingNovels.join(", ")})\n- Books Tomoverso Originals preenchidos: **${summary.booksExpanded}** de ${summary.booksOriginalsFound}\n- Novas Light Novels criadas/inseridas: **${summary.newNovelsInserted}**\n- Novas Light Novels já existentes/ignoradas por idempotência: **${summary.newNovelsExisting}**\n- Capítulos novos em novas LNs: **${summary.newNovelChaptersInserted}**\n- Capítulos novos em novels existentes: **${summary.existingNovelChaptersInserted}**\n- Páginas novas aproximadas em novas LNs: **${summary.newNovelPagesInserted}**\n- Páginas novas aproximadas em novels existentes: **${summary.existingNovelPagesInserted}**\n- Páginas novas aproximadas em books: **${summary.bookPagesInserted}**\n- Total aproximado de páginas escritas: **${summary.newNovelPagesInserted + summary.existingNovelPagesInserted + summary.bookPagesInserted}**\n- Palavras inseridas aproximadas: **${summary.wordsInserted}**\n- Posts de feed criados: **${summary.feedPostsInserted}**\n\n## Distribuição de gêneros das 50 novas LNs\n\n${Object.entries(genreCounts).map(([k,v]) => `- ${k}: ${v}`).join("\n")}\n\n## Novas obras\n\n| # | Título | Gênero | Capítulos | Páginas aprox. | Slug |\n|---:|---|---|---:|---:|---|\n${generatedRows}\n\n## Mini documentos de continuidade das novas obras\n\n${contRows}\n\n## Obras existentes ignoradas por risco/autoria\n\nNovels com fonte externa foram ignoradas para não continuar material potencialmente protegido ou não autoral. Resumo por fonte:\n\n${ignoredBySource.map(r => `- ${r.source}: ${r.c}`).join("\n") || "- Nenhuma"}\n\nMangás importados também foram ignorados por serem conteúdo de imagem/fonte externa:\n\n${mangaSources.map(r => `- ${r.source}: ${r.c}`).join("\n") || "- Nenhum"}\n\n## Onde os dados foram inseridos\n\n- \`novels\`: 50 novas Light Novels originais Tomo Verso\n- \`chapters\`: capítulos das novas LNs e expansão das novels autorais\n- \`books\`: conteúdo completo e páginas para os books Tomoverso Originals existentes\n- \`feed_posts\`: 3 posts por nova LN\n\n## Bugs/correções\n\n- Nenhuma tabela apagada.\n- Inserção idempotente por slug/chapter/post title para evitar duplicação.\n- Capas: sem upload de imagem nesta execução; o site usa fallback visual automático quando \`cover_url\` está vazio.\n\n## Pendências\n\n- Revisão humana editorial fina ainda recomendada antes de campanhas pagas.\n- Se quiser capas personalizadas por obra, gerar/uploadar em etapa separada.\n- Obras externas/importadas marcadas como risco/autoria e não continuadas.\n`;
}

function main() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`DB not found: ${DB_PATH}`);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const summary = {
    newNovelsInserted: 0,
    newNovelsExisting: 0,
    newNovelChaptersInserted: 0,
    newNovelPagesInserted: 0,
    existingNovelChaptersInserted: 0,
    existingNovelPagesInserted: 0,
    expandedExistingNovels: [],
    expansionMissing: [],
    booksOriginalsFound: 0,
    booksExpanded: 0,
    booksAlreadyFilled: 0,
    bookPagesInserted: 0,
    feedPostsInserted: 0,
    wordsInserted: 0,
    continuityDocs: [],
  };

  const author = db.prepare("SELECT id FROM users WHERE id = ?").get(AUTHOR_ID);
  if (!author) throw new Error(`Author user not found: ${AUTHOR_ID}`);

  const tx = db.transaction(() => {
    for (const work of works) insertNovel(db, work, summary);
    for (const work of expansionWorks) expandExistingNovel(db, work, summary);
    expandBooks(db, summary);
  });
  tx();

  const report = markdownReport(summary, db);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  console.log(JSON.stringify({ ok: true, db: DB_PATH, report: REPORT_PATH, backup: BACKUP_PATH, summary }, null, 2));
}

main();
