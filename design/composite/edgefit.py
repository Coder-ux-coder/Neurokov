"""Fit a screen's four edges from many half-level crossings, straighten with radial k, intersect.
usage: python edgefit.py img k "[[TL],[TR],[BR],[BL]]" reach [n] [polarity]
       k: the plate's lens distortion (0 for none); polarity +1 for a lit screen on a dark bezel,
       -1 for dark glass against brighter surroundings. Prints the quad undistorted and in image px."""
import sys, json
import cv2, numpy as np
img, k, guess, reach = sys.argv[1], float(sys.argv[2]), np.array(json.loads(sys.argv[3]), float), float(sys.argv[4])
POL = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0  # +1: inside brighter than outside, -1: darker
n = int(sys.argv[5]) if len(sys.argv) > 5 else 40
im = cv2.imread(img).astype(np.float32)
H_, W_ = im.shape[:2]
lum = cv2.GaussianBlur(im @ np.float32([0.114, 0.587, 0.299]), (0, 0), 0.7)
C = np.array([W_ / 2, H_ / 2]); R = W_ / 2
def und(p):
    d = (p - C) / R
    return C + (p - C) * (1 + k * (d ** 2).sum(axis=-1, keepdims=True))
def dist(pu):
    p = pu.copy()
    for _ in range(30):
        d = (p - C) / R
        p = C + (pu - C) / (1 + k * (d ** 2).sum(axis=-1, keepdims=True))
    return p
def sample(xs, ys):
    return cv2.remap(lum, xs.astype(np.float32), ys.astype(np.float32), cv2.INTER_LINEAR)
center = guess.mean(axis=0)
lines = []
for side in range(4):
    a, b = guess[side], guess[(side + 1) % 4]
    d = (b - a) / np.linalg.norm(b - a); nrm = np.array([-d[1], d[0]])
    if np.dot(nrm, (a + b) / 2 - center) < 0: nrm = -nrm  # outward
    s = np.arange(-reach, reach + 0.01, 0.25)
    pts = []
    for t in np.linspace(0.08, 0.92, n):
        p = a + t * (b - a)
        prof = sample((p[0] + s * nrm[0])[None], (p[1] + s * nrm[1])[None])[0]
        # outside = bezel (dark), inside = content: find the step with the largest inside-minus-outside median
        best = None
        for i in range(12, len(s) - 12, 1):
            inside = np.median(prof[i - 12:i - 2]); outside = np.median(prof[i + 2:i + 12])
            st = (inside - outside) * POL
            if best is None or st > best[0]: best = (st, i, inside, outside)
        st, i, ins, out = best
        if st < 6: continue
        lvl = (ins + out) / 2
        j = None
        for jj in range(i - 6, i + 6):
            if (prof[jj] - lvl) * (prof[jj + 1] - lvl) <= 0 and prof[jj] != prof[jj + 1]:
                j = jj + (lvl - prof[jj]) / (prof[jj + 1] - prof[jj]); break
        if j is None: continue
        pts.append(p + (s[0] + j * 0.25) * nrm)
    pts = np.array(pts)
    pu = und(pts)
    keep = np.ones(len(pu), bool)
    for _ in range(5):
        m = pu[keep].mean(axis=0); _, _, vt = np.linalg.svd(pu[keep] - m); nn = vt[1]
        r = (pu - m) @ nn
        keep = np.abs(r) < max(0.8, 3 * np.median(np.abs(r[keep])))
    print(f'side {side}: {keep.sum()}/{len(pu)} points, max resid {np.abs(r[keep]).max():.2f}, rms {np.sqrt((r[keep]**2).mean()):.2f}')
    lines.append((m, nn))
def inter(l1, l2):
    (m1, n1), (m2, n2) = l1, l2
    return np.linalg.solve(np.array([n1, n2]), np.array([n1 @ m1, n2 @ m2]))
T, Rt, B, L = lines
cu = np.array([inter(T, L), inter(T, Rt), inter(B, Rt), inter(B, L)])
print('undistorted', json.dumps(np.round(cu, 1).tolist()))
print('image', json.dumps(np.round(dist(cu), 1).tolist()))
