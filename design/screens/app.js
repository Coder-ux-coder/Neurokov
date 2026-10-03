// Shared helpers for the product screens: inline icons and small SVG charts.
// Runs in headless Chrome before the screenshot (see render.py).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const num = (s) => (s || '').split(',').filter(Boolean).map(Number);
  const el = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };

  // Icons: <i data-i="lucide-name"></i>, <i data-si="simple-icons-slug"></i>
  document.querySelectorAll('[data-i],[data-si]').forEach((node) => {
    const svg = node.dataset.i ? ICONS.lucide[node.dataset.i] : ICONS.si[node.dataset.si];
    if (svg) node.innerHTML = svg;
    else node.style.outline = '2px solid red';
  });

  // Monotone cubic through points (no overshoot), as an SVG path.
  function smooth(pts) {
    const n = pts.length;
    const m = [];
    const t = [];
    for (let i = 0; i < n - 1; i++) m[i] = (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) {
        t[i] = t[i + 1] = 0;
        continue;
      }
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        t[i] = k * a * m[i];
        t[i + 1] = k * b * m[i];
      }
    }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const h = (pts[i + 1][0] - pts[i][0]) / 3;
      d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(
        pts[i + 1][1] -
        t[i + 1] * h
      ).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
    }
    return d;
  }

  let gid = 0;
  const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name;

  // Line / area chart.
  // <svg data-line="1,2,3" [data-line2="..."] [data-max] [data-y="0,10,20"] [data-x="Mon,Tue"] [data-area] [data-color]>
  document.querySelectorAll('svg[data-line]').forEach((svg) => {
    const { width: W, height: H } = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const a = num(svg.dataset.line);
    const b = num(svg.dataset.line2);
    const ys = num(svg.dataset.y);
    const xs = (svg.dataset.x || '').split(',').filter(Boolean);
    const max = Number(svg.dataset.max) || Math.max(...a, ...b, ...ys) * 1.1;
    const min = Number(svg.dataset.min) || 0;
    const left = ys.length ? 34 : 0;
    const bottom = xs.length ? 22 : 0;
    const top = 6;
    const right = Number(svg.dataset.pad || 6);
    const px = (i, n) => left + (i / (n - 1)) * (W - left - right);
    const py = (v) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
    const stroke = color(svg.dataset.color || '--brand');

    ys.forEach((v) => {
      el('line', { x1: left, x2: W - right, y1: py(v), y2: py(v), stroke: 'rgba(255,255,255,.06)', 'stroke-dasharray': '3 4' }, svg);
      el('text', { x: left - 10, y: py(v) + 4, 'text-anchor': 'end', class: 'axis' }, svg).textContent = svg.dataset.fmt
        ? svg.dataset.fmt.replace('#', v)
        : v;
    });
    xs.forEach((label, i) => {
      el('text', { x: px(i, xs.length), y: H - 4, 'text-anchor': i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle', class: 'axis' }, svg).textContent = label;
    });

    if (b.length) {
      const pb = b.map((v, i) => [px(i, b.length), py(v)]);
      el('path', { d: smooth(pb), fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
    }
    const pa = a.map((v, i) => [px(i, a.length), py(v)]);
    if (svg.hasAttribute('data-area')) {
      const id = `g${gid++}`;
      const grad = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
      el('stop', { offset: '0%', 'stop-color': stroke, 'stop-opacity': 0.38 }, grad);
      el('stop', { offset: '100%', 'stop-color': stroke, 'stop-opacity': 0 }, grad);
      const base = py(min);
      el('path', { d: `${smooth(pa)} L${pa[pa.length - 1][0]},${base} L${pa[0][0]},${base} Z`, fill: `url(#${id})` }, svg);
    }
    el('path', { d: smooth(pa), fill: 'none', stroke, 'stroke-width': Number(svg.dataset.w || 2.2), 'stroke-linecap': 'round' }, svg);
    if (svg.hasAttribute('data-dot')) {
      const [x, y] = pa[pa.length - 1];
      el('circle', { cx: x, cy: y, r: 9, fill: stroke, opacity: 0.18 }, svg);
      el('circle', { cx: x, cy: y, r: 4, fill: '#fff', stroke, 'stroke-width': 2.5, class: 'end' }, svg);
    }
  });

  // Bar chart. <svg data-bars="1,2,3" [data-bars2] [data-hi="last|n"] [data-max] [data-x] [data-y]>
  document.querySelectorAll('svg[data-bars]').forEach((svg) => {
    const { width: W, height: H } = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const a = num(svg.dataset.bars);
    const b = num(svg.dataset.bars2);
    const ys = num(svg.dataset.y);
    const xs = svg.dataset.x ? svg.dataset.x.split(',') : []; // one per bar, blanks allowed
    const max = Number(svg.dataset.max) || Math.max(...a, ...b, ...ys) * 1.08;
    const left = ys.length ? 34 : 0;
    const bottom = xs.length ? 22 : 0;
    const top = 6;
    const slot = (W - left) / a.length;
    const bw = Math.min(slot * (b.length ? 0.32 : 0.56), Number(svg.dataset.bw || 40));
    const py = (v) => top + (1 - v / max) * (H - top - bottom);
    const hi = svg.dataset.hi === 'last' ? a.length - 1 : svg.dataset.hi ? Number(svg.dataset.hi) : -1;
    const id = `g${gid++}`;
    const grad = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
    el('stop', { offset: '0%', 'stop-color': color('--brand-2') }, grad);
    el('stop', { offset: '100%', 'stop-color': color('--brand'), 'stop-opacity': 0.75 }, grad);

    ys.forEach((v) => {
      el('line', { x1: left, x2: W, y1: py(v), y2: py(v), stroke: 'rgba(255,255,255,.06)', 'stroke-dasharray': '3 4' }, svg);
      el('text', { x: left - 10, y: py(v) + 4, 'text-anchor': 'end', class: 'axis' }, svg).textContent = svg.dataset.fmt
        ? svg.dataset.fmt.replace('#', v)
        : v;
    });
    const bar = (x, v, fill, opacity) => {
      const y = py(v);
      const h = py(0) - y;
      const r = Math.min(4, bw / 2, h);
      el('path', { d: `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + h} Z`, fill, opacity }, svg);
    };
    a.forEach((v, i) => {
      const cx = left + slot * (i + 0.5);
      if (b.length) {
        bar(cx - bw - 2, b[i], 'rgba(255,255,255,.14)', 1);
        bar(cx + 2, v, `url(#${id})`, 1);
      } else {
        bar(cx - bw / 2, v, i === hi || hi < 0 ? `url(#${id})` : 'rgba(255,154,107,.34)', 1);
      }
      if (xs[i]) {
        const edge = i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle';
        const x = edge === 'start' ? cx - bw / 2 : edge === 'end' ? cx + bw / 2 : cx;
        el('text', { x, y: H - 4, 'text-anchor': edge, class: 'axis' }, svg).textContent = xs[i];
      }
    });
  });

  // Donut. <svg data-donut="48,31,21" data-colors="--brand,#ff9a6b,#34344a" [data-w="14"]>
  document.querySelectorAll('svg[data-donut]').forEach((svg) => {
    const { width: W, height: H } = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const vals = num(svg.dataset.donut);
    const cols = svg.dataset.colors.split(',');
    const sw = Number(svg.dataset.w || 14);
    const r = Math.min(W, H) / 2 - sw / 2 - 1;
    const c = 2 * Math.PI * r;
    const total = vals.reduce((s, v) => s + v, 0);
    const gap = Number(svg.dataset.gap ?? 3);
    let off = 0;
    el('circle', { cx: W / 2, cy: H / 2, r, fill: 'none', stroke: 'rgba(255,255,255,.05)', 'stroke-width': sw }, svg);
    vals.forEach((v, i) => {
      const len = (v / total) * c;
      el('circle', {
        cx: W / 2,
        cy: H / 2,
        r,
        fill: 'none',
        stroke: cols[i].startsWith('--') ? color(cols[i]) : cols[i],
        'stroke-width': sw,
        'stroke-dasharray': `${Math.max(0, len - gap)} ${c}`,
        'stroke-dashoffset': -off,
        transform: `rotate(-90 ${W / 2} ${H / 2})`,
      }, svg);
      off += len;
    });
  });

  // Connectors between nodes on a canvas: <svg class="wires" data-wires="a>b,b>c"> ; nodes carry id + data-port
  document.querySelectorAll('svg[data-wires]').forEach((svg) => {
    const box = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.dataset.wires.split(',').forEach((pair) => {
      const [from, to, kind] = pair.trim().split(/[>:]/);
      const a = document.getElementById(from).getBoundingClientRect();
      const b = document.getElementById(to).getBoundingClientRect();
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const x2 = b.left - box.left;
      const y2 = b.top + b.height / 2 - box.top;
      const dx = Math.max(40, (x2 - x1) / 2);
      const hot = kind === 'hot';
      el('path', {
        d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
        fill: 'none',
        stroke: hot ? color('--brand-2') : kind === 'dim' ? 'rgba(255,255,255,.2)' : 'rgba(255,154,107,.78)',
        'stroke-width': hot ? 2.4 : 2,
      }, svg);
      el('circle', { cx: x1, cy: y1, r: 3.5, fill: '#1b1b24', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }, svg);
      el('circle', { cx: x2, cy: y2, r: 3.5, fill: '#1b1b24', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }, svg);
    });
  });

  document.documentElement.dataset.ready = '1';
})();
