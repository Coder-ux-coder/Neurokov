# Design sources

What the site's films, photo and icons are made from. None of this is part of the site: the
renderers write into `src/assets/` and `public/`, and the site uses those files.

| Folder | Makes |
| --- | --- |
| `clips/` | The story films. Each is an HTML page run by `engine.js`; `render.mjs <name> --install` renders it into `src/assets/clips/` |
| `qa/` | Frame-by-frame checks of the films: text cut off or covered, things that flicker or pop |
| `screens/`, `composite/` | The home page photo (`src/assets/images/home-feature.jpg`) and its loop (`src/assets/video/home-feature.mp4`) |
| `brand/` | `public/og.png`, `public/apple-touch-icon.png` and `public/favicon.ico` |

`chrome.mjs` drives headless Chrome for the renderers. The case films show the numbers in
`src/data/cases.ts`, so update both together.

## The home page photo

A real stock photo from Unsplash, [Sora Sagano](https://unsplash.com/photos/silver-imac-on-brown-wooden-desk-3BMIntVUsjQ)'s,
cropped to 3:2, with our own operations dashboard (`screens/home-monitor.html`) put onto the
monitor. The Unsplash License allows commercial use without credit. The original lives in
`incoming/stock/` (not in git), downloaded at 3600 px wide:
`https://images.unsplash.com/<photo>?w=3600&q=90&fm=jpg&fit=max`.

To change what the screen says:

```sh
python design/screens/render.py home-monitor                   # HTML -> design/screens/out/*.png
python design/composite/composite.py home-feature --install    # -> src/assets/images/home-feature.jpg
```

A screen's HTML sets its size with `<meta name="size" content="WxH@dpr">`, and its shape has
to match the real display: 3:2 for the home monitor. For the loop, `node design/screens/capture.mjs
home-monitor` saves frames of the screen's motion and `python design/composite/video.py
home-feature --install` puts them into the photo.

Everything a photo needs is in `PLATES` in `composite/composite.py`:

- **Quads are measured, not eyeballed.** `edgefit.py` fits each display edge from dozens of
  half-level crossings (about 0.3 px rms). `maxfit.py` does the same for busy wallpapers.
  `aspect.py` checks that a quad implies the display's real aspect ratio at a plausible focal
  length, which catches a bad corner. `boostzoom.py` and `corners.py` make zooms for checking
  by eye.
- **Black level.** A screen that was on in the photo takes a flat black from its bezel
  (`bl.box`) or from the old wallpaper's darkest parts; one that was off (`bl=dict(mode='off')`)
  keeps its own glass and reflections.
- **Brightness** matches the old screen's brightest content, or `peak` for screens that were off.
- **Edges.** A flat screen gets a thin border of bare glass just past the lit area, so the old
  picture's soft edge never shows.
- **Lens, occlusion and focus.** `lens` follows a photo's barrel distortion, `front` outlines
  and `keep` mattes put back anything in front of a screen, and `blur` softens a screen to its
  depth in the shot.

Five more photos, for the case studies and the About page, were retired when those pages moved
to films. Their screens, measurements and renders, and three superseded film renders, are in the
git history up to commit `155f295`.

`python design/brand/render.py` rebuilds the share card and icons from `design/brand/`. The
share card uses the home page photo, so rebuild it after changing that.
