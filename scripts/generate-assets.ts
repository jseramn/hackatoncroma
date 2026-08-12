/**
 * Generates the repo's raster brand assets from the vector sources in
 * public/ and app/:
 *
 *   public/og.png          1200x630  Open Graph card
 *   public/og-twitter.png  1200x600  Twitter card
 *   app/favicon.ico        16/32/48  multi-size ICO (replaces the CNA default)
 *
 * Idempotent: safe to re-run any time the brand changes.
 *
 *   bun scripts/generate-assets.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Brand tokens (see app/globals.css)
const INK = "#050505";
const PAPER = "#FAFAFA";
const AGENT = "#5967e8";
const MUTED = "#7a7a7a";
const LINE = "rgba(255,255,255,0.14)";

// The Croma symbol is a 10x10 grid of vertical dashes (a dotted "C"),
// extracted from public/croma_symbol_white.svg. Filled cells per row:
const GRID = [
  [3, 4, 5, 6, 7],
  [2, 3, 4, 5, 6, 7, 8],
  [1, 2, 3, 7, 8, 9],
  [1, 2, 8, 9],
  [0, 1],
  [0, 1],
  [1, 2, 8, 9],
  [1, 2, 3, 7, 8, 9],
  [2, 3, 4, 5, 6, 7, 8],
  [3, 4, 5, 6, 7],
] as const;

/** Path data for the symbol drawn inside a box: barRatio = dash width / cell. */
function symbolPath(box: number, ox: number, oy: number, barRatio: number) {
  const cell = box / 10;
  const bar = cell * barRatio;
  return GRID.flatMap((cols, row) =>
    cols.map((col) => {
      const x = (ox + col * cell + (cell - bar) / 2).toFixed(2);
      const y = (oy + row * cell).toFixed(2);
      return `M${x} ${y}h${bar.toFixed(2)}v${cell.toFixed(2)}h-${bar.toFixed(2)}z`;
    }),
  ).join("");
}

// ── Open Graph ────────────────────────────────────────────────────────────

const wordmark = readFileSync(join(ROOT, "public/croma_brand_white.svg"));
const wordmarkUri = `data:image/svg+xml;base64,${wordmark.toString("base64")}`;
const WORDMARK_ASPECT = 626 / 85;

function ogSvg(width: number, height: number) {
  const margin = 88;
  const cx = width / 2;

  // Centered stack: symbol, wordmark, eyebrow
  const symbolBox = 168;
  const wordW = 336;
  const wordH = wordW / WORDMARK_ASPECT;
  const gapA = 56;
  const gapB = 64;
  const eyebrowH = 18;
  const stack = symbolBox + gapA + wordH + gapB + eyebrowH;
  const top = (height - stack) / 2;
  const wordY = top + symbolBox + gapA;
  const eyebrowY = wordY + wordH + gapB;

  const mono = `font-family="monospace" font-size="17" letter-spacing="5"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${INK}"/>
  <g stroke="${LINE}" stroke-width="1">
    <line x1="${margin}.5" y1="0" x2="${margin}.5" y2="${height}"/>
    <line x1="${width - margin}.5" y1="0" x2="${width - margin}.5" y2="${height}"/>
    <line x1="0" y1="${margin}.5" x2="${width}" y2="${margin}.5"/>
    <line x1="0" y1="${height - margin}.5" x2="${width}" y2="${height - margin}.5"/>
  </g>
  <text x="${margin + 32}" y="${margin - 34}" fill="${MUTED}" ${mono}>CROMA MCP</text>
  <text x="${width - margin - 32}" y="${margin - 34}" fill="${MUTED}" ${mono} text-anchor="end">CO · PE · MX</text>
  <text x="${margin + 32}" y="${height - margin + 44}" fill="${MUTED}" ${mono}>USECROMA.COM</text>
  <text x="${width - margin - 32}" y="${height - margin + 44}" fill="${MUTED}" ${mono} text-anchor="end">AI SDK · VERCEL</text>
  <path fill="${PAPER}" d="${symbolPath(symbolBox, cx - symbolBox / 2, top, 0.28)}"/>
  <image x="${cx - wordW / 2}" y="${wordY}" width="${wordW}" height="${wordH}" href="${wordmarkUri}" xlink:href="${wordmarkUri}"/>
  <circle cx="${cx - 262}" cy="${eyebrowY - 6}" r="4" fill="${AGENT}"/>
  <text x="${cx + 12}" y="${eyebrowY}" fill="#9a9a9a" ${mono} text-anchor="middle">CHAT TEMPLATE · LIVE PUBLIC DATA</text>
</svg>`;
}

// ── Favicon ───────────────────────────────────────────────────────────────

/** Symbol on an ink square; chunkier dashes the smaller the target. */
function faviconSvg(size: number, barRatio: number) {
  const box = (size / 12) * 10; // one grid cell of padding on each side
  const pad = size / 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <path fill="${PAPER}" d="${symbolPath(box, pad, pad, barRatio)}"/>
</svg>`;
}

async function iconPng(size: number) {
  const superSize = size * 12; // supersample, then lanczos down
  const barRatio = size <= 16 ? 1 : size <= 32 ? 0.72 : 0.6;
  const data = await sharp(Buffer.from(faviconSvg(superSize, barRatio)))
    .resize(size, size)
    .png()
    .toBuffer();
  return { size, data };
}

/** Pack PNG buffers into a multi-size .ico (PNG entries, Vista+ format). */
function packIco(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// ── Run ───────────────────────────────────────────────────────────────────

await sharp(Buffer.from(ogSvg(1200, 630)))
  .png()
  .toFile(join(ROOT, "public/og.png"));
await sharp(Buffer.from(ogSvg(1200, 600)))
  .png()
  .toFile(join(ROOT, "public/og-twitter.png"));

const icons = await Promise.all([48, 32, 16].map(iconPng));
writeFileSync(join(ROOT, "app/favicon.ico"), packIco(icons));

console.log("generated: public/og.png, public/og-twitter.png, app/favicon.ico");
