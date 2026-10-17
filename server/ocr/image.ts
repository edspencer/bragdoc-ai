// Getting an image ready for tesseract (SPEC R8). Tesseract reads text best at roughly 20–40 px per line, and a
// non-Retina screenshot of a chat app is about 15: at that size it misreads half the words (mean confidence 33 on a
// 0.5× render of a Slack message, 85 after a 2× upscale). So a PNG that isn't already large is decoded, flattened onto
// white (transparent pixels would read as black) and scaled up 2× (bilinear) before it's read. Other formats go to
// tesseract as they are. Pure JS (pngjs): nothing to compile, nothing to download.
import { PNG } from 'pngjs';
import { imageSize } from '../store/blobs.js';
import { OcrError } from './engine.js';

/** Anything bigger is refused: a 50-megapixel image would take tesseract minutes and a lot of memory. */
export const MAX_PIXELS = 40_000_000;
/** PNGs narrower than this are scaled up 2× (a Retina screenshot is already at least this wide)... */
export const UPSCALE_BELOW_WIDTH = 1600;
/** ...unless the result would be more than this many pixels. */
export const MAX_UPSCALED_PIXELS = 16_000_000;

export interface Prepared {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** 1, or 2 when it was scaled up. */
  scale: number;
}

const isPng = (b: Uint8Array) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/** The image's size, or an OcrError: not an image tesseract can read, or too big to try. */
export function checkImage(bytes: Uint8Array): { width: number; height: number } {
  const size = imageSize(bytes);
  if (!size || !size.width || !size.height) throw new OcrError("that isn't an image BragDoc can read text in (PNG, JPEG, GIF or WebP)", 'unsupported');
  if (size.width * size.height > MAX_PIXELS) throw new OcrError(`the image is too big to read (${size.width}×${size.height}; the limit is ${MAX_PIXELS / 1e6} megapixels)`, 'too_large');
  return size;
}

export function prepareForTesseract(bytes: Uint8Array): Prepared {
  const { width, height } = checkImage(bytes);
  if (!isPng(bytes)) return { bytes, width, height, scale: 1 };
  let png: PNG;
  try {
    png = PNG.sync.read(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  } catch (e) {
    throw new OcrError(`the PNG can't be decoded: ${(e as Error).message}`, 'unsupported');
  }
  const scale = width < UPSCALE_BELOW_WIDTH && width * height * 4 <= MAX_UPSCALED_PIXELS ? 2 : 1;
  const flat = flatten(png.data);
  if (scale === 1 && !flat.changed) return { bytes, width, height, scale };
  const out = scale === 1 ? Object.assign(new PNG({ width, height }), { data: flat.data }) : upscale2x(flat.data, width, height);
  return { bytes: PNG.sync.write(out), width: out.width, height: out.height, scale };
}

/** RGBA over white, so transparent pixels are paper, not ink. */
function flatten(data: Buffer): { data: Buffer; changed: boolean } {
  let changed = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] !== 255) {
      changed = true;
      break;
    }
  if (!changed) return { data, changed };
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3]! / 255;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c]! * a + 255 * (1 - a));
    out[i + 3] = 255;
  }
  return { data: out, changed };
}

/** Bilinear 2× (pixel centres aligned). */
function upscale2x(src: Buffer, w: number, h: number): PNG {
  const W = w * 2;
  const H = h * 2;
  const out = new PNG({ width: W, height: H });
  const dst = out.data;
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < W; x++) {
      const sx = Math.min(w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = sx - x0;
      const a = (y0 * w + x0) * 4;
      const b = (y0 * w + x1) * 4;
      const c = (y1 * w + x0) * 4;
      const d = (y1 * w + x1) * 4;
      const o = (y * W + x) * 4;
      for (let k = 0; k < 4; k++) dst[o + k] = Math.round((src[a + k]! * (1 - fx) + src[b + k]! * fx) * (1 - fy) + (src[c + k]! * (1 - fx) + src[d + k]! * fx) * fy);
    }
  }
  return out;
}
