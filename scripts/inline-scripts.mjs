// The theme and motion script in Base.astro runs inline, before the first paint, and Astro writes it
// into every page as it reads in the source: comments, indentation and long names, about 1.5 KB of
// each page's compressed size. After the build this minifies it, in the ES5 its source is written in
// (it has to run in older browsers too). The Content-Security-Policy allows it by the hash of what
// this writes: after changing the script, build, then update public/_headers
// (scripts/check-headers.mjs, run by npm run build, says which hash it needs).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

async function* files(dir, extension) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, extension);
    else if (entry.name.endsWith(extension)) yield path;
  }
}

export const inlineScripts = {
  name: 'inline-scripts',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const minified = new Map(); // source -> minified, so every page gets the same bytes (one hash)
      let before = 0;
      let after = 0;
      for await (const file of files(fileURLToPath(dir), '.html')) {
        const html = await readFile(file, 'utf8');
        let out = '';
        let last = 0;
        // Plain inline scripts only: not modules or files (src), nor data (JSON-LD, speculation rules).
        for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
          const source = match[1];
          if (!minified.has(source)) {
            const { code } = await transform(source, { minify: true, target: 'es5', loader: 'js', charset: 'utf8' });
            minified.set(source, code.trim());
          }
          const code = minified.get(source);
          // A script's text ends at the first "</script": the minified code must not contain one.
          if (/<\/script/i.test(code)) throw new Error(`inline-scripts: minified script in ${file} contains "</script"`);
          out += html.slice(last, match.index) + '<script>' + code + '</script>';
          last = match.index + match[0].length;
          before += source.length;
          after += code.length;
        }
        out += html.slice(last);
        if (out !== html) await writeFile(file, out);
      }
      logger.info(`minified the inline scripts (${before} -> ${after} bytes over all pages)`);
    },
  },
};
