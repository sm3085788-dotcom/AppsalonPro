import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve(
  'C:/Users/sm308/.cursor/projects/c-AppsalonPro/assets',
);
const OUT_DIR = path.resolve('public/images/brands');

const BRANDS = [
  {
    slug: 'kerastase',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_1-77b1f87f-946d-408d-af50-86312c1ab372.png',
    color: false,
  },
  {
    slug: 'loreal-professionnel',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_2-bb689a5e-7ed5-4446-9595-2513dffef5a6.png',
    color: false,
  },
  {
    slug: 'olaplex',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_3-45bff3b0-5623-4b51-8e52-1f6cae0aae4d.png',
    color: false,
  },
  {
    slug: 'moroccanoil',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_4-b5622c58-3c6c-4265-802a-e1d6c05997d2.png',
    color: true,
  },
  {
    slug: 'redken',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_5-abbad0e5-5206-44ae-baba-a478ac309e8c.png',
    color: false,
  },
  {
    slug: 'wella',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_6-ed302dfc-3549-45cf-a602-46cc1f4299c7.png',
    color: false,
  },
  {
    slug: 'davines',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_7-24447f33-4cdc-4505-a4cf-9773a61a3279.png',
    color: false,
  },
  {
    slug: 'mac',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_8-c3527fc1-fcde-4c35-aaee-f887ddd03e03.png',
    color: false,
  },
  {
    slug: 'opi',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_9-4567770b-8cf2-407c-96cf-38c622df8625.png',
    color: false,
  },
  {
    slug: 'dior',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_10-8f2cafbd-a2a8-4662-b91a-7bbf586bdde6.png',
    color: false,
  },
  {
    slug: 'schwarzkopf',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_12-1df44fed-8387-4714-9a46-ad1b7304c9ed.png',
    color: false,
  },
  {
    slug: 'goldwell',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_13-d12fc26d-76cc-4208-9662-5d8a4a4b6532.png',
    color: true,
  },
  {
    slug: 'aveda',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_14-a58e5ec6-b5cf-4be2-897f-b39ee2077447.png',
    color: false,
  },
  {
    slug: 'nars',
    file: 'c__Users_sm308_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_15-171bf5f8-62de-4c27-9dec-42dad05e3afd.png',
    color: false,
  },
];

const TARGET_MIN_HEIGHT = 140; // ~2× retina para ~70px de alto en pantalla

async function removeWhiteBackground(inputPath, outputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = 245;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  const trimmed = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim()
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  const trimmedHeight = trimmedMeta.height ?? info.height;

  let pipeline = sharp(trimmed);
  if (trimmedHeight < TARGET_MIN_HEIGHT) {
    pipeline = pipeline.resize({
      height: TARGET_MIN_HEIGHT,
      kernel: sharp.kernel.lanczos3,
    });
  }

  const output = await pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();

  await sharp(output).toFile(outputPath);
  const meta = await sharp(output).metadata();

  return { width: meta.width ?? info.width, height: meta.height ?? info.height };
}

await fs.mkdir(OUT_DIR, { recursive: true });

const manifest = [];

for (const brand of BRANDS) {
  const input = path.join(ASSETS_DIR, brand.file);
  const output = path.join(OUT_DIR, `${brand.slug}.png`);
  const { width, height } = await removeWhiteBackground(input, output);
  manifest.push({
    slug: brand.slug,
    width,
    height,
    color: brand.color,
  });
  console.log(`✓ ${brand.slug} (${width}x${height})`);
}

await fs.writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log('Done.');
