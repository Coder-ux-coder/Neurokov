"""
Cut the site's two fonts down to the characters the site's copy uses (the full font files were most
of what a phone fetched before its first screen was ready), and write the @font-face rules for the
pieces to src/styles/fonts.css.

- The core of each font holds what the copy uses: plain ASCII (also everything typed into the
  booking form), a few Latin-1 signs (§ © · × and the no-break space) and typographic punctuation.
  Every page needs it, so Base.astro preloads it.
- "signs" holds Archivo's symbols from 62% to 100% wide, for the narrow signs on the split-flap
  tiles. It is a family of its own, 'Archivo Signs', so its narrow symbols never stand in for normal
  ones.
- Nothing else. Fontsource's other pieces (accented letters, Latin Extended, Vietnamese, Cyrillic)
  used to be declared too, fetched only when a page showed one of their characters, which the copy
  never does. But every piece a family declares makes the browser's first layout of each page check
  it, character by character: they cost a phone more time before its first paint than anything else
  on the page. A character outside the core (an accented letter typed into the form, say) shows in
  the fallback font, which is sized to match (fallback.py).

Archivo keeps all its weights and the widths the site sets in text, 100% to 125%. Its width axis
has a master at 100%, so dropping the narrower end leaves every glyph exactly as it was (cutting a
range at a point between masters would round the outlines a little, and the text would no longer
render pixel for pixel the same). Nothing a visitor can see changes: every character the copy uses
comes from the fonts, drawn the same.

The sources are the Fontsource packages in node_modules, so run `npm ci` first.

usage: python design/fonts/subset.py      (needs fonttools and brotli: pip install fonttools brotli)
       writes src/assets/fonts/*.woff2 and src/styles/fonts.css
"""
import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'src/assets/fonts'
CSS = ROOT / 'src/styles/fonts.css'
ARCHIVO = ROOT / 'node_modules/@fontsource-variable/archivo'
PLEX = ROOT / 'node_modules/@fontsource/ibm-plex-mono'


def chars(spec):
    """'U+0020-007E, U+00A0' (a CSS unicode-range) -> code points."""
    out = []
    for part in spec.replace('U+', '').split(','):
        lo, _, hi = part.strip().partition('-')
        out += range(int(lo, 16), int(hi or lo, 16) + 1)
    return out


def ranges(points):
    """Code points -> a CSS unicode-range."""
    points, out, i = sorted(points), [], 0
    while i < len(points):
        j = i
        while j + 1 < len(points) and points[j + 1] == points[j] + 1:
            j += 1
        out.append(f'U+{points[i]:04X}' if i == j else f'U+{points[i]:04X}-{points[j]:04X}')
        i = j + 1
    return ', '.join(out)


CORE = chars('U+0020-007E, U+00A0, U+00A7, U+00A9, U+00B7, U+00D7, U+2013-2014, U+2018-2019, U+201C-201D, U+2022, U+2026')
# The split-flap signs: anything on a tile that isn't a letter, a digit or a space (flap.ts).
SIGNS = [c for c in range(0x21, 0x7F) if not chr(c).isalnum()]


def faces(css_file):
    """Fontsource's @font-face rules: (file, unicode-range), in its order."""
    out = []
    for block in re.findall(r'@font-face\s*{([^}]*)}', css_file.read_text()):
        get = lambda name: re.search(rf'{name}:\s*([^;]+);', block).group(1).strip()
        file = re.search(r'url\(\./files/([^)]+\.woff2)\)', block).group(1)
        out.append((css_file.parent / 'files' / file, get('unicode-range')))
    return out


def cut(src, unicodes, name, axes=None):
    font = TTFont(src)
    options = subset.Options()
    options.layout_features = ['*']  # tabular figures, kerning and the rest stay; hinting stays too
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    font.flavor = 'woff2'
    font.save(OUT / name)
    print(f'{name:34} {(OUT / name).stat().st_size / 1024:5.1f} KB')


def rule(family, file, unicode_range, weight, stretch=None):
    fmt = 'woff2-variations' if stretch else 'woff2'
    lines = [f"  font-family: '{family}';", '  font-style: normal;', '  font-display: swap;', f'  font-weight: {weight};']
    if stretch:
        lines.append(f'  font-stretch: {stretch};')
    lines += [f"  src: url('../assets/fonts/{file}') format('{fmt}');", f'  unicode-range: {unicode_range};']
    return '@font-face {\n' + '\n'.join(lines) + '\n}\n'


def split(family, src_css, prefix, weight, axes, stretch):
    """The rules for one font: the core of its Latin file (and, for Archivo, the signs)."""
    rules = []
    for src, unicode_range in faces(src_css):
        if '-latin-' in src.name and '-latin-ext-' not in src.name:
            cut(src, CORE, f'{prefix}.woff2', axes)
            rules.append(rule(family, f'{prefix}.woff2', ranges(CORE), weight, stretch))
            if family == 'Archivo Variable':
                cut(src, SIGNS, f'{prefix}-signs.woff2', {'wdth': (62, 100)})
                rules.append(rule('Archivo Signs', f'{prefix}-signs.woff2', ranges(SIGNS), weight, '62% 100%'))
    return rules


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rules = split('Archivo Variable', ARCHIVO / 'wdth.css', 'archivo', '100 900', {'wdth': (100, 125)}, '100% 125%')
    for w in (400, 500, 600):
        rules += split('IBM Plex Mono', PLEX / f'{w}.css', f'plex-mono-{w}', str(w), None, None)
    CSS.write_text(
        '/* Written by design/fonts/subset.py: edit that, then run it again. Each font holds just the\n'
        '   characters the site\'s copy uses; anything else shows in the fallback font (fallback.css). */\n\n'
        + '\n'.join(rules)
    )
    print(f'-> {CSS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
