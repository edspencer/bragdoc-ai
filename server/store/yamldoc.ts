// Editing YAML as Documents, so a write changes only what it must: comments, key order, quoting and unknown keys all
// survive, because people (and their agents) hand-edit these files (SPEC R2; adapted from Hallway's yamldoc.ts). Plus
// pinning a problem to a line and column, and the front-matter split for achievement files, which keeps the markdown
// body byte for byte when only the front-matter changes.
//
// Reading is done by js-yaml instead (readYaml), because it's about seven times faster and the boot scan reads every
// file (D25). Both parse YAML 1.2's core schema (no timestamps: a date stays a string), both refuse duplicate keys,
// and test/yamldoc.test.ts holds them to the same answers. The Document parser is still what every write edits, and
// what pins a Problem to its line.
import jsyaml from 'js-yaml';
import YAML, { isMap, isScalar, isSeq, LineCounter, Pair, Scalar, type Document, type Node, YAMLMap } from 'yaml';

/** A path into a parsed file: keys and list indexes. */
export type KeyPath = (string | number)[];

export interface Parsed {
  doc: Document.Parsed;
  lc: LineCounter;
  /** The first syntax error, if any, with its position. */
  error: { message: string; line?: number; col?: number } | null;
}

export function parse(raw: string): Parsed {
  const lc = new LineCounter();
  const doc = YAML.parseDocument(raw, { lineCounter: lc, prettyErrors: true, uniqueKeys: true });
  const e = doc.errors[0];
  return {
    doc,
    lc,
    error: e ? { message: e.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, ''), line: e.linePos?.[0].line, col: e.linePos?.[0].col } : null,
  };
}

/** The plain value of a YAML text (the fast read path), or its first syntax error. */
export function readYaml(text: string): { value: unknown; error: null } | { value: null; error: { message: string; line?: number; col?: number } } {
  // anchors and aliases are rare in hand-written files, and js-yaml has no limit on them (a few nested aliases can
  // make a structure that takes forever to walk), so a file with an anchor takes the Document parser, which caps them
  if (/(?:^|[\s,[{:-])&[^\s,[\]{}]/m.test(text)) {
    const p = parse(text);
    if (p.error) return { value: null, error: p.error };
    try {
      return { value: p.doc.toJS({ maxAliasCount: 100 }) ?? null, error: null };
    } catch (e) {
      return { value: null, error: { message: (e as Error).message } };
    }
  }
  try {
    return { value: jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA }) ?? null, error: null };
  } catch (e) {
    const err = e as { reason?: string; message: string; mark?: { line: number; column: number } };
    return { value: null, error: { message: err.reason ?? err.message.split('\n')[0], ...(err.mark ? { line: err.mark.line + 1, col: err.mark.column + 1 } : {}) } };
  }
}

/** Where `key` is in the file: the value's node, else the nearest ancestor that exists. */
export function locate(p: Parsed, key: KeyPath): { line: number; col: number } | undefined {
  for (let n = key.length; n >= 0; n--) {
    const node = n === 0 ? p.doc.contents : p.doc.getIn(key.slice(0, n), true);
    const range = (node as Node | undefined)?.range;
    if (range) return p.lc.linePos(range[0]);
  }
  return undefined;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A new node for `value`. Short lists of scalars are written inline (`projects: [a, b]`), as people write them. */
function createNode(doc: Document, value: unknown): Node {
  const node = doc.createNode(value) as Node;
  if (isSeq(node) && (value as unknown[]).every((v) => !isPlainObject(v) && !Array.isArray(v))) node.flow = true;
  return node;
}

/** A merge-patch's object with its null (deleting) members dropped, at every depth. */
function withoutNulls(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, isPlainObject(v) ? withoutNulls(v) : v]),
  );
}

/**
 * Make `node` hold `value`, changing as little as possible: a scalar keeps its comments; a mapping keeps the keys the
 * patch doesn't mention; a list is updated item by item, so an unchanged item keeps its comments. Returns the node to
 * put in place (maybe new).
 */
function setNode(doc: Document, node: unknown, value: unknown): Node {
  if (isPlainObject(value)) {
    // a mapping that isn't there yet: null means "leave it out" here too (a merge-patch deletes it), not `key: null`
    if (!isMap(node)) return createNode(doc, withoutNulls(value));
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      if (v === null) {
        node.delete(k);
        continue;
      }
      const pair = node.items.find((it) => (isScalar(it.key) ? it.key.value : it.key) === k);
      if (pair) pair.value = setNode(doc, pair.value, v);
      else {
        const fresh = isPlainObject(v) ? withoutNulls(v) : v;
        node.items.push(new Pair(doc.createNode(k), createNode(doc, fresh)));
      }
    }
    return node;
  }
  if (Array.isArray(value)) {
    if (!isSeq(node)) return createNode(doc, value);
    // list items are whole values. Mappings with an `id` (evidence) are matched by it, not by position, so removing
    // one item never shifts another's comments or keys onto its neighbour
    if (value.length && value.every((v) => isPlainObject(v) && typeof v.id === 'string')) {
      const byId = new Map<string, YAMLMap>();
      for (const it of node.items) if (isMap(it) && typeof it.get('id') === 'string') byId.set(it.get('id') as string, it);
      node.items = value.map((v) => {
        const old = byId.get((v as { id: string }).id);
        return old ? replaceMap(doc, old, v as Record<string, unknown>) : createNode(doc, v);
      });
      return node;
    }
    value.forEach((v, i) => {
      if (i >= node.items.length) node.items.push(createNode(doc, v));
      else if (isPlainObject(v) && isMap(node.items[i])) node.items[i] = replaceMap(doc, node.items[i] as YAMLMap, v);
      else node.items[i] = setNode(doc, node.items[i], v);
    });
    node.items.length = value.length;
    return node;
  }
  if (isScalar(node) && node.value === value) return node;
  if (isScalar(node) && typeof node.value === typeof value && node.type !== Scalar.BLOCK_LITERAL && node.type !== Scalar.BLOCK_FOLDED) {
    node.value = value;
    return node;
  }
  // a different kind of value: a new node, carrying the old one's comments
  const fresh = createNode(doc, value);
  if (node && typeof node === 'object') {
    const old = node as Node;
    Object.assign(fresh, { comment: old.comment, commentBefore: old.commentBefore, spaceBefore: old.spaceBefore });
  }
  return fresh;
}

/**
 * Make a list item's mapping exactly `value`: keys it lacks go, scalars keep their comments, and a nested mapping or
 * list is replaced whole unless it's unchanged (merging a `quote:` into another quote would mix up who said what).
 */
function replaceMap(doc: Document, m: YAMLMap, value: Record<string, unknown>): YAMLMap {
  for (const it of [...m.items]) {
    const k = isScalar(it.key) ? String(it.key.value) : String(it.key);
    if (value[k] === undefined || value[k] === null) m.delete(k);
  }
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined || v === null) continue;
    const pair = m.items.find((it) => (isScalar(it.key) ? it.key.value : it.key) === k);
    if (!pair) m.items.push(new Pair(doc.createNode(k), createNode(doc, v)));
    else if (isPlainObject(v) || Array.isArray(v)) {
      const same = JSON.stringify((pair.value as Node | null)?.toJSON?.() ?? pair.value) === JSON.stringify(v);
      if (!same) pair.value = setNode(doc, null, v);
    } else pair.value = setNode(doc, pair.value, v);
  }
  return m;
}

function root(doc: Document): YAMLMap {
  if (doc.contents === null || (isScalar(doc.contents) && doc.contents.value === null)) {
    // an empty file (maybe just comments): give it a mapping, keeping the comments
    const map = new YAMLMap();
    if (isScalar(doc.contents)) map.commentBefore = doc.contents.commentBefore ?? undefined;
    doc.contents = map as never;
  }
  if (!isMap(doc.contents)) throw new Error('the file must be a mapping (key: value lines) at the top level');
  return doc.contents;
}

/** JSON merge patch (RFC 7396) onto the document: mappings merge, null removes a key, anything else replaces. */
export function mergePatch(doc: Document, patch: Record<string, unknown>): void {
  setNode(doc, root(doc), patch);
}

/** A fresh document for a new file, with an optional comment block at the top. */
export function newDocument(header?: string): Document {
  const doc = new YAML.Document(new YAMLMap());
  if (header) doc.commentBefore = header;
  return doc;
}

/**
 * The document as text. A string the `yaml` library would write plain but js-yaml would read back as something else
 * (`0b101` and `1_000` are numbers to js-yaml, not in YAML 1.2's core schema) is quoted, so a write reads back as
 * what was written (D25).
 */
export function stringify(doc: Document): string {
  YAML.visit(doc, {
    Scalar(_, n) {
      if (typeof n.value !== 'string' || (n.type && n.type !== Scalar.PLAIN)) return;
      let same = false;
      try {
        same = jsyaml.load(n.value, { schema: jsyaml.CORE_SCHEMA }) === n.value;
      } catch {
        /* not plain-safe: quote it */
      }
      // a plain scalar that's ambiguous to js-yaml; `yaml` quotes the ones it finds ambiguous itself
      if (!same && !/[\n:#]|^\s|\s$/.test(n.value) && /^[-+.0-9]/.test(n.value)) n.type = Scalar.QUOTE_DOUBLE;
    },
  });
  return doc.toString({ lineWidth: 0 });
}

// ---------------------------------------------------------------------------------------------------------------
// Front-matter (achievements/**/<id>.md)
// ---------------------------------------------------------------------------------------------------------------

export interface FrontMatter {
  /** The YAML between the `---` lines. */
  yaml: string;
  /** Everything after the closing `---` line, exactly as it is in the file. */
  body: string;
  /** The line the YAML starts on (1-based), to report problems at the right line of the file. */
  yamlLine: number;
}

const OPEN = /^﻿?---[ \t]*\r?\n/;
const CLOSE = /^---[ \t]*(?:\r?\n|$)/m;

/** Split a markdown file into its front-matter and body; null when it doesn't start with a `---` block. */
export function splitFrontMatter(raw: string): FrontMatter | null {
  const open = OPEN.exec(raw);
  if (!open) return null;
  const rest = raw.slice(open[0].length);
  const close = CLOSE.exec(rest); // the first `---` line, which may be the very next one (an empty block)
  if (!close) return null;
  return { yaml: rest.slice(0, close.index), body: rest.slice(close.index + close[0].length), yamlLine: 2 };
}

/** Put a front-matter YAML (ending in a newline) and a body back together. */
export function joinFrontMatter(yaml: string, body: string): string {
  return `---\n${yaml}${yaml.endsWith('\n') || yaml === '' ? '' : '\n'}---\n${body}`;
}
