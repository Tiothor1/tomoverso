#!/usr/bin/env python3
"""Converte todos os SVGs da pasta promocional para PNG."""
import os, subprocess, sys

src = "/c/Users/Fábio Teixeira/Desktop/tomoverso-banners"
out = src  # same folder

svgs = sorted([f for f in os.listdir(src) if f.endswith('.svg')])
total = len(svgs)

print(f"Convertendo {total} SVGs para PNG...")

for i, svg in enumerate(svgs, 1):
    path_svg = os.path.join(src, svg)
    path_png = os.path.join(out, svg.replace('.svg', '.png'))
    if os.path.exists(path_png):
        continue

    try:
        subprocess.run(
            ["python", "-c", f"import cairosvg; cairosvg.svg2png(url=r'{path_svg}', write_to=r'{path_png}', output_width=1080, output_height=1920)"],
            check=True, capture_output=True, timeout=30
        )
    except:
        # fallback: try with auto-detected dimensions
        try:
            import cairosvg
            cairosvg.svg2png(url=path_svg, write_to=path_png)
        except Exception as e:
            print(f"  ERRO [{svg}]: {e}")

    if i % 10 == 0:
        print(f"  ... {i}/{total}")

# Count result
pngs = [f for f in os.listdir(out) if f.endswith('.png')]
print(f"\n✅ {len(pngs)} PNGs gerados em {out}")
