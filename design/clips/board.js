// The board the service clips play on: the system's steps as squares along a
// track, and NK-01 hopping from one to the next. At each landing the square
// lights up, its label plaque turns orange, and the step's card pops up behind
// it and plays its little scene. Once every square is lit, the camera pulls
// back to show the whole system running.
//
// BOARD(K, g, opts) draws into the act group g. opts:
//   steps  labels, in order
//   cards  one builder per step: (parent) => ({ g, set(u) }), drawn inside a
//          320 x 240 card centred on (0, 0); u is seconds since the landing
//   land   when NK-01 lands on the first square; per: seconds per square
//   x0, dx the first square's x and the gap between squares (world)
// It returns the camera keys for the act (from land - 1.4 to the pull-back)
// and the times of the landings.
(function () {
  const S = window.STAGE;
  const { E, ramp, env, hit } = S;
  const { INK, PAPER, ORANGE, GRAY, SHADE } = CAST;

  const TOP = 818; // the squares' top face (the floor line is at 870)
  const CARD_Y = 452; // the cards' centre
  const PLAQUE_Y = 942; // the label plaques, on the floor in front

  window.BOARD = function (K, g, { steps, cards, land, per, x0 = 560, dx = 600, blink = [], zoom = 1.1 }) {
    const n = steps.length;
    const xs = steps.map((_, i) => x0 + i * dx);
    const lands = steps.map((_, i) => land + i * per);
    const last = lands[n - 1];

    // The track between the squares: a dashed line, and an orange one drawn
    // behind NK-01 as it goes.
    const trackD = `M ${xs[0] - 200} ${TOP + 26} L ${xs[n - 1] + 200} ${TOP + 26}`;
    S.svg('path', { d: trackD, stroke: INK, 'stroke-width': 5, 'stroke-dasharray': '6 16', 'stroke-linecap': 'round', opacity: 0.35 }, g);
    const lit = S.svg('path', { d: trackD, fill: 'none', stroke: ORANGE, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);

    // Cards behind the squares, then the squares, then NK-01 on top. Each card
    // sits in a group that fades it out as the frame's edge reaches it.
    const holders = steps.map((_, i) => {
      const edge = S.g(g);
      const holder = S.g(edge);
      S.svg('rect', { x: -160 + 12, y: -120 + 14, width: 320, height: 240, rx: 20, fill: INK }, holder);
      const face = S.svg('rect', { x: -160, y: -120, width: 320, height: 240, rx: 20, fill: PAPER, stroke: INK, 'stroke-width': 5 }, holder);
      // a post from the card down to its square
      S.svg('rect', { x: -7, y: 120, width: 14, height: TOP - CARD_Y - 120, fill: INK }, holder);
      // (its scene shows once the card is nearly up: rising, its words would pass
      // behind NK-01's antenna)
      const inner = S.g(holder);
      const scene = cards[i](inner);
      return { edge, holder, face, inner, scene };
    });
    S.late((t) => holders.forEach(({ edge, face }) => edge.setAttribute('opacity', S.edgeFade(face, 16, 60, t).toFixed(3))));

    const squares = steps.map((_, i) => {
      const sg = S.g(g);
      S.svg('path', { d: 'M -150 0 L 150 0 L 150 30 Q 150 44 136 44 L -136 44 Q -150 44 -150 30 Z', fill: GRAY, stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, sg);
      const face = S.svg('rect', { x: -150, y: -34, width: 300, height: 44, rx: 14, fill: PAPER, stroke: INK, 'stroke-width': 5 }, sg);
      const num = S.svg('text', { x: 0, y: 34, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 600, 'font-size': 20, 'letter-spacing': 2, fill: INK }, sg);
      num.textContent = String(i + 1).padStart(2, '0');
      S.put(sg, { x: xs[i], y: TOP + 20 });
      // rays up and out only: the ones pointing down would cross the footnote
      const pop = CAST.burst(g, { color: ORANGE, r0: 150, r1: 210, width: 7, keep: (a) => a < 100 || a > 260 });
      S.put(pop.g, { x: xs[i], y: TOP });
      return { sg, face, pop };
    });

    // (up from just before NK-01 arrives, for as long as the act g is up)
    const plaques = steps.map((label, i) =>
      S.html(`<div class="chip plaque" style="left:${xs[i]}px;top:${PLAQUE_Y}px">${String(i + 1).padStart(2, '0')} · ${label}</div>`, S.hudCam),
    );

    const bot = CAST.robot(g);
    // NK-01 flies in from the right, low enough that even its antenna's glow
    // passes under the act's headline as it rises
    const flight = S.svg('path', { d: `M ${xs[0] + 1500} 450 C ${xs[0] + 900} 440 ${xs[0] + 350} 510 ${xs[0]} ${TOP - 130}`, fill: 'none' }, g);

    // Where NK-01 is at t: flying in, standing on a square, or hopping.
    const pose = (t) => {
      if (t < lands[0]) {
        if (!flight._len) flight._len = flight.getTotalLength();
        const p = ramp(t, lands[0] - 1.3, 1.3, E.out);
        const pt = flight.getPointAtLength(p * flight._len);
        return { x: pt.x, y: pt.y, air: 1 - p, flying: true, i: 0 };
      }
      let i = 0;
      while (i < n - 1 && t >= lands[i + 1] - 0.5) i++;
      const hopStart = lands[i] - 0.5;
      if (i > 0 && t < lands[i]) {
        const p = ramp(t, hopStart, 0.5, E.linear);
        // out from under the card it leaves first, then up and over: jumping
        // straight up would carry it across that card's lower corner and its words
        const e = E.sine(p);
        const x = xs[i - 1] + (xs[i] - xs[i - 1]) * e;
        const y = TOP - 130 - 190 * Math.sin(Math.PI * S.clamp((e - 0.34) / 0.66)) ** 2;
        return { x, y, air: Math.sin(Math.PI * p), hop: p, i };
      }
      return { x: xs[i], y: TOP - 130, air: 0, i };
    };

    S.track((t) => {
      const P = pose(t);
      const since = t - lands[P.i];
      const settle = since >= 0 && since < 1 ? 1 - S.spring(t, lands[P.i], { freq: 2.4, damp: 0.35 }) : 0;
      const squash = hit(t, lands[P.i], 0.3) - (P.hop !== undefined ? 0.6 * hit(t, lands[P.i] - 0.5, 0.15) : 0);
      const done = t > last + 0.3;
      const presenting = since > 0.25 && since < per - 0.6;
      bot.set({
        x: P.x,
        y: P.y + 16 * settle + (P.air ? 0 : 6 * Math.sin(t * 3)),
        s: 1.05,
        t,
        tilt: P.flying ? -20 * P.air : P.hop !== undefined ? 14 * Math.sin(Math.PI * P.hop) : 3 * settle,
        ground: TOP - P.y,
        flame: P.flying ? 0.4 + 0.6 * P.air : P.hop !== undefined ? 0.8 * P.air : 0,
        glow: 0.5 + 0.5 * S.wave(t, 0.7),
        arm: done
          ? [[25, -25], [150, -20 + 30 * Math.sin(t * 12)]]
          : presenting
            ? [[20, -20], [160 - 12 * Math.sin(t * 4), -40]]
            : [[20, -20], [-20, 20]],
        eyes: done ? 'happy' : P.air > 0.2 ? 'wide' : 'normal',
        look: presenting ? [0.2, -1] : [0.4, 0],
        squash: Math.max(-0.4, squash),
        blink: K.blinkAt(t, blink),
      });

      // the orange track follows NK-01 from the first square
      const span = xs[n - 1] - xs[0] + 400;
      S.draw(lit, t < lands[0] ? 0 : Math.min(1, (P.x - (xs[0] - 200)) / span));

      const shown = t >= land - 1.6 && g.style.visibility !== 'hidden';
      squares.forEach((sq, i) => {
        const on = t >= lands[i];
        sq.face.setAttribute('fill', on ? ORANGE : PAPER);
        sq.pop.set(ramp(t, lands[i], 0.45, E.linear));
        S.put(sq.sg, { x: xs[i], y: TOP + 20 + 8 * hit(t, lands[i], 0.3) });
        plaques[i].classList.toggle('is-off', !on);
        plaques[i].style.visibility = shown ? '' : 'hidden';
      });

      holders.forEach(({ holder, inner, scene }, i) => {
        const u = t - lands[i];
        const up = u < 0 ? 0 : Math.min(1.12, S.spring(t, lands[i] + 0.08, { freq: 2.2, damp: 0.42 }));
        S.put(holder, { x: xs[i], y: CARD_Y + (1 - Math.min(1, up)) * 260, sy: Math.max(0.001, up), sx: Math.max(0.001, 0.6 + 0.4 * up), o: u < 0 ? 0 : 1 });
        // (fading in from when the card is 0.8 up, a tenth of a second after it
        // starts: tied to the spring itself, the scene cut in and dimmed on the rebound)
        inner.setAttribute('opacity', ramp(t, lands[i] + 0.175, 0.12, E.linear).toFixed(3));
        scene.set(u);
      });
    });

    // The camera: keep NK-01 left of centre with the next square in view,
    // then pull back over the whole board.
    const lead = 380 / zoom;
    const at = (i) => [xs[i] + lead, 575, zoom];
    const keys = [[land - 1.4, at(0)]];
    lands.forEach((a, i) => {
      if (i > 0) keys.push([a - 0.1, at(i), E.inOut]);
      keys.push([i < n - 1 ? a + per - 0.62 : a + 0.35, at(i), E.linear]);
    });
    // (framing every card and every plaque whole, even after the closing push-in)
    const reach = (i) => Math.max(180, plaques[i].offsetWidth / 2 + 8);
    const left = xs[0] - reach(0), right = xs[n - 1] + reach(n - 1);
    const mid = (left + right) / 2;
    const wide = Math.min(1, 1760 / (right - left) / 1.03);
    // the pull-back leaves the top of the frame for a closing headline
    keys.push([last + 1.35, [mid, 600, wide], E.inOut]);
    return { keys, lands, xs, last, wide, mid };
  };
})();
