import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readGlassStyles } from './src/styles.mjs';

const [css, template, metadata] = await Promise.all([
  readGlassStyles(),
  readFile(new URL('src/client.tpl.js', import.meta.url), 'utf8'),
  readFile(new URL('package.json', import.meta.url), 'utf8'),
]);

let out = template;
for (const [placeholder, value] of Object.entries({
  __GLASS_CSS__: css,
  __GLASS_VERSION__: JSON.parse(metadata).version,
})) {
  if (out.split(placeholder).length !== 2) throw new Error('Expected one ' + placeholder + ' in the client template');
  out = out.replace(placeholder, () => JSON.stringify(value));
}

const lib = new URL('lib/', import.meta.url);
await mkdir(lib, { recursive: true });
await writeFile(new URL('client.js', lib), out, 'utf8');
console.log('Built lib/client.js (' + (Buffer.byteLength(out) / 1024).toFixed(1) + ' KiB)');
