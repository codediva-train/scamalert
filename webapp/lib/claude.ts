// ทางเลือก: ใช้ Claude บน Microsoft Foundry แทน GPT — เปิดด้วย AI_PROVIDER=claude
// prompt และ JSON schema ชุดเดียวกับฝั่ง GPT (ส่งมาจาก lib/scam.ts) ผ่าน structured outputs (output_config.format)
// เงื่อนไข: Claude บน Foundry ต้องใช้ subscription แบบ pay-as-you-go (บัญชี Free Trial มีโควตา Claude เป็น 0)
// และ deploy ได้เฉพาะบาง region (เช่น East US 2, Sweden Central)
// ไฟล์นี้ถูก import จากฝั่ง server เท่านั้น key ไม่เคยไปถึงเบราว์เซอร์
import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk'
import { betaRefusalFallbackMiddleware } from '@anthropic-ai/sdk'

export const CLAUDE_TRIAGE_MODEL = process.env.CLAUDE_TRIAGE_MODEL || 'claude-haiku-5-5' // ด่านแรก: ถูกและเร็ว
export const CLAUDE_DEEP_MODEL = process.env.CLAUDE_DEEP_MODEL || 'claude-opus-5-5' // ด่านสอง: วิเคราะห์ละเอียด
// ถ้าโมเดลปฏิเสธคำขอ (stop_reason "refusal") ให้ SDK ลองซ้ำบน deployment นี้ — ตั้งเป็นค่าว่างเพื่อปิด
const CLAUDE_FALLBACK_MODEL = process.env.CLAUDE_FALLBACK_MODEL ?? 'claude-opus-4-8'

type Effort = 'low' | 'medium' | 'high'

let client: AnthropicFoundry | null = null
function getClaude() {
  const apiKey = process.env.CLAUDE_FOUNDRY_API_KEY || process.env.FOUNDRY_API_KEY
  const resource = process.env.CLAUDE_FOUNDRY_RESOURCE || process.env.FOUNDRY_RESOURCE
  if (!apiKey || !resource) throw new Error('not_configured')
  // CLAUDE_FOUNDRY_BASE_URL ใช้ตอนทดสอบกับ server จำลองเท่านั้น ปกติ SDK ต่อ URL จากชื่อ resource ให้เอง
  // (https://<resource>.services.ai.azure.com/anthropic/)
  const baseURL = process.env.CLAUDE_FOUNDRY_BASE_URL
  client ??= new AnthropicFoundry({
    apiKey,
    ...(baseURL ? { baseURL } : { resource }),
    middleware: CLAUDE_FALLBACK_MODEL ? [betaRefusalFallbackMiddleware([{ model: CLAUDE_FALLBACK_MODEL }])] : [],
  })
  return client
}

// ถาม Claude แล้วรับคำตอบเป็น JSON ตาม schema ที่กำหนด (strict: ทุก property required + additionalProperties: false)
export async function claudeJson<T>(opts: {
  model: string
  system: string
  text?: string
  image?: { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string }
  schema: Record<string, unknown>
  effort: Effort
}): Promise<T> {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } }
  > = []
  if (opts.image) content.push({ type: 'image', source: { type: 'base64', media_type: opts.image.mediaType, data: opts.image.base64 } })
  if (opts.text) content.push({ type: 'text', text: opts.text })

  const r = await getClaude().beta.messages.create({
    model: opts.model, // บน Foundry คือชื่อ deployment
    max_tokens: 16000,
    system: opts.system,
    messages: [{ role: 'user', content }],
    output_config: { effort: opts.effort, format: { type: 'json_schema', schema: opts.schema } },
  })
  if (r.stop_reason === 'refusal') throw new Error('refused')
  const block = r.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('empty')
  return JSON.parse(block.text) as T
}

// เช็กว่า key และ deployment ใช้ได้ไหม ด้วยการนับโทเคน (ไม่สร้างคำตอบ ไม่เสียค่าโมเดล)
// Models API ไม่มีบน Foundry จึงใช้วิธีนี้แทน
export async function claudeCheck(): Promise<void> {
  await getClaude().messages.countTokens({
    model: CLAUDE_TRIAGE_MODEL,
    messages: [{ role: 'user', content: 'ping' }],
  })
}
