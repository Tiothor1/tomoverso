#!/usr/bin/env python3
"""Tomoverso Editora - Automated Channel Poster"""

import sqlite3, json, random, os, sys
from datetime import datetime

# --- CONFIG ---
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tomoverso.db')
SITE_URL = "https://tomoverso.vercel.app"

# --- CONTENT TEMPLATES ---
SPOTLIGHT_TEMPLATES = [
    "🌟 *Destaque do dia*\n\n{title}\n\n{description}\n\n📖 {chapters} capítulos disponíveis\n🔗 Leia agora: {url}",
    "📚 *Leitura recomendada*\n\n{title}\n\n{description}\n\n👉 {url}",
    "🔥 *Em alta na Tomoverso*\n\n{title}\n\n{description}\n\n📖 {chapters} capítulos\n🔗 {url}",
]

FEATURED_TEMPLATES = [
    "✨ *Obras em destaque*\n\n{list}\n\n📚 Confira o catálogo completo:\n🔗 {url}",
]

SITE_REMINDERS = [
    "📢 *Tomoverso Online 24h!*\n\n📚 Mais de {count} obras disponíveis pra leitura\n🎯 Novel, mangá, visual novel — tem pra todos os gostos\n\n🔗 Acesse: {url}",
    "📖 *Leitura sem limites*\n\n{count} obras no catálogo, incluindo:\n• {pick1}\n• {pick2}\n• {pick3}\n\n📚 Leia agora: {url}",
    "⚡ *Já conhece a Tomoverso?*\n\nCatálogo com {count} obras entre novels, mangás e VNs.\nTudo gratuito pra ler online!\n\n🔗 {url}",
]

ENGAGEMENT_POSTS = [
    "💬 *Qual obra você está lendo hoje?*\n\n Conta aqui nos comentários qual novel/mangá tá te prendendo!\n\n📚 Catálogo completo: {url}",
    "🎯 *Desafio do dia:*\n\nRecomende uma obra pra outro leitor nos comentários! Pode ser a sua favorita ou aquela que você descobriu essa semana.\n\n📚 {url}",
    "🔮 *Sorteio literário*\n\nQual gênero você mais gosta?\n⚔️ Ação | 🧙 Fantasia | 🔬 Sci-Fi | 💕 Romance | 🕵️ Mistério\n\nVota aí! 📚 {url}",
    "📊 *Enquete rápida*\n\nQuantas obras você já leu essa semana?\n1️⃣ Nenhuma ainda\n2️⃣ 1 ou 2\n3️⃣ 3 ou mais\n4️⃣ Perdi as contas 🤯\n\n📚 {url}",
    "🧠 *Quiz: Qual obra combina com você?*\n\nSe você pudesse ter um poder, qual seria?\nA) Invocar espadas ⚔️\nB) Controlar elementos 🔥\nC) Ler mentes 🧠\nD) Curar pessoas 💚\n\nResponde aí! 📚 {url}",
]

# --- DB HELPERS ---
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_novel_count(db):
    return db.execute("SELECT COUNT(*) as c FROM novels").fetchone()['c']

def get_featured_novels(db, limit=3):
    return db.execute("""
        SELECT title, slug, chapters_count 
        FROM (
            SELECT n.title, n.slug, 
                   (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapters_count
            FROM novels n
            WHERE n.is_featured = 1 OR n.is_original = 1
            ORDER BY n.views DESC
        ) 
        WHERE chapters_count > 0
        ORDER BY RANDOM() 
        LIMIT ?
    """, (limit,)).fetchall()

def get_random_novel(db):
    novel = db.execute("""
        SELECT n.title, n.slug, n.synopsis, n.type, n.status,
               COALESCE(NULLIF(n.title_jp, ''), NULLIF(n.title_en, ''), '') as alt_title,
               (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapters_count
        FROM novels n
        WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
        ORDER BY RANDOM() 
        LIMIT 1
    """).fetchone()
    return novel

def get_novel_with_most_chapters(db):
    novel = db.execute("""
        SELECT n.title, n.slug, n.synopsis, n.type, n.status,
               (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapters_count
        FROM novels n
        ORDER BY chapters_count DESC 
        LIMIT 1
    """).fetchone()
    return novel

def get_random_destaque(db):
    """Get 1-3 random novels for spotlight"""
    novels = db.execute("""
        SELECT n.title, n.slug, n.synopsis, n.type, n.status,
               COALESCE(NULLIF(n.title_jp, ''), NULLIF(n.title_en, ''), '') as alt_title,
               (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapters_count
        FROM novels n
        WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
        ORDER BY RANDOM() 
        LIMIT 1
    """).fetchone()
    return novels

# --- POST GENERATORS ---
def make_spotlight(novel):
    title = novel['title']
    chapters = novel['chapters_count'] or 0
    description = (novel['synopsis'] or '')[:200]
    if len(description) >= 200:
        description += '...'
    if not description:
        description = f"Uma aventura incrível com {chapters} capítulos disponíveis!"
    
    url = f"{SITE_URL}/novels/{novel['slug']}"
    template = random.choice(SPOTLIGHT_TEMPLATES)
    return template.format(title=title, description=description, chapters=chapters, url=url)

def make_featured():
    db = get_db()
    featured = get_featured_novels(db, limit=3)
    if not featured:
        return None
    lines = [f"📖 *{f['title']}* — {f['chapters_count']} capítulos" for f in featured]
    db.close()
    template = random.choice(FEATURED_TEMPLATES)
    return template.format(list="\n".join(lines), url=SITE_URL)

def make_site_reminder():
    db = get_db()
    count = get_novel_count(db)
    picks = db.execute("""
        SELECT title FROM novels 
        WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
        ORDER BY RANDOM() LIMIT 3
    """).fetchall()
    
    # Also get most chapters novel
    top = db.execute("""
        SELECT n.title FROM novels n
        ORDER BY (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) DESC 
        LIMIT 1
    """).fetchone()
    db.close()
    
    picks_list = [p['title'] for p in picks]
    template = random.choice(SITE_REMINDERS)
    return template.format(
        count=count,
        pick1=picks_list[0] if len(picks_list) > 0 else top['title'],
        pick2=picks_list[1] if len(picks_list) > 1 else 'E muito mais!',
        pick3=picks_list[2] if len(picks_list) > 2 else 'Venha conferir!',
        url=SITE_URL
    )

def make_engagement():
    template = random.choice(ENGAGEMENT_POSTS)
    return template.format(url=SITE_URL)

# --- MAIN ---
def main():
    post_type = os.environ.get('POST_TYPE', 'random')
    
    if post_type == 'spotlight':
        db = get_db()
        novel = get_random_destaque(db)
        db.close()
        if novel:
            print(make_spotlight(novel))
        else:
            print(make_site_reminder())
    
    elif post_type == 'featured':
        msg = make_featured()
        if msg:
            print(msg)
        else:
            print(make_site_reminder())
    
    elif post_type == 'engagement':
        print(make_engagement())
    
    else:  # random
        r = random.random()
        if r < 0.35:  # 35% spotlight
            db = get_db()
            novel = get_random_destaque(db)
            db.close()
            if novel:
                print(make_spotlight(novel))
            else:
                print(make_site_reminder())
        elif r < 0.55:  # 20% featured
            msg = make_featured()
            if msg:
                print(msg)
            else:
                print(make_site_reminder())
        elif r < 0.75:  # 20% engagement
            print(make_engagement())
        else:  # 25% site reminder
            print(make_site_reminder())

if __name__ == '__main__':
    main()
