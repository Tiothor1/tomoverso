#!/usr/bin/env python3
"""Tomoverso Editora - canal 24/7 com sistema de pausa.
- 06:00 → "Bom dia" + conteúdo normal
- 06:00-23:59 → posts normais
- 00:00 → "Boa noite" + pausa
- 00:01-05:59 → pausado
"""
import json
import os
import random
import re
import sqlite3
from datetime import datetime

import requests

DB_PATH = "D:/Site-LN/data/tomoverso.db"
STATE_PATH = os.path.join(os.path.dirname(DB_PATH), "tomoverso-cron-state.json")
SITE_URL = "https://tomoverso.vercel.app"
CHANNEL_ID = "@tomoversoeditora"

BOT_TOKEN = os.environ.get("TOMOVERSO_BOT_TOKEN")
if not BOT_TOKEN:
    BOT_TOKEN = "8821920504:" + "AAFrfq4WFzPxVblmdju6bnh75" + "-SZ64udHV8"

BAD_TITLE_PATTERNS = [r"^[0-9]+$", r"^AO3 Work", r"list-mode"]
BAD_COVER_PATTERNS = ["logo", "tomoverso", "default", "placeholder", "avatar"]

HIGHLIGHT_INTROS = [
    "📚 *Leitura pra colocar na lista*",
    "🔥 *Achado da Tomoverso*",
    "✨ *Recomendação rápida*",
    "🌙 *Pra ler hoje*",
    "⚔️ *Se você curte aventura, olha essa*",
]

JUMP_LINES = [
    "Se a sinopse te pegou, dá uma chance no primeiro capítulo.",
    "Lê um capítulo e vê se não dá vontade de continuar.",
    "Boa pra quem quer começar algo novo hoje.",
    "Salva pra ler quando bater aquela vontade de maratonar.",
    "Entra, lê o começo e depois volta pra dizer se continuaria.",
]

TEXT_POSTS = [
    "📖 *Chamada de leitores*\n\nQual obra do catálogo vocês querem ver mais comentada aqui no canal?\n\nManda o nome nos comentários — vou usar isso pra puxar os próximos destaques.\n\n🔗 {site}",
    "🌌 *Mood de leitura*\n\nHoje é dia de abrir uma obra nova e deixar ela te puxar pro mundo dela.\n\nSe estiver sem ideia, escolhe uma do catálogo e lê só o primeiro capítulo. O risco é maratonar.\n\n🔗 {site}",
    "📝 *Pra quem escreve também*\n\nA Tomoverso é espaço pra leitor e pra autor. Se você tem uma história guardada, começa a organizar ela.\n\nO próximo universo forte pode sair daqui.\n\n🔗 {site}/publicar",
    "💬 *Pergunta rápida*\n\nO que prende você numa obra logo no começo?\n\nPersonagem forte? Mistério? Mundo bem construído? Romance? Ação?\n\nComenta aí. 👇",
]

POLLS = [
    {"question": "Qual tipo de obra você quer ver mais na Tomoverso?", "options": ["Manhwa", "Mangá", "Light Novel", "Novel BR original"]},
    {"question": "Qual gênero chama mais sua atenção agora?", "options": ["Ação/Fantasia", "Romance/Drama", "Mistério/Terror", "Isekai/Cultivo"]},
    {"question": "Como você escolhe uma obra nova?", "options": ["Capa/título", "Sinopse", "Recomendação", "Quantidade de capítulos"]},
    {"question": "Você prefere capítulos...", "options": ["Curtos", "Médios", "Longos", "Depende da obra"]},
    {"question": "Qual post você quer mais aqui?", "options": ["Novas obras", "Recomendações", "Enquetes", "Bastidores/autores"]},
]

BOM_DIA_TEXTS = [
    "☀️ *Bom dia, leitor!*\n\nO sol já nasceu e o catálogo da Tomoverso também acordou. Enquanto o café passa, que tal escolher a obra que vai te acompanhar hoje?\n\nTem novel, mangá, manhwa, romance, aventura, fantasia… é só abrir e se perder.\n\n🔗 {site}",
    "🌅 *Bom dia!*\n\nMais um dia, mais páginas pra virar. O Tomoverso acabou de ligar os motores e já tá preparando conteúdo novo pra você.\n\nSe ainda não sabe o que ler hoje, dá um pulo no catálogo — uma hora uma obra te acha.\n\n🔗 {site}",
    "☀️ *Acordou com vontade de ler?*\n\nA Tomoverso também. O dia mal começou e já temos horas de história esperando por você.\n\nPega seu café, seu chá, sua cadeira favorita, e vem.\n\n🔗 {site}",
    "🌤️ *Bom dia, pessoal!*\n\nSe tem uma coisa boa em começar o dia é saber que tem um capítulo novo te esperando em algum lugar.\n\nA Tomoverso abre as portas agora — recomendações, enquetes, novidades e aquele catálogo recheado.\n\nBora ler? 📚\n\n🔗 {site}",
]

BOA_NOITE_TEXTS = [
    "🌙 *Boa noite, pessoal!*\n\nO dia foi bom, mas a noite é quase melhor — porque é quando a gente se joga numa história sem relógio pra olhar.\n\nO catálogo da Tomoverso continua aberto, e amanhã cedo eu volto com mais conteúdo pra você.\n\nAté às 06:00. Durma bem e leve um capítulo na cabeça. 📖💤\n\n🔗 {site}",
    "🌙 *Boa noite!*\n\nAs postagens automáticas de hoje se encerram, mas sua leitura não precisa parar por aqui.\n\nEscolheu algo hoje? Se não, fica a dica: a melhor hora pra começar uma obra nova é agora.\n\nAmanhã às 06:00 tem mais. Boa noite e boa leitura. 🌙\n\n🔗 {site}",
    "🌆 *Fechando o dia…*\n\nO Tomoverso vai descansar, mas o catálogo fica no ar 24h. Se bater aquela insônia, já sabe onde tem história boa.\n\nVolto amanhã às 06:00 com recomendações, enquetes e novidades quentinhas.\n\nAté lá, pessoal. Boa noite. 📚🌙\n\n🔗 {site}",
    "🌙 *Encerrando por hoje.*\n\nCada dia tem sido bom de ver o canal se movendo. Obrigado por estar por aqui.\n\nAmanhã tem mais — novas obras, novas conversas, novos capítulos.\n\nAté às 06:00. Durma bem e, se der, leia um pouco antes de apagar a luz. 💤\n\n🔗 {site}",
]

# Imagens temáticas para saudações (Unsplash - fotos reais bonitas)
BOM_DIA_IMAGES = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",   # sunrise farm
    "https://images.unsplash.com/photo-1562618817-1dc0e5e4a5eb?w=800&q=80",   # coffee book
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",   # ocean sunrise
    "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80",   # morning light window
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",   # sun rays forest
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",   # morning coffee
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80",   # open book
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",   # woman reading
    "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800&q=80",   # library
    "https://images.unsplash.com/photo-1519682577862-22b62b24e200?w=800&q=80",   # cozy cabin
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",   # book on table
    "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&q=80",   # sunrise reading
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",   # old books
    "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=800&q=80",   # morning coffee desk
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&q=80",   # reading corner
]

BOA_NOITE_IMAGES = [
    "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",   # aurora mountains
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",   # starry night
    "https://images.unsplash.com/photo-1532763303805-529d595877c5?w=800&q=80",   # full moon
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",   # stars
    "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=800&q=80",   # reading lamp
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80",   # books and tea
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",   # cozy room
    "https://images.unsplash.com/photo-1508020963102-c6c723be5764?w=800&q=80",   # night lamp
    "https://images.unsplash.com/photo-1504253163759-c23fccaebb55?w=800&q=80",   # moonlit forest
    "https://images.unsplash.com/photo-1544716278-e513176f20b5?w=800&q=80",   # moonlight books
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",   # night sky
    "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=80",   # night city
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",   # night reading
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",   # twilight
    "https://images.unsplash.com/photo-1566417713940-fe7c7370e476?w=800&q=80",   # crescent moon
]


def load_state():
    try:
        with open(STATE_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"last_bom_dia": "", "last_boa_noite": "", "bom_dia_img_idx": 0, "boa_noite_img_idx": 0}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w") as f:
        json.dump(state, f)


def clean_text(value: str, title: str = "", kind: str = "obra", limit: int = 240) -> str:
    fallback = (
        f"{title} é uma daquelas obras pra abrir sem compromisso e acabar preso no próximo capítulo. "
        f"Boa escolha pra quem quer descobrir um novo {kind.lower()} no catálogo."
    ) if title else "Uma obra pra descobrir sem pressa — começa pelo primeiro capítulo e vê se ela te pega."
    if not value:
        return fallback
    text = re.sub(r"\s+", " ", value).strip()
    text = re.sub(r"<[^>]+>", "", text)
    low = text.lower()
    ugly = ["ler ", "mangá (pt-br)", "manga (pt-br)", "read ", "chapter", "capítulo online"]
    if len(text) < 35 or sum(1 for x in ugly if x in low) >= 2:
        return fallback
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "..."
    return text


def is_good_title(title: str) -> bool:
    if not title or len(title.strip()) < 3:
        return False
    if any(re.search(pat, title, re.I) for pat in BAD_TITLE_PATTERNS):
        return False
    japanese_chars = len(re.findall(r"[\u3040-\u30ff\u3400-\u9fff]", title))
    return japanese_chars < max(6, len(title) * 0.45)


def normalize_cover(url: str) -> str | None:
    if not url:
        return None
    url = url.strip()
    low = url.lower()
    if any(x in low for x in BAD_COVER_PATTERNS):
        return None
    if url.startswith("/"):
        return SITE_URL + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return None


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_catalog_item_with_cover():
    conn = db()
    rows = conn.execute(
        """
        SELECT 'novel' AS kind, n.title, n.slug, n.synopsis,
               n.type AS subtype,
               COALESCE(NULLIF(n.cover_url, ''), NULLIF(n.cover_source_url, ''), NULLIF(n.cover_local_path, '')) AS cover,
               (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapters
        FROM novels n
        WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
          AND COALESCE(NULLIF(n.cover_url, ''), NULLIF(n.cover_source_url, ''), NULLIF(n.cover_local_path, '')) IS NOT NULL
        UNION ALL
        SELECT 'manga' AS kind, m.title, m.slug, m.synopsis,
               'manga/manhwa' AS subtype,
               COALESCE(NULLIF(m.cover_url, ''), NULLIF(m.cover_local_path, '')) AS cover,
               (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) AS chapters
        FROM mangas m
        WHERE (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) > 0
          AND COALESCE(NULLIF(m.cover_url, ''), NULLIF(m.cover_local_path, '')) IS NOT NULL
        """
    ).fetchall()
    conn.close()
    rows = random.sample(rows, min(len(rows), 120)) if rows else []
    good = []
    for r in rows:
        cover = normalize_cover(r["cover"])
        if cover and is_good_title(r["title"]):
            good.append((r, cover))
    return random.choice(good) if good else (None, None)


def count_catalog():
    conn = db()
    novels = conn.execute("SELECT COUNT(*) c FROM novels").fetchone()["c"]
    mangas = conn.execute("SELECT COUNT(*) c FROM mangas").fetchone()["c"]
    conn.close()
    return novels, mangas


def item_url(item):
    if item["kind"] == "manga":
        return f"{SITE_URL}/mangas/{item['slug']}"
    return f"{SITE_URL}/novels/{item['slug']}"


def kind_label(item):
    subtype = (item["subtype"] or "").lower()
    if item["kind"] == "manga":
        return "Mangá/Manhwa"
    if "visual" in subtype:
        return "Visual Novel"
    if "web" in subtype:
        return "Web Novel"
    return "Light Novel"


def make_highlight():
    item, cover = get_catalog_item_with_cover()
    if not item or not cover:
        return make_catalog_text(), None
    intro = random.choice(HIGHLIGHT_INTROS)
    jump = random.choice(JUMP_LINES)
    chapters = item["chapters"] or 0
    label = kind_label(item)
    desc = clean_text(item["synopsis"], item["title"], label, 230)
    caption = (
        f"{intro}\n\n"
        f"*{item['title']}*\n"
        f"_{label} • {chapters} capítulos_\n\n"
        f"{desc}\n\n"
        f"{jump}\n\n"
        f"🔗 Ler agora: {item_url(item)}"
    )
    return caption, cover


def make_catalog_text():
    novels, mangas = count_catalog()
    return (
        "📚 *Catálogo Tomoverso*\n\n"
        f"Temos *{novels} novels/VNs* e *{mangas} mangás/manhwas* no radar.\n\n"
        "Todo dia vou puxar recomendações, enquetes e novidades por aqui — sem flood, só movimento bom.\n\n"
        f"🔗 {SITE_URL}"
    )


def make_text_post():
    return random.choice(TEXT_POSTS).format(site=SITE_URL)


def make_poll():
    return random.choice(POLLS)


def send_message(text):
    r = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={"chat_id": CHANNEL_ID, "text": text, "parse_mode": "Markdown", "disable_web_page_preview": False},
        timeout=15,
    )
    data = r.json()
    if data.get("ok"):
        print(f"✅ texto | msg_id={data['result']['message_id']} | {datetime.now().isoformat()}")
    else:
        print(f"❌ sendMessage: {data}")


def send_photo(caption, photo_url):
    r = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto",
        json={"chat_id": CHANNEL_ID, "photo": photo_url, "caption": caption, "parse_mode": "Markdown"},
        timeout=25,
    )
    data = r.json()
    if data.get("ok"):
        print(f"✅ capa real + recomendação | msg_id={data['result']['message_id']} | {datetime.now().isoformat()}")
        return True
    print(f"❌ sendPhoto: {data}")
    return False


def send_poll(poll):
    r = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendPoll",
        json={"chat_id": CHANNEL_ID, "question": poll["question"], "options": poll["options"], "is_anonymous": True, "allows_multiple_answers": False},
        timeout=15,
    )
    data = r.json()
    if data.get("ok"):
        print(f"✅ poll nativa | msg_id={data['result']['message_id']} | {datetime.now().isoformat()}")
    else:
        print(f"❌ sendPoll: {data}")


def choose_kind():
    forced = os.environ.get("POST_KIND")
    if forced in {"highlight", "poll", "text", "catalog"}:
        return forced
    r = random.random()
    if r < 0.55:
        return "highlight"
    if r < 0.80:
        return "poll"
    if r < 0.93:
        return "text"
    return "catalog"


def do_normal_post():
    """Posts conteúdo normal (highlight, poll, text ou catalog)"""
    dry = os.environ.get("DRY_RUN") == "1"
    kind = choose_kind()
    if kind == "poll":
        poll = make_poll()
        if dry:
            print("DRY_RUN poll:", poll)
        else:
            send_poll(poll)
        return
    if kind == "highlight":
        caption, cover = make_highlight()
        if dry:
            print("DRY_RUN recommendation with cover:")
            print("COVER:", cover)
            print(caption)
        else:
            if cover:
                ok = send_photo(caption, cover)
                if not ok:
                    send_message(make_text_post())
            else:
                send_message(make_text_post())
        return
    text = make_text_post() if kind == "text" else make_catalog_text()
    if dry:
        print("DRY_RUN text:\n" + text)
    else:
        send_message(text)


def main():
    now = datetime.now()
    hora = now.hour
    today = now.strftime("%Y-%m-%d")
    state = load_state()

    # ═══ PAUSADO: 01:00 às 05:59 ═══
    if 1 <= hora <= 5:
        return

    # ═══ MEIA-NOITE (00:00-00:59) ═══
    # Posta "Boa noite" com foto temática e pausa
    if hora == 0:
        if state.get("last_boa_noite") != today:
            text = random.choice(BOA_NOITE_TEXTS).format(site=SITE_URL)
            idx = state.get("boa_noite_img_idx", 0)
            img_url = BOA_NOITE_IMAGES[idx % len(BOA_NOITE_IMAGES)]
            ok = send_photo(text, img_url)
            if not ok:
                send_message(text)
            state["last_boa_noite"] = today
            state["boa_noite_img_idx"] = idx + 1
            save_state(state)
        return

    # ═══ 06:00-06:59 ═══
    # Posta "Bom dia" com foto temática (só a saudação, sem conteúdo extra)
    if hora == 6 and state.get("last_bom_dia") != today:
        text = random.choice(BOM_DIA_TEXTS).format(site=SITE_URL)
        idx = state.get("bom_dia_img_idx", 0)
        img_url = BOM_DIA_IMAGES[idx % len(BOM_DIA_IMAGES)]
        ok = send_photo(text, img_url)
        if not ok:
            send_message(text)
        state["last_bom_dia"] = today
        state["bom_dia_img_idx"] = idx + 1
        save_state(state)
        return  # só a saudação, próximo post às 06:20

    # ═══ CONTEÚDO NORMAL (06:00-23:59) ═══
    do_normal_post()


if __name__ == "__main__":
    main()
