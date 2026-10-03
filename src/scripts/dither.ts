/**
 * Photos that develop. Each [data-dither] photo starts as a coarse ordered
 * dither in ink and paper; when it scrolls into view the dots dissolve from the
 * top down, with an orange scan edge, until the photo is left.
 */
import { calm, onceVisible } from './lib';

// 8x8 Bayer matrix, normalised to 0..1.
const BAYER = (() => {
  const m = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
    54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
    61, 29, 53, 21,
  ];
  return m.map((v) => (v + 0.5) / 64);
})();

const INK = [18, 18, 18];
const PAPER = [242, 239, 232];
const SIGNAL = [255, 79, 0];
const CELL = 4; // CSS pixels per dither dot
const DURATION = 1500;

function develop(media: HTMLElement) {
  const img = media.querySelector('img');
  if (!img) return media.classList.add('is-developed');

  const canvas = document.createElement('canvas');
  canvas.className = 'dither';
  canvas.setAttribute('aria-hidden', 'true');

  const prepare = async () => {
    try {
      await img.decode();
    } catch {
      /* not decodable yet: wait for it to load, or to fail */
      if (!img.complete)
        await new Promise((ok, fail) => {
          img.addEventListener('load', ok, { once: true });
          img.addEventListener('error', fail, { once: true });
        });
    }
    if (!img.naturalWidth) throw new Error('The photo did not load');
    const box = media.getBoundingClientRect();
    const cols = Math.max(8, Math.round(box.width / CELL));
    const rows = Math.max(8, Math.round(box.height / CELL));
    canvas.width = cols;
    canvas.height = rows;

    // Luminance of the photo as it is cropped on screen (object-fit: cover at the focus point).
    const src = document.createElement('canvas');
    src.width = cols;
    src.height = rows;
    const sctx = src.getContext('2d', { willReadFrequently: true })!;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cols / iw, rows / ih);
    const [fx, fy] = (getComputedStyle(img).objectPosition || '50% 50%')
      .split(' ')
      .map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
    const dw = iw * scale;
    const dh = ih * scale;
    sctx.drawImage(img, (cols - dw) * fx, (rows - dh) * (fy ?? 0.5), dw, dh);
    const px = sctx.getImageData(0, 0, cols, rows).data;
    const lum = new Float32Array(cols * rows);
    for (let k = 0; k < lum.length; k++) {
      const l = (0.2126 * px[k * 4] + 0.7152 * px[k * 4 + 1] + 0.0722 * px[k * 4 + 2]) / 255;
      lum[k] = Math.min(1, Math.max(0, (l - 0.5) * 1.35 + 0.5)); // a little extra contrast reads better as dots
    }
    return { cols, rows, lum };
  };

  const ctx = canvas.getContext('2d')!;
  const draw = (cols: number, rows: number, lum: Float32Array, t: number) => {
    const out = ctx.createImageData(cols, rows);
    const d = out.data;
    for (let y = 0; y < rows; y++) {
      const band = y / rows;
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x;
        const b = BAYER[(y & 7) * 8 + (x & 7)];
        // Order of dissolving: mostly top to bottom, broken up by the matrix.
        const order = band * 0.62 + b * 0.38;
        const o = k * 4;
        if (order < t - 0.06) {
          d[o + 3] = 0;
          continue;
        }
        const c = order < t ? SIGNAL : lum[k] > b ? PAPER : INK;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  };

  let data: Awaited<ReturnType<typeof prepare>> | null = null;
  // Cover the photo with its dither before it comes into view, so it never flashes.
  onceVisible(
    media,
    async () => {
      try {
        data = await prepare();
      } catch {
        // A photo that can't be read (it failed to load, say) shows as it is, without the effect.
        return media.classList.add('is-developed');
      }
      draw(data.cols, data.rows, data.lum, 0);
      media.append(canvas);
      media.classList.add('is-developing');
      onceVisible(
        media,
        () => {
          const start = performance.now() + 150;
          const frame = (now: number) => {
            const t = Math.max(0, (now - start) / DURATION) * 1.1;
            draw(data!.cols, data!.rows, data!.lum, t);
            if (t < 1.1) requestAnimationFrame(frame);
            else {
              canvas.remove();
              media.classList.add('is-developed');
            }
          };
          requestAnimationFrame(frame);
        },
        { threshold: 0.35 },
      );
    },
    { rootMargin: '0px 0px 300px 0px' },
  );
}

const photos = document.querySelectorAll<HTMLElement>('[data-dither]');
photos.forEach((m) => {
  m.classList.add('is-armed');
  if (calm) m.classList.add('is-developed');
  else develop(m);
});
