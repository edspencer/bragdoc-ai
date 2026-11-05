// Types for the conformance runner's schema validator (@edspencer/cli-conformance ships it as plain JS): the
// reference code's tests check `--json` documents against the contract's schemas with it.
declare module '@edspencer/cli-conformance/dist/src/schema.js' {
  export function loadSchema(name: string): unknown;
  export function validate(schema: unknown, value: unknown): Array<{ path: string; message: string }>;
}
