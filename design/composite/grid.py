"""Crop a region of a plate, enlarge it and draw a labelled pixel grid, for locating screen corners."""
import sys
from PIL import Image, ImageDraw

src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
step = int(sys.argv[7]) if len(sys.argv) > 7 else 20
scale = float(sys.argv[8]) if len(sys.argv) > 8 else 2.0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for gx in range((x0 // step + 1) * step, x1, step):
    X = (gx - x0) * scale
    major = gx % (step * 5) == 0
    d.line([(X, 0), (X, im.height)], fill=(255, 60, 60) if major else (255, 255, 0), width=1)
    if major:
        d.text((X + 2, 2), str(gx), fill=(255, 80, 80))
for gy in range((y0 // step + 1) * step, y1, step):
    Y = (gy - y0) * scale
    major = gy % (step * 5) == 0
    d.line([(0, Y), (im.width, Y)], fill=(255, 60, 60) if major else (0, 255, 255), width=1)
    if major:
        d.text((2, Y + 2), str(gy), fill=(255, 80, 80))
im.save(out, quality=90)
print(im.size)
