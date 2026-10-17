// A Problem: something wrong with a file in the data home, as Settings → Data lists them (SPEC R2). Problems never
// stop the app: a broken file keeps its last good copy in memory (if it had one) and is never rewritten.

export type ProblemCode =
  /** The YAML (or the front-matter) doesn't parse. */
  | 'syntax'
  /** It parses, but doesn't match the file's schema. */
  | 'invalid'
  /** Written by a newer BragDoc: read-only here. */
  | 'future-version'
  /** It refers to an id (or a blob) that doesn't exist. */
  | 'dangling'
  /** A file where BragDoc expects something else (a bad name, `.yml`): ignored. */
  | 'stray';

export interface Problem {
  severity: 'error' | 'warning';
  code: ProblemCode;
  /** The file, relative to the data home, with `/`. */
  file: string;
  /** 1-based, when known. */
  line?: number;
  col?: number;
  /** The key path in the file, `evidence.0.blob`. */
  key?: string;
  message: string;
}
