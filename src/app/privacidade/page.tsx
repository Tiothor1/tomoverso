import { Mail } from "lucide-react";

export const metadata = {
  title: "Privacidade — Tomo Verso Editora",
  description: "Política de Privacidade da Tomo Verso Editora. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD.",
};

const sections = [
  {
    id: "introducao",
    title: "1. INTRODUÇÃO",
    content: `A Tomo Verso Editora valoriza a privacidade e a transparência no tratamento de dados pessoais de seus usuários.

Esta Política de Privacidade explica como coletamos, usamos, armazenamos, compartilhamos e protegemos as informações dos usuários da plataforma Tomo Verso Editora, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).

Ao utilizar a plataforma, o usuário declara estar ciente e de acordo com os termos descritos nesta política.`,
  },
  {
    id: "dados-coletados",
    title: "2. DADOS QUE COLETAMOS",
    content: `Podemos coletar as seguintes categorias de dados pessoais:

• Dados de cadastro: nome, e-mail, nome de usuário, senha (armazenada de forma segura com hash), data de criação da conta.
• Dados de perfil: foto de avatar, biografia, links pessoais, preferências de leitura e exibição.
• Dados de conteúdo: obras publicadas, capítulos, comentários, avaliações, posts, interações na comunidade.
• Dados de uso: páginas visitadas, tempo de leitura, capítulos acessados, termos de busca, preferências de navegação, histórico de leitura.
• Dados técnicos: endereço IP, tipo de navegador, sistema operacional, dispositivo, idioma do navegador, páginas de referência.
• Dados de interação: curtidas, favoritos, bookmarks, seguidores, comentários, respostas, notificações lidas.
• Dados de transação: quando aplicável, dados necessários para processamento de assinaturas, compras e pagamentos (processados por terceiros — não armazenamos dados de cartão de crédito).`,
  },
  {
    id: "uso-dados",
    title: "3. COMO USAMOS SEUS DADOS",
    content: `Utilizamos os dados coletados para as seguintes finalidades:

• Criar, manter e proteger sua conta na plataforma.
• Permitir login, exibição de perfil e interações sociais.
• Exibir, organizar e recomendar obras com base em seus interesses e histórico.
• Melhorar a experiência do usuário, o leitor de páginas e as funcionalidades da plataforma.
• Enviar comunicações relacionadas à plataforma, como notificações de novos capítulos, atualizações e avisos importantes.
• Responder a solicitações, dúvidas e denúncias enviadas pelo usuário.
• Prevenir fraudes, abusos, violações de termos e atividades maliciosas.
• Cumprir obrigações legais e regulatórias.
• Gerar estatísticas anônimas e agregadas para melhoria do serviço.`,
  },
  {
    id: "compartilhamento",
    title: "4. COMPARTILHAMENTO DE DADOS",
    content: `A Tomo Verso Editora não vende dados pessoais dos usuários.

Podemos compartilhar dados nas seguintes situações:

• Com prestadores de serviço essenciais ao funcionamento da plataforma (hospedagem, armazenamento, envio de e-mails, processamento de pagamentos), que estão contratualmente obrigados a proteger os dados.
• Para cumprir ordem judicial, requisição legal, obrigação regulatória ou proteger direitos da plataforma e de terceiros.
• Com consentimento explícito do usuário para finalidades específicas.
• Em caso de reestruturação, fusão ou aquisição, desde que o tratamento continue vinculado a esta Política.

Os dados de perfil público (nome, avatar, biografia, obras publicadas) são visíveis para outros usuários da plataforma conforme as configurações de privacidade.`,
  },
  {
    id: "cookies",
    title: "5. COOKIES E TECNOLOGIAS SEMELHANTES",
    content: `Utilizamos cookies e tecnologias similares para:

• Manter sessão de login ativa.
• Lembrar preferências de tema, idioma e leitura.
• Coletar dados anônimos de uso para análise e melhoria da plataforma.
• Prevenir fraudes e proteger a segurança das contas.

O usuário pode gerenciar as preferências de cookies nas configurações do navegador. A desativação de cookies essenciais pode afetar o funcionamento de algumas funcionalidades da plataforma.

Não utilizamos cookies de terceiros para rastreamento publicitário sem o consentimento do usuário.`,
  },
  {
    id: "direitos-usuario",
    title: "6. DIREITOS DO USUÁRIO (LGPD)",
    content: `Em conformidade com a LGPD, o usuário titular dos dados possui os seguintes direitos:

• Confirmação da existência de tratamento de dados pessoais.
• Acesso aos dados pessoais tratados pela plataforma.
• Correção de dados incompletos, inexatos ou desatualizados.
• Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei.
• Portabilidade dos dados a outro fornecedor de serviço, mediante requisição.
• Eliminação dos dados pessoais tratados com consentimento do titular.
• Informação sobre compartilhamento de dados com terceiros.
• Informação sobre a possibilidade de não fornecer consentimento e as consequências da negativa.
• Revogação do consentimento a qualquer tempo.

Para exercer seus direitos, entre em contato através do e-mail abaixo. Responderemos em prazo razoável conforme a legislação aplicável.`,
  },
  {
    id: "seguranca",
    title: "7. SEGURANÇA DOS DADOS",
    content: `Adotamos medidas técnicas e organizacionais para proteger os dados pessoais dos usuários, incluindo:

• Criptografia de senhas com bcrypt.
• Sessões seguras com tokens JWT/JWE.
• Comunicação via HTTPS em todas as páginas.
• Controles de acesso restritos a dados sensíveis.
• Monitoramento básico de segurança e prevenção contra acessos não autorizados.

Nenhum sistema é completamente seguro. Em caso de incidente de segurança que possa gerar risco significativo aos usuários, notificaremos os afetados e as autoridades competentes conforme exigido pela LGPD.`,
  },
  {
    id: "retencao",
    title: "8. RETENÇÃO DOS DADOS",
    content: `Mantemos os dados pessoais dos usuários enquanto a conta estiver ativa ou pelo período necessário para cumprir as finalidades descritas nesta política.

Após solicitação de exclusão da conta, os dados serão removidos ou anonimizados em até 30 dias, exceto quando a retenção for necessária para cumprimento de obrigações legais, resolução de disputas ou prevenção de fraudes.

Backups técnicos podem conter dados residualmente por período adicional limitado, sendo sobrescritos conforme o ciclo normal de rotação.`,
  },
  {
    id: "alteracoes",
    title: "9. ALTERAÇÕES DESTA POLÍTICA",
    content: `Esta Política de Privacidade poderá ser atualizada periodicamente para refletir mudanças nas práticas de tratamento de dados, na legislação ou na plataforma.

Recomendamos que o usuário revise esta página regularmente. Em caso de mudanças significativas, notificaremos os usuários através do site, e-mail ou outro meio apropriado.

O uso contínuo da plataforma após a publicação de alterações constitui aceitação da versão atualizada da política.`,
  },
  {
    id: "contato",
    title: "10. CONTATO",
    content: null,
  },
];

export default function PrivacidadePage() {
  return (
    <main className="aurora-bg">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-black tracking-tight md:text-5xl">
            Política de Privacidade
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
            Esta Política de Privacidade descreve como tratamos os dados pessoais dos usuários da
            nossa plataforma, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD).
          </p>
          <p>
            Ao acessar, criar conta, publicar obra ou interagir com a plataforma, o usuário declara
            estar ciente e de acordo com as práticas descritas neste documento.
          </p>
          <p>
            Caso não concorde com qualquer parte desta política, o usuário não deverá utilizar a plataforma.
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
                  <p>Para dúvidas, solicitações relacionadas à privacidade ou exercício dos direitos previstos na LGPD:</p>
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
