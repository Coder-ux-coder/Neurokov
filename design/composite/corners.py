"""Zoom into four approximate corners (80px boxes at 4x, grid every 5px, labels every 10px) in one 2x2 mosaic."""
import sys, json
from PIL import Image, ImageDraw

src, pts, out = sys.argv[1], json.loads(sys.argv[2]), sys.argv[3]
R, S = 40, 4  # half-box, scale
im = Image.open(src).convert('RGB')
tiles = []
for (cx, cy) in pts:
    x0, y0 = cx - R, cy - R
    t = im.crop((x0, y0, x0 + 2 * R, y0 + 2 * R)).resize((2 * R * S, 2 * R * S), Image.NEAREST)
    d = ImageDraw.Draw(t)
    for v in range(0, 2 * R + 1, 5):
        g = x0 + v
        c = (255, 60, 60) if g % 10 == 0 else (255, 230, 0)
        d.line([(v * S, 0), (v * S, t.height)], fill=c, width=1)
        if g % 10 == 0: d.text((v * S + 2, 2), str(g), fill=(255, 90, 90))
        g2 = y0 + v
        c2 = (255, 60, 60) if g2 % 10 == 0 else (0, 230, 255)
        d.line([(0, v * S), (t.width, v * S)], fill=c2, width=1)
        if g2 % 10 == 0: d.text((2, v * S + 2), str(g2), fill=(90, 200, 255))
    tiles.append(t)
W = tiles[0].width
m = Image.new('RGB', (W * 2 + 8, W * 2 + 8), (40, 40, 40))
for i, t in enumerate(tiles):
    m.paste(t, ((i % 2) * (W + 8), (i // 2) * (W + 8)))
m.save(out, quality=92)
