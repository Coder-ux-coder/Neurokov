// The cast and props for the clips, drawn in the site's three inks: paper,
// ink and signal orange, with thick outlines. Every builder takes a parent SVG
// group and returns handles; nothing moves by itself. Scenes pose things per
// frame with set() / put().
(function () {
  const S = window.STAGE;
  const C = (window.CAST = {});
  const INK = (C.INK = '#121212');
  const PAPER = (C.PAPER = '#f2efe8');
  const ORANGE = (C.ORANGE = '#ff4f00');
  const GRAY = (C.GRAY = '#cfc8ba');
  const SHADE = (C.SHADE = '#e4ddd0');
  const LW = (C.LW = 5);
  const rad = (d) => (d * Math.PI) / 180;
  const f = (n) => n.toFixed(2);

  // A thick limb with an ink outline: an outline stroke under a colour stroke.
  function limb(parent, width, color) {
    const out = S.svg('path', { fill: 'none', stroke: INK, 'stroke-width': width + 2 * LW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    const inn = S.svg('path', { fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    return {
      set(pts) {
        const d = 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
        out.setAttribute('d', d);
        inn.setAttribute('d', d);
      },
      color: (c) => inn.setAttribute('stroke', c),
    };
  }
  // Two-bone chain from p, angles in degrees from straight down, the second
  // relative to the first; positive swings forward (towards +x).
  function chain([x, y], l1, l2, a1, a2) {
    const e = [x + l1 * Math.sin(rad(a1)), y + l1 * Math.cos(rad(a1))];
    const h = [e[0] + l2 * Math.sin(rad(a1 + a2)), e[1] + l2 * Math.cos(rad(a1 + a2))];
    return [[x, y], e, h];
  }

  const HAIR = {
    short: 'M -47 2 C -50 -40 -22 -60 6 -56 C 36 -54 52 -34 47 -4 C 38 -22 16 -30 -8 -27 C -24 -24 -38 -12 -47 2 Z',
    bob: 'M -52 24 C -58 -36 -30 -60 0 -58 C 30 -60 58 -36 52 24 L 38 26 C 42 -4 30 -26 2 -31 C -28 -27 -40 -6 -38 26 Z',
    bun: 'M -47 0 C -50 -38 -24 -56 2 -55 C 30 -56 50 -36 47 -2 C 36 -24 16 -32 -6 -29 C -24 -26 -38 -14 -47 0 Z',
    curly: 'M -48 4 C -62 -10 -52 -34 -38 -40 C -36 -60 -10 -66 2 -56 C 16 -68 42 -60 42 -40 C 58 -34 62 -10 48 4 C 42 -18 22 -28 0 -28 C -22 -28 -42 -18 -48 4 Z',
  };

  // A person, standing on (0, 0), about 360 tall. opts: shirt, pants, hair,
  // hairColor, glasses, blush.
  C.person = function (parent, { shirt = ORANGE, pants = INK, hair = 'short', hairColor = INK, glasses = false, blush = true } = {}) {
    const root = S.g(parent);
    const body = S.g(root);
    const shadowEl = S.svg('ellipse', { cx: 0, cy: 0, rx: 70, ry: 10, fill: INK, opacity: 0.12 }, body);
    const armB = limb(body, 22, shirt);
    const handB = S.svg('circle', { r: 12, fill: PAPER, stroke: INK, 'stroke-width': LW }, body);
    const legB = limb(body, 30, pants);
    const legF = limb(body, 30, pants);
    const shoeB = S.svg('path', { fill: INK }, body);
    const shoeF = S.svg('path', { fill: INK }, body);
    const torso = S.svg('path', { fill: shirt, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, body);
    const collar = S.svg('path', { fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, body);
    const neck = S.svg('rect', { x: -11, width: 22, height: 22, fill: PAPER, stroke: INK, 'stroke-width': LW }, body);
    const head = S.g(body);
    const hairBack = hair === 'bob' ? S.svg('path', { d: 'M -52 24 C -58 -36 58 -36 52 24 Z', fill: hairColor, stroke: INK, 'stroke-width': LW }, head) : null;
    const bun = hair === 'bun' ? S.svg('circle', { cx: 4, cy: -60, r: 20, fill: hairColor, stroke: INK, 'stroke-width': LW }, head) : null;
    S.svg('circle', { r: 46, fill: PAPER, stroke: INK, 'stroke-width': LW }, head);
    const ear = S.svg('ellipse', { cx: -44, cy: 4, rx: 8, ry: 11, fill: PAPER, stroke: INK, 'stroke-width': 4 }, head);
    if (HAIR[hair]) S.svg('path', { d: HAIR[hair], fill: hairColor, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, head);
    const face = S.g(head);
    const cheeks = blush ? [-24, 26].map((x) => S.svg('ellipse', { cx: x, cy: 14, rx: 9, ry: 6, fill: ORANGE, opacity: 0.35 }, face)) : [];
    const eyes = [-15, 17].map((x) => S.svg('ellipse', { cx: x, cy: -2, rx: 5.5, ry: 7.5, fill: INK }, face));
    const brows = [-15, 17].map((x) => S.svg('path', { d: `M ${x - 9} -16 Q ${x} -21 ${x + 9} -16`, fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, face));
    const mouthEl = S.svg('path', { fill: 'none', stroke: INK, 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
    const specs = glasses ? S.g(face) : null;
    if (specs) {
      for (const x of [-15, 17]) S.svg('circle', { cx: x, cy: -2, r: 13, fill: 'none', stroke: INK, 'stroke-width': 4 }, specs);
      S.svg('path', { d: 'M -2 -3 L 4 -3', stroke: INK, 'stroke-width': 4 }, specs);
    }
    const armF = limb(body, 22, shirt);
    const handF = S.svg('circle', { r: 12, fill: PAPER, stroke: INK, 'stroke-width': LW }, body);
    const prop = S.g(body); // things held in the front hand go here

    const MOUTHS = {
      smile: 'M -12 16 Q 1 27 14 16',
      grin: 'M -14 14 Q 1 32 16 14 Z',
      flat: 'M -9 19 L 11 19',
      frown: 'M -11 22 Q 1 13 13 22',
      open: 'M -7 14 Q 1 30 9 14 Q 1 10 -7 14 Z',
      o: 'M -5 16 a 6 7 0 1 0 12 0 a 6 7 0 1 0 -12 0',
      sleep: 'M -8 20 Q 1 24 10 20',
    };

    const p = {
      root,
      head,
      prop,
      hand: [0, 0],
      // pose: x, y, s, flip, lean (deg), bob (px up), headTilt, headTurn (-1..1, a
      // hint of a turn), arm: [[a1, a2] back, [a1, a2] front], leg: [[a1, a2], [a1, a2]],
      // blink (0..1), mouth, look [dx, dy], seated (hips at y = -seated), shadow.
      set(o = {}) {
        const {
          x = 0, y = 0, s = 1, flip = 1, lean = 0, bob = 0, headTilt = 0, headTurn = 0,
          arm = [[8, -10], [-8, 10]], leg = [[4, 0], [-4, 0]], blink = 0, mouth = 'smile', look = [0, 0],
          seated = 0, shadow = 1,
        } = o;
        S.put(root, { x, y, sx: s * flip, sy: s });
        const hipY = seated ? -seated : -150;
        const lift = bob;
        // legs hang from the hips; when standing, the feet stay on the ground
        const hips = [[-18, hipY - lift], [18, hipY - lift]];
        const L = [chain(hips[0], 78, 72, leg[0][0], leg[0][1]), chain(hips[1], 78, 72, leg[1][0], leg[1][1])];
        legB.set(L[0]);
        legF.set(L[1]);
        for (const [shoe, pts] of [[shoeB, L[0]], [shoeF, L[1]]]) {
          const [hx, hy] = pts[2];
          shoe.setAttribute('d', `M ${f(hx - 18)} ${f(hy + 4)} Q ${f(hx - 18)} ${f(hy - 16)} ${f(hx + 2)} ${f(hy - 14)} L ${f(hx + 24)} ${f(hy - 8)} Q ${f(hx + 32)} ${f(hy - 4)} ${f(hx + 30)} ${f(hy + 4)} Z`);
        }
        shadowEl.setAttribute('opacity', (0.12 * shadow).toFixed(3));
        // upper body leans about the hips
        const top = hipY - lift;
        const T = (px, py) => {
          const a = rad(lean);
          const dx = px, dy = py - top;
          return [dx * Math.cos(a) - dy * Math.sin(a), top + dx * Math.sin(a) + dy * Math.cos(a)];
        };
        const sh = T(0, top - 112);
        const torsoPts = [T(-40, top - 108), T(40, top - 108), T(36, top + 4), T(-36, top + 4)];
        const [a, b, c, d] = torsoPts;
        torso.setAttribute('d', `M ${f(a[0])} ${f(a[1])} Q ${f(sh[0])} ${f(sh[1] - 8)} ${f(b[0])} ${f(b[1])} L ${f(c[0])} ${f(c[1])} Q ${f((c[0] + d[0]) / 2)} ${f(c[1] + 6)} ${f(d[0])} ${f(d[1])} Z`);
        const c1 = T(-12, top - 108), c2 = T(0, top - 96), c3 = T(12, top - 108);
        collar.setAttribute('d', `M ${f(c1[0])} ${f(c1[1])} L ${f(c2[0])} ${f(c2[1])} L ${f(c3[0])} ${f(c3[1])}`);
        const nk = T(0, top - 124);
        S.put(neck, { x: nk[0], y: nk[1], r: lean });
        const hd = T(0, top - 168);
        S.put(head, { x: hd[0], y: hd[1], r: lean + headTilt });
        ear.setAttribute('cx', f(-44 + headTurn * 10));
        S.put(face, { x: headTurn * 10 });
        // arms from the shoulders
        const shB = T(-34, top - 100), shF = T(34, top - 100);
        const A = [chain(shB, 70, 64, arm[0][0] + lean, arm[0][1]), chain(shF, 70, 64, arm[1][0] + lean, arm[1][1])];
        armB.set(A[0]);
        armF.set(A[1]);
        handB.setAttribute('cx', f(A[0][2][0]));
        handB.setAttribute('cy', f(A[0][2][1]));
        handF.setAttribute('cx', f(A[1][2][0]));
        handF.setAttribute('cy', f(A[1][2][1]));
        p.hand = A[1][2];
        p.handBack = A[0][2];
        // face
        const k = Math.max(0.1, 1 - blink);
        eyes.forEach((e, i) => {
          e.setAttribute('cx', f([-15, 17][i] + look[0] * 4));
          e.setAttribute('cy', f(-2 + look[1] * 3));
          e.setAttribute('ry', f(7.5 * k));
        });
        brows.forEach((br, i) => S.put(br, { y: look[1] * 2 - (mouth === 'open' || mouth === 'o' ? 4 : 0) }));
        mouthEl.setAttribute('d', MOUTHS[mouth] || MOUTHS.smile);
        mouthEl.setAttribute('fill', mouth === 'grin' || mouth === 'open' || mouth === 'o' ? INK : 'none');
        return p;
      },
    };
    return p.set();
  };

  // The operator: an orange robot that is the system. Hovers; origin at the
  // centre of its body. opts: label.
  C.robot = function (parent, { label = 'NK-01' } = {}) {
    const root = S.g(parent);
    const shadow = S.svg('ellipse', { cx: 0, cy: 0, rx: 70, ry: 11, fill: INK, opacity: 0.14 }, root);
    const bot = S.g(root);
    const flame = S.svg('path', { fill: ORANGE, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, bot);
    const armB = limb(bot, 10, INK);
    const handB = S.svg('circle', { r: 13, fill: PAPER, stroke: INK, 'stroke-width': LW }, bot);
    S.svg('line', { x1: 0, y1: -66, x2: 0, y2: -98, stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, bot);
    const glow = S.svg('circle', { cx: 0, cy: -106, r: 22, fill: ORANGE, opacity: 0.25 }, bot);
    const bulb = S.svg('circle', { cx: 0, cy: -106, r: 11, fill: ORANGE, stroke: INK, 'stroke-width': 5 }, bot);
    S.svg('rect', { x: -78, y: -68, width: 156, height: 136, rx: 38, fill: ORANGE, stroke: INK, 'stroke-width': 6 }, bot);
    S.svg('path', { d: 'M -56 40 Q 0 58 56 40', fill: 'none', stroke: INK, 'stroke-width': 4, opacity: 0.35, 'stroke-linecap': 'round' }, bot);
    const visor = S.svg('rect', { x: -60, y: -46, width: 120, height: 62, rx: 28, fill: INK }, bot);
    const eyes = [-25, 25].map((x) => S.svg('rect', { x: x - 9, y: -30, width: 18, height: 30, rx: 9, fill: PAPER }, bot));
    const happy = [-25, 25].map((x) => S.svg('path', { d: `M ${x - 11} -10 Q ${x} -30 ${x + 11} -10`, fill: 'none', stroke: PAPER, 'stroke-width': 6, 'stroke-linecap': 'round' }, bot));
    const tag = S.svg('text', { x: 0, y: 44, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 15, fill: INK, 'letter-spacing': 1.5 }, bot);
    tag.textContent = label;
    const armF = limb(bot, 10, INK);
    const handF = S.svg('circle', { r: 13, fill: PAPER, stroke: INK, 'stroke-width': LW }, bot);
    const prop = S.g(bot);

    const r = {
      root,
      bot,
      prop,
      visor,
      hand: [0, 0],
      // x, y (body centre), s, flip, tilt, hover (px above its shadow's ground at
      // y + 120), arm: [[a1, a2], [a1, a2]] (back, front), blink, eyes:
      // 'normal' | 'happy' | 'wide', look [dx, dy], glow (0..1), flame (0..1), squash.
      set(o = {}) {
        const {
          x = 0, y = 0, s = 1, flip = 1, tilt = 0, ground = 130, arm = [[20, -20], [-20, 20]], blink = 0,
          eyes: mood = 'normal', look = [0, 0], glow: g = 0.5, flame: fl = 0, squash = 0, t = 0,
        } = o;
        S.put(root, { x, y, sx: s * flip, sy: s });
        S.put(bot, { r: tilt, sx: 1 + squash * 0.12, sy: 1 - squash * 0.12 });
        tag.setAttribute('transform', flip < 0 ? 'scale(-1 1)' : ''); // the name reads the right way round either way
        const lift = Math.max(0, ground - 70);
        S.put(shadow, { y: ground, sx: 1 - Math.min(0.5, lift / 400), sy: 1 - Math.min(0.5, lift / 400) });
        shadow.setAttribute('opacity', (0.16 - Math.min(0.08, lift / 1500)).toFixed(3));
        const k = 0.8 + 0.2 * Math.sin(t * 40);
        flame.setAttribute('d', `M -18 64 Q 0 ${f(64 + 50 * fl * k)} 18 64 Z`);
        flame.style.visibility = fl > 0.02 ? '' : 'hidden';
        glow.setAttribute('opacity', (0.1 + 0.35 * g).toFixed(3));
        glow.setAttribute('r', f(16 + 12 * g));
        bulb.setAttribute('fill', g > 0.5 ? ORANGE : '#ff8a52');
        const A = [chain([-74, 8], 42, 38, arm[0][0], arm[0][1]), chain([74, 8], 42, 38, arm[1][0], arm[1][1])];
        armB.set(A[0]);
        armF.set(A[1]);
        handB.setAttribute('cx', f(A[0][2][0]));
        handB.setAttribute('cy', f(A[0][2][1]));
        handF.setAttribute('cx', f(A[1][2][0]));
        handF.setAttribute('cy', f(A[1][2][1]));
        r.hand = A[1][2];
        r.handBack = A[0][2];
        const kk = Math.max(0.12, 1 - blink);
        const wide = mood === 'wide' ? 1.25 : 1;
        eyes.forEach((e, i) => {
          const cx = [-25, 25][i] + look[0] * 9;
          e.setAttribute('x', f(cx - 9 * wide));
          e.setAttribute('width', f(18 * wide));
          e.setAttribute('height', f(30 * kk * wide));
          e.setAttribute('y', f(-15 - 15 * kk * wide + look[1] * 5));
          e.style.visibility = mood === 'happy' ? 'hidden' : '';
        });
        happy.forEach((h, i) => {
          h.style.visibility = mood === 'happy' ? '' : 'hidden';
          S.put(h, { x: look[0] * 9 });
        });
        return r;
      },
    };
    return r.set();
  };

  // ---------- Props ----------

  C.envelope = function (parent, { w = 120, h = 80, seal = ORANGE } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, fill: PAPER, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    const flap = S.svg('path', { d: `M ${-w / 2 + 4} ${-h / 2 + 4} L 0 ${h * 0.12} L ${w / 2 - 4} ${-h / 2 + 4}`, fill: 'none', stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    S.svg('circle', { cx: 0, cy: h * 0.1, r: 11, fill: seal, stroke: INK, 'stroke-width': 4 }, g);
    return { g, flap };
  };

  // A speech bubble; text goes in via the HUD. tail: 'left' | 'right' | 'none'.
  C.bubble = function (parent, { w = 300, h = 110, tail = 'left', fill = PAPER } = {}) {
    const g = S.g(parent);
    const tx = tail === 'left' ? -w / 2 + 40 : w / 2 - 40;
    const d =
      tail === 'none'
        ? ''
        : `M ${tx - 16} ${h / 2 - 3} L ${tx + (tail === 'left' ? -22 : 22)} ${h / 2 + 30} L ${tx + 16} ${h / 2 - 3}`;
    if (d) S.svg('path', { d, fill, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 26, fill, stroke: INK, 'stroke-width': LW }, g);
    if (d) S.svg('path', { d: `M ${tx - 12} ${h / 2 - 3} L ${tx + 12} ${h / 2 - 3}`, stroke: fill, 'stroke-width': 7 }, g);
    return g;
  };

  C.phone = function (parent, { w = 120, h = 230 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 22, fill: INK }, g);
    const screen = S.svg('rect', { x: -w / 2 + 9, y: -h / 2 + 9, width: w - 18, height: h - 18, rx: 15, fill: PAPER }, g);
    S.svg('rect', { x: -18, y: -h / 2 + 15, width: 36, height: 9, rx: 4.5, fill: INK }, g);
    const ui = S.g(g);
    return { g, screen, ui };
  };

  C.laptop = function (parent, { w = 340, h = 210 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -h, width: w, height: h, rx: 14, fill: INK }, g);
    const screen = S.svg('rect', { x: -w / 2 + 12, y: -h + 12, width: w - 24, height: h - 30, rx: 5, fill: PAPER }, g);
    S.svg('path', { d: `M ${-w / 2 - 34} 0 L ${w / 2 + 34} 0 L ${w / 2 + 20} 16 L ${-w / 2 - 20} 16 Z`, fill: GRAY, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    const ui = S.g(g);
    return { g, screen, ui, x0: -w / 2 + 12, y0: -h + 12, sw: w - 24, sh: h - 30 };
  };

  // A wall clock; set(hours) turns the hands (11.75 is 11:45).
  C.clock = function (parent, { r = 70 } = {}) {
    const g = S.g(parent);
    S.svg('circle', { r, fill: PAPER, stroke: INK, 'stroke-width': LW + 1 }, g);
    for (let i = 0; i < 12; i++) {
      const a = rad(i * 30);
      const l = i % 3 === 0 ? 14 : 8;
      S.svg('line', { x1: f(Math.sin(a) * (r - 8)), y1: f(-Math.cos(a) * (r - 8)), x2: f(Math.sin(a) * (r - 8 - l)), y2: f(-Math.cos(a) * (r - 8 - l)), stroke: INK, 'stroke-width': i % 3 === 0 ? 5 : 3, 'stroke-linecap': 'round' }, g);
    }
    const hh = S.svg('line', { x1: 0, y1: 0, x2: 0, y2: -r * 0.48, stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    const mm = S.svg('line', { x1: 0, y1: 0, x2: 0, y2: -r * 0.72, stroke: ORANGE, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    S.svg('circle', { r: 7, fill: INK }, g);
    return {
      g,
      // (minute, in turns, overrides the minute hand: a clock racing through the
      // hours can spin it fewer times, slow enough to read rather than strobe)
      set(hours, minute = hours % 1) {
        S.put(hh, { r: (hours % 12) * 30 });
        S.put(mm, { r: (minute % 1) * 360 });
      },
    };
  };

  C.calendar = function (parent, { w = 300, h = 250, cols = 5, rows = 3 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 + 10, y: -h / 2 + 12, width: w, height: h, rx: 18, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 18, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    S.svg('path', { d: `M ${-w / 2} ${-h / 2 + 56} L ${w / 2} ${-h / 2 + 56}`, stroke: INK, 'stroke-width': LW }, g);
    S.svg('path', { d: `M ${-w / 2 + 18} ${-h / 2} Q ${-w / 2} ${-h / 2} ${-w / 2} ${-h / 2 + 18} L ${-w / 2} ${-h / 2 + 56} L ${w / 2} ${-h / 2 + 56} L ${w / 2} ${-h / 2 + 18} Q ${w / 2} ${-h / 2} ${w / 2 - 18} ${-h / 2} Z`, fill: ORANGE, stroke: INK, 'stroke-width': LW }, g);
    for (const x of [-w / 4, w / 4]) S.svg('rect', { x: x - 6, y: -h / 2 - 16, width: 12, height: 30, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 4 }, g);
    const cells = [];
    const cw = (w - 40) / cols;
    const ch = (h - 56 - 30) / rows;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = -w / 2 + 20 + cw * (i + 0.5);
        const cy = -h / 2 + 56 + 15 + ch * (j + 0.5);
        const cell = S.svg('rect', { x: f(cx - cw / 2 + 5), y: f(cy - ch / 2 + 5), width: f(cw - 10), height: f(ch - 10), rx: 7, fill: SHADE }, g);
        cells.push({ cell, cx, cy, cw, ch });
      }
    return { g, cells };
  };

  // A tick in an orange disc, drawn on with p (0..1).
  C.check = function (parent, { r = 28, fill = ORANGE } = {}) {
    const g = S.g(parent);
    const disc = S.svg('circle', { r, fill, stroke: INK, 'stroke-width': LW }, g);
    const tick = S.svg('path', { d: `M ${-r * 0.45} 0 L ${-r * 0.1} ${r * 0.34} L ${r * 0.48} ${-r * 0.36}`, fill: 'none', stroke: INK, 'stroke-width': r * 0.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    return { g, disc, tick, set: (p) => S.draw(tick, p) };
  };

  // Burst lines round a point, for a pop; p (0..1) shoots them out and fades them.
  // keep(a) picks the lines to draw by angle (degrees clockwise from straight up),
  // to keep a burst off something beside it.
  C.burst = function (parent, { n = 8, r0 = 40, r1 = 80, color = INK, width = 6, keep = () => true } = {}) {
    const g = S.g(parent);
    const angles = Array.from({ length: n }, (_, i) => (i / n) * 360 + 360 / n / 2).filter(keep);
    const lines = angles.map(() => S.svg('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }, g));
    return {
      g,
      set(p) {
        g.style.visibility = p <= 0 || p >= 1 ? 'hidden' : '';
        lines.forEach((l, i) => {
          const a = rad(angles[i]);
          const a0 = r0 + (r1 - r0) * S.E.out(p);
          const a1 = a0 + (r1 - r0) * 0.5 * (1 - p);
          l.setAttribute('x1', f(Math.sin(a) * a0));
          l.setAttribute('y1', f(-Math.cos(a) * a0));
          l.setAttribute('x2', f(Math.sin(a) * a1));
          l.setAttribute('y2', f(-Math.cos(a) * a1));
        });
      },
    };
  };

  // rise: how far up a Z goes before it fades (at the group's scale 1). A shorter rise
  // makes the whole thing smaller, Zs and drift alike, so they stay as far apart.
  C.zzz = function (parent, { rise = 170 } = {}) {
    const g = S.g(parent);
    const u = Math.min(1, rise / 170);
    const zs = [0, 1, 2].map(() => {
      const z = S.svg('text', { 'font-family': 'Archivo Variable', 'font-weight': 800, 'font-size': 34 * u, fill: PAPER, stroke: INK, 'stroke-width': 3, 'paint-order': 'stroke' }, g);
      z.textContent = 'Z';
      return z;
    });
    return {
      g,
      // The Zs rise and grow along one path, a third of a cycle apart, so one
      // never lands on another.
      set(t, on = 1) {
        zs.forEach((z, i) => {
          const k = ((t * 0.6 + i / 3) % 1 + 1) % 1;
          S.put(z, { x: 50 * u * k, y: -rise * k, s: 1 + 0.6 * k, o: on * Math.sin(Math.PI * k), r: -12 });
        });
      },
    };
  };

  C.bed = function (parent, { w = 460 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 - 20, y: -190, width: 30, height: 190, rx: 10, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -86, width: w, height: 56, rx: 16, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    S.svg('rect', { x: -w / 2, y: -34, width: w, height: 22, rx: 6, fill: INK }, g);
    for (const x of [-w / 2 + 10, w / 2 - 30]) S.svg('rect', { x, y: -14, width: 20, height: 14, fill: INK }, g);
    const pillow = S.svg('rect', { x: -w / 2 + 10, y: -128, width: 130, height: 50, rx: 24, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    const sleeper = S.g(g);
    const blanket = S.svg('path', { d: `M ${-w / 2 + 110} -84 C ${-w / 2 + 150} -150 ${w / 2 - 60} -150 ${w / 2 + 6} -90 L ${w / 2 + 6} -40 L ${-w / 2 + 110} -40 Z`, fill: ORANGE, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    const stripes = S.svg('path', { d: `M ${-w / 2 + 170} -118 L ${-w / 2 + 170} -40 M ${-w / 2 + 250} -128 L ${-w / 2 + 250} -40 M ${-w / 2 + 330} -124 L ${-w / 2 + 330} -40`, stroke: INK, 'stroke-width': 3, opacity: 0.3 }, g);
    return { g, pillow, sleeper, blanket, stripes, headAt: [-w / 2 + 76, -140] };
  };

  C.window = function (parent, { w = 300, h = 360, night = true } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 - 14, y: -h / 2 - 14, width: w + 28, height: h + 28, rx: 10, fill: night ? '#2a2926' : PAPER, stroke: night ? PAPER : INK, 'stroke-width': LW }, g);
    const sky = S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, fill: night ? '#1b2233' : '#ffe2cf' }, g);
    const outside = S.g(g);
    const clip = S.svg('clipPath', { id: `win${Math.random().toString(36).slice(2, 7)}` }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h }, clip);
    outside.setAttribute('clip-path', `url(#${clip.id})`);
    S.svg('path', { d: `M 0 ${-h / 2} L 0 ${h / 2} M ${-w / 2} 0 L ${w / 2} 0`, stroke: night ? '#2a2926' : INK, 'stroke-width': 12 }, g);
    return { g, sky, outside };
  };

  C.moon = function (parent, { r = 44 } = {}) {
    const g = S.g(parent);
    S.svg('circle', { r: r * 1.8, fill: PAPER, opacity: 0.08 }, g);
    S.svg('path', { d: `M ${r * 0.3} ${-r} A ${r} ${r} 0 1 0 ${r} ${r * 0.35} A ${r * 0.8} ${r * 0.8} 0 1 1 ${r * 0.3} ${-r} Z`, fill: '#fbe7c6', stroke: INK, 'stroke-width': 4 }, g);
    return g;
  };

  C.sun = function (parent, { r = 56 } = {}) {
    const g = S.g(parent);
    const rays = S.g(g);
    for (let i = 0; i < 12; i++) {
      const a = rad(i * 30);
      S.svg('line', { x1: f(Math.sin(a) * (r + 16)), y1: f(-Math.cos(a) * (r + 16)), x2: f(Math.sin(a) * (r + 40)), y2: f(-Math.cos(a) * (r + 40)), stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, rays);
    }
    S.svg('circle', { r, fill: ORANGE, stroke: INK, 'stroke-width': LW + 1 }, g);
    return { g, rays };
  };

  C.mug = function (parent) {
    const g = S.g(parent);
    const steam = [-12, 8].map((x) => S.svg('path', { fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, g));
    S.svg('path', { d: 'M 26 -46 C 52 -46 52 -12 26 -14', fill: 'none', stroke: INK, 'stroke-width': 8 }, g);
    S.svg('path', { d: 'M -30 -62 L 30 -62 L 26 0 L -26 0 Z', fill: PAPER, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: 'M -28 -40 L 28 -40', stroke: ORANGE, 'stroke-width': 10 }, g);
    return {
      g,
      set(t) {
        steam.forEach((s, i) => {
          const x = [-12, 8][i];
          const k = (t * 0.8 + i * 0.5) % 1;
          const y0 = -70 - k * 30;
          s.setAttribute('d', `M ${x} ${f(y0)} q 10 -14 0 -28 q -10 -14 0 -28`);
          s.setAttribute('opacity', f(0.5 * Math.sin(Math.PI * k)));
        });
      },
    };
  };

  C.plant = function (parent) {
    const g = S.g(parent);
    for (const [a, l] of [[-40, 80], [-12, 100], [16, 92], [42, 70]]) {
      const x = Math.sin(rad(a)) * l, y = -Math.cos(rad(a)) * l - 60;
      S.svg('path', { d: `M 0 -60 Q ${f(x * 0.2)} ${f(y * 0.6)} ${f(x)} ${f(y)} Q ${f(x * 0.8 + 16)} ${f(y * 0.5 - 20)} 0 -60 Z`, fill: '#8aa37b', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    }
    S.svg('path', { d: 'M -40 -64 L 40 -64 L 32 0 L -32 0 Z', fill: ORANGE, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    return g;
  };

  C.desk = function (parent, { w = 520, h = 190 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -h, width: w, height: 22, rx: 6, fill: INK }, g);
    for (const x of [-w / 2 + 24, w / 2 - 40]) S.svg('rect', { x, y: -h + 20, width: 16, height: h - 20, fill: INK }, g);
    return g;
  };

  C.chair = function (parent) {
    const g = S.g(parent);
    S.svg('path', { d: 'M -60 -250 L -48 -120 L 30 -120', fill: 'none', stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: 'M -10 -120 L -10 -20 M -50 -8 L 30 -8', fill: 'none', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
    return g;
  };

  // A stack of paper; n sheets.
  C.stack = function (parent, { n = 8, w = 150 } = {}) {
    const g = S.g(parent);
    const sheets = [];
    for (let i = 0; i < n; i++) {
      const sh = S.svg('rect', { x: -w / 2, y: -(i + 1) * 16, width: w, height: 20, rx: 4, fill: i % 3 === 1 ? SHADE : PAPER, stroke: INK, 'stroke-width': 4 }, g);
      sheets.push(sh);
    }
    return { g, sheets };
  };

  // A ticket or card with lines of 'text'; kind colours its tag.
  C.card = function (parent, { w = 230, h = 120, tag = ORANGE, lines = 2 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 + 6, y: -h / 2 + 8, width: w, height: h, rx: 14, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    S.svg('rect', { x: -w / 2 + 18, y: -h / 2 + 18, width: 56, height: 16, rx: 8, fill: tag, stroke: INK, 'stroke-width': 3 }, g);
    for (let i = 0; i < lines; i++) S.svg('rect', { x: -w / 2 + 18, y: -h / 2 + 50 + i * 22, width: (w - 36) * (i === lines - 1 ? 0.6 : 1), height: 9, rx: 4.5, fill: GRAY }, g);
    return g;
  };

  // A paper plane, nose to +x: a sent reply.
  C.plane = function (parent, { fill = ORANGE } = {}) {
    const g = S.g(parent);
    S.svg('path', { d: 'M -40 0 L 44 -26 L 10 30 L 0 6 Z M 0 6 L 44 -26', fill, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    return g;
  };

  // A sticky note with a line of text, and a ticked badge that set(p) pops onto a top
  // corner (badge: 1 the right one, -1 the left), clear of the words; hidden until set.
  C.sticky = function (parent, { text = '', w = 150, fill = '#ffd166', size = 22, badge = 1 } = {}) {
    const g = S.g(parent);
    S.svg('path', { d: `M ${-w / 2} ${-w / 2} L ${w / 2} ${-w / 2} L ${w / 2} ${w / 2 - 26} L ${w / 2 - 26} ${w / 2} L ${-w / 2} ${w / 2} Z`, fill, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: `M ${w / 2} ${w / 2 - 26} L ${w / 2 - 26} ${w / 2 - 26} L ${w / 2 - 26} ${w / 2} Z`, fill: INK, opacity: 0.18 }, g);
    S.svg('rect', { x: -22, y: -w / 2 - 8, width: 44, height: 16, fill: PAPER, opacity: 0.8, transform: 'rotate(-4)' }, g);
    const lines = String(text).split('\n');
    lines.forEach((l, i) => {
      const tx = S.svg('text', { x: 0, y: 8 + (i - (lines.length - 1) / 2) * (size + 4), 'text-anchor': 'middle', 'font-family': 'Archivo Variable', 'font-weight': 700, 'font-size': size, fill: INK }, g);
      tx.textContent = l;
    });
    const done = C.check(g, { r: Math.round(w * 0.16) });
    const set = (p) => {
      const k = S.clamp(p / 0.3);
      S.put(done.g, { x: badge * (w / 2 - 4), y: -w / 2 + 4, s: Math.max(0.001, k * (1 + 0.15 * Math.sin(Math.PI * k))), o: p > 0 ? 1 : 0 });
      done.set((p - 0.25) / 0.75);
    };
    set(0);
    return { g, tick: done.tick, set };
  };

  // An in-tray; things put in its `pile` group sit in it.
  C.tray = function (parent, { w = 200 } = {}) {
    const g = S.g(parent);
    const pile = S.g(g);
    S.svg('path', { d: `M ${-w / 2} -60 L ${-w / 2 + 16} 0 L ${w / 2 - 16} 0 L ${w / 2} -60`, fill: GRAY, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: `M ${-w / 2 + 20} -30 L ${w / 2 - 20} -30`, stroke: INK, 'stroke-width': 3, opacity: 0.3 }, g);
    return { g, pile };
  };

  // A side table, top at y = -h.
  C.table = function (parent, { w = 240, h = 150 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -h, width: w, height: 20, rx: 6, fill: INK }, g);
    S.svg('rect', { x: -8, y: -h + 18, width: 16, height: h - 30, fill: INK }, g);
    S.svg('rect', { x: -w / 3, y: -14, width: (w * 2) / 3, height: 14, rx: 6, fill: INK }, g);
    return g;
  };

  // A rubber stamp, its face at y = 0 (the handle points up).
  C.stamp = function (parent, { w = 260 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2, y: -26, width: w, height: 26, rx: 6, fill: ORANGE, stroke: INK, 'stroke-width': LW }, g);
    S.svg('rect', { x: -w / 2 + 14, y: -76, width: w - 28, height: 52, rx: 10, fill: '#8a5a3c', stroke: INK, 'stroke-width': LW }, g);
    S.svg('path', { d: 'M -26 -76 C -30 -110 -24 -130 -34 -150 L 34 -150 C 24 -130 30 -110 26 -76 Z', fill: '#8a5a3c', stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('ellipse', { cx: 0, cy: -178, rx: 56, ry: 42, fill: '#a86f4b', stroke: INK, 'stroke-width': LW }, g);
    S.svg('ellipse', { cx: -18, cy: -192, rx: 16, ry: 9, fill: PAPER, opacity: 0.35 }, g);
    return g;
  };

  // A drop of sweat, falling from its origin as p goes 0..1.
  C.sweat = function (parent) {
    const g = S.g(parent);
    const d = S.svg('path', { d: 'M 0 -16 C 10 -2 12 6 0 12 C -12 6 -10 -2 0 -16 Z', fill: '#9fd3ff', stroke: INK, 'stroke-width': 3.5 }, g);
    return { g, set: (p) => S.put(d, { x: 16 * p, y: 30 * p * p, o: p <= 0 || p >= 1 ? 0 : 1 - p * p }) };
  };

  // A signpost with the Neurokov mark, standing on (0, 0).
  C.sign = function (parent, { h = 150, size = 190 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -9, y: -h, width: 18, height: h, fill: INK }, g);
    const board = S.g(g);
    S.svg('rect', { x: -size / 2 + 8, y: -h - size + 10, width: size, height: size, rx: 22, fill: INK }, board);
    S.svg('rect', { x: -size / 2, y: -h - size, width: size, height: size, rx: 22, fill: PAPER, stroke: INK, 'stroke-width': LW }, board);
    const k = size / 32 * 0.62, ox = -16 * k, oy = -h - size / 2 - 16 * k;
    S.svg('path', { d: 'M5 5h5v22H5zM22 5h5v22h-5z', fill: INK, transform: `translate(${f(ox)} ${f(oy)}) scale(${f(k)})` }, board);
    S.svg('path', { d: 'M5 5h5l17 22h-5z', fill: ORANGE, transform: `translate(${f(ox)} ${f(oy)}) scale(${f(k)})` }, board);
    return { g, board };
  };

  // A mailbox on a post, standing on (0, 0); its flag swings up with setFlag(p).
  C.mailbox = function (parent, { label = '', fill = PAPER } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -8, y: -150, width: 16, height: 150, fill: INK }, g);
    const box = S.g(g);
    S.svg('path', { d: 'M -60 -150 L -60 -196 A 60 44 0 0 1 60 -196 L 60 -150 Z', fill, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, box);
    S.svg('path', { d: 'M -60 -150 L -60 -196 A 22 44 0 0 1 -16 -196 L -16 -150 Z', fill: SHADE, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, box);
    const flag = S.g(box);
    S.svg('rect', { x: -3, y: -64, width: 6, height: 64, fill: INK }, flag);
    S.svg('rect', { x: 2, y: -64, width: 30, height: 22, fill: ORANGE, stroke: INK, 'stroke-width': 3.5 }, flag);
    if (label) {
      S.svg('rect', { x: -52, y: -122, width: 104, height: 28, rx: 5, fill: PAPER, stroke: INK, 'stroke-width': 3 }, g);
      const tx = S.svg('text', { x: 0, y: -102, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 15, 'letter-spacing': 1, fill: INK }, g);
      tx.textContent = label;
    }
    const m = { g, box, flag, setFlag: (p) => S.put(flag, { x: 44, y: -168, r: 90 - 90 * p }) };
    m.setFlag(0);
    return m;
  };

  // Flames on (0, 0). set(t, p): p (0..1) grows the fire; t makes it lick.
  C.fire = function (parent, { w = 120 } = {}) {
    const g = S.g(parent);
    const tongues = [-0.36, 0.34, 0, -0.14, 0.18].map((k, i) => {
      const outer = S.svg('path', { fill: ORANGE, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      const inner = S.svg('path', { fill: '#ffd166' }, g);
      return { k, i, outer, inner };
    });
    const flame = (x, h, wd, lean) =>
      `M ${f(x - wd)} 0 C ${f(x - wd)} ${f(-h * 0.45)} ${f(x + lean - wd * 0.3)} ${f(-h * 0.7)} ${f(x + lean)} ${f(-h)} C ${f(x + lean + wd * 0.3)} ${f(-h * 0.7)} ${f(x + wd)} ${f(-h * 0.45)} ${f(x + wd)} 0 Z`;
    return {
      g,
      set(t, p = 1) {
        g.style.visibility = p <= 0.01 ? 'hidden' : '';
        tongues.forEach(({ k, i, outer, inner }) => {
          const h = p * (i < 2 ? 90 : 130 - 20 * (i - 2)) * (0.85 + 0.15 * Math.sin(t * 17 + i * 2.1));
          const lean = 12 * S.noise(i + 3, t * 3);
          const x = k * w;
          const wd = 26 * Math.min(1, p * 1.5);
          outer.setAttribute('d', flame(x, h, wd, lean));
          inner.setAttribute('d', flame(x, h * 0.55, wd * 0.46, lean * 0.6));
        });
      },
    };
  };

  // A cartoon cannon on its wheel, standing on (0, 0); the barrel pivots at
  // (0, -50) with the muzzle to +x.
  C.cannon = function (parent) {
    const g = S.g(parent);
    const barrel = S.g(g);
    S.svg('path', { d: 'M -70 -34 L 150 -26 L 150 26 L -70 34 Q -100 0 -70 -34 Z', fill: '#6b6f7a', stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, barrel);
    S.svg('rect', { x: 140, y: -34, width: 28, height: 68, rx: 8, fill: '#6b6f7a', stroke: INK, 'stroke-width': LW }, barrel);
    S.svg('path', { d: 'M -40 -30 L -40 30 M 60 -28 L 60 28', stroke: INK, 'stroke-width': 3, opacity: 0.4 }, barrel);
    const wheel = S.g(g);
    S.svg('circle', { r: 50, fill: '#8a5a3c', stroke: INK, 'stroke-width': LW }, wheel);
    for (let i = 0; i < 6; i++) S.svg('line', { x1: 0, y1: 0, x2: f(Math.sin(rad(i * 60)) * 44), y2: f(-Math.cos(rad(i * 60)) * 44), stroke: INK, 'stroke-width': 4 }, wheel);
    S.svg('circle', { r: 10, fill: INK }, wheel);
    S.put(wheel, { y: -50 });
    const c = {
      g,
      barrel,
      // aim in degrees (negative is up); recoil in px, back along the barrel
      set({ aim = -12, recoil = 0 } = {}) {
        S.put(barrel, { x: -recoil * Math.cos(rad(aim)), y: -50 - recoil * Math.sin(rad(aim)), r: aim });
      },
      // the muzzle, relative to the cannon's origin
      muzzle: (aim = -12) => [168 * Math.cos(rad(aim)), -50 + 168 * Math.sin(rad(aim))],
    };
    c.set();
    return c;
  };

  // A tumbleweed, centred on (0, 0); spin `ball` to roll it.
  C.tumbleweed = function (parent, { r = 60 } = {}) {
    const g = S.g(parent);
    const ball = S.g(g);
    for (let i = 0; i < 7; i++) {
      S.svg('ellipse', { rx: f(r * (0.7 + (0.3 * ((i * 37) % 10)) / 10)), ry: f(r * (0.45 + (0.2 * ((i * 53) % 10)) / 10)), transform: `rotate(${i * 26})`, fill: 'none', stroke: '#8a6a44', 'stroke-width': 4 }, ball);
    }
    S.svg('circle', { r: r * 0.95, fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '10 16', opacity: 0.6 }, ball);
    return { g, ball };
  };

  // A small office building standing on (0, 0); recolour `body` to pick it out.
  C.building = function (parent, { w = 90, h = 130, fill = PAPER } = {}) {
    const g = S.g(parent);
    const body = S.svg('rect', { x: -w / 2, y: -h, width: w, height: h, rx: 6, fill, stroke: INK, 'stroke-width': 4 }, g);
    const cols = Math.max(2, Math.round(w / 34));
    const rows = Math.max(2, Math.round((h - 40) / 30));
    const cw = (w - 20) / cols;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) S.svg('rect', { x: f(-w / 2 + 10 + i * cw + 3), y: f(-h + 12 + j * 30), width: f(cw - 6), height: 16, rx: 3, fill: INK, opacity: 0.8 }, g);
    S.svg('rect', { x: -12, y: -26, width: 24, height: 26, fill: INK }, g);
    return { g, body };
  };

  // A browser window, centred; draw the page into `ui` (origin at the content's top left).
  C.browser = function (parent, { w = 520, h = 330 } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 + 10, y: -h / 2 + 12, width: w, height: h, rx: 18, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 18, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    S.svg('path', { d: `M ${-w / 2} ${-h / 2 + 44} L ${w / 2} ${-h / 2 + 44}`, stroke: INK, 'stroke-width': LW }, g);
    [0, 1, 2].forEach((i) => S.svg('circle', { cx: -w / 2 + 26 + i * 24, cy: -h / 2 + 22, r: 7, fill: i === 0 ? ORANGE : SHADE, stroke: INK, 'stroke-width': 3 }, g));
    S.svg('rect', { x: -w / 2 + 110, y: -h / 2 + 12, width: w - 140, height: 20, rx: 10, fill: SHADE }, g);
    const ui = S.g(g);
    S.put(ui, { x: -w / 2, y: -h / 2 + 44 });
    return { g, ui, w, h: h - 44 };
  };

  C.magnifier = function (parent, { r = 50 } = {}) {
    const g = S.g(parent);
    S.svg('line', { x1: r * 0.7, y1: r * 0.7, x2: r * 1.7, y2: r * 1.7, stroke: INK, 'stroke-width': 16, 'stroke-linecap': 'round' }, g);
    S.svg('circle', { r, fill: '#dff1ff', 'fill-opacity': 0.55, stroke: INK, 'stroke-width': 9 }, g);
    S.svg('path', { d: `M ${-r * 0.55} ${-r * 0.1} A ${r * 0.56} ${r * 0.56} 0 0 1 ${-r * 0.1} ${-r * 0.55}`, fill: 'none', stroke: PAPER, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    return g;
  };

  // A shield with a tick.
  C.shield = function (parent, { r = 60, fill = ORANGE } = {}) {
    const g = S.g(parent);
    S.svg('path', { d: `M 0 ${-r} L ${r * 0.85} ${-r * 0.62} L ${r * 0.78} ${r * 0.1} C ${r * 0.66} ${r * 0.62} ${r * 0.3} ${r * 0.88} 0 ${r} C ${-r * 0.3} ${r * 0.88} ${-r * 0.66} ${r * 0.62} ${-r * 0.78} ${r * 0.1} L ${-r * 0.85} ${-r * 0.62} Z`, fill, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: `M ${-r * 0.36} ${-r * 0.02} L ${-r * 0.08} ${r * 0.28} L ${r * 0.4} ${-r * 0.3}`, fill: 'none', stroke: INK, 'stroke-width': r * 0.16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    return g;
  };

  // A conveyor belt from x0 to x1 with its top surface at y = 0; set(t) runs it.
  C.belt = function (parent, { x0 = 0, x1 = 1000, speed = 160, legs = 160 } = {}) {
    const g = S.g(parent);
    const r = 26;
    for (let x = x0 + 80; x < x1; x += 440) S.svg('rect', { x: x - 10, y: 2 * r - 4, width: 20, height: legs + 4, fill: INK }, g);
    S.svg('rect', { x: x0 - r, y: 0, width: x1 - x0 + 2 * r, height: 2 * r, rx: r, fill: '#6b6f7a', stroke: INK, 'stroke-width': LW }, g);
    const surf = S.svg('line', { x1: x0, y1: 6, x2: x1, y2: 6, stroke: INK, 'stroke-width': 4, 'stroke-dasharray': '26 22', opacity: 0.45 }, g);
    const rollers = [];
    for (let x = x0; x <= x1 + 1; x += 110) {
      const rg = S.g(g);
      S.svg('circle', { r: 15, fill: GRAY, stroke: INK, 'stroke-width': 4 }, rg);
      S.svg('line', { x1: -11, y1: 0, x2: 11, y2: 0, stroke: INK, 'stroke-width': 4 }, rg);
      rollers.push([rg, x]);
    }
    return {
      g,
      speed,
      set(t) {
        surf.setAttribute('stroke-dashoffset', f(-t * speed));
        rollers.forEach(([rg, x]) => S.put(rg, { x, y: r, r: (t * speed * 180) / (Math.PI * 15) }));
      },
    };
  };

  // A desk phone standing on (0, 0); ring(t, on) hops the handset.
  C.deskphone = function (parent) {
    const g = S.g(parent);
    S.svg('path', { d: 'M -70 0 L -54 -60 L 54 -60 L 70 0 Z', fill: INK, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, g);
    S.svg('circle', { cx: 0, cy: -30, r: 18, fill: PAPER, stroke: INK, 'stroke-width': 3 }, g);
    const handset = S.g(g);
    S.svg('path', { d: 'M -78 -58 C -80 -84 -60 -92 -48 -80 L -40 -70 L 40 -70 L 48 -80 C 60 -92 80 -84 78 -58 L 60 -56 L 50 -66 L -50 -66 L -60 -56 Z', fill: ORANGE, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, handset);
    const lines = S.g(g);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) S.svg('line', { x1: sx * 92, y1: -70 + (i - 1) * 22, x2: sx * 116, y2: -76 + (i - 1) * 30, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, lines);
    return {
      g,
      handset,
      ring(t, on = 1) {
        const k = on * Math.abs(Math.sin(t * 22));
        S.put(handset, { y: -14 * k, r: 6 * Math.sin(t * 22) * on });
        lines.style.visibility = on > 0.2 && Math.sin(t * 11) > 0 ? '' : 'hidden';
      },
    };
  };

  // A clipboard with a form: n fields with tick boxes and a submit button.
  // Returns the ticks (draw them with S.draw) and the button.
  C.clipboard = function (parent, { w = 300, h = 400, fields = 4, button = 'SUBMIT' } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 + 8, y: -h / 2 + 10, width: w, height: h, rx: 16, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: '#a86f4b', stroke: INK, 'stroke-width': LW }, g);
    S.svg('rect', { x: -w / 2 + 18, y: -h / 2 + 30, width: w - 36, height: h - 48, rx: 6, fill: PAPER, stroke: INK, 'stroke-width': 4 }, g);
    S.svg('rect', { x: -56, y: -h / 2 - 14, width: 112, height: 40, rx: 10, fill: GRAY, stroke: INK, 'stroke-width': LW }, g);
    S.svg('circle', { cx: 0, cy: -h / 2 - 2, r: 7, fill: PAPER, stroke: INK, 'stroke-width': 3 }, g);
    const ticks = [];
    const top = -h / 2 + 64;
    const gap = (h - 170) / fields;
    for (let i = 0; i < fields; i++) {
      const y = top + i * gap;
      S.svg('rect', { x: -w / 2 + 38, y, width: 26, height: 26, rx: 5, fill: PAPER, stroke: INK, 'stroke-width': 3.5 }, g);
      S.svg('rect', { x: -w / 2 + 78, y: y + 4, width: (w - 130) * (i % 2 ? 0.7 : 1), height: 8, rx: 4, fill: INK }, g);
      S.svg('rect', { x: -w / 2 + 78, y: y + 18, width: (w - 130) * 0.5, height: 6, rx: 3, fill: GRAY }, g);
      ticks.push(S.svg('path', { d: `M ${-w / 2 + 42} ${y + 13} L ${-w / 2 + 50} ${y + 21} L ${-w / 2 + 62} ${y + 5}`, fill: 'none', stroke: ORANGE, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g));
    }
    const btn = S.g(g);
    S.svg('rect', { x: -70, y: h / 2 - 78, width: 140, height: 44, rx: 10, fill: ORANGE, stroke: INK, 'stroke-width': 4 }, btn);
    const bt = S.svg('text', { x: 0, y: h / 2 - 49, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 18, 'letter-spacing': 2, fill: INK }, btn);
    bt.textContent = button;
    return { g, ticks, button: btn, buttonAt: [0, h / 2 - 56] };
  };

  // A half-dial gauge on (0, 0) (the hub); set(v) points the needle at v (0..1).
  C.gauge = function (parent, { r = 200, from = 0 } = {}) {
    const g = S.g(parent);
    const arc = (a0, a1, rr) => {
      const p = (a) => [Math.cos(rad(180 + a * 180)) * rr, Math.sin(rad(180 + a * 180)) * rr];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `M ${f(x0)} ${f(y0)} A ${rr} ${rr} 0 0 1 ${f(x1)} ${f(y1)}`;
    };
    S.svg('path', { d: `${arc(0, 1, r)} L ${-r} 0 Z`, fill: PAPER, stroke: INK, 'stroke-width': LW + 1, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: arc(0.02, 0.98, r - 30), fill: 'none', stroke: SHADE, 'stroke-width': 26 }, g);
    const band = S.svg('path', { d: arc(0.02, 0.98, r - 30), fill: 'none', stroke: ORANGE, 'stroke-width': 26 }, g);
    for (let i = 0; i <= 10; i++) {
      const a = rad(180 + i * 18);
      S.svg('line', { x1: f(Math.cos(a) * (r - 52)), y1: f(Math.sin(a) * (r - 52)), x2: f(Math.cos(a) * (r - 66)), y2: f(Math.sin(a) * (r - 66)), stroke: INK, 'stroke-width': i % 5 ? 3 : 5 }, g);
    }
    const needle = S.svg('path', { d: `M -10 0 L 0 ${-(r - 40)} L 10 0 Z`, fill: INK }, g);
    S.svg('circle', { r: 18, fill: ORANGE, stroke: INK, 'stroke-width': LW }, g);
    S.draw(band, from);
    return {
      g,
      set(v, fillTo = v) {
        S.put(needle, { r: -90 + 180 * v });
        S.draw(band, fillTo);
      },
    };
  };

  // A tear-off calendar pad on the wall, centred. setDay(text) writes the page;
  // flyer is a loose page for tearing off (write it with flyText).
  C.pad = function (parent, { w = 240, h = 280, label = 'DAY' } = {}) {
    const g = S.g(parent);
    S.svg('rect', { x: -w / 2 + 10, y: -h / 2 + 12, width: w, height: h, rx: 14, fill: INK }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14, fill: PAPER, stroke: INK, 'stroke-width': LW }, g);
    S.svg('path', { d: `M ${-w / 2} ${-h / 2 + 70} L ${-w / 2} ${-h / 2 + 14} Q ${-w / 2} ${-h / 2} ${-w / 2 + 14} ${-h / 2} L ${w / 2 - 14} ${-h / 2} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + 14} L ${w / 2} ${-h / 2 + 70} Z`, fill: ORANGE, stroke: INK, 'stroke-width': LW }, g);
    for (const x of [-w / 4, w / 4]) S.svg('rect', { x: x - 7, y: -h / 2 - 18, width: 14, height: 34, rx: 7, fill: PAPER, stroke: INK, 'stroke-width': 4 }, g);
    const lab = S.svg('text', { x: 0, y: -h / 2 + 46, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 24, 'letter-spacing': 4, fill: INK }, g);
    lab.textContent = label;
    const num = S.svg('text', { x: 0, y: h / 2 - 50, 'text-anchor': 'middle', 'font-family': 'Archivo Variable', 'font-weight': 800, 'font-stretch': '125%', 'font-size': h * 0.5, fill: INK }, g);
    const flyer = S.g(g);
    S.svg('rect', { x: -w / 2, y: -h / 2 + 70, width: w, height: h - 70, rx: 8, fill: PAPER, stroke: INK, 'stroke-width': 4 }, flyer);
    const flyNum = S.svg('text', { x: 0, y: h / 2 - 50, 'text-anchor': 'middle', 'font-family': 'Archivo Variable', 'font-weight': 800, 'font-stretch': '125%', 'font-size': h * 0.5, fill: INK }, flyer);
    return {
      g,
      label: lab,
      flyer,
      setDay: (text) => (num.textContent = text),
      flyText: (text) => (flyNum.textContent = text),
    };
  };

  // A reminder bell, centred; swing `body` to ring it.
  C.bell = function (parent, { r = 40 } = {}) {
    const g = S.g(parent);
    const body = S.g(g);
    S.svg('circle', { cx: 0, cy: -r * 1.2, r: r * 0.18, fill: INK }, body);
    S.svg('path', { d: `M ${-r} ${r * 0.6} C ${-r * 0.9} ${-r * 0.2} ${-r * 0.75} ${-r * 1.1} 0 ${-r * 1.1} C ${r * 0.75} ${-r * 1.1} ${r * 0.9} ${-r * 0.2} ${r} ${r * 0.6} Z`, fill: ORANGE, stroke: INK, 'stroke-width': LW, 'stroke-linejoin': 'round' }, body);
    S.svg('rect', { x: -r * 1.12, y: r * 0.5, width: r * 2.24, height: r * 0.3, rx: r * 0.15, fill: ORANGE, stroke: INK, 'stroke-width': LW }, body);
    S.svg('circle', { cx: 0, cy: r * 0.98, r: r * 0.2, fill: INK }, body);
    return { g, body };
  };

  // A receipt or invoice with a torn bottom edge, centred.
  C.receipt = function (parent, { w = 90, h = 120, label = 'INVOICE' } = {}) {
    const g = S.g(parent);
    let d = `M ${-w / 2} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${h / 2}`;
    const n = 6;
    for (let i = 0; i < n; i++) d += ` L ${f(w / 2 - ((i + 0.5) * w) / n)} ${f(h / 2 - 10)} L ${f(w / 2 - ((i + 1) * w) / n)} ${h / 2}`;
    S.svg('path', { d: d + ' Z', fill: PAPER, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    const tx = S.svg('text', { x: 0, y: -h / 2 + 22, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': Math.round(w / 7.5), 'letter-spacing': 1, fill: INK }, g);
    tx.textContent = label;
    for (let i = 0; i < 3; i++) S.svg('rect', { x: -w / 2 + 12, y: -h / 2 + 36 + i * 18, width: (w - 24) * (i === 2 ? 0.5 : 1), height: 7, rx: 3.5, fill: GRAY }, g);
    return g;
  };

  // ---------- Props for the service boards ----------

  // A folder, centred; its tab on the top left.
  C.folder = function (parent, { w = 120, h = 90, fill = ORANGE } = {}) {
    const g = S.g(parent);
    S.svg('path', { d: `M ${-w / 2} ${-h / 2 + 10} L ${-w / 2} ${-h / 2 - 6} Q ${-w / 2} ${-h / 2 - 14} ${-w / 2 + 8} ${-h / 2 - 14} L ${-w / 2 + w * 0.36} ${-h / 2 - 14} L ${-w / 2 + w * 0.44} ${-h / 2 - 2} L ${w / 2 - 8} ${-h / 2 - 2} Q ${w / 2} ${-h / 2 - 2} ${w / 2} ${-h / 2 + 6} L ${w / 2} ${-h / 2 + 10} Z`, fill, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    S.svg('rect', { x: -w / 2, y: -h / 2 + 4, width: w, height: h - 4, rx: 8, fill, stroke: INK, 'stroke-width': 4 }, g);
    S.svg('path', { d: `M ${-w / 2 + 12} ${-h / 2 + 22} L ${w / 2 - 12} ${-h / 2 + 22}`, stroke: INK, 'stroke-width': 3, opacity: 0.25 }, g);
    return g;
  };

  // A page, centred, whose lines type in with set(p) (0..1). title: a heading bar.
  C.doc = function (parent, { w = 150, h = 190, lines = 6, title = true } = {}) {
    const g = S.g(parent);
    S.svg('path', { d: `M ${-w / 2} ${-h / 2} L ${w / 2 - 28} ${-h / 2} L ${w / 2} ${-h / 2 + 28} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z`, fill: PAPER, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    S.svg('path', { d: `M ${w / 2 - 28} ${-h / 2} L ${w / 2 - 28} ${-h / 2 + 28} L ${w / 2} ${-h / 2 + 28}`, fill: SHADE, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    const top = -h / 2 + (title ? 30 : 22);
    if (title) S.svg('rect', { x: -w / 2 + 16, y: -h / 2 + 16, width: w * 0.42, height: 12, rx: 6, fill: ORANGE, stroke: INK, 'stroke-width': 2.5 }, g);
    const gap = (h - (top + h / 2) - 18) / lines;
    const bars = [];
    for (let i = 0; i < lines; i++) {
      const full = (w - 36) * (i === lines - 1 ? 0.55 : i % 3 === 1 ? 0.85 : 1);
      bars.push([S.svg('rect', { x: -w / 2 + 18, y: top + 14 + i * gap, height: 8, rx: 4, fill: INK, opacity: 0.8 }, g), full]);
    }
    const d = {
      g,
      set(p) {
        bars.forEach(([b, full], i) => {
          const k = S.clamp(p * lines - i);
          b.setAttribute('width', f(Math.max(0.01, full * k)));
          b.style.visibility = k <= 0 ? 'hidden' : '';
        });
      },
    };
    d.set(1);
    return d;
  };

  // A four-point sparkle, the mark for "the system did this"; centred.
  C.sparkle = function (parent, { r = 26, fill = ORANGE } = {}) {
    const g = S.g(parent);
    const k = r * 0.28;
    S.svg('path', { d: `M 0 ${-r} Q ${k} ${-k} ${r} 0 Q ${k} ${k} 0 ${r} Q ${-k} ${k} ${-r} 0 Q ${-k} ${-k} 0 ${-r} Z`, fill, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, g);
    return g;
  };

  // A chat message: an avatar dot and a bubble with lines; side 1 or -1.
  C.chat = function (parent, { w = 170, side = 1, fill = PAPER, dot = ORANGE, lines = 2 } = {}) {
    const g = S.g(parent);
    const h = 26 + lines * 16;
    const bx = side > 0 ? -w / 2 + 34 : -w / 2;
    S.svg('circle', { cx: side > 0 ? -w / 2 + 12 : w / 2 - 12, cy: h / 2 - 12, r: 12, fill: dot, stroke: INK, 'stroke-width': 3 }, g);
    S.svg('rect', { x: bx, y: -h / 2, width: w - 34, height: h, rx: 14, fill, stroke: INK, 'stroke-width': 3.5 }, g);
    for (let i = 0; i < lines; i++) S.svg('rect', { x: bx + 14, y: -h / 2 + 14 + i * 16, width: (w - 62) * (i === lines - 1 ? 0.6 : 1), height: 7, rx: 3.5, fill: INK, opacity: 0.7 }, g);
    return g;
  };

  // A round count badge, centred; set(text).
  C.badge = function (parent, { r = 30, fill = ORANGE, size } = {}) {
    const g = S.g(parent);
    S.svg('circle', { r, fill, stroke: INK, 'stroke-width': 4 }, g);
    const tx = S.svg('text', { y: f(r * 0.34), 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': size ?? Math.round(r * 0.9), fill: INK }, g);
    return { g, set: (text) => (tx.textContent = text) };
  };

  // A small tag with text, centred.
  C.tag = function (parent, { text = '', fill = PAPER, size = 17, pad = 12 } = {}) {
    const g = S.g(parent);
    const w = text.length * size * 0.66 + pad * 2;
    S.svg('rect', { x: -w / 2, y: -size * 0.9, width: w, height: size * 1.8, rx: size * 0.4, fill, stroke: INK, 'stroke-width': 3 }, g);
    const tx = S.svg('text', { y: f(size * 0.34), 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': size, 'letter-spacing': 1, fill: INK }, g);
    tx.textContent = text;
    return g;
  };

  // A sound wave of n bars, centred; set(t, amp) moves it.
  C.wave = function (parent, { n = 11, w = 200, h = 70, fill = ORANGE } = {}) {
    const g = S.g(parent);
    const bw = w / n;
    const bars = Array.from({ length: n }, (_, i) => S.svg('rect', { x: f(-w / 2 + i * bw + bw * 0.2), width: f(bw * 0.6), rx: f(bw * 0.3), fill, stroke: INK, 'stroke-width': 2.5 }, g));
    return {
      g,
      set(t, amp = 1) {
        bars.forEach((b, i) => {
          const k = amp * (0.25 + 0.75 * Math.abs(Math.sin(t * 7 + i * 1.7) * Math.cos(t * 3.1 + i * 0.6)));
          const bh = Math.max(8, h * k);
          b.setAttribute('y', f(-bh / 2));
          b.setAttribute('height', f(bh));
        });
      },
    };
  };

  // Ground: a line with drafting hatches under it.
  C.ground = function (parent, { x0 = -2000, x1 = 4000, color = INK } = {}) {
    const g = S.g(parent);
    S.svg('line', { x1: x0, y1: 0, x2: x1, y2: 0, stroke: color, 'stroke-width': LW }, g);
    let d = '';
    for (let x = x0; x < x1; x += 26) d += `M ${x} 6 l -16 22 `;
    S.svg('path', { d, stroke: color, 'stroke-width': 2.5, opacity: 0.35 }, g);
    return g;
  };

  // A field of dots, like the site's gridlines.
  C.dots = function (parent, { x0 = 0, y0 = 0, w = 1920, h = 1080, gap = 48, color = INK, o = 0.12 } = {}) {
    const id = `dots${Math.random().toString(36).slice(2, 7)}`;
    const defs = S.svg('defs', {}, parent);
    const pat = S.svg('pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse' }, defs);
    S.svg('circle', { cx: gap / 2, cy: gap / 2, r: 2.2, fill: color, opacity: o }, pat);
    return S.svg('rect', { x: x0, y: y0, width: w, height: h, fill: `url(#${id})` }, parent);
  };
})();
