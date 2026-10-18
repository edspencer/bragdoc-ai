// Apple Vision on macOS (SPEC R8): `osascript -l JavaScript` (JXA) bridging to VNRecognizeTextRequest, so there's no
// compiled helper to build, sign or ship: the helper is the script below, run through proc.ts like every other
// program. The image goes in as base64 on stdin (no temp file); the text comes back as JSON on stdout, one entry per
// line Vision found, with its box. A capability probe runs once; when it fails (not macOS, Vision missing, osascript
// blocked) server/ocr/index.ts falls back to tesseract.js.
//
// Verified on the macOS CI runner (test/ocr.test.ts asserts the Vision path ran there); not on the Linux dev box.
import { ProcError, run as procRun } from '../proc.js';
import { type OcrEngine, OcrError, type OcrText } from './engine.js';
import { checkImage } from './image.js';

/** The JXA helper. `probe` says whether Vision can be used; `read` reads base64 image bytes from stdin. */
export const VISION_SCRIPT = String.raw`
ObjC.import('Foundation');
ObjC.import('Vision');
function run(argv) {
  if (argv[0] === 'probe') {
    var r = $.VNRecognizeTextRequest.alloc.init;
    return JSON.stringify({ ok: !r.isNil() });
  }
  var input = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  var data = $.NSData.alloc.initWithBase64EncodedDataOptions(input, 1);
  if (data.isNil()) return JSON.stringify({ error: 'the image bytes were not base64' });
  var handler = $.VNImageRequestHandler.alloc.initWithDataOptions(data, $.NSDictionary.dictionary);
  var request = $.VNRecognizeTextRequest.alloc.init;
  request.recognitionLevel = 0;
  request.usesLanguageCorrection = true;
  var error = Ref();
  if (!handler.performRequestsError($.NSArray.arrayWithObject(request), error)) {
    var e = error[0];
    return JSON.stringify({ error: e && !e.isNil() ? ObjC.unwrap(e.localizedDescription) : 'Vision could not read the image' });
  }
  var results = request.results;
  var lines = [];
  for (var i = 0; i < results.count; i++) {
    var obs = results.objectAtIndex(i);
    var top = obs.topCandidates(1);
    if (top.count < 1) continue;
    var c = top.objectAtIndex(0);
    var b = obs.boundingBox;
    var line = { text: ObjC.unwrap(c.string), confidence: c.confidence };
    if (b && b.origin && b.size) { line.x = b.origin.x; line.y = b.origin.y; line.w = b.size.width; line.h = b.size.height; }
    lines.push(line);
  }
  return JSON.stringify({ lines: lines });
}
`;

/** One line Vision found. The box is normalised (0–1) with its origin at the bottom left, as Vision gives it. */
export interface VisionLine {
  text: string;
  confidence?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export type Runner = typeof procRun;

export interface VisionOptions {
  run?: Runner;
  platform?: NodeJS.Platform;
  probeTimeoutMs?: number;
}

/** Vision's observations as lines of text in reading order: rows top to bottom, each left to right. */
export function linesToText(lines: readonly VisionLine[]): string {
  const boxed = lines.every((l) => [l.x, l.y, l.w, l.h].every((n) => typeof n === 'number'));
  if (!boxed) return lines.map((l) => l.text.trim()).filter(Boolean).join('\n');
  const sorted = [...lines].sort((a, b) => b.y! + b.h! - (a.y! + a.h!) || a.x! - b.x!);
  const rows: VisionLine[][] = [];
  for (const l of sorted) {
    const row = rows.at(-1);
    const cy = l.y! + l.h! / 2;
    const ref = row?.[0];
    // the same row: its vertical centre within half a line of the row's first entry
    if (ref && Math.abs(cy - (ref.y! + ref.h! / 2)) < Math.min(l.h!, ref.h!) / 2) row!.push(l);
    else rows.push([l]);
  }
  return rows
    .map((r) => r.sort((a, b) => a.x! - b.x!).map((l) => l.text.trim()).filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n');
}

export class VisionEngine implements OcrEngine {
  readonly name = 'vision' as const;
  private probed: Promise<{ ok: true } | { ok: false; why: string }> | null = null;
  private readonly run: Runner;
  private readonly platform: NodeJS.Platform;
  private readonly probeTimeoutMs: number;

  constructor({ run = procRun, platform = process.platform, probeTimeoutMs = 15_000 }: VisionOptions = {}) {
    this.run = run;
    this.platform = platform;
    this.probeTimeoutMs = probeTimeoutMs;
  }

  available() {
    this.probed ??= this.probe();
    return this.probed;
  }

  private async probe(): Promise<{ ok: true } | { ok: false; why: string }> {
    if (this.platform !== 'darwin') return { ok: false, why: 'Apple Vision is only on macOS' };
    try {
      const r = await this.run('osascript', ['-l', 'JavaScript', '-e', VISION_SCRIPT, 'probe'], { timeoutMs: this.probeTimeoutMs });
      if (r.code !== 0) return { ok: false, why: `Apple Vision isn't usable here (${firstLine(r.stderr) || `osascript exited ${r.code}`})` };
      const out = JSON.parse(r.stdout) as { ok?: unknown };
      return out.ok === true ? { ok: true } : { ok: false, why: "Apple Vision's text recognition isn't available on this Mac" };
    } catch (e) {
      return { ok: false, why: `Apple Vision isn't usable here (${e instanceof Error ? e.message : String(e)})` };
    }
  }

  async recognize(image: Uint8Array, { timeoutMs }: { timeoutMs: number }): Promise<OcrText> {
    checkImage(image);
    let r;
    try {
      r = await this.run('osascript', ['-l', 'JavaScript', '-e', VISION_SCRIPT, 'read'], {
        input: Buffer.from(image.buffer, image.byteOffset, image.byteLength).toString('base64'),
        timeoutMs,
        maxOutput: 16 * 1024 * 1024,
      });
    } catch (e) {
      if (e instanceof ProcError) throw new OcrError(`Apple Vision: ${e.message}`, e.code === 'timeout' ? 'timeout' : e.code === 'not_found' ? 'unavailable' : 'failed');
      throw e;
    }
    if (r.code !== 0) throw new OcrError(`Apple Vision failed: ${firstLine(r.stderr) || `osascript exited ${r.code}`}`, 'failed');
    let out: { lines?: VisionLine[]; error?: string };
    try {
      out = JSON.parse(r.stdout) as typeof out;
    } catch {
      throw new OcrError(`Apple Vision's helper said something unexpected: ${firstLine(r.stdout).slice(0, 200)}`, 'failed');
    }
    if (out.error) throw new OcrError(`Apple Vision couldn't read it: ${out.error}`, 'failed');
    const lines = (out.lines ?? []).filter((l): l is VisionLine => !!l && typeof l.text === 'string');
    const conf = lines.map((l) => l.confidence).filter((c): c is number => typeof c === 'number');
    return { text: linesToText(lines), ...(conf.length ? { confidence: Math.round((conf.reduce((a, b) => a + b, 0) / conf.length) * 100) } : {}) };
  }

  async close(): Promise<void> {}
}

const firstLine = (s: string) => s.trim().split('\n')[0] ?? '';
