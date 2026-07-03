# ─── CONFIGURAÇÃO DE EMAIL ───────────────────────────────────
# Escolha UMA das opções abaixo:

# OPÇÃO 1: Gmail (mais comum pra quem já tem Gmail)
# Requer:
#   1. Ativar 2FA em: https://myaccount.google.com/security
#   2. Gerar senha de app em: https://myaccount.google.com/apppasswords
#      (criar pra "Outro dispositivo" → colocar nome "Tomoverso")
#   3. Copiar a senha de 16 letras
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tomoversoeditora@gmail.com
SMTP_PASS=INSIRA_AQUI_A_SENHA_DE_APP

# OPÇÃO 2: Resend (mais simples, precisa criar conta grátis)
# Cria conta em: https://resend.com
# Vai em API Keys → cria uma chave → cola abaixo
# Email de verificado em: https://resend.com/domains
RESEND_API_KEY=re_PEGUE_SUA_KEY_AQUI
EMAIL_FROM="Tomo Verso Editora <onboarding@resend.dev>"
