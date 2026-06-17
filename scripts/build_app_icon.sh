#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

SRC_PNG="assets/aad-icon-large.png"
OUT_MACOS_PNG="assets/aad-icon-macos-1024.png"
OUT_ICNS="assets/aad-icon.icns"

if [ ! -f "$SRC_PNG" ]; then
  echo "Fehlt: $SRC_PNG"
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

src = Path("assets/aad-icon-large.png")
out_png = Path("assets/aad-icon-macos-1024.png")
out = Path("assets/aad-icon.icns")

raw = Image.open(src).convert("RGBA")

# Remove the flat background color from the source logo.
bg_sample = raw.getpixel((0, 0))
bg = Image.new("RGBA", raw.size, bg_sample)
diff = ImageChops.difference(raw, bg).convert("L")
mask = diff.point(lambda p: 255 if p > 10 else 0)
logo = raw.copy()
logo.putalpha(mask)
bbox = logo.getbbox()
if bbox:
    logo = logo.crop(bbox)

# Build macOS-like rounded tile.
size = 1024
canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

# Shadow
shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
tile_margin = 44
radius = 220
sd.rounded_rectangle(
    [tile_margin, tile_margin + 12, size - tile_margin, size - tile_margin + 12],
    radius=radius,
    fill=(0, 0, 0, 90),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
canvas.alpha_composite(shadow)

# Main tile with subtle vertical gradient.
tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
td = ImageDraw.Draw(tile)
top = (250, 252, 255, 255)
bottom = (236, 240, 246, 255)
for y in range(size):
    t = y / (size - 1)
    c = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
    td.line([(0, y), (size, y)], fill=c, width=1)
tile_mask = Image.new("L", (size, size), 0)
md = ImageDraw.Draw(tile_mask)
md.rounded_rectangle([tile_margin, tile_margin, size - tile_margin, size - tile_margin], radius=radius, fill=255)
tile.putalpha(tile_mask)
canvas.alpha_composite(tile)

# Logo placement.
content_box = size - (tile_margin + 120) * 2
logo_ratio = min(content_box / logo.width, content_box / logo.height)
logo_size = (int(logo.width * logo_ratio), int(logo.height * logo_ratio))
logo_resized = logo.resize(logo_size, Image.Resampling.LANCZOS)
pos = ((size - logo_size[0]) // 2, (size - logo_size[1]) // 2 + 6)
canvas.alpha_composite(logo_resized, dest=pos)

# Gentle top highlight for macOS feel.
highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
hd = ImageDraw.Draw(highlight)
hd.rounded_rectangle(
    [tile_margin + 10, tile_margin + 10, size - tile_margin - 10, size // 2],
    radius=radius - 20,
    fill=(255, 255, 255, 36),
)
highlight = highlight.filter(ImageFilter.GaussianBlur(10))
canvas.alpha_composite(highlight)

# Keep design unchanged, but reduce perceived Dock size by adding a transparent safe-area inset.
final_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
icon_inset = 88
scaled_size = size - icon_inset * 2
scaled = canvas.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
final_canvas.alpha_composite(scaled, dest=(icon_inset, icon_inset))

final_canvas.save(out_png, format="PNG")

img = final_canvas.convert("RGBA")
sizes = [(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)]
img.save(out, format="ICNS", sizes=sizes)
print(f"macOS PNG erzeugt: {out_png}")
print(f"Icon erzeugt: {out}")
PY

echo "macOS Icon PNG: $OUT_MACOS_PNG"
echo "Icon erzeugt: $OUT_ICNS"
