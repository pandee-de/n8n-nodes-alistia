// Copies non-TS assets (icons, node metadata) into dist, mirroring the source
// tree, so n8n can resolve `file:*.svg` icons and `.node.json` codex files.
import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

const roots = ['credentials', 'nodes'];
const assetExt = ['.svg', '.png', '.json'];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (assetExt.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

for (const root of roots) {
  let files = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    const dest = join('dist', file);
    await mkdir(dirname(dest), { recursive: true });
    await cp(file, dest);
    console.log('copied', relative('.', dest));
  }
}
