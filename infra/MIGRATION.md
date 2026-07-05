# Guia de Migração: Vercel → VPS
# =================================
# Tomo Verso Editora — Next.js + SQLite
#
# Pré-requisitos da VPS:
#   • 8 GB RAM, 2 CPUs (ou mais)
#   • Ubuntu/Debian 22+ (recomendado)
#   • Acesso root ou sudo
#   • Domínio apontado pro IP da VPS (DNS)
# =================================

## ── 1. Conexão inicial ──

```bash
ssh root@SEU_IP_VPS
# Atualizar sistema
apt update && apt upgrade -y
# Criar usuário (opcional)
adduser deploy
usermod -aG sudo deploy
```

## ── 2. Deploy automático ──

```bash
# Como usuário deploy
curl -fsSL https://raw.githubusercontent.com/Tiothor1/tomoverso/main/infra/deploy.sh | bash
```

Isso instala Docker, clona o repositório, builda e sobe tudo.

## ── 3. Configurar domínio ──

Edite `infra/Caddyfile` e troque `tomoverso.com.br` pelo seu domínio:

```bash
nano /opt/tomoverso/infra/Caddyfile
# Depois recarregue:
docker compose -f /opt/tomoverso/infra/docker-compose.yml restart caddy
```

Caddy emite SSL automático do Let's Encrypt — zero配置.

## ── 4. Variáveis de ambiente ──

Copie as variáveis de ambiente (Supabase, etc):

```bash
nano /opt/tomoverso/.env
# Mesmo conteúdo do .env.local que você usa hoje
```

Depois:
```bash
docker compose -f /opt/tomoverso/infra/docker-compose.yml restart tomoverso
```

## ── 5. Deploy automático via GitHub Actions ──

Você **não precisa rodar script nenhum manualmente**. Uma vez configurado, é igual ao Vercel:

```
git push origin main   # ← SÓ ISSO. O resto é automático.
```

### Configurar (uma vez):

```bash
# 1. No repositório do GitHub:
#    Settings → Secrets and variables → Actions → New repository secret
#    Adicione 3 secrets:
#      VPS_HOST     = IP da sua VPS
#      VPS_USER     = deploy (ou root)
#      VPS_SSH_KEY  = sua chave SSH privada

# 2. Testar: dá um git push que o GitHub Action roda sozinho
```

### Ver o status do deploy:

- Abra o repositório no GitHub → **Actions** → Vai aparecer `Deploy para VPS`
- Se falhar, você recebe notificação no email do GitHub

## ── 6. Manutenção manual (se precisar) ──

### Atualizar o site (toda vez que quiser novo deploy):

```bash
ssh deploy@SEU_IP_VPS 'bash -s' < /opt/tomoverso/infra/deploy.sh
```

Ou simplificando: crie um alias no seu terminal local:

```bash
alias deploy-tomo='ssh deploy@SEU_IP_VPS "cd /opt/tomoverso && git pull && docker compose -f infra/docker-compose.yml build tomoverso && docker compose -f infra/docker-compose.yml up -d"'
```

### Ver logs:
```bash
ssh deploy@SEU_IP_VPS "docker compose -f /opt/tomoverso/infra/docker-compose.yml logs -f tomoverso"
```

### Backup do banco:
```bash
ssh deploy@SEU_IP_VPS "docker exec tomoverso sh -c 'cp /data/tomoverso.db /data/backup-\$(date +%Y%m%d-%H%M%S).db'"
```

## ── 6. Rollback (se algo der errado) ──

```bash
# Voltar para o commit anterior
cd /opt/tomoverso
git log --oneline -5
git checkout COMMIT_ANTERIOR
docker compose -f infra/docker-compose.yml build tomoverso && docker compose -f infra/docker-compose.yml up -d
```

## ── 7. Comparação Vercel vs VPS ──

| Aspecto            | Vercel (atual)         | VPS (nova)              |
|--------------------|------------------------|-------------------------|
| Deploy             | git push → automático  | git push + script       |
| SSL                | automático             | Caddy (automático)      |
| Banco SQLite       | /tmp (volátil)         | Volume Docker (persiste)|
| RAM                | 1 GB (limitado)        | 8 GB                    |
| Cold start         | Sim (lento)            | Não (sempre rodando)    |
| Preço              | Gratuito (limitado)    | ~R$ 60-100/mês          |
| Uploads/imagens    | Local /tmp             | Volume persistente      |

## ── 8. Arquivos do kit ──

```
infra/
├── Caddyfile           # Proxy reverso com SSL
├── docker-compose.yml  # Orquestração dos containers
├── Dockerfile          # Build da aplicação
├── deploy.sh           # Script de deploy
└── MIGRATION.md        # Este guia
```
