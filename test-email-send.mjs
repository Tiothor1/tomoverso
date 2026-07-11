const fs = require('fs');
const key = fs.readFileSync('/proc/self/environ','utf8').split('\0')
  .find(e => e.startsWith('RESEND_API_KEY='))?.split('=')[1];

const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fafafa">
  <div style="background:#fff;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px;text-align:center">
      <h1 style="margin:0;color:#e8d5b7;font-size:20px">📚 Tomo Verso Editora</h1>
    </div>
    <div style="padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#1a1a2e">Código de verificação</h2>
      <p style="color:#666;font-size:15px">Seu código chegou:</p>
      <div style="background:#f5f0e8;border-radius:12px;padding:24px;text-align:center;margin:16px 0;border:1px solid #e0d5c5">
        <span style="font-family:monospace;font-size:40px;letter-spacing:10px;font-weight:700;color:#1a1a2e">482159</span>
      </div>
      <p style="color:#888;font-size:13px">⏱ 10 minutos · uso único · 🔒 Não compartilhe</p>
    </div>
  </div>
</div>`;

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({
    from: 'Tomo Verso Editora <onboarding@resend.dev>',
    to: ['tomoversoeditora@gmail.com'],
    subject: 'Código de verificação — Tomo Verso Editora',
    html,
    text: 'Seu código de verificação do Tomo Verso Editora é: 482159. Válido por 10 minutos.'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d)));
