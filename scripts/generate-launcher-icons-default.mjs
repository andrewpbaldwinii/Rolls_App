/**
 * Android home-screen launcher icons only (ic_launcher / ic_launcher_round mipmaps).
 *
 * Source art (in order): `src/assets/images/launcher_icon_default.png`, else `app_icon.png`.
 * Edit `launcher_icon_default.png` for the launcher look; in-app UI can keep using `app_icon.png`.
 *
 * Defaults: SCALE=2.6, OFFSET_X_FRAC=0.016 (slight right for optical center).
 *   SCALE=2.4 OFFSET_X_FRAC=0.02 npm run generate:launcher
 *
 * Does not modify in-app `app_icon.png` usage in JS — only writes under android/.../mipmap-*.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const LAUNCHER_DEFAULT = path.join(ROOT, 'src/assets/images/launcher_icon_default.png');
const APP_ICON = path.join(ROOT, 'src/assets/images/app_icon.png');

const SCALE = Math.min(5, Math.max(0.1, parseFloat(process.env.SCALE ?? '2.6')));
const offsetEnv = process.env.OFFSET_X_FRAC;
const OFFSET_X_FRAC = Math.min(
  0.15,
  Math.max(
    -0.15,
    offsetEnv !== undefined && offsetEnv !== '' ? parseFloat(offsetEnv) : 0.016,
  ),
);

const DENSITIES = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const SIZE_BY_FOLDER = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

function resolveLauncherSource() {
  if (fs.existsSync(LAUNCHER_DEFAULT) && fs.statSync(LAUNCHER_DEFAULT).size > 0) {
    return LAUNCHER_DEFAULT;
  }
  if (fs.existsSync(APP_ICON) && fs.statSync(APP_ICON).size > 0) {
    return APP_ICON;
  }
  return null;
}

function findFirstExistingSquare() {
  for (const folder of DENSITIES) {
    const p = path.join(RES, folder, 'ic_launcher.png');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Fill each density square from master (overwrites) when master exists. */
async function seedMipmapsFromMaster(master) {
  for (const folder of DENSITIES) {
    const dir = path.join(RES, folder);
    const size = SIZE_BY_FOLDER[folder];
    fs.mkdirSync(dir, { recursive: true });
    const square = path.join(dir, 'ic_launcher.png');
    const round = path.join(dir, 'ic_launcher_round.png');
    await sharp(master)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(square);
    await fs.promises.copyFile(square, round);
    console.log('Seeded', folder, `${size}×${size}`, 'from', path.basename(master));
  }
}

async function ensureBaseMipmaps() {
  const master = resolveLauncherSource() ?? findFirstExistingSquare();
  if (!master) {
    console.warn(
      'No launcher_icon_default.png / app_icon.png and no ic_launcher.png in mipmaps — add art first.',
    );
    return;
  }
  await seedMipmapsFromMaster(master);
}

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
  await ensureBaseMipmaps();
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
      `(×${SCALE}${OFFSET_X_FRAC !== 0 ? `, offsetX ${(OFFSET_X_FRAC * 100).toFixed(2)}% canvas width` : ''})`,
    );
  }
  const src = resolveLauncherSource();
  console.log(
    'Done. Launcher source:',
    src ? path.relative(ROOT, src) : '(mipmap only)',
    '— Rebuild the Android app to refresh the home-screen icon.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
