/**
 * Homescreen launcher only: multiplies the trimmed logo size by SCALE, placed on the same canvas.
 * Optional OFFSET_X_FRAC shifts the logo right (fraction of canvas width, e.g. 0.012 = 1.2%).
 * If the scaled logo is larger than the icon square, it is scaled down uniformly to fit.
 * Does NOT modify app_icon.png or in-app UI.
 *
 * Example: SCALE=1.2 OFFSET_X_FRAC=0.012 node scripts/generate-launcher-icons-home.mjs
 *
 * Re-running stacks on whatever is already in the mipmaps — restore from git first if needed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RES = path.join(ROOT, 'android/app/src/main/res');

const SCALE = Math.min(5, Math.max(0.1, parseFloat(process.env.SCALE || '1') || 1));
/** Positive = move logo right (as a fraction of canvas width). */
const OFFSET_X_FRAC = Math.min(0.15, Math.max(-0.15, parseFloat(process.env.OFFSET_X_FRAC || '0') || 0));

const DENSITIES = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function scaleLogoOnCanvas(iconPath) {
  const buf = fs.readFileSync(iconPath);
  const metaCanvas = await sharp(buf).metadata();
  const canvasW = metaCanvas.width;
  const canvasH = metaCanvas.height;

  const trimmed = await sharp(buf).trim({ threshold: 18 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) {
    throw new Error(`No content after trim: ${iconPath}`);
  }

  let targetW = Math.max(1, Math.round(w * SCALE));
  let targetH = Math.max(1, Math.round(h * SCALE));

  const fit = Math.min(canvasW / targetW, canvasH / targetH, 1);
  targetW = Math.max(1, Math.round(targetW * fit));
  targetH = Math.max(1, Math.round(targetH * fit));

  const resized = await sharp(trimmed).resize(targetW, targetH).png().toBuffer();

  const offsetX = Math.round(canvasW * OFFSET_X_FRAC);
  let left = Math.round((canvasW - targetW) / 2 + offsetX);
  const top = Math.round((canvasH - targetH) / 2);

  left = Math.max(0, Math.min(left, canvasW - targetW));

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  for (const folder of DENSITIES) {
    const dir = path.join(RES, folder);
    const square = path.join(dir, 'ic_launcher.png');
    if (!fs.existsSync(square)) {
      console.warn('Skip (missing):', square);
      continue;
    }
    const out = await scaleLogoOnCanvas(square);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), out);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), out);
    console.log(
      'Updated',
      folder,
      `(×${SCALE}${OFFSET_X_FRAC !== 0 ? `, offsetX ${OFFSET_X_FRAC * 100}% canvas width` : ''})`
    );
  }
  console.log('Done. In-app app_icon.png was not changed. Rebuild the Android app to see the home screen icon.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
