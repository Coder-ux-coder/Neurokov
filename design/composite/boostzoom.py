"""Zoom boxes with the shadows lifted: python boostzoom.py img out.jpg gain x0,y0,x1,y1 [...] (each box 4x, grid 5/10px)"""
import sys
import numpy as np
from PIL import Image, ImageDraw
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
out, gain = sys.argv[2], float(sys.argv[3])
tiles = []
for b in sys.argv[4:]:
    x0, y0, x1, y1 = map(int, b.split(','))
    S = 4
    c = im[y0:y1, x0:x1] / 255
    c = np.clip(1 - np.exp(-c * gain), 0, 1) / (1 - np.exp(-gain))  # lift shadows
    t = Image.fromarray((c * 255).astype(np.uint8)).resize(((x1 - x0) * S, (y1 - y0) * S), Image.NEAREST)
    d = ImageDraw.Draw(t)
    for g in range(x0 - x0 % 5, x1, 5):
        v = (g - x0) * S
        d.line([(v, 0), (v, t.height)], fill=(255, 60, 60) if g % 10 == 0 else (120, 110, 0), width=1)
        if g % 20 == 0: d.text((v + 2, 2), str(g), fill=(255, 120, 120))
    for g in range(y0 - y0 % 5, y1, 5):
        v = (g - y0) * S
        d.line([(0, v), (t.width, v)], fill=(255, 60, 60) if g % 10 == 0 else (0, 110, 120), width=1)
        if g % 20 == 0: d.text((2, v + 2), str(g), fill=(120, 200, 255))
    tiles.append(t)
W = sum(t.width for t in tiles) + 8 * (len(tiles) - 1)
H = max(t.height for t in tiles)
m = Image.new('RGB', (W, H), (60, 20, 60))
x = 0
for t in tiles:
    m.paste(t, (x, 0)); x += t.width + 8
m.save(out, quality=92)
