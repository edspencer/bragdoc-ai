// Evidence files: typed by content, deduplicated, size-capped, regular files only, with a sidecar.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { imageSize, MAX_BLOB_BYTES, sniff } from '../server/store/blobs.ts';
import { blobRelPath } from '../server/store/files.ts';
import { ValidationError } from '../server/store/index.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
afterEach(() => h?.cleanup());

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000002800000016808060000000000000000', 'hex'); // 640×360
const GIF = Buffer.from('474946383961' + '2003' + 'e001' + '0000', 'hex'); // 800×480
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffc00011080168028003012200021101031101', 'hex'); // 640×360
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

test('the type comes from magic bytes, not the name', async () => {
  assert.deepEqual(await sniff(PNG, 'report.pdf'), { mime: 'image/png', ext: 'png' });
  assert.deepEqual(await sniff(PDF, 'image.png'), { mime: 'application/pdf', ext: 'pdf' });
  assert.deepEqual(await sniff(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>')), { mime: 'image/svg+xml', ext: 'svg' });
  assert.deepEqual(await sniff(Buffer.from('# notes\n'), 'notes.md'), { mime: 'text/markdown', ext: 'md' });
  assert.deepEqual(await sniff(Buffer.from('hello'), 'evil.exe'), { mime: 'text/plain', ext: 'txt' });
  assert.deepEqual(await sniff(Buffer.from([0, 1, 2, 3, 0xff])), { mime: 'application/octet-stream', ext: 'bin' });
});

test('image sizes from headers', () => {
  assert.deepEqual(imageSize(PNG), { width: 640, height: 360 });
  assert.deepEqual(imageSize(GIF), { width: 800, height: 480 });
  assert.deepEqual(imageSize(JPEG), { width: 640, height: 360 });
  assert.equal(imageSize(PDF), undefined);
  assert.equal(imageSize(PNG.subarray(0, 12)), undefined);
});

test('ingest: stored once, content-addressed, with a sidecar; the same bytes again are deduplicated', async () => {
  h = storeHome();
  const a = await h.services.evidence.ingestBytes(PNG, { originalName: '../../etc/Screenshot\u0007.png' });
  assert.equal(a.created, true);
  assert.equal(a.kind, 'image');
  assert.ok(h.exists(blobRelPath(a.sha256, 'png')));
  assert.deepEqual(
    { ...a.sidecar, createdAt: undefined },
    { schemaVersion: 1, sha256: a.sha256, mime: 'image/png', ext: 'png', originalName: 'Screenshot.png', bytes: PNG.length, width: 640, height: 360, createdAt: undefined },
  );
  const b = await h.services.evidence.ingestBytes(PNG, { originalName: 'other.png' });
  assert.equal(b.created, false);
  assert.equal(b.sidecar.originalName, 'Screenshot.png');
  assert.equal(fs.readdirSync(path.join(h.home, 'evidence', a.sha256.slice(0, 2))).length, 2);
  assert.equal(h.services.evidence.file(a.sha256).sidecar.mime, 'image/png');
  const pdf = await h.services.evidence.ingestBytes(PDF);
  assert.equal(pdf.kind, 'pdf');
});

test('ingest refuses empty and oversized files, and anything but a regular file', async () => {
  h = storeHome();
  await assert.rejects(h.services.evidence.ingestBytes(new Uint8Array(0)), ValidationError);
  await assert.rejects(h.services.evidence.ingestBytes(new Uint8Array(MAX_BLOB_BYTES + 1)), /limit is 25 MB/);
  await assert.rejects(h.services.evidence.ingestPath(h.home), /not a regular file/);
  await assert.rejects(h.services.evidence.ingestPath(path.join(h.home, 'nope.png')), /no file/);
  const big = path.join(h.home, '..', 'big.bin');
  fs.writeFileSync(big, '');
  fs.truncateSync(big, MAX_BLOB_BYTES + 1);
  await assert.rejects(h.services.evidence.ingestPath(big), /limit/);
  const ok = path.join(h.home, '..', 'shot.png');
  fs.writeFileSync(ok, PNG);
  fs.symlinkSync(ok, path.join(h.home, '..', 'link.png'));
  assert.equal((await h.services.evidence.ingestPath(path.join(h.home, '..', 'link.png'))).sidecar.originalName, 'link.png');
});

test('a sidecar whose blob file is missing: file() says so, and re-ingesting restores it', async () => {
  h = storeHome();
  const a = await h.services.evidence.ingestBytes(PDF);
  fs.renameSync(path.join(h.home, blobRelPath(a.sha256, 'pdf')), path.join(h.home, '..', 'moved.pdf'));
  assert.throws(() => h.services.evidence.file(a.sha256), /missing/);
  await h.services.evidence.ingestBytes(PDF);
  assert.ok(h.services.evidence.file(a.sha256).path);
});
