import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { genericOAuth } from 'better-auth/plugins';

import prisma from './prisma';

const requiredEnvironment = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'AUTHY_ISSUER',
  'AUTHY_CLIENT_ID',
  'AUTHY_CLIENT_SECRET',
] as const;

for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const authyIssuer = process.env.AUTHY_ISSUER!.replace(/\/$/, '');

export const auth = betterAuth({
  appName: 'PulseChat',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'mysql' }),
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { emailVerified: true },
          });
          if (!user?.emailVerified) {
            throw new APIError('FORBIDDEN', {
              message: 'Authy must verify your email before you can sign in.',
            });
          }
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['authy'],
      allowDifferentEmails: false,
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'authy',
          clientId: process.env.AUTHY_CLIENT_ID!,
          clientSecret: process.env.AUTHY_CLIENT_SECRET!,
          discoveryUrl: `${authyIssuer}/api/auth/.well-known/openid-configuration`,
          scopes: ['openid', 'profile', 'email'],
          pkce: true,
        },
      ],
    }),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookiePrefix: 'pulsechat',
  },
});
