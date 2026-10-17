// The store's errors, which the HTTP routes and MCP tools turn into responses: NotFoundError → 404, ValidationError →
// 400, ConflictError (and ReadOnlyError) → 409. Messages are sentences for people.

export class NotFoundError extends Error {
  code = 'not_found';
}

/** The request, or the file it would produce, isn't valid. */
export class ValidationError extends Error {
  code = 'invalid';
  constructor(
    message: string,
    public issues: { key: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** A stale If-Match, a file that exists (create-only), or a file that's broken on disk and must be fixed by hand. */
export class ConflictError extends Error {
  code = 'conflict';
  constructor(
    message: string,
    public etag: string | null = null,
  ) {
    super(message);
  }
}

/** The file was written by a newer BragDoc: this one reads it but never rewrites it. */
export class ReadOnlyError extends ConflictError {
  code = 'read_only';
}
