import { betterAuthConfig } from './better-auth/config';
import { betterAuth } from 'better-auth';

export const auth = betterAuth(betterAuthConfig);
