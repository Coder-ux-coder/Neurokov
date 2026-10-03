"""Estimate the real width/height ratio of the rectangle a quad was photographed from
(Zhang & He, "Whiteboard scanning"), assuming the principal point is the image centre.
usage: python aspect.py W H "[[TL],[TR],[BR],[BL]]" ..."""
import json, sys
import numpy as np

W, H = float(sys.argv[1]), float(sys.argv[2])
u0, v0 = W / 2, H / 2
for arg in sys.argv[3:]:
    tl, tr, br, bl = [np.array([x, y, 1.0]) for x, y in json.loads(arg)]
    m1, m2, m3, m4 = tl, tr, bl, br
    k2 = np.dot(np.cross(m1, m4), m3) / np.dot(np.cross(m2, m4), m3)
    k3 = np.dot(np.cross(m1, m4), m2) / np.dot(np.cross(m3, m4), m2)
    n2 = k2 * m2 - m1
    n3 = k3 * m3 - m1
    f2 = -((n2[0] * n3[0] - (n2[0] * n3[2] + n2[2] * n3[0]) * u0 + n2[2] * n3[2] * u0 * u0)
           + (n2[1] * n3[1] - (n2[1] * n3[2] + n2[2] * n3[1]) * v0 + n2[2] * n3[2] * v0 * v0)) / (n2[2] * n3[2])
    def ratio(f):
        A = np.linalg.inv(np.array([[f, 0, u0], [0, f, v0], [0, 0, 1]]))
        A = A.T @ A
        return np.sqrt((n2 @ A @ n2) / (n3 @ A @ n3))
    out = f'f={np.sqrt(f2):7.1f} aspect={ratio(np.sqrt(f2)):.3f}' if f2 > 0 else 'f=n/a'
    # also report aspect for a few plausible focal lengths (35mm-equiv 28..85 on a 36mm-wide frame)
    alts = ' '.join(f'{mm}mm:{ratio(W * mm / 36):.2f}' for mm in (28, 35, 50, 85))
    print(f'{out:28s} {alts}')
