// The clip engine. A clip is an HTML page (design/clips/<name>.html) whose every
// frame is a pure function of t, in seconds: scenes register tracks, and
// STAGE.seek(t) runs them all. render.mjs steps t frame by frame in headless
// Chrome and pipes the screenshots to ffmpeg. Opened in a browser with
// ?play, a clip plays itself in real time (with a scrubber) for previewing.
//
// Layout: #stage is W x H. Inside it, svg#art holds the drawing (its g#cam is
// the camera) and div#hud holds HTML text above it (div#hud-cam follows the
// camera, for labels that belong to the world).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const c1 = 1.70158;
  const E = {
    linear: (x) => x,
    in: (x) => x * x * x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    back: (x) => 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
    backIn: (x) => (c1 + 1) * x * x * x - c1 * x * x,
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    elastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin(((x * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
  };

  const tracks = [];
  const lates = [];
  const setups = [];

  const S = (window.STAGE = {
    W: 1920,
    H: 1080,
    duration: 10,
    fps: 30,
    E,
    clamp,
    lerp,

    // 0 before a, eased 0..1 over d seconds.
    ramp: (t, a, d, ease = E.inOut) => ease(clamp((t - a) / d)),
    // 1 from a to b, easing in over din and out over dout.
    env: (t, a, b, din = 0.4, dout = din, ease = E.inOut) =>
      Math.min(ease(clamp((t - a) / din)), 1 - ease(clamp((t - b) / dout))),
    // A flash that lands at a and fades by a + d.
    hit: (t, a, d = 1) => (t < a || t > a + d ? 0 : Math.pow(1 - (t - a) / d, 2)),
    // A cosine between 0 and 1 that peaks at t = phase.
    wave: (t, period, phase = 0) => 0.5 + 0.5 * Math.cos((2 * Math.PI * (t - phase)) / period),
    // Settles from 0 to 1 from t = a, overshooting like a spring.
    spring(t, a, { freq = 2.2, damp = 0.32 } = {}) {
      const u = t - a;
      if (u <= 0) return 0;
      const w = 2 * Math.PI * freq;
      return 1 - Math.exp(-damp * w * u) * Math.cos(w * Math.sqrt(1 - damp * damp) * u);
    },
    // Keyframes: [[time, value, ease?], ...]. A value is a number or an array of
    // numbers; each key's ease shapes the segment that ends on it.
    kf(t, keys) {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 1; i < keys.length; i++) {
        const [t1, v1, ease = E.inOut] = keys[i];
        if (t <= t1) {
          const [t0, v0] = keys[i - 1];
          const p = ease(t1 === t0 ? 1 : (t - t0) / (t1 - t0));
          return Array.isArray(v0) ? v0.map((x, k) => lerp(x, v1[k], p)) : lerp(v0, v1, p);
        }
      }
      return keys[keys.length - 1][1];
    },
    // Smooth deterministic noise in -1..1 (for wobble and jitter).
    noise(seed, t) {
      const h = (n) => {
        const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
        return s - Math.floor(s);
      };
      const i = Math.floor(t);
      const f = t - i;
      const u = f * f * (3 - 2 * f);
      return lerp(h(i), h(i + 1), u) * 2 - 1;
    },
    // Hand-held: the same t gives the same step, so held frames repeat exactly.
    step: (t, fps = 8) => Math.floor(t * fps) / fps,

    setup: (fn) => setups.push(fn),
    track: (fn) => tracks.push(fn),
    // A track that runs after every other one, camera included, so it can
    // measure where things landed on screen this frame.
    late: (fn) => lates.push(fn),

    async init() {
      const meta = document.querySelector('meta[name="clip"]');
      if (meta) {
        const [, w, h, d] = meta.content.match(/(\d+)x(\d+)\s+([\d.]+)s/);
        Object.assign(S, { W: +w, H: +h, duration: +d });
      }
      const stage = document.getElementById('stage');
      stage.style.width = `${S.W}px`;
      stage.style.height = `${S.H}px`;
      S.art.setAttribute('viewBox', `0 0 ${S.W} ${S.H}`);
      await document.fonts.ready;
      for (const fn of setups) await fn(S);
      S.seek(0);
    },

    seek(t) {
      S.t = t;
      for (const fn of tracks) fn(t);
      for (const fn of lates) fn(t);
      return document.body.offsetHeight;
    },

    // How far el's box sits inside the frame, from its nearest edge, in stage
    // px (negative once an edge cuts it), measured after the camera moved.
    inset(el) {
      const st = document.getElementById('stage').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return Math.min(r.left - st.left, st.right - r.right, r.top - st.top, st.bottom - r.bottom) / (st.width / S.W);
    },
    // An edge fade for el at t: 0 while it sits under a px inside the frame, 1
    // from a + span in. A fast pan can carry a thing across the whole ramp
    // between two frames (a pop), so the fade is averaged over the frames either
    // side, with el where the camera carries it then (held still in the world):
    // in a pan it takes five frames, and with the camera still nothing changes.
    edgeFade(el, a, span, t = S.t) {
      const st = document.getElementById('stage').getBoundingClientRect();
      const q = st.width / S.W;
      const r = el.getBoundingClientRect();
      const box = [(r.left - st.left) / q, (r.top - st.top) / q, (r.right - st.left) / q, (r.bottom - st.top) / q];
      const keys = S.camKeys;
      const [cx, cy, z] = keys ? S.kf(t, keys) : [];
      let sum = 0;
      for (let k = -2; k <= 2; k++) {
        let [l, tp, rt, b] = box;
        if (keys && k) {
          // screen -> world with the camera now -> screen with the camera then
          const [cx2, cy2, z2] = S.kf(t + k / S.fps, keys);
          const X = (x) => S.W / 2 + z2 * (cx - cx2 + (x - S.W / 2) / z);
          const Y = (y) => S.H / 2 + z2 * (cy - cy2 + (y - S.H / 2) / z);
          [l, tp, rt, b] = [X(l), Y(tp), X(rt), Y(b)];
        }
        sum += clamp((Math.min(l, S.W - rt, tp, S.H - b) - a) / span);
      }
      return sum / 5;
    },

    // ---------- SVG ----------

    svg(tag, attrs = {}, parent) {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
      if (parent) parent.appendChild(e);
      return e;
    },
    g: (parent, attrs = {}) => S.svg('g', attrs, parent),
    // Positions an SVG node: {x, y, r (deg), s, sx, sy, o, ox, oy (pivot)}.
    put(node, { x = 0, y = 0, r = 0, s = 1, sx = s, sy = s, o, ox = 0, oy = 0 } = {}) {
      let tf = `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
      if (r) tf += ` rotate(${r.toFixed(3)})`;
      if (sx !== 1 || sy !== 1) tf += ` scale(${sx.toFixed(4)} ${sy.toFixed(4)})`;
      if (ox || oy) tf += ` translate(${(-ox).toFixed(2)} ${(-oy).toFixed(2)})`;
      node.setAttribute('transform', tf);
      if (o !== undefined) {
        node.setAttribute('opacity', clamp(o).toFixed(3));
        node.style.visibility = o <= 0.001 ? 'hidden' : '';
      }
      return node;
    },
    // Reveals a stroked path from 0 to p (0..1) of its length.
    draw(path, p) {
      if (!path._len) {
        path._len = path.getTotalLength();
        path.setAttribute('stroke-dasharray', `${path._len} ${path._len + 1}`);
      }
      path.setAttribute('stroke-dashoffset', ((1 - clamp(p)) * path._len).toFixed(2));
      path.style.visibility = p <= 0.001 ? 'hidden' : '';
    },

    // ---------- HTML text ----------

    html(markup, parent = S.hud) {
      const tpl = document.createElement('template');
      tpl.innerHTML = markup.trim();
      const node = tpl.content.firstElementChild;
      parent.appendChild(node);
      return node;
    },
    // Wraps each word of el in a span (keeping inner markup such as <em>), and
    // returns the spans.
    words(el) {
      const out = [];
      const walk = (node) => {
        for (const child of [...node.childNodes]) {
          if (child.nodeType === 3) {
            const parts = child.nodeValue.split(/(\s+)/);
            const frag = document.createDocumentFragment();
            for (const p of parts) {
              if (!p) continue;
              if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
              else {
                const w = document.createElement('span');
                w.className = 'w';
                w.textContent = p;
                frag.appendChild(w);
                out.push(w);
              }
            }
            child.replaceWith(frag);
          } else if (child.nodeType === 1) walk(child);
        }
      };
      walk(el);
      return out;
    },
    // Words rise into place one after another from a, and leave together at b.
    rise(t, spans, a, { stagger = 0.06, d = 0.5, dy = 42, b = Infinity, out = 0.35 } = {}) {
      spans.forEach((w, i) => {
        const p = S.ramp(t, a + i * stagger, d, E.back);
        const q = S.ramp(t, b, out, E.in);
        const o = clamp(S.ramp(t, a + i * stagger, d * 0.6, E.out) - q);
        w.style.opacity = o.toFixed(3);
        w.style.transform = `translateY(${((1 - p) * dy + q * -dy * 0.6).toFixed(2)}px)`;
      });
    },
    // Types text into el, cps characters a second, from a. Returns progress.
    type(t, el, text, a, cps = 28) {
      const n = Math.floor(clamp((t - a) * cps, 0, text.length));
      el.textContent = text.slice(0, n);
      return n / text.length;
    },
    style(el, css) {
      for (const [k, v] of Object.entries(css)) el.style[k] = v;
    },

    // ---------- Camera ----------

    // keys: [[time, [cx, cy, zoom], ease?], ...]: the world point (cx, cy) sits at
    // the frame's centre, zoomed.
    camera(keys) {
      S.camKeys = keys;
      S.track((t) => {
        const [cx, cy, z] = S.kf(t, keys);
        const tf = `translate(${S.W / 2} ${S.H / 2}) scale(${z.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`;
        S.cam.setAttribute('transform', tf);
        S.hudCam.style.transform = `translate(${S.W / 2}px, ${S.H / 2}px) scale(${z.toFixed(4)}) translate(${(-cx).toFixed(2)}px, ${(-cy).toFixed(2)}px)`;
      });
    },

    // ---------- Preview ----------

    play() {
      const bar = document.createElement('div');
      bar.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:8px 12px;background:#121212;color:#f2efe8;font:12px monospace;z-index:9';
      bar.innerHTML = '<button>pause</button><input type="range" min="0" step="0.001" style="flex:1"><span></span>';
      document.body.appendChild(bar);
      const [btn, range, out] = bar.children;
      range.max = S.duration;
      let playing = true;
      let t0 = performance.now();
      let base = 0;
      btn.onclick = () => {
        playing = !playing;
        btn.textContent = playing ? 'pause' : 'play';
        base = S.t;
        t0 = performance.now();
      };
      range.oninput = () => {
        base = +range.value;
        t0 = performance.now();
        S.seek(base);
      };
      const tick = (now) => {
        if (playing) {
          const t = (base + (now - t0) / 1000) % S.duration;
          S.seek(t);
          range.value = t;
        }
        out.textContent = S.t.toFixed(2) + 's';
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const fit = () => {
        const k = Math.min(innerWidth / S.W, (innerHeight - 40) / S.H);
        document.getElementById('stage').style.transform = `scale(${k})`;
      };
      addEventListener('resize', fit);
      fit();
    },
  });

  S.art = document.getElementById('art');
  S.cam = document.getElementById('cam');
  S.hud = document.getElementById('hud');
  S.hudCam = document.getElementById('hud-cam');
  if (new URLSearchParams(location.search).has('play')) addEventListener('load', () => S.init().then(() => S.play()));
})();
