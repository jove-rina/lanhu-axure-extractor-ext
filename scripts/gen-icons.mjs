/**
 * Generate extension PNG icons from public/icons/icon.svg.
 *
 * Usage: pnpm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'public/icons/icon.svg');
const sizes = [16, 48, 128];

if (!fs.existsSync(svgPath)) {
  console.error(`${svgPath} not found.`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);

for (const size of sizes) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  const out = path.join(root, `public/icons/icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`Wrote ${path.relative(root, out)} (${png.length} bytes)`);
}
