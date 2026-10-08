/**
 * Runs simulated leads through the machine diagram. A lead (ink dot) comes in
 * on one of four channels, crosses the system (the gates light as it passes),
 * and leaves as actions (orange dots): a good fit books a call, updates the CRM
 * and pings the team; anyone else is updated in the CRM and nurtured.
 */
import { calm, fine, loop, onMotion, pad, still, watchVisible } from './lib';
import { decode } from './reveal';


export function startMachine() {
  const host = document.querySelector<HTMLElement>('[data-machine]');
  if (host) machine(host);
}
interface Packet {
  /** Which wire it rides, the same in both drawings: in:<n>, core or out:<key>. */
  wire: string;
  path: SVGPathElement;
  len: number;
  t: number;
  dur: number;
  el: SVGCircleElement;
  gates?: { el: Element; at: number }[];
  done: () => void;
}

function machine(host: HTMLElement) {
  const NS = 'http://www.w3.org/2000/svg';
  const tip = host.querySelector<HTMLElement>('[data-machine-tip]')!;
  const defaultTip = fine ? 'Hover any part to see what it does.' : 'Tap any part to see what it does.';
  tip.textContent = defaultTip;
  const tallies = { in: 0, answered: 0, booked: 0 };
  const outs: Record<string, number> = { booked: 0, crm: 0, team: 0, nurture: 0 };

  let svg: SVGSVGElement;
  let packets: Packet[] = [];
  let sinceSpawn = 0;
  let nextSpawn = 400;

  // The wire a packet rides, and the gates along the core, in the drawing on screen.
  const pathOf = (wire: string) =>
    (wire === 'core'
      ? svg.querySelector<SVGPathElement>('[data-core]')
      : wire.startsWith('in:')
        ? svg.querySelectorAll<SVGPathElement>('[data-in]')[Number(wire.slice(3))]
        : svg.querySelector<SVGPathElement>(`[data-out="${wire.slice(4)}"]`))!;
  const gatesNow = () =>
    [...svg.querySelectorAll<SVGRectElement>('[data-gate]')].map((g) => ({ el: g, at: Number(g.dataset.at) }));

  // A wide and a tall drawing: the one on screen runs. Switching (a phone turned on its side), the leads
  // on their way carry on along the same wires in the other drawing, so every lead in is still answered.
  const pick = () => {
    const visible = [...host.querySelectorAll<SVGSVGElement>('svg.machine__svg')].find(
      (s) => getComputedStyle(s).display !== 'none',
    );
    if (!visible || visible === svg) return;
    svg?.querySelectorAll('.is-hot').forEach((g) => g.classList.remove('is-hot'));
    svg = visible;
    const layer = svg.querySelector('[data-packets]')!;
    packets.forEach((p) => {
      p.path = pathOf(p.wire);
      p.len = p.path.getTotalLength();
      if (p.gates) p.gates = gatesNow();
      layer.append(p.el);
    });
    render();
  };

  // Three digits, like an odometer: left running for hours, a count rolls over rather than outgrowing its box.
  const render = () => {
    host.querySelectorAll<SVGTextElement>('[data-out-count]').forEach((t) => {
      t.textContent = pad(outs[t.dataset.outCount!] % 1000);
    });
    host.querySelectorAll<HTMLElement>('[data-tally]').forEach((b) => {
      b.textContent = pad(tallies[b.dataset.tally as keyof typeof tallies] % 1000);
    });
  };

  const send = (wire: string, cls: string, dur: number, done: () => void) => {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('r', '5');
    el.setAttribute('class', cls);
    svg.querySelector('[data-packets]')!.append(el);
    const path = pathOf(wire);
    packets.push({ wire, path, len: path.getTotalLength(), t: 0, dur, el, gates: wire === 'core' ? gatesNow() : undefined, done });
  };

  const hit = (key: string) => {
    const box = svg.querySelector(`[data-out-box="${key}"]`);
    box?.classList.remove('is-hit');
    void (box as SVGGElement | null)?.getBBox();
    box?.classList.add('is-hit');
    setTimeout(() => box?.classList.remove('is-hit'), 420);
    outs[key]++;
    if (key === 'booked') tallies.booked++;
    render();
  };

  const spawn = () => {
    const ins = svg.querySelectorAll('[data-in]').length;
    tallies.in++;
    render();
    send(`in:${(Math.random() * ins) | 0}`, 'dot', 1150, () =>
      send('core', 'dot dot--core', 1300, () => {
        tallies.answered++;
        render();
        const fit = Math.random() < 0.68;
        const keys = fit ? ['booked', 'crm', 'team'] : ['nurture', 'crm'];
        keys.forEach((k, n) => setTimeout(() => send(`out:${k}`, 'dot dot--out', 900, () => hit(k)), n * 90));
      }),
    );
  };

  const engine = loop((dt) => {
    const arrived: Packet[] = [];
    sinceSpawn += dt;
    if (sinceSpawn > nextSpawn) {
      sinceSpawn = 0;
      nextSpawn = 850 + Math.random() * 900;
      spawn();
    }
    packets = packets.filter((p) => {
      p.t = Math.min(1, p.t + dt / p.dur);
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      const pt = p.path.getPointAtLength(e * p.len);
      p.el.setAttribute('cx', pt.x.toFixed(1));
      p.el.setAttribute('cy', pt.y.toFixed(1));
      p.gates?.forEach((g) => g.el.classList.toggle('is-hot', Math.abs(e - g.at) < 0.09));
      if (p.t < 1) return true;
      p.el.remove();
      arrived.push(p);
      return false;
    });
    // After the filter: a packet sent from done() has to land in the new list, not the old one.
    arrived.forEach((p) => p.done());
  });

  // What each part does, on hover or tap.
  host.querySelectorAll<SVGGElement>('.node').forEach((node) => {
    const show = () => {
      host.querySelectorAll('.node.is-focus').forEach((n) => n.classList.remove('is-focus'));
      node.classList.add('is-focus');
      decode(tip, node.dataset.tip, 420);
    };
    node.addEventListener('pointerenter', show);
    node.addEventListener('click', show);
    // A finger leaves the moment it lifts, so after a tap the part stays lit until another is tapped.
    node.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      node.classList.remove('is-focus');
      decode(tip, defaultTip, 300);
    });
  });

  requestAnimationFrame(pick);
  addEventListener('resize', pick, { passive: true });
  host.classList.add('is-ready');
  if (calm) return;
  host.classList.add('is-simulated');
  // It runs while it's on screen, unless the visitor has paused the site's motion.
  let visible = false;
  const run = () => (visible && !still() ? engine.start() : engine.stop());
  watchVisible(host, (v) => ((visible = v), run()), { rootMargin: '80px 0px' });
  onMotion(run);
}
