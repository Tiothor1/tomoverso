#!/usr/bin/env python3
"""Tomoverso Bot Chat Bridge - Relay Telegram messages to/from Hermes AI."""

import json, time, requests, os, sys, logging
from logging.handlers import RotatingFileHandler

# ─── Config ────────────────────────────────────────────
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
API_KEY = os.environ.get("OPENCODE_ZEN_API_KEY", "")
API_BASE = os.environ.get("OPENCODE_ZEN_BASE_URL", "https://opencode.ai/zen/v1")
ALLOWED_USERS = {2064684497}
POLL_INTERVAL = 2  # seconds
MODEL = "deepseek-v4-flash-free"

# ─── Logging ────────────────────────────────────────────
log = logging.getLogger("chat_bridge")
log.setLevel(logging.INFO)
handler = RotatingFileHandler("/home/Tiothor1/tomoverso-chat.log", maxBytes=1_000_000, backupCount=3)
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
log.addHandler(handler)
log.addHandler(logging.StreamHandler())

# ─── Telegram helpers ───────────────────────────────────
TG = f"https://api.telegram.org/bot{BOT_TOKEN}"

def tg_send(chat_id, text, reply_to=None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    if reply_to:
        payload["reply_to_message_id"] = reply_to
    return requests.post(f"{TG}/sendMessage", json=payload, timeout=10).json()

def tg_delete(chat_id, msg_id):
    return requests.post(f"{TG}/deleteMessage", json={"chat_id": chat_id, "message_id": msg_id}, timeout=10).json()

def get_updates(offset=None):
    params = {"timeout": 30, "limit": 10, "allowed_updates": ["message"]}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(f"{TG}/getUpdates", params=params, timeout=35)
        return r.json().get("result", [])
    except Exception as e:
        log.error(f"getUpdates error: {e}")
        return []

# ─── AI call ────────────────────────────────────────────
system_prompt = """Você é o Hermes Agent, assistente inteligente da Tomo Verso Editora.
Responda em português brasileiro, de forma direta, amigável e poética quando couber.
Você gerencia o canal @tomoversoeditora, posta mangás/manhwas/light novels.
Seu criador é o Fábio (wonner / Tiothor1).
Links: https://tomoverso.studio
Seja útil, resolva problemas, sugira melhorias."""

def ai_chat(messages):
    """Call the AI model and return response text."""
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000,
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        r = requests.post(f"{API_BASE}/chat/completions", json=payload, headers=headers, timeout=60)
        data = r.json()
        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"]
        log.error(f"AI error response: {data}")
        return f"❌ Erro na IA: {data.get('error', {}).get('message', 'resposta vazia')}"
    except Exception as e:
        log.error(f"AI call failed: {e}")
        return f"❌ Erro ao chamar IA: {e}"

# ─── Main Loop ──────────────────────────────────────────
def main():
    log.info("🤖 Chat Bridge iniciado!")
    
    # Track conversation contexts per user (keep last N messages)
    contexts = {}
    MAX_CONTEXT = 20  # messages per user
    
    offset = 0
    
    while True:
        try:
            updates = get_updates(offset)
            
            for update in updates:
                update_id = update["update_id"]
                offset = update_id + 1
                
                msg = update.get("message")
                if not msg:
                    continue
                
                chat_id = msg["chat"]["id"]
                user_id = msg["from"]["id"]
                
                # Only respond to allowed users
                if user_id not in ALLOWED_USERS:
                    log.info(f"Ignored user {user_id}")
                    continue
                
                text = msg.get("text", "").strip()
                if not text:
                    continue
                
                log.info(f"MSG from {user_id}: {text[:100]}")
                
                # Build conversation context
                if user_id not in contexts:
                    contexts[user_id] = [
                        {"role": "system", "content": system_prompt}
                    ]
                
                contexts[user_id].append({"role": "user", "content": text})
                
                # Trim context if too long
                if len(contexts[user_id]) > MAX_CONTEXT:
                    # Keep system message + last MAX_CONTEXT-1 messages
                    contexts[user_id] = (
                        [contexts[user_id][0]] + contexts[user_id][-(MAX_CONTEXT-1):]
                    )
                
                # Show "typing..." indicator
                requests.post(f"{TG}/sendChatAction", json={
                    "chat_id": chat_id, "action": "typing"
                }, timeout=5)
                
                # Get AI response
                response = ai_chat(contexts[user_id])
                
                # Add to context
                contexts[user_id].append({"role": "assistant", "content": response})
                
                # Trim again after adding assistant response
                if len(contexts[user_id]) > MAX_CONTEXT:
                    contexts[user_id] = (
                        [contexts[user_id][0]] + contexts[user_id][-(MAX_CONTEXT-1):]
                    )
                
                # Send response
                result = tg_send(chat_id, response)
                if result.get("ok"):
                    log.info(f"Sent to {user_id}: {response[:80]}...")
                else:
                    log.error(f"Send failed: {result}")
                
                # Small delay between messages
                time.sleep(0.5)
            
        except KeyboardInterrupt:
            log.info("Shutting down...")
            break
        except Exception as e:
            log.error(f"Main loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
