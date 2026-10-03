# Site photos and brand images

The six photos are real stock photos from Unsplash, with our own product screens composited
onto every laptop, monitor and phone. Only `home-feature` is on the site now, in
`src/assets/images/` with its loop in `src/assets/video/`. The case studies and the About page
tell their stories as films (`design/clips/`), so the other five plates and their loops are
kept in `design/archive/`, out of the build. `--install` still writes to `src/assets/`, so move
a plate back there only when a page uses it again. The originals live in `incoming/stock/`
(not in git). The Unsplash License allows commercial use without credit, but here is where
each one came from:

| Photo | Original | Screens (`design/screens/`) |
| --- | --- | --- |
| `home-feature` | [Sora Sagano](https://unsplash.com/photos/silver-imac-on-brown-wooden-desk-3BMIntVUsjQ), cropped to 3:2 | `home-monitor` ops dashboard (3:2) |
| `about-workspace` | [Joshua Aragon](https://unsplash.com/photos/laptop-and-monitor-displaying-code-workspace-BMnhuwFYr7w) | `about-wide` workflow map (2.39:1), `home-laptop` workflow editor |
| `case-psychology` | [Clay Banks](https://unsplash.com/photos/macbook-pro-on-brown-wooden-table-s7IIk_2dA7g), cropped to 3:2 | `psych-laptop` practice dashboard |
| `case-outbound` | [Unsplash](https://unsplash.com/photos/turned-off-macbook-pro-between-cup-of-coffee-iphone-notebook-and-pen-NuFUbftUu_s) | `out-laptop` campaign dashboard, `out-phone` calendar |
| `case-speed-to-lead` | [Nubelson Fernandes](https://unsplash.com/photos/macbook-pro-on-black-table-sdg7M9KwoLM) | `stl-laptop` deal pipeline (16:9), `stl-phone` lock screen |
| `case-back-office` | [Markus Spiske](https://unsplash.com/photos/a-computer-monitor-sitting-on-top-of-a-desk-WTWYGDNBGts) | `bo-left` ticket board, `bo-right` operations report |

Each original was downloaded at 3600 px wide:
`https://images.unsplash.com/<photo>?w=3600&q=90&fm=jpg&fit=max`.

To change what a screen says:

```sh
python design/screens/render.py out-laptop                   # HTML -> design/screens/out/*.png
python design/composite/composite.py case-outbound --install  # -> src/assets/images/*.jpg
```

A screen's HTML sets its size with `<meta name="size" content="WxH@dpr">`, and its shape has
to match the real display: 16:10 for the MacBooks, 16:9 for the HP and the back-office
monitors, 3:2 for the home monitor, 2.39:1 for the About ultrawide.

## How the composites stay believable

Everything a plate needs is in `PLATES` in `design/composite/composite.py`:

- **Quads are measured, not eyeballed.** `edgefit.py` fits each display edge from dozens of
  half-level crossings (about 0.3 px rms). `maxfit.py` does the same for busy wallpapers,
  such as the back-office monitors. `aspect.py` checks that a quad implies the display's real
  aspect ratio at a plausible focal length, which catches a bad corner. `boostzoom.py` and
  `corners.py` make zooms for checking by eye.
- **Lens distortion.** The About photo has barrel distortion: the monitor's top edge bows by
  about 6 px. `lens=dict(k=0.0095)` warps the screen to follow it.
- **Black level.** Screens that were off in the photo (`bl=dict(mode='off')`) keep their own
  glass, reflections included; the outbound phone's glare streak runs over the new screen.
  Screens that were on take a flat black from their bezel (`bl.box`), or from the old
  wallpaper's darkest parts.
- **Brightness** matches the old screen's brightest content, or `peak` for screens that were off.
- **Edges.** A flat screen gets a thin border of bare glass just past the lit area, so the old
  picture's soft edge never shows.
- **Occlusion.** Anything in front of a screen goes back on top: `front` outlines (the About
  laptop's lid, the coffee cup, the phone stand's lip) and `keep` mattes for the plant's leaves.
- **Focus.** `blur` softens each screen to its depth in the shot; the back-office right
  monitor is out of focus.

The numbers on the case study screens mirror `src/data/cases.ts`, so update both together.

`python design/brand/render.py` rebuilds `public/og.png`, `public/apple-touch-icon.png`
and `public/favicon.ico` from `design/brand/`. The share card uses the `home-feature` photo,
so rebuild it after changing that one.
