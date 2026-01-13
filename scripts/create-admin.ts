#!/usr/bin/env npx tsx
import 'dotenv/config'
import { auth } from '../src/lib/auth'

const email = process.argv[2]
const password = process.argv[3]
const name = process.argv[4] || 'Admin'

if (!email || !password) {
  console.log('Usage: npx tsx scripts/create-admin.ts <email> <password> [name]')
  process.exit(1)
}

async function main() {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    })

    console.log('Admin user created:', result.user.email)
  } catch (error) {
    console.error('Failed to create admin user:', error)
    process.exit(1)
  }
}

main()
