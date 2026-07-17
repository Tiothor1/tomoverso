"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

const FAQ_ITEMS = [
  {
    question: "Posso publicar gratuitamente?",
    answer: "Sim. Publicar obras e capítulos, aparecer no catálogo, receber leitores e comentários e manter um perfil básico de autor não exige assinatura.",
  },
  {
    question: "Qual a diferença entre Pro Leitor e Autor+?",
    answer: "Pro Leitor é voltado à leitura: remove anúncios, libera badge, downloads de capítulos, modo de leitura premium, temas e suporte prioritário. Autor+ reúne ferramentas de criação, assets, trilhas guiadas, estatísticas avançadas e perfil premium para autores. Publicar continua gratuito nos dois casos.",
  },
  {
    question: "Como funciona o plano mensal?",
    answer: "Depois da confirmação do pagamento, o plano mensal fica ativo por um mês. Você pode fazer um pagamento avulso pelo Checkout ou PIX, ou escolher o cartão recorrente para renovar no intervalo mensal.",
  },
  {
    question: "Como funciona o plano anual?",
    answer: "O Autor+ Anual libera os benefícios por 12 meses. O equivalente mensal é exibido como R$ 14,93, mas o valor do período é R$ 179,10 — com 3 meses grátis em comparação a 12 pagamentos mensais.",
  },
  {
    question: "O plano anual é cobrado mensalmente ou de uma vez?",
    answer: "No Checkout avulso e no PIX, o plano anual é pago de uma vez: R$ 179,10 pelo período de 12 meses. Se você escolher Recorrente no cartão, a renovação é configurada no intervalo anual.",
  },
  {
    question: "Como funciona a renovação automática?",
    answer: "A renovação automática só é criada ao escolher Recorrente no cartão. Esse fluxo usa a assinatura recorrente do Mercado Pago no intervalo do plano. Checkout avulso e PIX não criam renovação automática.",
  },
  {
    question: "Posso pagar por PIX?",
    answer: "Sim. Nos planos pagos, o botão Pagar via PIX gera um QR Code e um código copia e cola pelo Mercado Pago.",
  },
  {
    question: "O pagamento por PIX é recorrente?",
    answer: "Não. PIX é um pagamento avulso. Para renovar depois, é necessário gerar um novo pagamento PIX ou usar a opção Recorrente no cartão.",
  },
  {
    question: "O que acontece quando meu plano expira?",
    answer: "Ao fim do período, os recursos vinculados à assinatura deixam de ficar ativos e a conta permanece com os recursos do plano gratuito. Suas obras não são removidas.",
  },
  {
    question: "Posso cancelar a renovação automática?",
    answer: "Sim. Em Minha Assinatura, você pode cancelar a assinatura. Quando ela foi criada pelo fluxo recorrente, o sistema também envia o cancelamento ao Mercado Pago.",
  },
  {
    question: "O selo desaparece quando o plano termina?",
    answer: "Os selos e acessos premium dependem de uma assinatura ativa. Quando ela expira ou é cancelada, eles deixam de ficar disponíveis até uma nova assinatura ser ativada.",
  },
  {
    question: "Minhas obras continuam publicadas após o plano expirar?",
    answer: "Sim. A publicação de obras e capítulos é gratuita; o vencimento de um plano pago não despublica seu conteúdo.",
  },
  {
    question: "O plano Pro remove todos os anúncios?",
    answer: "Sim. O Pro Leitor remove todos os anúncios do site enquanto a assinatura estiver ativa.",
  },
  {
    question: "Quais ferramentas estão incluídas no Autor+?",
    answer: "Autor+ inclui Central de Ideias, Assistente Editorial, pack de assets, trilhas guiadas para criação, estatísticas avançadas de autor, perfil premium com selo Autor+ e um destaque leve de descoberta.",
  },
  {
    question: "Quanto tempo leva para o plano ser ativado após o pagamento?",
    answer: "A ativação acontece quando o Mercado Pago confirma o pagamento e envia essa confirmação ao sistema. O painel mostra o status do pagamento; não há um tempo fixo garantido, porque a confirmação depende do processamento do Mercado Pago.",
  },
] as const;

export function PlanFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionId = useId();

  return (
    <section className="mt-12" aria-labelledby="plan-faq-title">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Planos sem letra miúda</p>
        <h2 id="plan-faq-title" className="mt-1 font-heading text-2xl font-bold">Perguntas frequentes</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Respostas diretas sobre pagamento, renovação e o que permanece disponível na sua conta.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          const contentId = `${sectionId}-${index}`;

          return (
            <article key={item.question} className="border-b border-border/60 last:border-b-0">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-5"
                >
                  <span>{item.question}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </h3>
              <div
                id={contentId}
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="px-4 pb-4 text-sm leading-6 text-muted-foreground sm:px-5">{item.answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
