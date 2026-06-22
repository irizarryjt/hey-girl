import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

const key = process.env.ANTHROPIC_API_KEY
const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!key) {
  fail('No ANTHROPIC_API_KEY found. Did you create a .env file (cp .env.example .env) and paste your key?')
}
if (!key.startsWith('sk-ant-')) {
  fail(`Key found but it doesn't look right (should start with "sk-ant-"). Got: ${key.slice(0, 8)}…`)
}

console.log(`🔑 Key loaded (${key.slice(0, 10)}…${key.slice(-4)}), testing model "${model}"…`)

const client = new Anthropic({ apiKey: key })

try {
  const resp = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with just the word: ok' }],
  })
  const text = resp.content.find((b) => b.type === 'text')?.text?.trim()
  console.log(`\n✅ Success! Hey Girl is wired up. Model replied: "${text}"`)
  console.log('You can now run `npm run dev` and chat for real.\n')
} catch (err) {
  const status = err?.status
  if (status === 401) fail('Key was rejected (401). It may be wrong, revoked, or copied with extra spaces.')
  if (status === 400 && /model/i.test(err?.message || '')) {
    fail(`Model "${model}" was rejected. Check CLAUDE_MODEL in your .env (default: claude-sonnet-4-6).`)
  }
  if (status === 429) fail('Rate limited or out of credits (429). Add credits in console.anthropic.com → Billing.')
  fail(`Call failed: ${err?.message || err}`)
}
