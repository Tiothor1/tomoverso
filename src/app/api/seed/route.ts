import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, generateId } from "@/lib/auth";

const FABIO_ID = "fabio-texeira-2026";

const novels = [
  {
    id: "o-que-eu-desenhei-existe",
    slug: "o-que-eu-desenhei-existe",
    title: "O Que Eu Desenhei, Existe",
    alternative_titles: ["OQEDE"],
    synopsis: "Yumi, 23 anos, é uma desenhista brasileira que nunca conseguiu publicar um mangá. Sobrevive de freela e tem um caderno velho, herdado da avó, onde desde os 12 anos desenhou um mundo inteiro de fantasia. Um dia, ela descobre que o que ela desenha com a mão esquerda vira real numa dimensão espelho — e que já existem pessoas lá idênticas aos personagens que ela inventou quando era criança. O reino que ela criou está em guerra civil. O vilão que ela desenhou está ganhando. E o herói que ela idealizou como 'interesse amoroso ideal' aos 14 anos está lá, esperando alguém que nunca veio. Yumi nunca terminou a história. E agora, o que ela fizer no caderno decide o destino de um mundo cheio de gente que ela mesma inventou.",
    genres: ["Fantasia", "Drama", "Slice of Life", "Sobrenatural"],
    tags: ["isekai-reverso", "criador-como-protagonista", "meta-narrativa", "romance-lento"],
    is_featured: 1,
  },
  {
    id: "dublador-de-almas",
    slug: "dublador-de-almas",
    title: "Dublador de Almas",
    synopsis: "Diego, dublador brasileiro de anime, morre e acorda num mundo medieval em guerra — onde sua habilidade de imitar qualquer voz é a arma mais poderosa que existe.",
    genres: ["Fantasia", "Comédia", "Ação", "Isekai"],
    tags: ["dublador", "comédia", "meta-humor"],
    is_featured: 1,
  },
  {
    id: "sistema-ultima-posicao",
    slug: "sistema-ultima-posicao",
    title: "Sistema: Última Posição",
    synopsis: "Kai é o único caçador preso no rank mais baixo por uma década. Até que copia, sem querer, a habilidade do monstro mais forte que existe.",
    genres: ["Ação", "Sistema", "Fantasia"],
    tags: ["underdog", "revenge", "level-up"],
    is_featured: 1,
  },
];

const chapters = [
  {
    id: "oqede-cap-1",
    novel_id: "o-que-eu-desenhei-existe",
    chapter_number: 1,
    title: "O Caderno da Avó",
    word_count: 1850,
    content: `O caderno estava dentro de uma caixa de sapatos, no fundo do armário da avó, embrulhado em três camadas de plástico-bolha e uma carta que ninguém tinha aberto em vinte e três anos.

Yumi só foi encontrá-lo porque o apartamento novo era pequeno demais pra guardar mais do que o essencial — e a mãe tinha jogado a caixa no canto da sala com um "cuida disso quando puder, filha, eu não tenho espaço emocional pra mais um objeto da tua avó" que era simultaneamente um favor e um sumiço.

O caderno tinha capa de couro falso, gasto nos cantos, e uma presilha de metal que não fechava mais. Na primeira página, uma caligrafia inclinada e redonda que Yumi não reconhecia de nenhum parente:

*"Para quem encontrar: isto não é meu. Mas é de alguém. Toma cuidado."*

Abaixo, com outra caneta, num garrancho de criança:

*"Pra mim mesma — se eu esquecer. NÃO ESQUECE."*

Yumi riu sozinha, no chão do apartamento, com uma caixa de pizza vazia do lado e a luz do corredor entrando pela porta entreaberta. A avó sempre foi dramática. O caderno provavelmente era um diário antigo, daqueles de adolescente. Ela ia fechar, colocar de volta na caixa, e—

O cheiro do papel.

Era um cheiro antigo, de coisa guardada por muito tempo, mas também doce. Como papel novo. Como se alguém tivesse acabado de abrir a embalagem. Estranho. Yumi folheou.

Dentro, não tinha diário.

Tinha um mapa.

Um mapa desenhado à mão, com cidades que não existiam, rios que ela nunca tinha visto, e uma legenda no canto inferior direito: *Reino de Vael — Ano 0 da Fundação*.

Vael. Aquele nome.

Yumi fechou o caderno. Abriu de novo. Fechou. Abriu. O nome não ia embora. Vael era o nome do reino que ela tinha inventado aos 12 anos, no caderno velho da escola, durante uma aula de matemática, e que ela nunca tinha contado pra ninguém. Nem pra mãe, nem pra melhor amiga, nem pra terapeuta. Era o reino que ela tinha escrito, desenhado, sonhado, durante três anos inteiros, antes de desistir aos 15 e jogar o caderno da escola fora.

Este caderno era de 1998. Yumi nasceu em 2003. Sua avó morreu em 2019, antes de Yumi começar a desenhar.

Ela folheou mais, devagar. Cada página tinha um desenho, datado. *Vael, 1998. O Castelo do Rei. A Floresta dos Espelhos. A Ponte de Vidro.* Tudo que ela tinha inventado aos 12 anos, neste caderno, doze anos antes dela nascer. Cada página era uma cópia exata — linha por linha, sombra por sombra — do que ela ia desenhar cinco anos depois, na quinta série, sem nunca ter visto esse caderno.

E na última página, uma única frase, na mesma caligrafia inclinada da primeira:

*"Você vai entender quando chegar lá."*

Yumi fechou o caderno. Levantou do chão. Olhou em volta do apartamento. Olhou pro teto. Olhou pro caderno de novo.

"Eu preciso dormir mais", ela disse em voz alta, pro ninguém, e foi pra cama levando o caderno junto, sem conseguir largar, do mesmo jeito que uma criança leva um cobertor velho que não troca por nenhum outro do mundo.

No meio da noite, ela sonhou com um reino. Com um trono vazio. Com alguém de pé no trono, esperando.

Quando acordou, o caderno estava embaixo do travesseiro. E na última página em branco, onde antes não tinha nada, agora tinha um desenho que ela não tinha feito:

Um rosto. Olhando pra ela.

Era o rosto do herói que ela tinha inventado aos 14. O interesse amoroso ideal, loiro, olhos azuis, sorriso torto, com uma cicatriz fina cortando a sobrancelha esquerda.

Ela lembrava do nome dele. Tinha dado um nome a ele, anos atrás.

Arlén.`,
  },
  {
    id: "oqede-cap-2",
    novel_id: "o-que-eu-desenhei-existe",
    chapter_number: 2,
    title: "A Mão Esquerda",
    word_count: 1620,
    content: `Yumi não dormiu mais naquela noite.

Passou as horas seguintes sentada na cama, com o caderno no colo, virando a página do rosto de Arlén pra cima e pra baixo, olhando os detalhes. A cicatriz na sobrancelha — ela lembrava que ela mesma tinha decidido que ele ia ter essa cicatriz. Os olhos azuis, um pouco puxados, com uma pinta marrom na íris esquerda. O sorriso torto, com o lado direito subindo mais que o esquerdo. Era ele. Era exatamente ele.

Mas ela não tinha desenhado isso.

Ela repetiu pra si mesma, várias vezes, como uma oração: *eu não desenhei isso.*

Levantou. Foi pra cozinha. Pegou um lápis. Tentou, com a mão direita, redesenhar o rosto de Arlén em outra folha. Tentou umas cinco vezes. Todas vieram erradas — assimétricas, duras, com olhos tortos. Ela não era boa com rostos. Era boa com cenário. Mão ruim pra figura humana. Sabia disso aos 15, sabia disso aos 23.

Tentou com a mão esquerda.

A mão esquerda dela era horrível. Letra feia, sem controle, traço trêmulo. Mas quando ela pegou o lápis e começou a desenhar — o mesmo rosto, as mesmas linhas — a mão se moveu diferente. Com controle. Com uma confiança que ela não tinha. Como se outra pessoa tivesse pegado o lápis por ela.

O rosto ficou perfeito.

Na hora exata em que o último traço tocou o papel, uma brisa passou pelo apartamento. Yumi sentiu no pescoço, fria, cheirando a chuva que não existia lá fora — o céu de São Paulo estava limpo, sem uma nuvem. A janela estava fechada.

E no desenho, em volta do rosto de Arlén, apareceu algo novo. Uma paisagem. Um castelo no fundo. Duas bandeiras hasteadas — uma com o brasão que ela tinha inventado, a outra com o brasão oposto, o do vilão. O castelo estava em ruínas pela metade.

Yumi largou o lápis. Olhou pras próprias mãos. A esquerda estava tremendo. A direita estava normal.

Ela virou o caderno. Na página ao lado, o castelo do desenho de Arlén agora tinha um nome embaixo, escrito numa caligrafia que não era a dela, nem a da avó, nem a de ninguém que ela conhecia:

*"Castelo de Vael. Tomado pela Rainha Serys. 14º ano da Fundação."*

Rainha Serys. Aquele nome também. Yumi lembrava. A vilã. A rainha do reino oposto, que ela tinha inventado aos 13, e que era o motivo pelo qual Arlén existia — ele era o herói que ia derrotar Serys e salvar o reino. Ela nunca tinha escrito essa parte. Quando desistiu, aos 15, parou bem antes do clímax. O reino ficou em guerra, sem resolução. Arlén ficou sem vilão pra enfrentar. E ela ficou sem história pra contar.

Mas Serys existia. Nesse caderno, no castelo de Vael, ela existia.

Yumi pegou o celular. Abriu o navegador. Procurou: "Vael light novel". "Rainha Serys". "Arlén fantasy". Nada. Nenhum resultado. Procurou em inglês, em japonês, em coreano. Nada.

Pegou o caderno de novo. Tentou apagar o desenho. Não saiu — a borracha passava por cima, mas o lápis continuava ali, marcado no papel, como se tivesse sido feito com tinta.

Tentou arrancar a página. Rasgou. Pegou a parte rasgada, virou — no verso, tinha outro desenho, novo, que ela não tinha feito:

Um par de olhos, vermelhos, olhando de canto, com um sorriso fino. Embaixo, com a mesma caligrafia estranha:

*"Você demorou."*

E ao lado, com outra letra, menor, mais apressada, como se tivesse sido escrito com pressa:

*"Não responde pra ela. Só pra mim. Eu sou Arlén. Eu sou seu. Por favor."*

Yumi largou o caderno. As mãos tremiam. Olhou pro teto do apartamento, em São Paulo, no terceiro andar de um prédio sem graça no centro, com uma pizza velha na sala e a luz do sol entrando.

E pela primeira vez em cinco anos, ela abriu o caderno de desenho de verdade, o dela, o que ela usava pra freela, e começou a desenhar.

Com a mão esquerda.`,
  },
  {
    id: "oqede-cap-3",
    novel_id: "o-que-eu-desenhei-existe",
    chapter_number: 3,
    title: "Vael em Chamas",
    word_count: 1740,
    content: `Yumi passou o resto do dia desenhando.

Não conseguia parar. A mão esquerda se movia como se soubesse coisas que ela não sabia — traços firmes, ângulos perfeitos, sombras que pareciam reais. Quando ela finalmente parou, eram seis da tarde, e o caderno dela estava cheio de uma cidade que ela não lembrava de ter desenhado com tanta precisão.

Era Vael. A capital. As torres, as ruas estreitas, o mercado central. Tudo de memória — uma memória que ela não tinha, mas que a mão esquerda parecia carregar.

Ela levantou, foi pegar água, e quando voltou, o desenho tinha ganhado volume.

As sombras estavam mais fundas. As cores, que eram lápis de cor, pareciam mais vibrantes. E numa das ruas do mercado central, três figuras estavam de pé, pequenas, mas nítidas: um homem de armadura, uma mulher de manto vermelho, e uma criança segurando uma espada grande demais pra ela.

Yumi conhecia os três.

O homem de armadura era Arlén. A mulher de manto vermelho era uma personagem que ela tinha criado aos 13 — Kira, a melhor amiga de Arlén, que morria no capítulo que ela nunca escreveu. A criança era... a criança ela não conhecia. Não fazia parte do reino original.

Pegou o caderno do avó. Abriu a página do castelo. O castelo continuava em ruínas pela metade, mas agora tinha movimento — bandeiras se mexendo, fumaça subindo, sombras passando por trás das janelas.

Abre o caderno da avó, escreve com a mão esquerda, embaixo do castelo:

*"Arlén. Você está aí?"*

A mão treme. O lápis sai. A resposta vem em três segundos, na página ao lado, com a mesma caligrafia apressada de antes:

*"Estou. O tempo aqui é diferente. Aqui já fazem três dias desde que você acordou. Você demora pra nós. Por favor, escuta. Serys vai atacar a cidade baixa amanhã ao amanhecer. Você tem que decidir o que fazer."*

Yumi escreveu de volta:

*"Quem é a criança?"*

A resposta demorou mais. Quase um minuto. Quando veio, era só:

*"É você. Como você vai ser, se você não desenhar outra coisa."*

Yumi fechou o caderno devagar. Olhou pro teto de novo. Olhou pras próprias mãos — a esquerda com calo de tanto desenhar, a direita intacta.

Ela era a criança segurando a espada grande demais.

Ela era, naquele mundo, uma versão sua que ela ainda não tinha criado. Uma versão que ela teria que desenhar, com cuidado, pra não destruir uma cidade inteira.

E pela primeira vez em cinco anos, ela abriu o caderno, e ao invés de pensar *eu não sou boa o suficiente pra isso*, ela pensou:

*Eu criei esse mundo. Eu sou a única pessoa que pode consertar.*

Pegou o lápis com a mão esquerda. Começou a desenhar.

E o reino de Vael, pela primeira vez em quatorze anos, parou de queimar.`,
  },
];

export async function POST() {
  const db = getDb();
  const now = new Date().toISOString();

  // Cria usuário Fábio (admin)
  const existingFabio = db.prepare("SELECT id FROM users WHERE username = ?").get("fabio_tx");
  if (!existingFabio) {
    const passwordHash = await hashPassword("tomoverso2026");
    db.prepare(
      `INSERT INTO users (id, email, username, password_hash, display_name, role, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      FABIO_ID,
      "fabio@tomoverso.com",
      "fabio_tx",
      passwordHash,
      "Fábio Teixeira",
      "admin",
      "Criador do Tomoverso. Escritor de Light Novels. Apaixonado por anime, fandub e mundos que ainda não existem."
    );
  }

  // Cria novels
  const novelInsert = db.prepare(`
    INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, genres, tags, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  for (const n of novels) {
    novelInsert.run(
      n.id,
      n.slug,
      n.title,
      JSON.stringify(n.alternative_titles || []),
      n.synopsis,
      `/covers/${n.slug}.jpg`,
      FABIO_ID,
      "light-novel",
      "ongoing",
      JSON.stringify(n.genres),
      JSON.stringify(n.tags),
      n.is_featured
    );
  }

  // Cria capítulos
  const chapterInsert = db.prepare(`
    INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  for (const c of chapters) {
    chapterInsert.run(c.id, c.novel_id, c.chapter_number, c.title, c.content, c.word_count, now);
  }

  // Conta o que tem
  const counts = {
    users: (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c,
    novels: (db.prepare("SELECT COUNT(*) as c FROM novels").get() as { c: number }).c,
    chapters: (db.prepare("SELECT COUNT(*) as c FROM chapters").get() as { c: number }).c,
  };

  return NextResponse.json({
    ok: true,
    message: "Banco populado com sucesso!",
    credentials: {
      username: "fabio_tx",
      password: "tomoverso2026",
      email: "fabio@tomoverso.com",
    },
    counts,
  });
}

export async function GET() {
  return POST();
}
