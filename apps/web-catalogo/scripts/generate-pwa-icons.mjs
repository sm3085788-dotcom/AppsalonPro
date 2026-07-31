import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOGO = path.join(ROOT, 'public/images/logo-andreas-transparent.png');
const BG = '#0e0e0f';

/** @type {{ rel: string; size: number; padding: number }[]} */
const TARGETS = [
  { rel: 'public/pwa/icon-192.png', size: 192, padding: 0.16 },
  { rel: 'public/pwa/icon-512.png', size: 512, padding: 0.16 },
  { rel: 'public/pwa/icon-512-maskable.png', size: 512, padding: 0.22 },
  { rel: 'public/pwa/apple-touch-icon.png', size: 180, padding: 0.16 },
  { rel: 'app/icon.png', size: 32, padding: 0.12 },
  { rel: 'app/apple-icon.png', size: 180, padding: 0.16 },
];

async function writeIcon(rel, size, paddingRatio) {
  const outPath = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logoBuf = await sharp(LOGO)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(logoBuf).metadata();
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const left = Math.floor((size - w) / 2);
  const top = Math.floor((size - h) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toFile(outPath);

  console.log('wrote', rel);
}

for (const t of TARGETS) {
  await writeIcon(t.rel, t.size, t.padding);
}
