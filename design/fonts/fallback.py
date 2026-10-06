"""
Fallback fonts sized to match the site's fonts, so the page doesn't move when they arrive.

Until Archivo and IBM Plex Mono have loaded (font-display: swap), text shows in a font the
visitor already has. A fallback that sets a line wider or narrower than the real font wraps it
differently, and when the real font swaps in, everything below the line moves (the layout shift
Lighthouse counts). These rules make the fallback take the same room: Arial (or a font with its
metrics: Liberation Sans, Arimo) scaled with size-adjust so a line of copy is as wide as in
Archivo, at each weight and width the site sets text in, and with Archivo's line metrics.
Plex Mono's stand-in is Courier New (or Liberation Mono, Cousine): every monospaced font in it is
0.6em a character, as Plex Mono is, so only the line metrics need setting.

Arial can't be made wider, so each width the site uses (font-stretch) gets faces of its own, one
per weight set in it, scaled up to match. Bold Arial stands in from 550 up.

usage: python design/fonts/fallback.py   (needs fonttools; ARIAL and ARIAL_BOLD point it at the
       fonts to measure against when Liberation Sans isn't in the usual place)
       writes src/styles/fallback.css
"""
import os
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent.parent
ARCHIVO = ROOT / 'src/assets/fonts/archivo.woff2'
PLEX = ROOT / 'src/assets/fonts/plex-mono-400.woff2'
CSS = ROOT / 'src/styles/fallback.css'


def find(env, *paths):
    for p in ([os.environ[env]] if env in os.environ else []) + list(paths):
        if Path(p).exists():
            return Path(p)
    raise SystemExit(f'No {env} font found: set {env} to a path')


ARIAL = find('ARIAL', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 'C:/Windows/Fonts/arial.ttf', '/Library/Fonts/Arial.ttf')
ARIAL_BOLD = find('ARIAL_BOLD', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf', '/Library/Fonts/Arial Bold.ttf')

# Fonts with Arial's metrics, by full and PostScript name. Roboto (Android) is a close match.
REGULAR = ['Arial', 'ArialMT', 'Liberation Sans', 'LiberationSans', 'Arimo', 'Roboto']
BOLD = ['Arial Bold', 'Arial-BoldMT', 'Liberation Sans Bold', 'LiberationSans-Bold', 'Arimo Bold', 'Arimo-Bold', 'Roboto Bold', 'Roboto-Bold']
MONO = ['Courier New', 'CourierNewPSMT', 'Liberation Mono', 'LiberationMono', 'Cousine']
MONO_BOLD = ['Courier New Bold', 'CourierNewPS-BoldMT', 'Liberation Mono Bold', 'LiberationMono-Bold', 'Cousine Bold', 'Cousine-Bold']

# Every width (font-stretch) the site sets Archivo text in, with the weights set in it. To list
# them: the computed font-weight/font-stretch of every text node, over every page.
USED = {
    100: [400, 500, 550, 600, 650, 700],
    104: [600, 650],
    106: [560, 650, 720],
    108: [560],
    110: [650, 800],
    112: [650, 720, 850],
    115: [720, 750],
    118: [750],
    120: [800],
    122: [800],
    125: [800, 850],
}

# Copy like the site's: what a line is measured on.
SAMPLE = (
    'We find the businesses that should buy from you, answer every lead in under a minute and put '
    'qualified sales calls on your calendar. You show up and close. If it doesn’t work, you don’t pay. '
    'Your lead generation partner. Some of our work. From first call to booked calls. Questions, answered. '
    'A psychology platform, grown 100%+ in a single month. 46 meetings, 31% reply rate, under 60 seconds.'
)


def kerning(font, wanted):
    """The font's pair kerning (GPOS 'kern', as a browser applies it) for the wanted (left, right)
    glyph pairs -> units. The first subtable to cover a pair decides it."""
    pairs = {}
    if 'GPOS' not in font:
        return pairs
    gpos = font['GPOS'].table
    lookups = {i for f in gpos.FeatureList.FeatureRecord if f.FeatureTag == 'kern' for i in f.Feature.LookupListIndex}
    for i in sorted(lookups):
        for sub in gpos.LookupList.Lookup[i].SubTable:
            sub = getattr(sub, 'ExtSubTable', sub)
            if getattr(sub, 'LookupType', 2) != 2:
                continue
            covered = set(sub.Coverage.glyphs)
            if sub.Format == 1:
                sets = dict(zip(sub.Coverage.glyphs, sub.PairSet))
                for first, second in wanted:
                    rec = next((r for r in sets[first].PairValueRecord if r.SecondGlyph == second), None) if first in sets else None
                    if rec and (first, second) not in pairs:
                        pairs[first, second] = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
            else:
                c1, c2 = sub.ClassDef1.classDefs, sub.ClassDef2.classDefs
                for first, second in wanted:
                    if first in covered and (first, second) not in pairs:
                        v = sub.Class1Record[c1.get(first, 0)].Class2Record[c2.get(second, 0)].Value1
                        x = getattr(v, 'XAdvance', 0) if v else 0
                        # A class 0 second glyph means "no kerning" unless the font says otherwise.
                        if x or c2.get(second, 0):
                            pairs[first, second] = x
    return pairs


def width(font):
    """How wide the sample sets, in ems: advances plus pair kerning."""
    cmap, hmtx = font.getBestCmap(), font['hmtx']
    glyphs = [cmap[ord(c)] for c in SAMPLE if ord(c) in cmap]
    kern = kerning(font, set(zip(glyphs, glyphs[1:])))
    total = sum(hmtx[g][0] for g in glyphs) + sum(kern.get(p, 0) for p in zip(glyphs, glyphs[1:]))
    return total / font['head'].unitsPerEm


def pct(x):
    return f'{x * 100:.2f}%'.replace('.00%', '%')


def face(family, names, weight, size, ascent, descent, stretch=None):
    lines = [f"  font-family: '{family}';", f'  font-weight: {weight};']
    if stretch:
        lines.append(f'  font-stretch: {stretch}%;')
    lines += [
        '  src: ' + ', '.join(f"local('{n}')" for n in names) + ';',
        f'  size-adjust: {pct(size)};',
        # The overrides are scaled by size-adjust too, so they're divided by it here.
        f'  ascent-override: {pct(ascent / size)};',
        f'  descent-override: {pct(descent / size)};',
        '  line-gap-override: 0%;',
    ]
    return '@font-face {\n' + '\n'.join(lines) + '\n}\n'


def main():
    archivo = TTFont(ARCHIVO)
    upm = archivo['head'].unitsPerEm
    ascent, descent = archivo['hhea'].ascent / upm, -archivo['hhea'].descent / upm
    regular, bold = width(TTFont(ARIAL)), width(TTFont(ARIAL_BOLD))

    rules = []
    for stretch, weights in USED.items():
        for i, w in enumerate(weights):
            # Each weight covers up to halfway to the next one used at this width.
            lo = 100 if i == 0 else (weights[i - 1] + w) // 2 + 1
            hi = 900 if i == len(weights) - 1 else (w + weights[i + 1]) // 2
            real = width(instancer.instantiateVariableFont(TTFont(ARCHIVO), {'wght': w, 'wdth': stretch}))
            names, base = (BOLD, bold) if w >= 550 else (REGULAR, regular)
            rules.append(face('Archivo Fallback', names, f'{lo} {hi}', real / base, ascent, descent, stretch))
            print(f'{stretch}% {w:>3} ({lo}-{hi}): size-adjust {pct(real / base)}')

    plex = TTFont(PLEX)
    upm = plex['head'].unitsPerEm
    for weights, names in (('100 549', MONO), ('550 900', MONO_BOLD)):
        rules.append(face('Plex Mono Fallback', names, weights, 1, plex['hhea'].ascent / upm, -plex['hhea'].descent / upm))

    CSS.write_text(
        '/* Written by design/fonts/fallback.py: edit that, then run it again. Fonts the visitor already\n'
        '   has, sized to take the same room as Archivo and Plex Mono, so nothing moves when those arrive. */\n\n'
        + '\n'.join(rules)
    )
    print(f'-> {CSS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
