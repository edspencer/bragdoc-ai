/**
 * Mock for Better Auth client hooks
 * Used in Jest tests to avoid Better Auth initialization issues
 */

export const useSession = jest.fn(() => ({
  data: null,
  isPending: false,
  error: null,
}));

export const signIn = {
  magicLink: jest.fn().mockResolvedValue({ data: null, error: null }),
  social: jest.fn().mockResolvedValue({ data: null, error: null }),
};

export const signOut = jest.fn().mockResolvedValue({ data: null, error: null });

export const authClient = {
  useSession,
  signIn,
  signOut,
  $Infer: {} as any,
};
