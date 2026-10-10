/**
 * Split-flap readouts. Each tile is four halves: the static top and bottom,
 * and the two leaves that fall between them. A change flips a tile through a
 * few random characters before it lands, like a station departures board.
 */
import { calm, sleep } from './lib';

const RANDOM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%+<';
const isSignal = (c: string) => /[^A-Z0-9 ]/.test(c);
const randomChar = () => RANDOM[(Math.random() * RANDOM.length) | 0];

class Tile {
  private halves: HTMLElement[];
  cur: string;
  /** The character the tile shows once it stops: `cur`, or where a run is heading. */
  goal: string;
  private token = 0;
  private flipping = Promise.resolve();

  constructor(private el: HTMLElement) {
    this.halves = ['.fc__t', '.fc__b', '.fc__ft', '.fc__fb'].map((s) => el.querySelector<HTMLElement>(s)!);
    this.cur = this.goal = this.halves[1].textContent ?? ' ';
  }

  private paint(half: number, c: string) {
    this.halves[half].firstElementChild!.textContent = c;
  }

  show(c: string) {
    this.token++;
    for (let h = 0; h < 4; h++) this.paint(h, c);
    this.el.classList.toggle('fc--signal', isSignal(c));
    this.cur = this.goal = c;
  }

  private async flip(next: string, speed: number) {
    const [t, b, ft, fb] = [0, 1, 2, 3];
    this.paint(t, next);
    this.paint(ft, this.cur);
    this.paint(b, this.cur);
    this.paint(fb, next);
    this.el.classList.toggle('fc--signal', isSignal(next));
    const fall = this.halves[ft].animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], {
      duration: speed,
      easing: 'cubic-bezier(.55,0,1,.45)',
      fill: 'forwards',
    });
    await fall.finished;
    const land = this.halves[fb].animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], {
      duration: speed,
      easing: 'cubic-bezier(0,.55,.45,1)',
      fill: 'forwards',
    });
    await land.finished;
    this.paint(b, next);
    this.paint(ft, next);
    fall.cancel();
    land.cancel();
    this.cur = next;
  }

  async run(target: string, flips: number, delay: number, speed: number) {
    const token = ++this.token;
    this.goal = target;
    await sleep(delay);
    for (let k = 0; k < flips; k++) {
      // One flip at a time: a new run waits for the old one's leaf to land before it takes over.
      await this.flipping;
      if (token !== this.token) return;
      this.flipping = this.flip(k === flips - 1 ? target : randomChar(), speed).catch(() => {});
    }
  }
}

export class Flap {
  private tiles: Tile[];
  private text: HTMLElement | null;

  constructor(el: HTMLElement) {
    this.tiles = [...el.querySelectorAll<HTMLElement>('.fc')].map((t) => new Tile(t));
    this.text = el.querySelector('[data-flap-text]');
  }

  blank() {
    this.tiles.forEach((t) => t.show(' '));
  }

  /**
   * Flip to a value. Tiles already on their way to the right character stay put.
   * (Not merely showing it: a quick change back must stop a tile mid-flip to the old value.)
   */
  set(value: string, { flips = 4, stagger = 55, speed = 48 } = {}) {
    if (this.text) this.text.textContent = value;
    const chars = [...value.toUpperCase().padEnd(this.tiles.length, ' ')].slice(0, this.tiles.length);
    this.tiles.forEach((tile, i) => {
      if (calm) return tile.show(chars[i]);
      if (tile.goal === chars[i]) return;
      tile.run(chars[i], flips + ((i * 7) % 3), i * stagger, speed);
    });
  }
}
