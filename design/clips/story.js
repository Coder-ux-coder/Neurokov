// The storytelling kit the clips share: acts that come and go, headlines that
// rise word by word, orange wipes between acts, the camera with its shakes, a
// closing card with the real number, and the footnote that says the story is
// illustrated. STORY(acts) binds it to one clip: acts is [[start, end], ...]
// in seconds. Wherever a helper takes an act, a [start, end] range works too.
(function () {
  const S = window.STAGE;
  const { E, ramp } = S;

  window.STORY = function (acts) {
    const within = (t, [a, b]) => t >= a && t < b;
    const span = (i) => (Array.isArray(i) ? i : acts[i]);

    const K = {
      acts,
      within,

      // A world group (under the camera) that shows only during act i.
      act(i, parent = S.cam) {
        const g = S.g(parent);
        S.track((t) => (g.style.visibility = K.shows(t, i) ? '' : 'hidden'));
        return g;
      },

      // Shows an HTML element only during act i.
      hudAct(el, i) {
        S.track((t) => (el.style.visibility = K.shows(t, i) ? '' : 'hidden'));
        return el;
      },

      // Whether act i is up at t. The act the closing card ends stays up until
      // the card's wipe has covered it, so the wipe never uncovers a bare stage.
      shows(t, i) {
        const [a, b] = span(i);
        return within(t, [a, b]) || (b === K.cardAt && t >= b && t < b + 0.6);
      },

      // 1 for the few frames of a blink after each of times.
      blinkAt: (t, times) => (times.some((a) => t >= a && t < a + 0.12) ? 1 : 0),

      // A prop's scale as it pops in at a and out at b: up from nothing on a spring
      // (a third of its size on its first frame, then a little overshoot), and
      // smoothly back down to nothing over the d seconds before b. Shown or hidden
      // in one frame, a prop blinked; pair it with the same a and b for opacity.
      pop: (t, a, b = Infinity, d = 0.2) =>
        Math.max(0.001, Math.min(1.1, S.spring(t, a, { freq: 2.6, damp: 0.45 })) * (1 - ramp(t, b - d, d, E.inOut))),

      // Talking: a mouth that opens and closes between a and b.
      talk: (t, a, b, rate = 9) => (t >= a && t < b && Math.sin((t - a) * rate * Math.PI) > -0.2 ? 'open' : 'smile'),

      // An interior: wall, floor and the drafting ground line.
      room(g, { floor = 860, wall = '#343945', ground = '#2b2f39' } = {}) {
        S.svg('rect', { x: -600, y: -600, width: 3200, height: floor + 606, fill: wall }, g);
        S.svg('rect', { x: -600, y: floor + 6, width: 3200, height: 900, fill: ground }, g);
        CAST.ground(g).setAttribute('transform', `translate(0 ${floor})`);
        return g;
      },

      // Outdoors on paper: the dotted grid and the ground line.
      paper(g, { floor = 870 } = {}) {
        CAST.dots(g, { x0: -600, y0: -600, w: 3200, h: 2400 });
        CAST.ground(g).setAttribute('transform', `translate(0 ${floor})`);
        return g;
      },

      // The act's big line, top left, under its kicker. The headline owns the
      // frame's top left (x < 1100, y < 360), so sets keep that corner clear.
      headline(i, kicker, html, at, leave, { dark = true, x = 112, y = 146, size } = {}) {
        const ink = dark ? '#f2efe8' : '#121212';
        const k = S.html(`<div class="mono kicker" style="left:${x + 8}px;top:${y - 50}px;color:${ink}">${kicker}</div>`);
        const h = S.html(`<h1 class="headline${dark ? ' on-dark' : ''}" style="left:${x}px;top:${y}px${size ? `;font-size:${size}px` : ''}">${html}</h1>`);
        const words = S.words(h);
        K.hudAct(k, i);
        K.hudAct(h, i);
        S.track((t) => {
          k.style.opacity = (ramp(t, at - 0.15, 0.3) * (1 - ramp(t, leave, 0.3))).toFixed(3);
          S.rise(t, words, at, { stagger: 0.07, b: leave });
        });
        return { k, h };
      },

      // Orange wipes between acts: [[time, label], ...]. Each slides in, holds a
      // beat to read, and slides out; the act changes behind it at time.
      wipes(list) {
        const wipe = S.html('<div class="wipe"><span></span></div>');
        const txt = wipe.firstElementChild;
        S.track((t) => {
          const w = list.find(([at]) => t > at - 0.42 && t < at + 0.7);
          if (!w) return (wipe.style.visibility = 'hidden');
          const [at, label] = w;
          const x = t < at ? -130 * (1 - E.out(ramp(t, at - 0.42, 0.42, E.linear))) : 130 * E.in(ramp(t, at + 0.3, 0.4, E.linear));
          wipe.style.visibility = '';
          txt.textContent = label;
          wipe.style.transform = `translateX(${x.toFixed(2)}%) skewX(-8deg)`;
          txt.style.transform = `skewX(8deg) translateX(${(-x * 3).toFixed(1)}px)`;
        });
        return wipe;
      },

      // The footnote, bottom left. dark(t) says when it sits on a dark set.
      note(text, dark = () => true) {
        const n = S.html(`<div class="mono" style="left:120px;bottom:60px;font-size:17px;opacity:0.7">${text}</div>`);
        S.track((t) => (n.style.color = dark(t) ? '#f2efe8' : '#121212'));
        return n;
      },

      // The camera (see STAGE.camera), then shakes: [[time, seconds, strength], ...].
      camera(keys, shakes = []) {
        S.camera(keys);
        if (!shakes.length) return;
        S.track((t) => {
          const k = shakes.reduce((sum, [a, d, amp]) => sum + amp * S.hit(t, a, d), 0);
          if (k <= 0.001) return;
          const dx = 14 * k * S.noise(1, t * 30), dy = 10 * k * S.noise(2, t * 30);
          S.cam.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) ` + S.cam.getAttribute('transform'));
        });
      },

      // A rubber stamp that slams down at `at` (screen space, centred on x, y).
      stamp(html, { x, y, at, until = Infinity, rot = -8, size = 40, fill = '#ff4f00', color = '#121212' }) {
        const el = S.html(`<div class="mono" style="left:${x}px;top:${y}px;padding:10px 18px;background:${fill};color:${color};font-size:${size}px;font-weight:600;border:5px solid #121212">${html}</div>`);
        S.track((t) => {
          const st = S.spring(t, at, { freq: 3, damp: 0.35 });
          // (it lifts off over the last fifth of a second before until: cut, it blinked out)
          const off = ramp(t, until - 0.2, 0.2, E.in);
          el.style.visibility = t > at && t < until ? '' : 'hidden';
          el.style.opacity = (1 - off).toFixed(3);
          el.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${((2.2 - 1.2 * Math.min(st, 1.1)) * (1 + 0.12 * off)).toFixed(3)})`;
        });
        return el;
      },

      // Counts a number up in el between a and a + d; fmt formats it.
      count(t, el, from, to, a, d, fmt = (n) => String(Math.round(n))) {
        el.textContent = fmt(from + (to - from) * ramp(t, a, d, E.out));
      },

      // The closing card: a wipe to paper, the kicker, then the real number.
      //   swap:  { was, now, label }  — the old figure struck out, the new one in
      //   count: { big, count: [from, to, fmt?], label } — big holds <b data-n></b>
      //   text:  { big, label } — a line that rises word by word
      // cta: a small line under the label (e.g. the free audit). countFor: how
      // long the count runs, so the final number holds before the loop.
      endCard({ at, kicker, was, now, big, count, label = '', cta = '', size = 124, countFor = 1.1 }) {
        K.cardAt = at;
        const main = was
          ? `<span data-was style="position:relative;color:#9a948a">${was}<i data-strike style="position:absolute;left:-3%;right:-3%;top:50%;height:13px;background:#ff4f00;transform-origin:left"></i></span>
             <span data-arrow>→</span>
             <span data-now>${now}</span>`
          : `<span data-big>${big}</span>`;
        const end = S.html(`
          <div style="position:absolute;inset:0;background:#f2efe8;display:grid;align-content:center;padding:0 120px">
            <div class="mono kicker" style="position:static;margin-bottom:34px">${kicker}</div>
            <div class="endline" style="display:flex;align-items:baseline;gap:44px;font-weight:800;font-stretch:125%;letter-spacing:-0.04em;white-space:nowrap;font-size:${size}px;line-height:1">${main}</div>
            <div class="mono" style="position:static;margin-top:30px;font-size:24px;color:#6b665e">${label}</div>
            ${cta ? `<div data-cta class="mono" style="position:static;margin-top:44px;font-size:30px;font-weight:600;color:#121212"><span style="display:inline-block;padding:16px 24px;background:#ff4f00;border:5px solid #121212;box-shadow:8px 8px 0 #121212">${cta}</span></div>` : ''}
            <div style="position:absolute;right:120px;bottom:64px;display:flex;align-items:center;gap:16px;font-weight:800;font-stretch:125%;font-size:34px;letter-spacing:0.02em">
              <svg viewBox="0 0 32 32" width="46" height="46"><path d="M5 5h5v22H5zM22 5h5v22h-5z" fill="#121212"/><path d="M5 5h5l17 22h-5z" fill="#ff4f00"/></svg>NEUROKOV
            </div>
          </div>`);
        end.querySelectorAll('em').forEach((e) => Object.assign(e.style, { fontStyle: 'normal', color: '#ff4f00' }));
        const q = (s) => end.querySelector(s);
        const strike = q('[data-strike]'), arrow = q('[data-arrow]'), nowEl = q('[data-now]');
        const bigEl = q('[data-big]'), num = q('[data-n]'), ctaEl = q('[data-cta]');
        const words = bigEl && !count ? S.words(bigEl) : [];
        S.track((t) => {
          const p = ramp(t, at, 0.55, E.inOut);
          end.style.clipPath = `inset(0 0 0 ${((1 - p) * 100).toFixed(2)}%)`;
          end.style.visibility = p > 0 ? '' : 'hidden';
          if (strike) {
            strike.style.transform = `scaleX(${ramp(t, at + 0.6, 0.35, E.out).toFixed(3)})`;
            arrow.style.opacity = ramp(t, at + 0.75, 0.25).toFixed(3);
            arrow.style.transform = `translateX(${(-30 * (1 - ramp(t, at + 0.75, 0.35, E.back))).toFixed(1)}px)`;
            nowEl.style.opacity = ramp(t, at + 0.9, 0.25).toFixed(3);
            nowEl.style.display = 'inline-block';
            nowEl.style.transform = `scale(${(0.9 + 0.1 * ramp(t, at + 0.9, 0.4, E.back)).toFixed(3)})`;
          }
          if (count) {
            const [from, to, fmt] = count;
            K.count(t, num, from, to, at + 0.45, countFor, fmt);
            bigEl.style.display = 'inline-block';
            bigEl.style.opacity = ramp(t, at + 0.35, 0.25).toFixed(3);
            bigEl.style.transform = `scale(${(0.94 + 0.06 * ramp(t, at + 0.35, 0.5, E.back)).toFixed(3)})`;
          }
          if (words.length) S.rise(t, words, at + 0.4, { stagger: 0.07 });
          if (ctaEl) {
            ctaEl.style.opacity = ramp(t, at + 1.3, 0.3).toFixed(3);
            ctaEl.style.transform = `translateY(${(16 * (1 - ramp(t, at + 1.3, 0.4, E.back))).toFixed(1)}px)`;
          }
        });
        return end;
      },
    };

    // World labels (#hud-cam) fade out as the frame's edge reaches them, so the
    // camera never holds one cut in half.
    S.late((t) => {
      for (const el of S.hudCam.querySelectorAll('.chip, .mono')) {
        const k = S.edgeFade(el, 4, 24, t);
        el.style.filter = k < 1 ? `opacity(${k.toFixed(3)})` : '';
      }
    });
    return K;
  };
})();
