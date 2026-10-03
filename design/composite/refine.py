"""
Snap a rough screen quad to the real edges in a photo.

For each side of the rough quad, sample intensity profiles perpendicular to the
side, take the strongest step within +/- `reach` px, fit a robust line through
those points, then intersect neighbouring lines for the corners.

usage: python refine.py plate.png "[[x,y]x4 TL,TR,BR,BL]" out_preview.jpg [reach] [skip|-] [span]
       `skip` lists sides (0=top,1=right,2=bottom,3=left) to keep as given, e.g. "1"
       for a screen that runs off the edge of the photo.
"""
import json
import sys

import cv2
import numpy as np


def bilinear(img, xs, ys):
    return cv2.remap(img, xs.astype(np.float32), ys.astype(np.float32), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_REPLICATE)


def fit_side(gray, a, b, center, reach, samples=40, span=0.12):
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = (b - a) / np.linalg.norm(b - a)
    n = np.array([-d[1], d[0]])
    if np.dot(n, (a + b) / 2 - center) < 0:  # make n point outwards
        n = -n
    s = np.arange(-reach, reach + 0.01, 0.5)
    pts, weights = [], []
    for t in np.linspace(span, 1 - span, samples):
        p = a + t * (b - a)
        xs = p[0] + s * n[0]
        ys = p[1] + s * n[1]
        prof = bilinear(gray, xs[None, :], ys[None, :])[0].astype(float)
        prof = cv2.GaussianBlur(prof[None, :], (1, 5), 0)[0]
        grad = np.gradient(prof)
        i = int(np.argmax(np.abs(grad)))
        pts.append(p + s[i] * n)
        weights.append(abs(grad[i]))
    pts, weights = np.array(pts), np.array(weights)
    # robust fit: drop points far from a first fit
    for _ in range(3):
        vx, vy, x0, y0 = cv2.fitLine(pts.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        dist = np.abs((pts[:, 0] - x0) * vy - (pts[:, 1] - y0) * vx)
        keep = dist < max(1.5, np.median(dist) * 2.5)
        if keep.sum() < 6:
            break
        pts, weights = pts[keep], weights[keep]
    return np.array([x0, y0]), np.array([vx, vy]), pts


def intersect(p1, d1, p2, d2):
    A = np.array([d1, -d2]).T
    t = np.linalg.solve(A, p2 - p1)
    return p1 + t[0] * d1


def main():
    src, quad, out = sys.argv[1], np.array(json.loads(sys.argv[2]), float), sys.argv[3]
    reach = float(sys.argv[4]) if len(sys.argv) > 4 else 10
    skip = {int(c) for c in sys.argv[5] if c.isdigit()} if len(sys.argv) > 5 else set()
    span = float(sys.argv[6]) if len(sys.argv) > 6 else 0.12
    img = cv2.imread(src)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    center = quad.mean(axis=0)
    lines, found = [], []
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]
        if i in skip:
            d = (b - a) / np.linalg.norm(b - a)
            lines.append((a, d))
            found.append(np.array([a, b]))
            continue
        p, d, pts = fit_side(gray, a, b, center, reach, span=span)
        lines.append((p, d))
        found.append(pts)
    corners = []
    for i in range(4):  # corner i sits between side i-1 and side i
        p1, d1 = lines[i - 1]
        p2, d2 = lines[i]
        corners.append(intersect(p1, d1, p2, d2))
    corners = np.array(corners)
    print(json.dumps([[round(float(x), 1), round(float(y), 1)] for x, y in corners]))

    vis = img.copy()
    for pts in found:
        for x, y in pts:
            cv2.circle(vis, (int(round(x)), int(round(y))), 2, (0, 255, 255), -1)
    cv2.polylines(vis, [np.round(corners).astype(np.int32)], True, (0, 255, 0), 1, cv2.LINE_AA)
    x0, y0 = np.floor(corners.min(axis=0) - 40).astype(int)
    x1, y1 = np.ceil(corners.max(axis=0) + 40).astype(int)
    h, w = vis.shape[:2]
    crop = vis[max(0, y0):min(h, y1), max(0, x0):min(w, x1)]
    scale = min(2.0, 1100 / crop.shape[1])
    crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(out, crop, [cv2.IMWRITE_JPEG_QUALITY, 90])


if __name__ == '__main__':
    main()
