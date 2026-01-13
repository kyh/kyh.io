import { config } from 'dotenv'
import { createClient } from '@libsql/client'

config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function reset() {
  const contentTables = ['votes', 'videos', 'incidents']

  console.log('Clearing content tables...')

  for (const table of contentTables) {
    console.log(`  Deleting from ${table}`)
    await client.execute(`DELETE FROM "${table}"`)
  }

  console.log('Done!')
}

reset().catch(console.error)
