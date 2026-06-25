# Monetização do Tomoverso

## 1. Assinaturas (Mercado Pago)

### Planos ativos
| Plano | Preço | Período | Benefícios |
|-------|-------|---------|------------|
| Tomoverso Pro | R$ 9,90 | mensal | Sem anúncios, acesso antecipado, badge Pro |
| Tomoverso Pro Anual | R$ 94,90 | anual (2 meses grátis) | Mesmo + economia |
| Tomoverso Autor | R$ 19,90 | mensal | Tudo do Pro + ferramentas de autor, analytics |

### Como configurar o Mercado Pago

1. **Crie uma conta no Mercado Pago** em https://mercadopago.com.br (se já tiver conta do Mercado Livre, usa a mesma)

2. **Gere um Access Token**:
   - Vá em [https://mercadopago.com.br/developers/panel](https://mercadopago.com.br/developers/panel)
   - Crie uma aplicação → "Checkout Pro"
   - Na aba "Credentials", copie o **Access Token** (produção)

3. **Configure no Vercel**:
   - No dashboard da Vercel (https://vercel.com/Tiothor1/tomoverso/settings/environment-variables)
   - Adicione a variável: `MP_ACCESS_TOKEN` com o token copiado
   - A variável `NEXT_PUBLIC_SITE_URL` já deve estar como `https://tomoverso.vercel.app`

4. **Configure o Webhook** (para receber notificações de pagamento):
   - No painel do Mercado Pago, vá na sua aplicação → "Webhooks"
   - Adicione a URL: `https://tomoverso.vercel.app/api/payments/mercadopago-webhook`
   - Selecione o evento: "Payment"

### Como testar (modo sandbox)

1. No painel do MP, ative o "modo teste/sandbox"
2. Pegue o **Test Access Token** e configure como `MP_TEST_ACCESS_TOKEN` na Vercel
3. Use os cartões de teste do MP:
   - Mastercard: `5031 4332 1540 6351` (qualquer CVV, vencimento futuro)
   - Aprovado: `APRO` como nome do titular
   - Recusado: `OTHE` como nome do titular

---

## 2. Anúncios (Google AdSense)

### Como adicionar AdSense

1. **Crie uma conta** em https://adsense.google.com
2. **Adicione seu site** (tomoverso.vercel.app)
3. **Crie um ad unit** no painel do AdSense:
   - Vá em "Anúncios" → "Por unidade de anúncio" → "Criar unidade de anúncio"
   - Escolha "Anúncio em display" 
   - Copie o `data-ad-client` (ca-pub-XXXXXXXX) e `data-ad-slot`

4. **Configure no código**:
   - Abra `src/components/ads/ad-slot.tsx`
   - Descomente as linhas do AdSense
   - Substitua `ADSENSE_PUBLISHER` pelo seu publisher ID
   - Substitua o `data-ad-slot` pelo slot ID

5. **Onde colocar anúncios**:
   - Entre capítulos de novel (dentro de `novels/[slug]/[chapter]/page.tsx`)
   - No final de cada capítulo de mangá
   - Sidebar do explorar
   - Entre resultados de busca

### Alternativas ao AdSense

| Serviço | Tipo | Ideal para |
|---------|------|------------|
| **BuySellAds** | Anúncios nativos | Site com tráfego médio |
| **Amazon Associates** | Links afiliados | Recomendar livros/LNs |
| **Mercado Livre Ads** | Links afiliados | Público BR |
| **Parceria direta** | Publisher | Editoras de LN BR |

### Anúncios afiliados (Amazon/Mercado Livre)

1. Crie conta no [Amazon Associates](https://associados.amazon.com.br)
2. Gere links para livros/LNs que você recomenda
3. Adicione banners nas páginas de novel/manga

---

## 3. Estratégia de preços

**Por que R$ 9,90?**
- Preço psicológico abaixo de R$ 10
- Competitivo com outras plataformas BR
- Acessível pro público jovem (maioria leitor de LN)

**Meta inicial**: 50 assinantes Pro = ~R$ 500/mês recorrente
**Meta sustentável**: 200 assinantes = ~R$ 2.000/mês

---

## 4. Próximos passos de monetização

- [ ] **Venda de produtos físicos** (camisetas, marca-páginas) via /store
- [ ] **Capítulos premium** por obra (pague por capítulo avulso)
- [ ] **Doações/PIX** para autores via botão "Apoiar"
- [ ] **Comissão** sobre vendas de autores (ex: 10% por venda)
- [ ] **Publicidade direta** de editoras parceiras
