"""
Put real product screens into the site's stock photos (Unsplash, see design/README.md).

For every screen in a plate:
  1. build the device's glass panel: bezel plus the rendered UI (design/screens/out),
  2. work out the screen's "black level", the light it shows with nothing on it:
       'off' screens (black in the photo) keep their own glass, reflections and all,
       'on' screens (lit in the photo) get a flat black read off their bezel (bl.box),
       otherwise it's a low percentile per block of the old screen (reflections, falloff),
  3. add the UI's light on top, scaled to the old screen's brightest content (or 'peak'),
  4. warp it onto the screen quad (supersampled, following the lens's barrel distortion),
     soften it to the photo's focus, add a little bloom, and blend it in; things in front
     of the screen ('front' outlines, 'keep' mattes for leaves) are put back from the photo.
Then grade, add grain and save to src/assets/images.

Quads, boxes and outlines are in pixels of the cropped source photo (incoming/stock/<name>.jpg).
Quad corners run TL, TR, BR, BL. A 'flat' device's quad is the lit display itself; the
others are the device's glass, and build_panel draws the bezel inside it.

usage: python composite.py [plate ...] [--debug] [--install]
       writes design/composite/out/<plate>.jpg; --install also copies it into the site
"""
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
UI = ROOT / 'design/screens/out'
INCOMING = ROOT / 'incoming/stock'
OUT = HERE / 'out'  # --install copies finished plates to src/assets/images
SITE = ROOT / 'src/assets/images'
REF_W = 1536  # the blur, bloom and inset sizes below are in pixels at this width
MAX_WORK_W = 3600
FINAL_W = 2400

# Bezels as a fraction of the display width; radii as a fraction of the panel width.
# notch: (width, height) as fractions of the display, bottom corners rounded.
DEVICES = {
    'flat': dict(side=0, top=0, bottom=0, glass_r=0, disp_r=0),
    'laptop': dict(side=0.0252, top=0.0273, bottom=0.0368, glass_r=0.012, disp_r=0.006),
    'macbook16': dict(side=0.0185, top=0.025, bottom=0.041, glass_r=0.018, disp_r=0.006),
    'iphone': dict(side=0.058, top=0.058, bottom=0.058, glass_r=0.15, disp_r=0.105, notch=(0.557, 0.037)),
}

PLATES = {
    'home-feature': dict(
        crop=[302, 0, 3320, 2012],
        screens=[
            dict(ui='home-monitor', device='flat', quad=[[737.5, 480.3], [2279.1, 480.3], [2280.2, 1501.4], [740.2, 1505.6]],
                 bl=dict(box=[798, 470, 2198, 477]), blur=1.2, bloom=0.1, haze=0.02),
        ],
    ),
}


def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4).astype(np.float32)


def lin_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055).astype(np.float32)


def read_lin(path):
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    return srgb_to_lin(img[..., ::-1].astype(np.float32) / 255)


def rounded_mask(w, h, r, ss=4):
    """Anti-aliased rounded-rectangle mask."""
    if r <= 0:
        return np.ones((h, w), np.float32)
    big = np.zeros((h * ss, w * ss), np.uint8)
    R = int(round(r * ss))
    cv2.rectangle(big, (R, 0), (w * ss - 1 - R, h * ss - 1), 255, -1)
    cv2.rectangle(big, (0, R), (w * ss - 1, h * ss - 1 - R), 255, -1)
    for cx, cy in ((R, R), (w * ss - 1 - R, R), (R, h * ss - 1 - R), (w * ss - 1 - R, h * ss - 1 - R)):
        cv2.circle(big, (cx, cy), R, 255, -1, cv2.LINE_AA)
    return cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


_panels = {}


def panel_shape(uw, uh, device, width, bezel=None):
    """A panel's layout for a uw x uh UI, `width` px wide: display size and offsets, the
    display's mask and the glass alpha. Cached: every frame of a video shares one."""
    key = (uw, uh, device, width, tuple(sorted((bezel or {}).items())))
    if key not in _panels:
        d = {**DEVICES[device], **(bezel or {})}
        scale = width / (uw * (1 + 2 * d['side']))
        dw, dh = round(uw * scale), round(uh * scale)
        sx, st, sb = round(d['side'] * dw), round(d['top'] * dw), round(d['bottom'] * dw)
        W, H = dw + 2 * sx, dh + st + sb
        dm = rounded_mask(dw, dh, d['disp_r'] * dw)
        if d.get('notch'):
            nw, nh = round(d['notch'][0] * dw), round(d['notch'][1] * dh)
            r = round(0.38 * nh)
            notch = rounded_mask(nw, nh + r, r)[r:]  # only the bottom corners are round
            x = (dw - nw) // 2
            dm[:nh, x : x + nw] *= 1 - notch
        _panels[key] = (dw, dh, sx, st, dm, rounded_mask(W, H, d['glass_r'] * W))
    return _panels[key]


def build_panel(ui_lin, device, width, bezel=None):
    """Scale the UI so the whole panel is `width` px wide; return emission and glass alpha."""
    uh, uw = ui_lin.shape[:2]
    dw, dh, sx, st, dm, alpha = panel_shape(uw, uh, device, width, bezel)
    ui = cv2.resize(ui_lin, (dw, dh), interpolation=cv2.INTER_AREA)
    bg = np.median(ui_lin[: uh // 8, -uw // 8 :].reshape(-1, 3), axis=0)  # app background colour
    emit = np.zeros(alpha.shape + (3,), np.float32)
    emit[st : st + dh, sx : sx + dw] = np.clip(ui - bg, 0, None) * dm[..., None]
    return emit, alpha


class Lens:
    """Radial (barrel) distortion about the full photo's centre, in working px.
    ideal = c + (p - c) * (1 + k r^2), r measured in half-widths of the full photo."""

    def __init__(self, k, c, R):
        self.k, self.c, self.R = k, np.float32(c), np.float32(R)

    def undistort(self, p):
        d = (p - self.c) / self.R
        return self.c + (p - self.c) * (1 + self.k * (d * d).sum(-1, keepdims=True))

    def distort(self, pu):
        p = pu.copy()
        for _ in range(10):
            d = (p - self.c) / self.R
            p = self.c + (pu - self.c) / (1 + self.k * (d * d).sum(-1, keepdims=True))
        return p


NO_LENS = Lens(0.0, (0, 0), 1)


def offset_quad(quad, e):
    """Move every side of a convex quad outward by e px (inward if negative)."""
    c = quad.mean(axis=0)
    sides = []
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]
        d = (b - a) / np.linalg.norm(b - a)
        n = np.array([-d[1], d[0]])
        if np.dot(n, (a + b) / 2 - c) < 0:
            n = -n
        sides.append((a + n * e, d))
    out = []
    for i in range(4):  # corner i joins side i-1 and side i
        (p1, d1), (p2, d2) = sides[i - 1], sides[i]
        t = np.linalg.solve(np.array([d1, -d2]).T, p2 - p1)[0]
        out.append(p1 + t * d1)
    return np.float32(out)


def apply_h(H, p):
    """Apply a homography to (..., 2) points."""
    q = p @ H[:2, :2].T + H[:2, 2]
    w = p @ H[2, :2] + H[2, 2]
    return (q / w[..., None]).astype(np.float32)


def black_level(plate_lin, panel_to_plate, W, H, mode=None, level=None, blocks=(14, 9), pct=12, sat=0.5):
    """The screen's light with nothing on it, in (low-res) panel space: returns (black, old screen).
    mode 'off': the photo's own dark glass. level: a flat black (screens that were switched on).
    Otherwise the old screen's darkest tone per block, smoothed: reflections + falloff."""
    ends = panel_to_plate(np.float32([[0, 0], [W, 0]]))
    quad_w = np.linalg.norm(ends[1] - ends[0])
    lw = int(min(max(280, quad_w / 1.5), 1400)) if mode == 'off' else 280
    lh = round(lw * H / W)
    # blur first so the unwarp does not alias
    sigma = max(0.5, quad_w / lw / 2)
    src = cv2.GaussianBlur(plate_lin, (0, 0), sigma)
    gy, gx = np.mgrid[0:lh, 0:lw].astype(np.float32)
    grid = np.stack([(gx + 0.5) * W / lw, (gy + 0.5) * H / lh], -1)
    m = panel_to_plate(grid.reshape(-1, 2)).reshape(lh, lw, 2)
    low = cv2.remap(src, m[..., 0], m[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    if mode == 'off':
        return low.copy(), low
    if level is not None:
        return np.broadcast_to(np.float32(level), (lh, lw, 3)).copy(), low
    bx, by = blocks
    grid = np.zeros((by, bx, 3), np.float32)
    ys = np.linspace(0, lh, by + 1).astype(int)
    xs = np.linspace(0, lw, bx + 1).astype(int)
    lum = low @ np.float32([0.2126, 0.7152, 0.0722])
    for j in range(by):
        for i in range(bx):
            cell = low[ys[j] : ys[j + 1], xs[i] : xs[i + 1]].reshape(-1, 3)
            cl = lum[ys[j] : ys[j + 1], xs[i] : xs[i + 1]].ravel()
            k = cl <= np.percentile(cl, pct)
            grid[j, i] = cell[k].mean(axis=0)
    g = cv2.resize(grid, (lw, lh), interpolation=cv2.INTER_CUBIC)
    g = cv2.GaussianBlur(g, (0, 0), lw / bx * 0.9)
    # reflections carry the room's colour, not the old UI's: pull the tint toward grey
    gl = (g @ np.float32([0.2126, 0.7152, 0.0722]))[..., None]
    g = gl + (g - gl) * sat
    return np.clip(g, 0, None), low


def sample(plate, box, q):
    """Mean linear colour of a box (source px)."""
    x0, y0, x1, y1 = (np.array(box) * q).astype(int)
    return plate[y0:y1, x0:x1].reshape(-1, 3).mean(axis=0)


def prepare(plate, original, sc, q, u, lens, ui, debug=False):
    """Everything about placing one screen that doesn't depend on what it shows: the warp
    from panel to photo, the glass, its black level and brightness, and the mattes.
    q: working px per source px. u: working px per REF_W px, for the tuned sizes.
    ui: one frame of the screen (linear RGB), for the panel's shape."""
    ph, pw = plate.shape[:2]
    quad = lens.undistort(np.float32(sc['quad']) * q)  # ideal (undistorted) working px
    bezel = sc.get('bezel')
    if sc['device'] == 'flat':
        # a thin border of bare glass just past the lit area covers the old picture's soft edge
        e = sc.get('edge', 1.2) * u
        f = e / np.linalg.norm(quad[1] - quad[0])
        bezel = dict(side=f, top=f, bottom=f)
        quad = offset_quad(quad, e)
    else:
        # pull the edge in a touch so the bezel never paints over the lid's metal rim
        quad = offset_quad(quad, -sc.get('inset', 0.6) * u)

    top_w = max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3]))
    ss = 2
    width = int(top_w * ss * 1.15)
    alpha = panel_shape(ui.shape[1], ui.shape[0], sc['device'], width, bezel)[-1]
    H, W = alpha.shape
    corners = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    Hp = cv2.getPerspectiveTransform(corners, quad.astype(np.float32))  # panel -> ideal plate
    Hinv = np.linalg.inv(Hp)
    to_plate = lambda p: lens.distort(apply_h(Hp, p))

    # black level of the old screen, in panel space
    bl = dict(sc.get('bl', {}))
    if 'box' in bl:  # flat black, read off the device's own bezel
        bl['level'] = sample(original, bl.pop('box'), q) * bl.pop('mul', 1.0)
    g_low, low = black_level(plate, to_plate, W, H, **bl)
    g = cv2.resize(g_low, (W, H), interpolation=cv2.INTER_CUBIC)

    # brightness: match the old screen's brightest content (max channel above black level)
    if 'peak' in sc:
        ref = sc['peak']
    else:
        ref = np.percentile(np.clip(low - g_low, 0, None).max(axis=2), 99.7)
    k = ref * sc.get('gain', 1.0)
    if debug:
        print(f"  {sc['ui']}: black level median {np.median(g_low, axis=(0, 1)).round(4)}, peak {ref:.3f}, k {k:.3f}")

    # the screen's footprint in the photo (edges bow with the lens), plus a margin
    edge = np.concatenate([np.linspace(corners[i], corners[(i + 1) % 4], 200) for i in range(4)])
    foot = to_plate(edge.astype(np.float32))
    x0, y0 = np.maximum(np.floor(foot.min(axis=0)).astype(int) - 4, 0)
    x1, y1 = np.minimum(np.ceil(foot.max(axis=0)).astype(int) + 4, [pw, ph])
    cw, ch = (x1 - x0) * ss, (y1 - y0) * ss

    # warp (supersampled): each canvas pixel -> undistort -> panel
    gy, gx = np.mgrid[0:ch, 0:cw].astype(np.float32)
    pts = np.stack([x0 + (gx + 0.5) / ss - 0.5, y0 + (gy + 0.5) / ss - 0.5], -1)
    m = apply_h(Hinv, lens.undistort(pts.reshape(-1, 2))).reshape(ch, cw, 2)
    mx, my = m[..., 0].copy(), m[..., 1].copy()
    del gx, gy, pts, m
    warp = lambda img: cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    down = lambda img: cv2.resize(img, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    # soften to the photo's focus
    blur = sc.get('blur', 1.0) * u / 2
    soften = (lambda img: cv2.GaussianBlur(img, (0, 0), blur)) if blur > 0 else (lambda img: img)

    # leaves over the screen: greener than the old screen, darker than its text, and soft
    # (out of focus), where text is sharp: low local contrast keeps text edges out of the matte
    mattes = []
    for kp in sc.get('keep', []):
        bx0, by0, bx1, by1 = (np.array(kp['box']) * q).astype(int)
        srgb = lin_to_srgb(original[by0:by1, bx0:bx1]) * 255
        lum = srgb @ np.float32([0.2126, 0.7152, 0.0722])
        disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        contrast = cv2.dilate(lum, disk) - cv2.erode(lum, disk)
        ramp = lambda v, lo, hi: np.clip((v - lo) / (hi - lo), 0, 1)
        mm = ramp(srgb[..., 1] - srgb[..., 2], 0, 6) * ramp(lum, 90, 60) * ramp(contrast, 70, 40)
        mm = cv2.morphologyEx(mm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        mattes.append(((by0, by1, bx0, bx1), ramp(cv2.GaussianBlur(mm, (0, 0), 1.5), 0.3, 0.8)[..., None]))

    # objects in front of the screen (a laptop lid, a cup): outlined, put back from the photo
    for poly in sc.get('front', []):
        mk = np.zeros(plate.shape[:2], np.uint8)
        cv2.fillPoly(mk, [np.round(np.float32(poly) * q * 8).astype(np.int32)], 255, cv2.LINE_AA, shift=3)
        mk = cv2.GaussianBlur(mk.astype(np.float32) / 255, (0, 0), sc.get('front_blur', 0.6) * u)
        rows, cols = np.nonzero(mk.any(axis=1))[0], np.nonzero(mk.any(axis=0))[0]
        fy0, fy1, fx0, fx1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
        mattes.append(((fy0, fy1, fx0, fx1), mk[fy0:fy1, fx0:fx1, None]))

    mg = int(3 * 22 * u)
    return dict(
        device=sc['device'], width=width, bezel=bezel, light=k * np.float32(sc.get('tint', (1, 1, 1))),
        box=(x0, y0, x1, y1), glow=(max(x0 - mg, 0), max(y0 - mg, 0), min(x1 + mg, pw), min(y1 + mg, ph)),
        warp=warp, down=down, soften=soften,
        a=down(warp(alpha))[..., None], dark=soften(down(warp(g))),
        u=u, bloom=sc.get('bloom', 0.22), haze=sc.get('haze', 0.08), mattes=mattes,
    )


def draw(plate, original, prep, ui, fast=False):
    """Composite one frame of a screen into the working plate (linear RGB, in place).
    fast: the wide haze is blurred at a quarter size (for video frames)."""
    emit, _ = build_panel(ui, prep['device'], prep['width'], prep['bezel'])
    lit = prep['down'](prep['warp'](emit * prep['light']))
    x0, y0, x1, y1 = prep['box']
    a = prep['a']
    roi = plate[y0:y1, x0:x1]
    roi[:] = roi * (1 - a) + (prep['dark'] + prep['soften'](lit)) * a

    # bloom from the bright UI, on a canvas wide enough for the haze to fade out
    X0, Y0, X1, Y1 = prep['glow']
    u = prep['u']
    big = np.zeros((Y1 - Y0, X1 - X0, 3), np.float32)
    big[y0 - Y0 : y1 - Y0, x0 - X0 : x1 - X0] = lit
    bloom = cv2.GaussianBlur(np.clip(big - 0.06, 0, None), (0, 0), 4 * u) * prep['bloom']
    if fast:
        small = cv2.resize(big, ((X1 - X0) // 4, (Y1 - Y0) // 4), interpolation=cv2.INTER_AREA)
        haze = cv2.resize(cv2.GaussianBlur(small, (0, 0), 22 * u / 4), (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_LINEAR)
    else:
        haze = cv2.GaussianBlur(big, (0, 0), 22 * u)
    plate[Y0:Y1, X0:X1] += bloom + haze * prep['haze']

    for (y0, y1, x0, x1), mm in prep['mattes']:  # leaves and lids go back on top
        plate[y0:y1, x0:x1] = plate[y0:y1, x0:x1] * (1 - mm) + original[y0:y1, x0:x1] * mm


def place(plate, original, sc, q, u, lens, debug):
    """Composite one screen, as rendered for the stills, into the working plate."""
    ui = read_lin(UI / f"{sc['ui']}.png")
    draw(plate, original, prepare(plate, original, sc, q, u, lens, ui, debug), ui)


def grade(lin, sat=0.92, warm=0.0, exposure=1.0, to_srgb=lin_to_srgb):
    """One look for every photo: a little less saturation, slightly lifted blacks, rolled whites.
    `warm` shifts the white balance (+ warmer, - cooler), `exposure` scales the light."""
    lin = lin * exposure * np.float32([1 + warm, 1, 1 - warm])
    s = to_srgb(lin)
    lum = s @ np.float32([0.2126, 0.7152, 0.0722])
    s = lum[..., None] + (s - lum[..., None]) * sat
    s = 0.012 + s * (1 - 0.012 - 0.01)
    return np.clip(s, 0, 1)


def grain_fields(h, w, rng):
    n = rng.normal(0, 1, (h, w)).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), 0.6)
    n /= n.std()
    c = rng.normal(0, 1, (h, w, 3)).astype(np.float32)
    return n, cv2.GaussianBlur(c, (0, 0), 1.2) * 0.0015


def add_grain(s, fields):
    n, c = fields
    lum = s @ np.float32([0.2126, 0.7152, 0.0722])
    amp = 0.004 + 0.006 * np.sqrt(np.clip(lum * (1 - lum) * 4, 0, 1))  # strongest in the midtones
    return np.clip(s + (n * amp)[..., None] + c, 0, 1)


def grain(s, rng):
    return add_grain(s, grain_fields(*s.shape[:2], rng))


def run(name, cfg, debug, install):
    print(name)
    src = cv2.imread(str(INCOMING / f'{name}.jpg'), cv2.IMREAD_COLOR)[..., ::-1].copy()
    full_h, full_w = src.shape[:2]
    cx0, cy0, cx1, cy1 = cfg.get('crop', [0, 0, full_w, full_h])
    src = src[cy0:cy1, cx0:cx1].copy()
    h, w = src.shape[:2]
    ww = min(w, MAX_WORK_W)
    q, u = ww / w, ww / REF_W
    lens = NO_LENS
    if 'lens' in cfg:  # distortion is centred on the uncropped photo
        lens = Lens(cfg['lens']['k'], ((full_w / 2 - cx0) * q, (full_h / 2 - cy0) * q), full_w / 2 * q)
    big = src if ww == w else cv2.resize(src, (ww, round(h * q)), interpolation=cv2.INTER_AREA)
    big = srgb_to_lin(np.clip(big.astype(np.float32) / 255, 0, 1))
    original = big.copy()
    for sc in cfg['screens']:
        place(big, original, sc, q, u, lens, debug)
    s = grade(big, **cfg.get('grade', {}))
    fh = round(FINAL_W * h / w)
    s = cv2.resize(s, (FINAL_W, fh), interpolation=cv2.INTER_AREA)
    s = grain(s, np.random.default_rng(7))
    out = (s[..., ::-1] * 255 + 0.5).astype(np.uint8)
    for folder in [OUT] + ([SITE] if install else []):
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f'{name}.jpg'
        cv2.imwrite(str(path), out, [cv2.IMWRITE_JPEG_QUALITY, 90,
                                     cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])
        print(f'  -> {path.relative_to(ROOT)}  {FINAL_W}x{fh}')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    debug = '--debug' in sys.argv
    install = '--install' in sys.argv
    for name, cfg in PLATES.items():
        if not args or name in args:
            run(name, cfg, debug, install)


if __name__ == '__main__':
    main()
