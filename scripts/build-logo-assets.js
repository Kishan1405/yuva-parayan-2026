// One-off script: crops the new saint+boy illustration into every icon size
// the app needs. Run with: node scripts/build-logo-assets.js <source-image>
const sharp = require("sharp");
const path = require("path");

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/build-logo-assets.js <source-image>");
  process.exit(1);
}

// Tight square crop centered on the two figures, keeping the golden temple
// glow behind them and some ground below their feet. Tuned against the
// 1636x1313 source — the flag/finial at the very top is deliberately cropped
// out since it's illegible at icon sizes anyway.
const CROP = { left: 315, top: 153, width: 1050, height: 1050 };

const root = path.resolve(__dirname, "..");

async function run() {
  const master = sharp(src).extract(CROP);
  const masterBuffer = await master.png().toBuffer();

  // Plain square icons — used wherever the icon isn't OS-masked into a
  // circle/squircle (browser tab favicon, apple touch icon, nav-bar logo).
  await sharp(masterBuffer).resize(512, 512).toFile(path.join(root, "src/app/icon.png"));
  await sharp(masterBuffer).resize(180, 180).toFile(path.join(root, "src/app/apple-icon.png"));
  await sharp(masterBuffer).resize(192, 192).toFile(path.join(root, "public/icon-192.png"));
  await sharp(masterBuffer).resize(512, 512).toFile(path.join(root, "public/icon-512.png"));
  await sharp(masterBuffer).resize(256, 256).toFile(path.join(root, "public/logo.png"));

  // Maskable icon: Android/PWA launchers crop this into circles/squircles,
  // so the subject needs to sit inside the center ~80% "safe zone" — shrink
  // the master and pad it out on a solid background instead of using the
  // tight crop directly (which would clip the figures' shoulders/edges).
  const edgeColor = { r: 74, g: 108, b: 189 }; // sampled sky blue from the source
  await sharp(masterBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: edgeColor,
    })
    .resize(512, 512)
    .toFile(path.join(root, "public/icon-maskable-512.png"));

  console.log("Done. Generated: icon.png, apple-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png, logo.png");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
