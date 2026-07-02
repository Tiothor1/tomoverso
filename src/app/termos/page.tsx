import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Termos de Uso — Tomo Verso Editora",
  description: "Termos de Uso e Publicação da Tomo Verso Editora. Leia as regras para usar a plataforma e publicar suas obras.",
};

const sections = [
  {
    id: "definicoes",
    title: "1. DEFINIÇÕES",
    content: `Para fins destes Termos:

Tomo Verso Editora: projeto editorial digital independente, site, plataforma, comunidade e ambiente online dedicado à leitura, publicação, organização, recomendação e divulgação de obras digitais.

Usuário: qualquer pessoa que acesse, navegue, leia, crie conta ou interaja com a plataforma.

Autor: usuário que publica, envia, cadastra ou autoriza a publicação de obra, capítulo, sinopse, capa, imagem, post ou qualquer conteúdo autoral.

Obra: qualquer conteúdo literário, artístico, narrativo ou editorial publicado ou enviado à plataforma, incluindo novels, light novels, mangás, manhwas, livros, capítulos, sinopses, capas, ilustrações, personagens, universos ficcionais, posts e materiais relacionados.

Conteúdo do Usuário: qualquer material enviado, publicado ou disponibilizado pelo usuário, incluindo textos, imagens, comentários, posts, obras, capítulos, perfis, avaliações e interações.`,
  },
  {
    id: "natureza",
    title: "2. NATUREZA INDEPENDENTE DO PROJETO",
    content: `A Tomo Verso Editora é uma iniciativa independente e autoral.

O usuário entende que a plataforma pode estar em fase de desenvolvimento, teste, expansão ou melhoria contínua, podendo sofrer alterações, ajustes, instabilidades, mudanças de layout, mudanças de regras, atualizações técnicas e modificações de funcionalidades.

Caso a Tomo Verso Editora seja formalizada futuramente como empresa, MEI, sociedade, editora registrada ou outro formato jurídico, estes Termos poderão ser atualizados para refletir a nova estrutura.`,
  },
  {
    id: "aceitacao",
    title: "3. ACEITAÇÃO DAS REGRAS",
    content: `Ao utilizar a plataforma, o usuário concorda em cumprir:
• estes Termos de Uso e Publicação;
• regras de comunidade e publicação;
• políticas de privacidade;
• orientações editoriais;
• normas legais aplicáveis;
• futuras regras específicas de autores, monetização ou publicação.

O usuário se compromete a agir de boa-fé, respeitar outros usuários, respeitar direitos autorais e não utilizar a plataforma para fins ilegais, abusivos ou prejudiciais.`,
  },
  {
    id: "cadastro",
    title: "4. CADASTRO E CONTA",
    content: `Algumas funcionalidades podem exigir cadastro.

O usuário se compromete a fornecer dados verdadeiros, manter sua conta segura e não utilizar identidade falsa, dados de terceiros ou informações enganosas.

O usuário é responsável por tudo que for feito em sua conta.

A Tomo Verso Editora poderá suspender, limitar ou encerrar contas que violem estes Termos, pratiquem spam, abuso, fraude, plágio, violação de direitos autorais ou qualquer conduta prejudicial à plataforma.`,
  },
  {
    id: "publicacao",
    title: "5. PUBLICAÇÃO DE OBRAS",
    content: `Ao publicar uma obra ou conteúdo na Tomo Verso Editora, o autor declara que:

1. é o criador original da obra; ou
2. possui autorização para publicar o conteúdo;
3. possui os direitos necessários sobre textos, imagens, capas, nomes, personagens, traduções e materiais enviados;
4. a obra não foi copiada de terceiros sem permissão;
5. a obra não viola direitos autorais, marcas, imagem, privacidade ou direitos de terceiros;
6. a obra não contém conteúdo proibido pela plataforma;
7. a publicação não descumpre contratos anteriores do autor com terceiros.

O autor é o único responsável pela obra que publicar.

A Tomo Verso Editora poderá remover, ocultar, moderar, revisar, limitar ou despublicar obras em caso de denúncia, suspeita de plágio, violação de direitos, conteúdo proibido, risco jurídico ou descumprimento destes Termos.`,
  },
  {
    id: "direitos-autorais",
    title: "6. DIREITOS AUTORAIS DO AUTOR",
    content: `A obra continua pertencendo ao seu respectivo autor ou titular de direitos, salvo se houver contrato escrito em contrário.

Publicar uma obra na Tomo Verso Editora não transfere automaticamente todos os direitos autorais da obra para a plataforma.

No entanto, ao publicar ou enviar conteúdo, o autor concede à Tomo Verso Editora uma autorização de uso necessária para que a plataforma consiga hospedar, exibir, organizar, divulgar e manter a obra disponível aos leitores.`,
  },
  {
    id: "autorizacao-uso",
    title: "7. AUTORIZAÇÃO PARA MANTER A OBRA NO AR",
    content: `Ao publicar uma obra na Tomo Verso Editora, o autor autoriza a plataforma a manter a obra disponível online dentro do site, vinculada ao perfil do autor, ao catálogo, ao feed, às recomendações, à busca e às páginas de leitura.

Essa autorização permite que a Tomo Verso Editora:
• hospede a obra;
• exiba capítulos, sinopse, capa e nome do autor;
• organize a obra no catálogo;
• recomende a obra para leitores;
• mostre a obra em cards, rankings, busca, feed e páginas internas;
• use trechos curtos para divulgação dentro da plataforma;
• use a obra em materiais promocionais da própria Tomo Verso Editora;
• mantenha cópias técnicas, backups, cache e registros necessários para funcionamento, segurança e defesa da plataforma.

Essa autorização é concedida de forma gratuita, não exclusiva e válida enquanto a obra estiver publicada na plataforma, sem impedir que o autor publique sua obra em outros lugares, salvo contrato separado dizendo o contrário.`,
  },
  {
    id: "remocao",
    title: "8. REMOÇÃO DE OBRAS",
    content: `O autor poderá solicitar a remoção de sua obra da visualização pública da plataforma através do e-mail abaixo.

A Tomo Verso Editora poderá atender a solicitação dentro de prazo razoável, respeitando limitações técnicas, registros de segurança, backups e obrigações legais.

Mesmo após a remoção pública, a plataforma poderá manter:
• registros internos da publicação;
• logs de segurança e histórico para auditoria;
• backups temporários;
• dados mínimos para defesa contra denúncias, fraudes ou disputas;
• registros de interações já realizadas;
• informações necessárias para cumprimento de obrigações legais.`,
  },
  {
    id: "promocional",
    title: "9. USO PROMOCIONAL",
    content: `O autor autoriza a Tomo Verso Editora a usar título, capa, sinopse, nome do autor, tags, gênero e trechos curtos da obra para divulgar a própria obra e a plataforma.

Esse uso poderá ocorrer em:
• página inicial, feed e catálogo;
• rankings e recomendações;
• redes sociais, banners e cards;
• anúncios e newsletters;
• materiais promocionais e páginas públicas da plataforma.

A Tomo Verso Editora não é obrigada a divulgar todas as obras igualmente. Destaques, rankings e recomendações podem depender de critérios editoriais, técnicos, de qualidade, popularidade, segurança, interesse do público ou funcionamento do algoritmo.`,
  },
  {
    id: "plagio",
    title: "10. PROIBIÇÃO DE PLÁGIO E CONTEÚDO SEM DIREITO",
    content: `É proibido publicar conteúdo copiado, pirateado, traduzido sem autorização ou pertencente a terceiros.

Também é proibido publicar:
• obras roubadas;
• traduções não autorizadas;
• capas sem direito de uso;
• imagens de terceiros sem permissão;
• personagens protegidos sem autorização, quando isso gerar violação de direitos;
• conteúdo com marcas registradas usado de forma indevida;
• textos gerados ou copiados de terceiros sem transparência quando exigido pela plataforma;
• qualquer material que possa prejudicar juridicamente a Tomo Verso Editora.

Caso a plataforma receba denúncia ou identifique risco, poderá remover o conteúdo imediatamente.`,
  },
  {
    id: "responsabilidade-autor",
    title: "11. RESPONSABILIDADE DO AUTOR",
    content: `O autor é responsável por tudo que publicar.

Se uma obra enviada pelo autor gerar reclamação, denúncia, processo, cobrança, notificação ou prejuízo por violação de direitos de terceiros, o autor poderá ser responsabilizado.

O autor concorda em isentar a Tomo Verso Editora de prejuízos causados por conteúdo que ele próprio publicou sem ter direito.`,
  },
  {
    id: "conteudo-proibido",
    title: "12. CONTEÚDO PROIBIDO",
    content: `Não é permitido publicar conteúdo que contenha:
• abuso sexual infantil ou qualquer sexualização de menores;
• incentivo a crimes reais;
• discurso de ódio, racismo, homofobia, xenofobia;
• ameaça, assédio ou perseguição;
• exposição de dados pessoais de terceiros;
• links maliciosos, vírus, golpes ou spam;
• plágio ou pirataria;
• conteúdo ilegal ou que viole leis brasileiras;
• conteúdo que coloque a plataforma em risco jurídico.

A Tomo Verso Editora poderá criar regras específicas para conteúdo adulto, violência, temas sensíveis, idade indicativa e categorias especiais.`,
  },
  {
    id: "comunidade",
    title: "13. COMENTÁRIOS, POSTS E COMUNIDADE",
    content: `Usuários poderão interagir por meio de comentários, curtidas, favoritos, posts, republicações, seguidores e outras ferramentas sociais.

O usuário é responsável pelo que publica.

A Tomo Verso Editora poderá remover comentários, posts ou interações que sejam ofensivos, abusivos, ilegais, discriminatórios, ameaçadores, fraudulentos, repetitivos ou prejudiciais.

A opinião de usuários não representa a opinião oficial da Tomo Verso Editora.`,
  },
  {
    id: "recomendacao",
    title: "14. SISTEMA DE RECOMENDAÇÃO",
    content: `A plataforma poderá recomendar obras com base em leituras, curtidas, favoritos, buscas, tags, gêneros, popularidade, interações, histórico interno e comportamento dentro do site.

O usuário entende que nem toda obra será recomendada ou destacada.

O autor entende que publicar uma obra não garante visualizações, leitores, destaque, monetização ou sucesso.`,
  },
  {
    id: "monetizacao",
    title: "15. MONETIZAÇÃO",
    content: `A publicação na Tomo Verso Editora não garante pagamento automático ao autor.

Caso futuramente exista monetização, assinatura, venda de capítulos, programa de autores, impulsionamento, anúncios, divisão de receita ou qualquer forma de remuneração, as regras serão definidas em documento separado.

Enquanto não houver contrato ou regra específica de monetização, o autor entende que a publicação é feita sem promessa de pagamento.`,
  },
  {
    id: "dados",
    title: "16. DADOS PESSOAIS",
    content: `A Tomo Verso Editora poderá coletar e tratar dados necessários ao funcionamento da plataforma, como dados de cadastro, login, segurança, leitura, interação, preferências, comentários e uso do site.

Esses dados poderão ser usados para:
• criar e proteger contas;
• permitir login e exibir perfis;
• recomendar obras e melhorar a experiência;
• prevenir fraude e manter segurança;
• responder solicitações e cumprir obrigações legais.

A plataforma manterá uma Política de Privacidade separada explicando com mais detalhes o tratamento de dados pessoais.`,
  },
  {
    id: "instabilidades",
    title: "17. INSTABILIDADES E ALTERAÇÕES",
    content: `A Tomo Verso Editora poderá passar por manutenções, bugs, mudanças, atualizações, alterações de layout, remoção de funcionalidades e instabilidades.

O usuário entende que a plataforma é um projeto digital em desenvolvimento contínuo.

A Tomo Verso Editora não garante funcionamento ininterrupto, ausência total de erros ou disponibilidade permanente.`,
  },
  {
    id: "suspensao",
    title: "18. SUSPENSÃO DE CONTA",
    content: `A Tomo Verso Editora poderá suspender ou encerrar contas que:
• violem estes Termos;
• publiquem conteúdo proibido;
• pratiquem plágio ou violem direitos autorais;
• ataquem outros usuários;
• tentem invadir a plataforma;
• pratiquem spam ou manipulem rankings;
• usem automações abusivas;
• prejudiquem a comunidade.`,
  },
  {
    id: "alteracoes",
    title: "19. ALTERAÇÕES DESTES TERMOS",
    content: `Estes Termos poderão ser alterados a qualquer momento.

Quando houver mudanças importantes, a Tomo Verso Editora poderá avisar os usuários pelo site, e-mail, notificação ou outro meio disponível.

O uso contínuo da plataforma após alterações significa aceitação da versão atualizada.`,
  },
  {
    id: "contato",
    title: "20. CONTATO",
    content: null,
  },
  {
    id: "aceite",
    title: "21. ACEITE FINAL",
    content: `Ao utilizar a Tomo Verso Editora, o usuário declara que:

1. leu estes Termos;
2. entende que a plataforma é um projeto editorial digital independente;
3. concorda em cumprir as regras;
4. é responsável pelo conteúdo que publicar;
5. garante possuir direitos sobre suas obras;
6. autoriza a Tomo Verso Editora a manter sua obra no ar enquanto publicada;
7. autoriza o uso da obra para exibição, organização, recomendação e divulgação dentro da plataforma;
8. entende que pode solicitar remoção pública da obra, respeitados backups, registros técnicos e obrigações legais;
9. entende que não há promessa automática de pagamento;
10. aceita que violações podem gerar remoção de conteúdo, suspensão ou encerramento da conta.`,
  },
];

export default function TermosPage() {
  return (
    <main className="aurora-bg">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-black tracking-tight md:text-5xl">
            Termos de Uso e Publicação
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Última atualização: 02 de julho de 2026
          </p>
        </div>

        {/* Intro */}
        <section className="mb-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Bem-vindo(a) à <strong className="text-foreground">Tomo Verso Editora</strong>.
          </p>
          <p>
            A Tomo Verso Editora é um projeto editorial digital independente, criado para reunir
            leitores, autores e obras originais em um ambiente online voltado à leitura, descoberta,
            publicação e divulgação de histórias.
          </p>
          <p>
            Ao acessar, criar conta, publicar obra, enviar capítulo, comentar ou utilizar qualquer
            funcionalidade da plataforma, o usuário declara que leu, entendeu e concorda com estes Termos.
          </p>
          <p>
            Caso não concorde com qualquer parte destes Termos, o usuário não deverá utilizar a plataforma.
          </p>
        </section>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-border/40 bg-card/50 p-5 md:p-6"
            >
              <h2 className="mb-3 font-heading text-lg font-bold">{section.title}</h2>
              {section.content ? (
                <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {section.content}
                </div>
              ) : null}
              {section.id === "contato" && (
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p>Para dúvidas, denúncias, solicitações de remoção, reclamações de direitos autorais ou suporte:</p>
                  <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-muted/30 p-4">
                    <p>
                      <span className="font-semibold text-foreground">E-mail:</span>{" "}
                      <a
                        href="mailto:tomoversoeditora@gmail.com"
                        className="text-primary hover:underline font-medium"
                      >
                        tomoversoeditora@gmail.com
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Responsável:</span> Fábio Teixeira
                    </p>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
