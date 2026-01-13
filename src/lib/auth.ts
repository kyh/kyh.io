import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db/index'

const baseURL =
  process.env.VERCEL_ENV === 'production'
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === 'preview'
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [
    'https://www.policingice.com',
    'https://policingice.com',
    'http://localhost:3000',
  ],
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    anonymous(),
    tanstackStartCookies(), // must be last
  ],
})
