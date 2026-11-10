// Authoring-time only: rebuilds public/favicon.ico and public/apple-touch-icon.png from
// public/favicon.svg. Run it again whenever the SVG changes:
//
//   node scripts/make-favicons.mjs
//
// favicon.ico answers the browsers and crawlers that ask for /favicon.ico without reading the
// page; the apple-touch-icon is what iOS puts on the home screen (square, no rounded corners:
// iOS rounds them itself).
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ICO_SIZES = [16, 32, 48];
const TOUCH_SIZE = 180;

const svg = await readFile(join(PUBLIC, 'favicon.svg'), 'utf8');
const png = (source, size) => sharp(Buffer.from(source), { density: 384 }).resize(size, size).png().toBuffer();

// An .ico is a small directory followed by the images, which may be stored as PNG.
const images = await Promise.all(ICO_SIZES.map((size) => png(svg, size)));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((image, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(ICO_SIZES[i], 0); // width
  entry.writeUInt8(ICO_SIZES[i], 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.length;
  return entry;
});
await writeFile(join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]));

// Same drawing with square corners, so there is nothing see-through for iOS to fill with black.
const square = svg.replace(/\srx="[^"]*"/, '');
await writeFile(join(PUBLIC, 'apple-touch-icon.png'), await png(square, TOUCH_SIZE));

console.log(`favicon.ico (${ICO_SIZES.join(', ')} px) and apple-touch-icon.png (${TOUCH_SIZE} px) written to public/`);
