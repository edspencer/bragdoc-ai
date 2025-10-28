/**
 * Mock for Better Auth server instance
 * Used in Jest tests to avoid Better Auth initialization issues
 *
 * Default behavior returns no session (unauthenticated).
 * Tests can override this by calling mockResolvedValue on auth.api.getSession.
 */

export const auth = {
  handler: jest.fn(),
  api: {
    getSession: jest.fn().mockResolvedValue({
      session: null,
      user: null,
    }),
  },
  $Infer: {} as any,
};
