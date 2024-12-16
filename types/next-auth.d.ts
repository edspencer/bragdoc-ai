import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    provider?: string;
    providerId?: string;
    githubAccessToken?: string;
  }

  interface Session extends DefaultSession {
    user: {
      provider?: string;
      providerId?: string;
      githubAccessToken?: string;
    } & DefaultSession['user'];
  }
}
