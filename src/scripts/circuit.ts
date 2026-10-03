/**
 * Workflow circuits on the service pages: a pulse runs down the wire, each step
 * goes Ready, Running, Done in turn, and the run repeats. It only runs while
 * the circuit is on screen.
 */
import { calm, sleep, watchVisible } from './lib';

document.querySelectorAll<HTMLElement>('[data-circuit]').forEach(circuit);

function circuit(el: HTMLElement) {
  const body = el.querySelector<HTMLElement>('.circuit__body')!;
  const wire = el.querySelector<HTMLElement>('.circuit__wire')!;
  const pulse = el.querySelector<HTMLElement>('.circuit__pulse')!;
  const nodes = [...el.querySelectorAll<HTMLElement>('.circuit__node')];
  const states = nodes.map((n) => n.querySelector<HTMLElement>('.circuit__state')!);
  const runEl = el.querySelector<HTMLElement>('[data-circuit-run]');
  const clock = el.querySelector<HTMLElement>('[data-circuit-clock]');

  // Centre of each step's number box, measured from the top of the list.
  const centres = () => nodes.map((n) => n.offsetTop + n.offsetHeight / 2);
  const layout = () => {
    const c = centres();
    wire.style.top = `${c[0]}px`;
    wire.style.height = `${c[c.length - 1] - c[0]}px`;
  };
  // Its first call comes before the first paint, once the page is laid out anyway.
  new ResizeObserver(layout).observe(body);

  if (calm) {
    nodes.forEach((n, i) => {
      n.classList.add('is-done');
      states[i].textContent = 'Done';
    });
    return;
  }

  let visible = false;
  let running = false;
  let run = 1;
  let t0 = 0;
  let tick = 0;

  const showClock = () => {
    if (!clock) return;
    const s = (performance.now() - t0) / 1000;
    clock.textContent = `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    tick = requestAnimationFrame(showClock);
  };

  const cycle = async () => {
    if (running) return;
    running = true;
    while (visible) {
      if (runEl) runEl.textContent = String(run++).padStart(4, '0');
      nodes.forEach((n, i) => {
        n.classList.remove('is-live', 'is-done');
        states[i].textContent = 'Ready';
      });
      t0 = performance.now();
      cancelAnimationFrame(tick);
      showClock();
      const c = centres();
      for (let i = 0; i < nodes.length && visible; i++) {
        pulse.style.transform = `translateY(${c[i] - c[0]}px)`;
        await sleep(i === 0 ? 150 : 520);
        nodes[i].classList.add('is-live');
        states[i].textContent = 'Running';
        await sleep(620);
        nodes[i].classList.replace('is-live', 'is-done');
        states[i].textContent = 'Done';
      }
      cancelAnimationFrame(tick);
      await sleep(2200);
      pulse.style.transform = 'translateY(0px)';
    }
    running = false;
  };

  watchVisible(el, (v) => {
    visible = v;
    if (v) cycle();
  });
}
