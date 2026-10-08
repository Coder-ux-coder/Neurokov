// Every page carries the whole stylesheet inline (astro.config.mjs), but each uses well under half of
// it: the other pages' rules only cost a phone bytes and parse time before its first paint. After the
// build, this drops from each page the rules that can't apply to it. A selector stays while every
// class, id, tag and attribute it names appears in the page or in the site's scripts (which add
// classes and elements as a visitor uses the page). What it can't judge stays: whatever sits inside a
// pseudo-class (:not(), :has(), :hover...), keyframes, fonts and custom properties. Rules are cut out
// of the stylesheet's text, so everything kept is byte for byte what Astro wrote.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as csstree from 'css-tree';

const words = (text) => new Set(text.match(/[\w-]+/g));

// The words in the page and its scripts, plus the attributes a script sets through a property: dataset.theme
// sets data-theme, ariaExpanded aria-expanded.
function wordsIn(text) {
  const seen = words(text);
  const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  for (const [, name] of text.matchAll(/\bdataset\.([A-Za-z_$][\w$]*)/g)) seen.add(`data-${kebab(name)}`);
  for (const [, name] of text.matchAll(/\bdataset\[\s*['"`]([^'"`]+)['"`]\s*\]/g)) seen.add(`data-${kebab(name)}`);
  for (const [, name] of text.matchAll(/\baria([A-Z]\w*)/g)) seen.add(`aria-${name.toLowerCase()}`);
  return seen;
}

// Elements the HTML parser adds without the page naming them.
const IMPLIED_TAGS = ['html', 'head', 'body', 'tbody'];
// Attributes the browser sets itself as a visitor uses the page (a dialog's open, a field's state).
const BROWSER_ATTRIBUTES = ['open', 'checked', 'selected', 'value', 'disabled', 'hidden', 'inert'];

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

/** The stylesheet without the rules no element on the page can match. */
export function pruneStyles(css, seen) {
  const ast = csstree.parse(css, { positions: true, parseValue: false, parseAtrulePrelude: false, parseCustomProperty: false });
  const edits = []; // [start, end, replacement], none overlapping
  csstree.walk(ast, {
    visit: 'Rule',
    enter(rule) {
      if (this.atrule && /keyframes$/i.test(this.atrule.name)) return csstree.walk.skip;
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
  // Media, support and container blocks left with nothing inside go too.
  for (let emptied = true; emptied; ) {
    emptied = false;
    const tree = csstree.parse(out, { positions: true, parseValue: false, parseAtrulePrelude: false, parseRulePrelude: false, parseCustomProperty: false });
    const empty = [];
    csstree.walk(tree, {
      visit: 'Atrule',
      enter(atrule) {
        if (/^(media|supports|container|layer)$/i.test(atrule.name) && atrule.block && atrule.block.children.isEmpty) empty.push(atrule);
      },
    });
    for (const atrule of empty.sort((a, b) => b.loc.start.offset - a.loc.start.offset)) {
      out = out.slice(0, atrule.loc.start.offset) + out.slice(atrule.loc.end.offset);
      emptied = true;
    }
  }
  return out;
}

async function* files(dir, extension) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, extension);
    else if (entry.name.endsWith(extension)) yield path;
  }
}

export const pageStyles = {
  name: 'page-styles',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const dist = fileURLToPath(dir);
      let scripts = '';
      for await (const file of files(join(dist, '_astro'), '.js')) scripts += await readFile(file, 'utf8');
      let before = 0;
      let after = 0;
      for await (const file of files(dist, '.html')) {
        const html = await readFile(file, 'utf8');
        const seen = wordsIn(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '') + scripts);
        for (const tag of IMPLIED_TAGS) seen.add(tag);
        const out = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (_, open, css, close) => {
          const pruned = pruneStyles(css, seen);
          before += css.length;
          after += pruned.length;
          return open + pruned + close;
        });
        if (out !== html) await writeFile(file, out);
      }
      logger.info(`kept ${Math.round((100 * after) / (before || 1))}% of the inline stylesheets (${before} -> ${after} bytes)`);
    },
  },
};
