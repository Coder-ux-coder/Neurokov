"""
Living photos: every plate again, with its screens playing their motion (the frames
design/screens/capture.mjs saves), composited frame by frame through the same steps
as the stills (composite.py) and encoded as a seamless loop.

The loop's first frame is the still. Over its last PRE seconds it fades into the frames
captured before t = 0, so it closes on its first frame without a jump.

usage: python video.py [plate ...] [--install]
       writes design/composite/out/<plate>.mp4; --install also copies it into src/assets/video/
"""
import shutil
import subprocess
import sys

import cv2
import numpy as np

from composite import (INCOMING, NO_LENS, OUT, PLATES, REF_W, ROOT, Lens, add_grain, draw, grade, grain_fields,
                       lin_to_srgb, prepare, srgb_to_lin)

FRAMES = ROOT / 'design/screens/frames'
SITE = ROOT / 'src/assets/video'
FPS, LOOP, PRE = 24, 8, 0.75  # as in capture.mjs
WORK_W = 2880
VIDEO_W = 1920
TO_LIN = srgb_to_lin(np.arange(256, dtype=np.float32) / 255)
TO_SRGB = lin_to_srgb(np.arange(65536, dtype=np.float32) / 65535)


def to_srgb(lin):
    """lin_to_srgb through a 16-bit table: much faster, and well under a level off."""
    return TO_SRGB[(np.clip(lin, 0, 1) * 65535 + 0.5).astype(np.uint16)]


def frame(name, i):
    img = cv2.imread(str(FRAMES / name / f'f{i:04d}.jpg'), cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f'missing {FRAMES / name / f"f{i:04d}.jpg"}: run node design/screens/capture.mjs {name}')
    return TO_LIN[img[..., ::-1]]


def run(name, cfg, install):
    print(name)
    src = cv2.imread(str(INCOMING / f'{name}.jpg'), cv2.IMREAD_COLOR)[..., ::-1].copy()
    full_h, full_w = src.shape[:2]
    cx0, cy0, cx1, cy1 = cfg.get('crop', [0, 0, full_w, full_h])
    src = src[cy0:cy1, cx0:cx1].copy()
    h, w = src.shape[:2]
    ww = min(w, WORK_W)
    q, u = ww / w, ww / REF_W
    lens = NO_LENS
    if 'lens' in cfg:  # distortion is centred on the uncropped photo
        lens = Lens(cfg['lens']['k'], ((full_w / 2 - cx0) * q, (full_h / 2 - cy0) * q), full_w / 2 * q)
    big = cv2.resize(src, (ww, round(h * q)), interpolation=cv2.INTER_AREA)
    original = srgb_to_lin(np.clip(big.astype(np.float32) / 255, 0, 1))

    pre = round(PRE * FPS)
    count = LOOP * FPS
    names = [sc['ui'] for sc in cfg['screens']]

    # what doesn't change: each screen's placement, prepared on its first frame (t = 0) and
    # in order, so a screen's black level sees the ones in front of it, as in the stills
    plate = original.copy()
    preps = []
    for sc in cfg['screens']:
        ui = frame(sc['ui'], pre)
        preps.append(prepare(plate, original, sc, q, u, lens, ui))
        draw(plate, original, preps[-1], ui, fast=True)

    # only the screens and their glow change: the rest of the picture is graded and
    # grained once, and each frame redoes just these boxes (x0, y0, x1, y1)
    boxes = [p['glow'] for p in preps] + [(x0, y0, x1, y1) for p in preps for (y0, y1, x0, x1), _ in p['mattes']]
    look = cfg.get('grade', {})
    vh = round(VIDEO_W * h / w) // 2 * 2
    r = VIDEO_W / ww
    oboxes = [(max(int(x0 * r) - 2, 0), max(int(y0 * r) - 2, 0), min(int(np.ceil(x1 * r)) + 2, VIDEO_W), min(int(np.ceil(y1 * r)) + 2, vh))
              for x0, y0, x1, y1 in boxes]
    fields = grain_fields(vh, VIDEO_W, np.random.default_rng(7))
    s = grade(original, **look, to_srgb=to_srgb)
    still = add_grain(cv2.resize(s, (VIDEO_W, vh), interpolation=cv2.INTER_AREA), fields)
    plate = original.copy()

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{name}.mp4'
    enc = subprocess.Popen(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{VIDEO_W}x{vh}',
         '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p',
         '-profile:v', 'high', '-movflags', '+faststart', '-an', str(path)],
        stdin=subprocess.PIPE)
    out = still.copy()
    for j in range(count):
        t = j / FPS
        fade = min(max((t - (LOOP - PRE)) / PRE, 0), 1)
        for x0, y0, x1, y1 in boxes:
            plate[y0:y1, x0:x1] = original[y0:y1, x0:x1]
        for n, prep in zip(names, preps):
            ui = frame(n, pre + j)
            if fade > 0:  # into the frames before t = 0, so the loop closes on the still
                ui = ui * (1 - fade) + frame(n, pre + j - count) * fade
            draw(plate, original, prep, ui, fast=True)
        for x0, y0, x1, y1 in boxes:
            s[y0:y1, x0:x1] = grade(plate[y0:y1, x0:x1], **look, to_srgb=to_srgb)
        small = cv2.resize(s, (VIDEO_W, vh), interpolation=cv2.INTER_AREA)
        for x0, y0, x1, y1 in oboxes:
            out[y0:y1, x0:x1] = add_grain(small[y0:y1, x0:x1], (fields[0][y0:y1, x0:x1], fields[1][y0:y1, x0:x1]))
        enc.stdin.write((out * 255 + 0.5).astype(np.uint8).tobytes())
        if j % 48 == 47:
            print(f'  {j + 1}/{count}')
    enc.stdin.close()
    if enc.wait():
        sys.exit('ffmpeg failed')
    print(f'  -> {path.relative_to(ROOT)}  {VIDEO_W}x{vh}  {path.stat().st_size // 1024} KB')
    if install:
        SITE.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, SITE / path.name)
        print(f'  -> {(SITE / path.name).relative_to(ROOT)}')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for name, cfg in PLATES.items():
        if not args or name in args:
            run(name, cfg, '--install' in sys.argv)


if __name__ == '__main__':
    main()
