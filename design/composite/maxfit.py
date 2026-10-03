"""Fit the edges of a lit screen whose content is busy (bright and dark stripes) against a dark bezel.
Per window along each side: the 90th percentile of max(R,G,B) across the window, as a profile across
the edge. Content is bright somewhere in every window, the bezel never is. The edge is where that
profile falls to `level` of the way from bezel to content (from outside). Lines are fitted, corners
intersected. usage: python maxfit.py img "[[TL],[TR],[BR],[BL]]" reach [level] [skip sides e.g. 13]"""
import json
import sys

import cv2
import numpy as np

img, guess, reach = sys.argv[1], np.array(json.loads(sys.argv[2]), float), float(sys.argv[3])
level = float(sys.argv[4]) if len(sys.argv) > 4 else 0.35
skip = set(int(c) for c in sys.argv[5]) if len(sys.argv) > 5 else set()
im = cv2.imread(img).astype(np.float32)
sig = cv2.GaussianBlur(im.max(axis=2), (0, 0), 0.7)
center = guess.mean(axis=0)
lines = []
for side in range(4):
    a, b = guess[side], guess[(side + 1) % 4]
    L = np.linalg.norm(b - a)
    d = (b - a) / L
    nrm = np.array([-d[1], d[0]])
    if np.dot(nrm, (a + b) / 2 - center) < 0:
        nrm = -nrm  # outward
    if side in skip:
        lines.append(((a + b) / 2, nrm))
        continue
    s = np.arange(-reach, reach + 0.01, 0.25)
    pts = []
    win = 30.0
    for t0 in np.arange(0.06 * L, 0.94 * L - win, win):
        along = np.arange(t0, t0 + win, 1.5)
        P = a + along[:, None] * d  # points along the edge
        xs = P[:, 0:1] + s[None, :] * nrm[0]
        ys = P[:, 1:2] + s[None, :] * nrm[1]
        prof = cv2.remap(sig, xs.astype(np.float32), ys.astype(np.float32), cv2.INTER_LINEAR)
        p90 = np.percentile(prof, 90, axis=0)
        outside = np.median(p90[-int(4 / 0.25):])
        inside = np.percentile(p90[: int(reach / 0.25)], 80)
        if inside - outside < 25:
            continue
        lvl = outside + level * (inside - outside)
        # from outside inwards: first crossing above lvl
        j = None
        for i in range(len(s) - 1, 0, -1):
            if p90[i - 1] >= lvl > p90[i]:
                j = (i - 1) + (p90[i - 1] - lvl) / (p90[i - 1] - p90[i])
                break
        if j is None:
            continue
        mid = a + (t0 + win / 2) * d
        pts.append(mid + (s[0] + j * 0.25) * nrm)
    pts = np.array(pts)
    keep = np.ones(len(pts), bool)
    for _ in range(5):
        m = pts[keep].mean(axis=0)
        _, _, vt = np.linalg.svd(pts[keep] - m)
        nn = vt[1]
        r = (pts - m) @ nn
        keep = np.abs(r) < max(1.0, 3 * np.median(np.abs(r[keep])))
    print(f'side {side}: {keep.sum()}/{len(pts)}, rms {np.sqrt((r[keep] ** 2).mean()):.2f}, max {np.abs(r[keep]).max():.2f}')
    lines.append((m, nn))


def inter(l1, l2):
    (m1, n1), (m2, n2) = l1, l2
    return np.linalg.solve(np.array([n1, n2]), np.array([n1 @ m1, n2 @ m2]))


T, R, B, Lf = lines
q = np.array([inter(T, Lf), inter(T, R), inter(B, R), inter(B, Lf)])
print(json.dumps(np.round(q, 1).tolist()))
