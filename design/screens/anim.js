// Motion for the living photos. Each screen's moving parts are pure functions of
// t, in seconds, so capture.mjs can step through them frame by frame. Nothing
// runs on a plain render (render.py): capture.mjs calls ANIM.init(), then
// ANIM.seek(t) per frame. At t <= 0 a screen looks exactly like its still.
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const out = (x) => 1 - Math.pow(1 - x, 3);
  const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ramp = (t, a, d, ease = inOut) => ease(clamp((t - a) / d));
  const setups = [];
  const tracks = [];

  const A = (window.ANIM = {
    clamp,
    out,
    inOut,
    ramp,
    // A highlight that lands at a and fades out by a + d.
    hit: (t, a, d = 1.8) => (t < a || t > a + d ? 0 : Math.pow(1 - (t - a) / d, 2)),
    // 1 from a to b, easing in and out over d.
    env: (t, a, b, d = 0.4) => Math.min(ramp(t, a, d, out), 1 - ramp(t, b, d)),
    // A cosine that peaks at t = phase; periods divide the 8 s loop, so it loops.
    wave: (t, period, phase = 0) => 0.5 + 0.5 * Math.cos(2 * Math.PI * ((t - phase) / period)),
    setup: (fn) => setups.push(fn),
    track: (fn) => tracks.push(fn),

    async init() {
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
      document.head.appendChild(style);
      await document.fonts.ready;
      for (const fn of setups) await fn();
      A.seek(0);
    },

    seek(t) {
      for (const fn of tracks) fn(t);
      return document.body.offsetHeight; // settle layout before the capture
    },

    $: (sel, root = document) => root.querySelector(sel),
    $$: (sel, root = document) => [...root.querySelectorAll(sel)],

    // An orange flag on an element (f from 0 to 1), the way the UI marks a change.
    glow(el, f) {
      if (el._shadow === undefined) {
        const s = getComputedStyle(el).boxShadow;
        el._shadow = s === 'none' ? '' : s;
      }
      el.style.boxShadow = f <= 0.002 ? '' : [A.flag(f), el._shadow].filter(Boolean).join(', ');
    },
    flag: (f) =>
      f <= 0.002
        ? ''
        : `inset 0 0 0 999px rgb(255 90 31 / ${(0.16 * f).toFixed(3)}), 0 0 0 1.5px rgb(255 122 61 / ${(0.9 * f).toFixed(3)}), 0 0 ${Math.round(26 * f)}px rgb(255 90 31 / ${(0.4 * f).toFixed(3)})`,

    // A card lifting off a board and landing (dx, dy) away, between a and a + d:
    // returns its transform and shadow for the moment t.
    flight(t, a, d, dx, dy) {
      const p = A.ramp(t, a, d);
      const lift = Math.sin(Math.PI * p);
      return {
        p,
        transform: `translate(${(dx * p).toFixed(2)}px, ${(dy * p).toFixed(2)}px) rotate(${(-1.6 * lift).toFixed(3)}deg) scale(${(1 + 0.05 * lift).toFixed(4)})`,
        shadow: lift > 0.01 ? `0 ${(18 * lift).toFixed(1)}px ${(40 * lift).toFixed(1)}px rgb(0 0 0 / ${(0.55 * lift).toFixed(3)})` : '',
      };
    },

    // A number inside an element, rewritten in its own format ('11,864', '62.4', '41').
    number(el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode()) && !/\d/.test(node.nodeValue));
      const m = node.nodeValue.match(/^([^\d]*)([\d,]*\d(?:\.\d+)?)(.*)$/s);
      const [, pre, n, post] = m;
      const dec = (n.split('.')[1] || '').length;
      const comma = n.includes(',');
      const value = parseFloat(n.replace(/,/g, ''));
      const set = (v) => {
        const s = comma
          ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
          : v.toFixed(dec);
        node.nodeValue = pre + s + post;
      };
      return { value, set };
    },

    // Steps a counter through [time, value] pairs, flashing its box on each change.
    counter(el, steps, box = el) {
      const n = A.number(el);
      A.track((t) => {
        let v = n.value;
        let at = -1;
        for (const [ts, val] of steps) if (t >= ts) (v = val), (at = ts);
        n.set(v);
        if (box) A.glow(box, at < 0 ? 0 : 0.55 * A.hit(t, at, 1.1));
      });
    },

    // Slides a toast or notification in at a and out at b.
    toast(el, a, b, dx = 0, dy = 16) {
      A.track((t) => {
        const e = A.env(t, a, b, 0.45);
        el.style.opacity = e.toFixed(3);
        el.style.visibility = e <= 0.001 ? 'hidden' : '';
        el.style.transform = `translate(${(dx * (1 - e)).toFixed(1)}px, ${(dy * (1 - e)).toFixed(1)}px) scale(${(0.97 + 0.03 * e).toFixed(4)})`;
      });
    },

    // Puts node in before ref and lets it open its own space from t = a: until then
    // the items after it sit on top of it, so the layout is the still's.
    insert(node, ref, a, { gap = 0, d = 0.6, flash = true } = {}) {
      ref.parentNode.insertBefore(node, ref);
      const h = node.getBoundingClientRect().height;
      A.track((t) => {
        const p = A.ramp(t, a, d, out);
        node.style.marginBottom = `${((p - 1) * (h + gap)).toFixed(2)}px`;
        node.style.opacity = A.ramp(t, a + d * 0.35, d * 0.65, out).toFixed(3);
        node.style.visibility = p <= 0 ? 'hidden' : '';
        if (flash) A.glow(node, A.hit(t, a + d * 0.4, 2.4));
      });
      return node;
    },

    // The same for a table row: it stays out of the layout until a, then its cells
    // open to full height while the rows under it slide down.
    insertRow(row, ref, a, { d = 0.6 } = {}) {
      ref.parentNode.insertBefore(row, ref);
      const cells = [...row.cells].map((td) => {
        const wrap = document.createElement('div');
        wrap.style.overflow = 'hidden';
        wrap.append(...td.childNodes);
        td.append(wrap);
        const cs = getComputedStyle(td);
        return { td, wrap, h: wrap.getBoundingClientRect().height, pt: parseFloat(cs.paddingTop), pb: parseFloat(cs.paddingBottom) };
      });
      A.track((t) => {
        const p = A.ramp(t, a, d, out);
        row.style.display = p <= 0 ? 'none' : '';
        const f = A.hit(t, a + d * 0.4, 2.6);
        for (const [i, c] of cells.entries()) {
          c.wrap.style.height = `${(c.h * p).toFixed(2)}px`;
          c.wrap.style.opacity = A.ramp(t, a + d * 0.35, d * 0.65, out).toFixed(3);
          c.td.style.paddingTop = `${(c.pt * p).toFixed(2)}px`;
          c.td.style.paddingBottom = `${(c.pb * p).toFixed(2)}px`;
          c.td.style.background = f > 0.002 ? `rgb(255 90 31 / ${(0.15 * f).toFixed(3)})` : '';
          if (i === 0) c.td.style.boxShadow = f > 0.002 ? `inset 3px 0 0 rgb(255 122 61 / ${f.toFixed(3)})` : '';
        }
      });
      return row;
    },

    // Turns an element into another at t: the child marked data-a-from gives way
    // to the one marked data-a-to (shown as its data-display), and the new state
    // (or its child marked data-a-glow) flashes.
    swap(el, at) {
      const from = A.$('[data-a-from]', el);
      const to = A.$('[data-a-to]', el);
      const flash = A.$('[data-a-glow]', to) || to;
      const show = (node, on) => (node.style.display = on ? node.dataset.display || '' : 'none');
      A.track((t) => {
        const on = t >= at;
        show(from, !on);
        show(to, on);
        A.glow(flash, on ? 0.9 * A.hit(t, at, 1.4) : 0);
      });
    },

    // A soft ring that grows out of a chart's end point every `period` seconds.
    ring(svg, period = 2, phase = 0.4) {
      const dot = svg.querySelector('circle.end');
      if (!dot) return;
      const ring = dot.cloneNode();
      ring.removeAttribute('class');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', dot.getAttribute('stroke'));
      dot.before(ring);
      const r0 = Number(dot.getAttribute('r'));
      A.track((t) => {
        const k = (((t - phase) % period) + period) % period / period;
        ring.setAttribute('r', (r0 + 22 * out(k)).toFixed(2));
        ring.setAttribute('stroke-width', (3 * (1 - k)).toFixed(2));
        ring.setAttribute('opacity', (t < phase ? 0 : 0.9 * (1 - k)).toFixed(3));
      });
    },

    // Runs a pulse down the wires app.js drew into svg[data-wires]: hops are
    // [wire index, start] pairs (wires in data-wires order), each taking d seconds.
    pulses(svg, hops, d = 0.45) {
      const NS = 'http://www.w3.org/2000/svg';
      const wires = [...svg.querySelectorAll('path')];
      const blur = document.createElementNS(NS, 'filter');
      blur.id = 'pulse-blur';
      blur.setAttribute('x', '-50%');
      blur.setAttribute('y', '-50%');
      blur.setAttribute('width', '200%');
      blur.setAttribute('height', '200%');
      blur.innerHTML = '<feGaussianBlur stdDeviation="4"></feGaussianBlur>';
      svg.prepend(blur);
      for (const [i, a] of hops) {
        const len = wires[i].getTotalLength();
        const seg = Math.min(120, len * 0.7);
        const layers = [
          ['#ff7a3d', 10, 0.8, 'url(#pulse-blur)'],
          ['#ffd7c2', 3, 1, ''],
        ].map(([stroke, width, opacity, filter]) => {
          const p = wires[i].cloneNode();
          p.setAttribute('stroke', stroke);
          p.setAttribute('stroke-width', width);
          p.setAttribute('stroke-linecap', 'round');
          p.setAttribute('opacity', opacity);
          p.setAttribute('stroke-dasharray', `${seg} ${len + seg}`);
          if (filter) p.setAttribute('filter', filter);
          svg.appendChild(p);
          return p;
        });
        A.track((t) => {
          const k = A.ramp(t, a, d, (x) => x);
          const on = k > 0 && k < 1;
          for (const p of layers) {
            p.setAttribute('stroke-dashoffset', (seg - A.inOut(k) * (len + seg)).toFixed(2));
            p.style.visibility = on ? '' : 'hidden';
          }
        });
      }
    },

    // Gently breathes an element (live dots): 1 at t = 0, as in the still.
    breathe(el, period = 2, low = 0.35) {
      A.track((t) => {
        el.style.opacity = (low + (1 - low) * A.wave(t, period)).toFixed(3);
      });
    },

    // Places a copy-free overlay element exactly over a rect of the page.
    pin(node, rect, parent = document.body) {
      const box = parent.getBoundingClientRect();
      Object.assign(node.style, {
        position: 'absolute',
        left: `${rect.left - box.left}px`,
        top: `${rect.top - box.top}px`,
        width: `${rect.width}px`,
        margin: 0,
      });
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      parent.appendChild(node);
      return node;
    },

    html(markup) {
      const t = document.createElement('template');
      t.innerHTML = markup.trim();
      const node = t.content.firstElementChild;
      window.ICONS &&
        node.querySelectorAll('[data-i]').forEach((i) => (i.innerHTML = ICONS.lucide[i.dataset.i] || ''));
      return node;
    },
  });
})();
