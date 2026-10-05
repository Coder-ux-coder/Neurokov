"""
Render the product screens to PNG with headless Chrome.

Each screen is an HTML file here with <meta name="size" content="WxH@dpr">.
Icons are written as <i data-i="lucide-name"></i> or <i data-si="simple-icons-slug"></i>;
this script gathers the ones in use into icons.js so the pages work from file://.

usage: python render.py [name ...]      (default: every screen)
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
LUCIDE = ROOT / 'node_modules/lucide-static/icons'
SIMPLE = ROOT / 'node_modules/simple-icons/icons'
OUT = HERE / 'out'
# Set CHROME to use another browser binary (on Linux or a Mac, say).
CHROME = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')


def lucide(name):
    svg = (LUCIDE / f'{name}.svg').read_text(encoding='utf8')
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'\s*class="[^"]*"', '', svg)
    return re.sub(r'\s+', ' ', svg).replace('> <', '><').strip()


def simple(name):
    svg = (SIMPLE / f'{name}.svg').read_text(encoding='utf8')
    svg = re.sub(r'<title>.*?</title>', '', svg).replace(' role="img"', '')
    return svg.replace('<svg ', '<svg fill="currentColor" ', 1).strip()


def build_icons(pages):
    icons = {'lucide': {}, 'si': {}}
    for page in pages:
        html = page.read_text(encoding='utf8')
        for name in re.findall(r'data-i="([a-z0-9-]+)"', html):
            icons['lucide'][name] = lucide(name)
        for name in re.findall(r'data-si="([a-z0-9-]+)"', html):
            icons['si'][name] = simple(name)
    (HERE / 'icons.js').write_text('window.ICONS = ' + json.dumps(icons) + ';\n', encoding='utf8')


def render(page, profile):
    html = page.read_text(encoding='utf8')
    w, h, dpr = re.search(r'<meta name="size" content="(\d+)x(\d+)@([\d.]+)"', html).groups()
    OUT.mkdir(exist_ok=True)
    png = OUT / f'{page.stem}.png'
    subprocess.run(
        [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
         '--font-render-hinting=none', f'--user-data-dir={profile}', f'--force-device-scale-factor={dpr}',
         f'--window-size={w},{h}', '--virtual-time-budget=5000', f'--screenshot={png}',
         # Chrome refuses to run as root (in a container, say) with its sandbox on.
         *(['--no-sandbox'] if hasattr(os, 'geteuid') and os.geteuid() == 0 else []), page.as_uri()],
        check=True, capture_output=True)
    size = Image.open(png).size
    want = (round(int(w) * float(dpr)), round(int(h) * float(dpr)))
    print(f'{png.name}: {size[0]}x{size[1]}' + ('' if size == want else f'  (expected {want[0]}x{want[1]})'))


def main():
    pages = sorted(HERE.glob('*.html'))
    build_icons(pages)
    wanted = set(sys.argv[1:])
    with tempfile.TemporaryDirectory() as profile:
        for page in pages:
            if not wanted or page.stem in wanted:
                render(page, profile)


if __name__ == '__main__':
    main()
