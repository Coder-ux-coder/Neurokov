"""Contact sheets of a film's half-second stills (filmcheck.mjs saves them), 20 to a sheet: sheet.py <dir> <out-prefix> [per] [cols] [thumb width]"""
import glob, sys
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 20
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 480
fs = sorted(glob.glob(d + '/s-*.jpg'))
th = tw * 9 // 16
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 17)
for k in range(0, len(fs), per):
    chunk = fs[k:k + per]
    rows = (len(chunk) + cols - 1) // cols
    s = Image.new('RGB', (cols * (tw + 4) - 4, rows * (th + 4) - 4), (255, 255, 255))
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * (tw + 4), (i // cols) * (th + 4)
        s.paste(im, (x, y))
        t = f.split('s-')[-1][:-4]
        dr = ImageDraw.Draw(s)
        dr.rectangle([x, y, x + 62, y + 22], fill=(0, 90, 255))
        dr.text((x + 4, y + 2), t + 's', font=font, fill=(255, 255, 255))
    name = f'{out}-{k // per + 1}.png'
    s.save(name)
    print(name, s.size)
