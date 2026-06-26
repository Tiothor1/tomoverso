# Mercado Pago — Configuração do Tomoverso

O código do checkout já está integrado. Para ativar pagamentos reais em produção, configure as variáveis abaixo no Vercel.

## Obrigatório

### Opção recomendada

Use o access token de produção do Mercado Pago:

```env
MP_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.com
```

### Opção alternativa via OAuth/token

Se preferir gerar o token pelo endpoint `https://api.mercadopago.com/oauth/token`, configure:

```env
MP_CLIENT_ID=seu_client_id
MP_CLIENT_SECRET=seu_client_secret
MP_TEST_MODE=false
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.com
```

O sistema chama:

```http
POST https://api.mercadopago.com/oauth/token
Content-Type: application/json
```

com `grant_type=client_credentials`.

## Webhook

O checkout envia `notification_url` automaticamente para:

```txt
https://SEU-DOMINIO.com/api/payments/mercadopago-webhook
```

Também pode cadastrar essa URL no painel do Mercado Pago.

## Fluxo implementado

1. Usuário escolhe plano em `/store/plans`
2. Site cria preferência em `https://api.mercadopago.com/checkout/preferences`
3. Mercado Pago abre checkout com PIX/cartão/boleto
4. Webhook confirma o pagamento
5. Assinatura vira `active`
6. Benefícios liberam no site

## Segurança

- Sem token do Mercado Pago, o site NÃO libera assinatura grátis.
- Assinatura só ativa quando o webhook retorna pagamento `approved`.
- Assinaturas `pending` ficam aguardando confirmação.
