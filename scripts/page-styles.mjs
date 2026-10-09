// Every page carries the whole stylesheet inline (astro.config.mjs), but each uses well under half of
// it: the other pages' rules only cost a phone bytes and parse time before its first paint. After the
// build, this drops from each page what can't apply to it:
// - the rules no element can match. A selector stays while every class, id, tag and attribute it
//   names appears in the page's markup, or in the site's scripts as something a script could set
//   (they add classes and elements as a visitor uses the page). What it can't judge stays: whatever
//   sits inside a pseudo-class (:not(), :has(), :hover...), and custom properties;
// - the animations (@keyframes) nothing left names;
// - the fallback font faces for widths (font-stretch) nothing left sets;
// - the font faces of a family nothing left sets text in (the split-flap signs, on a page without a board).
// Everything is cut out of the stylesheet's text, so what stays is byte for byte what Astro wrote.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as csstree from 'css-tree';

const words = (text) => new Set(text.match(/[\w-]+/g));

// A start tag: its name, then its attributes up to the > that ends it (not one inside quotes).
const START_TAG = /<[a-zA-Z](?:"[^"]*"|'[^']*'|[^'">])*>/y;

/**
 * The words of a page's tags: their names, their attributes' names and every word of the attributes'
 * values. Not the text between them, which no selector reads, nor what's inside comments and scripts.
 */
function markupWords(markup, seen) {
  for (const { index } of markup.matchAll(/<[a-zA-Z]/g)) {
    START_TAG.lastIndex = index;
    // A tag the pattern can't follow (a quote left open) gives its words up to the next > instead.
    const tag = START_TAG.exec(markup)?.[0] ?? markup.slice(index, markup.indexOf('>', index) + 1 || undefined);
    for (const word of tag.match(/[\w-]+/g) ?? []) seen.add(word).add(word.toLowerCase());
  }
}

/**
 * Every word a script could write into a class, id or attribute: one standing on its own ('is-open',
 * class="is-open"). One that only ever follows a dot is a class being looked up ('.is-open') or a
 * property, which puts nothing on the page.
 */
function scriptWords(code, seen) {
  for (const m of code.matchAll(/[\w-]+/g)) if (code[m.index - 1] !== '.') seen.add(m[0]);
  addAttributes(code, seen);
}

// A script element that runs (not data, like JSON-LD or speculation rules).
const isCode = (attributes) => {
  const type = attributes.match(/\btype=["']?([^"'\s>]+)/i)?.[1];
  return !type || /^(module|(text|application)\/(java|ecma)script)$/i.test(type);
};

// Attributes a script sets through a property: dataset.theme sets data-theme, ariaExpanded aria-expanded.
function addAttributes(text, seen) {
  const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  for (const [, name] of text.matchAll(/\bdataset\.([A-Za-z_$][\w$]*)/g)) seen.add(`data-${kebab(name)}`);
  for (const [, name] of text.matchAll(/\bdataset\[\s*['"`]([^'"`]+)['"`]\s*\]/g)) seen.add(`data-${kebab(name)}`);
  for (const [, name] of text.matchAll(/\baria([A-Z]\w*)/g)) seen.add(`aria-${name.toLowerCase()}`);
}

// Elements the HTML parser adds without the page naming them.
const IMPLIED_TAGS = ['html', 'head', 'body', 'tbody'];
// Attributes the browser sets itself as a visitor uses the page (a dialog's open, a field's state).
const BROWSER_ATTRIBUTES = ['open', 'checked', 'selected', 'value', 'disabled', 'hidden', 'inert'];

/**
 * The words that may name something on a page (its stylesheets taken out): those of its tags, and
 * every word its inline scripts and the site's scripts could write into a class, id or attribute.
 */
export function pageWords(html, scripts) {
  const seen = new Set(IMPLIED_TAGS);
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b([^>]*)>)([\s\S]*?)(<\/script\s*>)/gi, (_, open, attributes, code, close) => {
      if (isCode(attributes)) scriptWords(code, seen);
      return open + close;
    });
  markupWords(markup, seen);
  scriptWords(scripts, seen);
  return seen;
}

/** Could this selector match an element, given the words the page and its scripts contain? */
function mayMatch(selector, seen) {
  let ok = true;
  csstree.walk(selector, (node) => {
    if (!ok) return csstree.walk.break;
    switch (node.type) {
      case 'PseudoClassSelector':
      case 'PseudoElementSelector':
        return csstree.walk.skip;
      case 'TypeSelector':
        ok = node.name === '*' || seen.has(node.name.toLowerCase().replace(/^.*\|/, ''));
        break;
      case 'ClassSelector':
      case 'IdSelector':
        ok = seen.has(node.name);
        break;
      case 'AttributeSelector': {
        const name = node.name.name;
        if (BROWSER_ATTRIBUTES.includes(name)) break;
        ok = seen.has(name);
        // An exact value has to appear too; a partial one (^= $= *= ~= |=) isn't judged.
        if (ok && node.matcher === '=' && node.value) {
          const value = node.value.type === 'String' ? node.value.value : node.value.name;
          ok = [...words(value)].every((w) => seen.has(w));
        }
        return csstree.walk.skip;
      }
    }
  });
  return ok;
}

const parse = (css) => csstree.parse(css, { positions: true, parseValue: false, parseAtrulePrelude: false, parseRulePrelude: false, parseCustomProperty: false });
const isKeyframes = (atrule) => /keyframes$/i.test(atrule.name);
const isFontFace = (atrule) => atrule.name.toLowerCase() === 'font-face';

/** Cut [start, end) ranges out of a text, given in any order and never overlapping. */
function cut(text, ranges) {
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + text.slice(end);
  return text;
}

/** A stylesheet without the rules (and the selectors in a list) no element on the page can match. */
function dropUnmatched(css, seen) {
  const ast = csstree.parse(css, { positions: true, parseValue: false, parseAtrulePrelude: false, parseCustomProperty: false });
  const edits = []; // [start, end, replacement], none overlapping
  csstree.walk(ast, {
    visit: 'Rule',
    enter(rule) {
      if (this.atrule && isKeyframes(this.atrule)) return csstree.walk.skip;
      if (rule.prelude.type !== 'SelectorList') return csstree.walk.skip;
      const selectors = rule.prelude.children.toArray();
      const kept = selectors.filter((s) => mayMatch(s, seen));
      if (!kept.length) edits.push([rule.loc.start.offset, rule.loc.end.offset, '']);
      else if (kept.length < selectors.length) {
        const text = kept.map((s) => css.slice(s.loc.start.offset, s.loc.end.offset)).join(',');
        edits.push([rule.prelude.loc.start.offset, rule.prelude.loc.end.offset, text]);
      }
      return csstree.walk.skip;
    },
  });
  let out = css;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, start) + text + out.slice(end);
  return out;
}

/** Media, support, container and layer blocks left with nothing inside go too. */
function dropEmptyBlocks(css) {
  for (;;) {
    const empty = [];
    csstree.walk(parse(css), {
      visit: 'Atrule',
      enter(atrule) {
        if (/^(media|supports|container|layer)$/i.test(atrule.name) && atrule.block && atrule.block.children.isEmpty) empty.push([atrule.loc.start.offset, atrule.loc.end.offset]);
      },
    });
    if (!empty.length) return css;
    css = cut(css, empty);
  }
}

/** Every declaration outside @keyframes and @font-face blocks, as [property, value]. */
function declarations(css) {
  const found = [];
  csstree.walk(parse(css), {
    visit: 'Declaration',
    enter(declaration) {
      if (this.atrule && (isKeyframes(this.atrule) || isFontFace(this.atrule))) return;
      found.push([declaration.property.toLowerCase(), csstree.generate(declaration.value).trim()]);
    },
  });
  return found;
}

/**
 * Animations nothing can start any more. A @keyframes stays while its name appears in a declaration
 * left on the page (an animation, or a custom property one might take it from) or among the page's
 * words (a style attribute or a script could name it).
 */
function dropUnusedKeyframes(css, named, seen) {
  const unused = [];
  csstree.walk(parse(css), {
    visit: 'Atrule',
    enter(atrule) {
      if (!isKeyframes(atrule) || !atrule.prelude) return;
      const name = csstree.generate(atrule.prelude).trim().replace(/^["']|["']$/g, '');
      if (!named.has(name) && !seen.has(name)) unused.push([atrule.loc.start.offset, atrule.loc.end.offset]);
    },
  });
  return cut(css, unused);
}

const PERCENTAGE = /^\d+(\.\d+)?%$/;
const normalise = (percentage) => `${parseFloat(percentage)}%`;

/** The font faces of a stylesheet: each one's text range, family, and width when it has a single one. */
function faces(css) {
  const found = [];
  csstree.walk(parse(css), {
    visit: 'Atrule',
    enter(atrule) {
      if (!isFontFace(atrule) || !atrule.block) return;
      const descriptor = (name) => {
        const d = atrule.block.children.toArray().find((d) => d.type === 'Declaration' && d.property.toLowerCase() === name);
        return d ? csstree.generate(d.value).trim() : '';
      };
      const width = descriptor('font-stretch');
      found.push({
        range: [atrule.loc.start.offset, atrule.loc.end.offset],
        family: descriptor('font-family').replace(/^["']|["']$/g, '').toLowerCase(),
        width: PERCENTAGE.test(width) ? normalise(width) : null,
      });
    },
  });
  return found;
}

/**
 * The widths (font-stretch) a page's remaining rules set, or null when that can't be told for sure:
 * a width that isn't a plain percentage, the font shorthand (it can set one), a width that changes
 * over time (a transition or animation passes through every value in between), or one set outside
 * the stylesheets (a style attribute, a script).
 */
function widthsSet(css, outside) {
  if (/font-stretch|fontStretch/.test(outside)) return null;
  const widths = new Set(['100%']);
  for (const [property, value] of declarations(css)) {
    if (property === 'font-stretch') {
      if (!PERCENTAGE.test(value)) return null;
      widths.add(normalise(value));
    } else if (property === 'font' && !/^(inherit|initial|unset|revert|revert-layer)$/i.test(value)) return null;
    else if (/^transition(-property)?$/.test(property) && value.split(/[\s,]+/).some((t) => ['all', 'font', 'font-stretch'].includes(t))) return null;
  }
  let animated = false;
  csstree.walk(parse(css), {
    visit: 'Declaration',
    enter(declaration) {
      if (this.atrule && isKeyframes(this.atrule) && /^font(-stretch)?$/i.test(declaration.property)) animated = true;
    },
  });
  return animated ? null : widths;
}

/**
 * What the font and font-family declarations left on a page name (lower case), custom properties
 * (var()) followed through every value they're given anywhere. Null when that can't be told: a custom
 * property they go through is also set outside the stylesheets (a style attribute, a script).
 */
function fontsNamed(css, outside) {
  const custom = new Map(); // --name -> every value it's given
  const values = [];
  csstree.walk(parse(css), {
    visit: 'Declaration',
    enter(declaration) {
      if (this.atrule && isFontFace(this.atrule)) return;
      const value = csstree.generate(declaration.value);
      if (declaration.property.startsWith('--')) custom.set(declaration.property, [...(custom.get(declaration.property) ?? []), value]);
      else if (/^font(-family)?$/i.test(declaration.property)) values.push(value);
    },
  });
  const followed = new Set();
  for (let i = 0; i < values.length; i++) {
    for (const [, name] of values[i].matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (followed.has(name)) continue;
      if (new RegExp(`${name}(?![\\w-])`).test(outside)) return null;
      followed.add(name);
      values.push(...(custom.get(name) ?? []));
    }
  }
  return values.join('\n').toLowerCase();
}

/**
 * The page's stylesheets without what can't apply to it. outside: the page's text besides its
 * stylesheets, and the site's scripts.
 */
export function pruneStyles(sheets, seen, outside) {
  let out = sheets.map((css) => dropUnmatched(css, seen));
  // An animation or a width can be named in one of the page's stylesheets and used in another.
  const named = new Set();
  for (const [, value] of declarations(out.join('\n'))) for (const word of value.match(/[\w-]+/g) ?? []) named.add(word);
  out = out.map((css) => dropUnusedKeyframes(css, named, seen));
  // The metric-matched fallback font (fonts/fallback.py) has faces for each width the site sets text
  // in. The browser takes the face whose width matches, or else the nearest one (CSS Fonts 4: at or
  // below 100%, the next narrower face, then the next wider; above 100%, the next wider, then the next
  // narrower), so a face neither matches nor is nearest to any width the page sets is never chosen.
  // Only families whose faces all have a single width are judged.
  const widths = widthsSet(out.join('\n'), outside);
  if (widths) {
    const all = out.flatMap((css) => faces(css));
    const keep = new Map(); // family -> widths whose faces stay; none for a family not judged
    for (const family of new Set(all.map((f) => f.family))) {
      const own = all.filter((f) => f.family === family);
      if (!own.every((f) => f.width)) continue;
      const have = [...new Set(own.map((f) => parseFloat(f.width)))].sort((a, b) => a - b);
      const chosen = new Set(['100%']);
      for (const w of [...widths].map(parseFloat)) {
        const narrower = have.filter((x) => x <= w).at(-1);
        const wider = have.find((x) => x >= w);
        const pick = w <= 100 ? narrower ?? wider : wider ?? narrower;
        if (pick !== undefined) chosen.add(`${pick}%`);
      }
      keep.set(family, chosen);
    }
    out = out.map((css) => cut(css, faces(css).filter((f) => keep.has(f.family) && !keep.get(f.family).has(f.width)).map((f) => f.range)));
  }
  // The faces of a family nothing left sets text in, and that nothing outside the stylesheets names
  // (a script drawing text in it, an SVG's font-family), are never used.
  const fonts = fontsNamed(out.join('\n'), outside);
  if (fonts !== null) {
    const elsewhere = outside.toLowerCase();
    out = out.map((css) => cut(css, faces(css).filter((f) => f.family && !fonts.includes(f.family) && !elsewhere.includes(f.family)).map((f) => f.range)));
  }
  return out.map(dropEmptyBlocks);
}

async function* files(dir, extension) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, extension);
    else if (entry.name.endsWith(extension)) yield path;
  }
}

const STYLE = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g;

export const pageStyles = {
  name: 'page-styles',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const dist = fileURLToPath(dir);
      let scripts = '';
      for await (const file of files(join(dist, '_astro'), '.js')) scripts += (await readFile(file, 'utf8')) + '\n';
      let before = 0;
      let after = 0;
      for await (const file of files(dist, '.html')) {
        const html = await readFile(file, 'utf8');
        const sheets = [...html.matchAll(STYLE)].map((m) => m[2]);
        if (!sheets.length) continue;
        const page = html.replace(STYLE, '');
        const pruned = pruneStyles(sheets, pageWords(page, scripts), page + scripts);
        let i = 0;
        const out = html.replace(STYLE, (_, open, css, close) => open + pruned[i++] + close);
        before += sheets.join('').length;
        after += pruned.join('').length;
        if (out !== html) await writeFile(file, out);
      }
      logger.info(`kept ${Math.round((100 * after) / (before || 1))}% of the inline stylesheets (${before} -> ${after} bytes)`);
    },
  },
};
