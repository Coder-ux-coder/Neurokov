"""
Render the brand images into public/: og.png (1200x630 share card),
apple-touch-icon.png (180x180) and favicon.ico (16/32/48).

usage: python render.py
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent.parent / 'public'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


def shot(page, out, w, h, dpr=1, fragment='', transparent=False):
    with tempfile.TemporaryDirectory() as profile:
        args = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                f'--user-data-dir={profile}', f'--force-device-scale-factor={dpr}', f'--window-size={w},{h}',
                '--virtual-time-budget=4000', f'--screenshot={out}']
        if transparent:
            args.append('--default-background-color=00000000')
        subprocess.run(args + [(HERE / page).as_uri() + fragment], check=True, capture_output=True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        shot('og.html', tmp / 'og.png', 1200, 630, dpr=2)
        Image.open(tmp / 'og.png').convert('RGB').resize((1200, 630), Image.LANCZOS).save(PUBLIC / 'og.png', optimize=True)

        shot('icon.html', tmp / 'full.png', 512, 512, fragment='#full')
        Image.open(tmp / 'full.png').convert('RGB').resize((180, 180), Image.LANCZOS).save(PUBLIC / 'apple-touch-icon.png')

        shot('icon.html', tmp / 'round.png', 512, 512, transparent=True)
        icon = Image.open(tmp / 'round.png').convert('RGBA')
        icon.save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

    for name in ('og.png', 'apple-touch-icon.png', 'favicon.ico'):
        path = PUBLIC / name
        print(f'{name}: {Image.open(path).size} {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
