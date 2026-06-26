/**
 * Envio de email — configurável via env vars.
 *
 * Prioridade:
 * 1. RESEND_API_KEY — usa API do Resend (https://resend.com)
 * 2. SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS — usa SMTP direto
 *
 * Se nada configurado, loga no console (dev mode).
 */

const RESEND_API = "https://api.resend.com";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const { to, subject, html, text } = params;
  const from = process.env.EMAIL_FROM || "Tomoverso <naoresponda@tomoverso.com>";

  // Tenta Resend primeiro
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch(`${RESEND_API}/emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]+>/g, ""),
        }),
      });
      if (res.ok) return true;
      console.error("[email] Resend error:", await res.text());
    } catch (e: any) {
      console.error("[email] Resend exception:", e.message);
    }
  }

  // Fallback: SMTP
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    try {
      let nodemailer: any;
      try { nodemailer = require("nodemailer"); } catch { return false; }
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ""),
      });
      return true;
    } catch (e: any) {
      console.error("[email] SMTP error:", e.message);
    }
  }

  // Dev mode: log no console
  console.log("\n========== EMAIL (dev) ==========");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${html.replace(/<[^>]+>/g, "").substring(0, 500)}`);
  console.log("=================================\n");
  return true; // dev mode sempre "envia"
}
