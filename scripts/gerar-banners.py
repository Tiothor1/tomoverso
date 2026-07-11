#!/usr/bin/env python3
"""Gera dezenas de banners promocionais variados para a Tomo Verso Editora."""

import os, uuid, textwrap

OUT = "public/promocional"
os.makedirs(OUT, exist_ok=True)

# ─── templates de layout ────────────────────────────────────────
# Cada template: nome, width, height, função que gera o SVG

PALETTES = [
    # (bg_start, bg_mid, bg_end, accent, accent2)
    ("#0f0c29","#1a1a3e","#24243e","#f59e0b","#d97706"),  # dark gold
    ("#0a0a0f","#1c1c2e","#2d1b69","#a855f7","#7c3aed"),  # purple
    ("#0f172a","#1e293b","#020617","#38bdf8","#0284c7"),  # blue
    ("#0c0a09","#1c1917","#292524","#f97316","#ea580c"),  # orange
    ("#0f0f0f","#1a1a1a","#262626","#22c55e","#16a34a"),  # green
    ("#1a0f0e","#2d1815","#3d1f1a","#ef4444","#dc2626"),  # red
    ("#0f0c29","#1a1a3e","#3b0764","#ec4899","#db2777"),  # pink
    ("#0a0a0f","#111827","#0f172a","#facc15","#eab308"),  # yellow
    ("#020617","#0f172a","#1e293b","#14b8a6","#0d9488"),  # teal
    ("#0f0f0f","#1a1a2e","#16213e","#e94560","#c73550"),  # coral dark
]

FOCUS = [
    # (big_text, sub_text, detail_lines, cta)
    ("172+ MANGÁS", "Grátis para ler agora", ["Ação, romance, fantasia, terror", "Atualizado toda semana", "Leitura otimizada para celular"], "EXPLORAR CATÁLOGO"),
    ("52+ NOVELS", "Histórias brasileiras", ["Romance, fantasia, comédia", "Autores independentes", "Novos capítulos toda semana"], "COMEÇAR A LER"),
    ("20 MIL", "CAPÍTULOS DISPONÍVEIS", ["Mangás, manhwas e novels", "Em português", "Leitura sem limites"], "LER GRÁTIS"),
    ("LEIA GRÁTIS", "Sem cadastro, sem enrolação", ["Milhares de obras", "Interface moderna", "Suporte a temas escuro/claro"], "COMEÇAR AGORA"),
    ("MANGÁ ONLINE", "No seu celular", ["Carregamento rápido", "Modo leitor confortável", "Salve seus favoritos"], "LER AGORA"),
    ("PUBLIQUE SUA", "HISTÓRIA AQUI", ["Alcance milhares de leitores", "Monetize seu trabalho", "Faça parte da comunidade"], "CRIAR CONTA"),
    ("TOMOVERSO", "A maior editora digital BR", ["172+ mangás", "52+ novels", "20.500+ capítulos"], "EXPLORAR"),
    ("VOCÊ É", "FÃ DE MANGÁ?", ["Temos o maior acervo grátis", "Leia no celular ou PC", "Recomendações personalizadas"], "DESCUBRA"),
    ("ACABOU A", "ENROLAÇÃO", ["Mangá grátis de verdade", "Sem propaganda abusiva", "Sua história começa aqui"], "LER AGORA"),
    ("NOVOS", "CAPÍTULOS TODO DIA", ["Acompanhe suas obras favoritas", "Notificações de lançamento", "Lista de leitura personalizada"], "VER MAIS"),
]

def make_svg_vertical(i, palette, focus):
    bg_s, bg_m, bg_e, ac1, ac2 = palette
    big, sub, details, cta = focus
    cid = str(uuid.uuid4())[:8]

    details_svg = ""
    for line in details:
        details_svg += f'      <tspan x="540" dy="42" font-family="Arial,sans-serif" font-size="18" fill="#a1a1aa">{line}</tspan>\n'

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg{i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg_s}"/>
      <stop offset="50%" stop-color="{bg_m}"/>
      <stop offset="100%" stop-color="{bg_e}"/>
    </linearGradient>
    <linearGradient id="ac{i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{ac1}"/>
      <stop offset="100%" stop-color="{ac2}"/>
    </linearGradient>
    <filter id="g{i}">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="{ac1}" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg{i})"/>
  <ellipse cx="540" cy="0" rx="700" ry="500" fill="{ac1}" opacity="0.06"/>
  <circle cx="200" cy="1600" r="280" fill="none" stroke="{ac1}" stroke-opacity="0.04" stroke-width="1"/>
  <circle cx="880" cy="400" r="180" fill="none" stroke="{ac1}" stroke-opacity="0.03" stroke-width="1"/>

  <line x1="200" y1="100" x2="880" y2="100" stroke="url(#ac{i})" stroke-width="2" stroke-opacity="0.25"/>

  <g transform="translate(540, 260)" text-anchor="middle">
    <rect x="-60" y="-60" width="120" height="120" rx="24" fill="url(#ac{i})" opacity="0.15"/>
    <text x="0" y="15" font-family="Georgia,serif" font-size="56" font-weight="bold" fill="url(#ac{i})">T</text>
  </g>
  <text x="540" y="400" font-family="Georgia,serif" font-size="38" font-weight="bold" fill="#e4e4e7" text-anchor="middle" letter-spacing="4">TOMO VERSO</text>
  <text x="540" y="438" font-family="Arial,sans-serif" font-size="16" fill="#71717a" text-anchor="middle" letter-spacing="7">EDITORA</text>

  <g transform="translate(540, 700)" text-anchor="middle" filter="url(#g{i})">
    <text font-family="Arial,sans-serif" font-size="82" font-weight="bold" fill="url(#ac{i})">{big}</text>
    <text y="90" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#e4e4e7" letter-spacing="3">{sub}</text>
  </g>

  <g transform="translate(540, 950)" text-anchor="middle">
    <text font-family="Arial,sans-serif" font-size="18" fill="#a1a1aa">
{details_svg}    </text>
  </g>

  <rect x="240" y="1200" width="600" height="80" rx="40" fill="url(#ac{i})" filter="url(#g{i})"/>
  <text x="540" y="1250" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#0f0c29" text-anchor="middle" letter-spacing="2">{cta}</text>

  <rect x="290" y="1400" width="500" height="56" rx="28" fill="#18181b" stroke="{ac1}" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="540" y="1435" font-family="monospace,Arial" font-size="24" font-weight="bold" fill="{ac1}" text-anchor="middle">tomoverso.studio</text>

  <line x1="200" y1="1820" x2="880" y2="1820" stroke="url(#ac{i})" stroke-width="2" stroke-opacity="0.25"/>
</svg>'''


def make_svg_square(i, palette, focus):
    bg_s, bg_m, bg_e, ac1, ac2 = palette
    big, sub, details, cta = focus
    cid = str(uuid.uuid4())[:8]

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bs{i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg_s}"/>
      <stop offset="50%" stop-color="{bg_m}"/>
      <stop offset="100%" stop-color="{bg_e}"/>
    </linearGradient>
    <linearGradient id="as{i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{ac1}"/>
      <stop offset="100%" stop-color="{ac2}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bs{i})"/>
  <ellipse cx="540" cy="0" rx="500" ry="300" fill="{ac1}" opacity="0.06"/>

  <g transform="translate(540, 180)" text-anchor="middle">
    <rect x="-45" y="-45" width="90" height="90" rx="18" fill="url(#as{i})" opacity="0.15"/>
    <text x="0" y="12" font-family="Georgia,serif" font-size="44" font-weight="bold" fill="url(#as{i})">T</text>
  </g>
  <text x="540" y="295" font-family="Georgia,serif" font-size="32" font-weight="bold" fill="#e4e4e7" text-anchor="middle" letter-spacing="3">TOMO VERSO</text>
  <text x="540" y="325" font-family="Arial,sans-serif" font-size="14" fill="#71717a" text-anchor="middle" letter-spacing="5">EDITORA</text>

  <g transform="translate(540, 480)" text-anchor="middle">
    <text font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="url(#as{i})">{big}</text>
    <text y="60" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#e4e4e7" letter-spacing="2">{sub}</text>
  </g>

  <rect x="290" y="680" width="500" height="70" rx="35" fill="url(#as{i})"/>
  <text x="540" y="726" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#0f0c29" text-anchor="middle">{cta}</text>

  <text x="540" y="880" font-family="monospace,Arial" font-size="20" font-weight="bold" fill="{ac1}" text-anchor="middle">tomoverso.studio</text>
</svg>'''


def make_svg_story_text(i, palette):
    """Banner só com texto grande em destaque, estilo TikTok"""
    bg_s, bg_m, bg_e, ac1, ac2 = palette
    phrases = [
        ("LEITURA", "GRÁTIS"),
        ("MANGÁ", "DE GRAÇA"),
        ("20 MIL", "CAPÍTULOS"),
        ("SEM", "ENROLAÇÃO"),
        ("SÓ VEM", "LER"),
        ("VOCÊ", "LEITOR"),
        ("MANGÁ", "ONLINE"),
        ("HISTÓRIAS", "BRASILEIRAS"),
        ("MILHARES", "DE OBRAS"),
        ("TUDO", "GRÁTIS"),
    ]
    p = phrases[i % len(phrases)]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bt{i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg_s}"/>
      <stop offset="100%" stop-color="{bg_e}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bt{i})"/>
  <circle cx="540" cy="960" r="600" fill="{ac1}" opacity="0.03"/>

  <text x="540" y="700" font-family="Arial,sans-serif" font-size="100" font-weight="bold" fill="{ac1}" text-anchor="middle" letter-spacing="8">{p[0]}</text>
  <text x="540" y="820" font-family="Arial,sans-serif" font-size="100" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="8">{p[1]}</text>

  <text x="540" y="1100" font-family="Arial,sans-serif" font-size="22" fill="#a1a1aa" text-anchor="middle">
    <tspan x="540" dy="0">tomoverso.studio</tspan>
  </text>

  <line x1="390" y1="1200" x2="690" y2="1200" stroke="{ac1}" stroke-width="3" stroke-opacity="0.5"/>
</svg>'''


# ─── Gerar ───────────────────────────────────────────────────────
count = 0
for i in range(30):
    pal = PALETTES[i % len(PALETTES)]
    foc = FOCUS[i % len(FOCUS)]

    # Vertical
    svg = make_svg_vertical(count, pal, foc)
    path = os.path.join(OUT, f"banner-v{count:02d}.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    count += 1

    # Square
    svg = make_svg_square(count, pal, foc)
    path = os.path.join(OUT, f"banner-q{count:02d}.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    count += 1

    # Story text
    svg = make_svg_story_text(count, pal)
    path = os.path.join(OUT, f"banner-t{count:02d}.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    count += 1

print(f"✅ {count} banners gerados em public/promocional/")
