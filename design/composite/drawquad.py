"""Draw a quad on a plate and save a zoomed crop around it, to check corners by eye.
usage: python drawquad.py plate "[[x,y]x4]" out.jpg [scale] [pad]"""
import json, sys
import cv2
import numpy as np

src, quad, out = sys.argv[1], np.array(json.loads(sys.argv[2]), float), sys.argv[3]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 3
pad = int(sys.argv[5]) if len(sys.argv) > 5 else 30
img = cv2.imread(src)
x0, y0 = np.floor(quad.min(0) - pad).astype(int)
x1, y1 = np.ceil(quad.max(0) + pad).astype(int)
h, w = img.shape[:2]
x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
crop = cv2.resize(img[y0:y1, x0:x1], None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
pts = np.round((quad - [x0, y0]) * scale).astype(np.int32)
cv2.polylines(crop, [pts], True, (0, 255, 0), 1, cv2.LINE_AA)
for i, (x, y) in enumerate(pts):
    cv2.circle(crop, (int(x), int(y)), 3, (0, 0, 255), -1)
    cv2.putText(crop, 'TL TR BR BL'.split()[i], (int(x) + 5, int(y) - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
cv2.imwrite(out, crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
