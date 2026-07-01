import sharp from 'sharp';
import path from 'node:path';

const SRC = path.resolve('public/images/logo-andreas.png');
const OUT = path.resolve('public/images/logo-andreas-transparent.png');

const img = sharp(SRC).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Umbral: los píxeles casi-blancos se vuelven transparentes.
// Además, cerca del borde del blanco se aplica alfa gradual para bordes suaves.
const THRESHOLD = 235; // por encima => candidato a fondo
const SOFT = 200; // zona de transición

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const minC = Math.min(r, g, b);

  if (minC >= THRESHOLD) {
    // Blanco puro -> totalmente transparente
    data[i + 3] = 0;
  } else if (minC >= SOFT) {
    // Transición: alfa proporcional para evitar halo duro
    const t = (minC - SOFT) / (THRESHOLD - SOFT);
    data[i + 3] = Math.round((1 - t) * data[i + 3]);
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(OUT);

console.log('[v0] Logo transparente generado en', OUT);
