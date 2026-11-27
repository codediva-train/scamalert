// ตรรกะสองด่านของแล็บ ScamAlert: คัดกรองด้วยโมเดลถูก แล้วส่งเฉพาะสแกมให้โมเดลแพง
// ไฟล์นี้ถูก import จาก API route เท่านั้น จึงรันฝั่ง server และ key ไม่เคยไปถึงเบราว์เซอร์
import OpenAI, { AzureOpenAI } from 'openai'
import { NOT_A_CASE, SCAM_TYPES } from './samples'
import { CLAUDE_DEEP_MODEL, CLAUDE_TRIAGE_MODEL, claudeCheck, claudeJson } from './claude'

// ทางเลือก: AI_PROVIDER=claude ใช้ Claude บน Foundry แทน GPT (ดู lib/claude.ts) — ถอดเสียงยังใช้ gpt-4o-transcribe เสมอ
const USE_CLAUDE = process.env.AI_PROVIDER === 'claude'
const asSchema = (f: { schema: object }) => f.schema as unknown as Record<string, unknown>

export type Category = 'สแกม' | 'ปกติ' | 'ข้อมูลบิดเบือน'

export type ScamType = string // หนึ่งใน SCAM_TYPES หรือ NOT_A_CASE

export type Triage = {
  category: Category
  scam_type: ScamType
  confidence: number
  warning_signs: string[]
}

export type Detail = {
  explanation: string
  links: string[]
  phone_numbers: string[]
  account_numbers: string[]
  next_steps: string[]
}

export type CheckResult = Triage & {
  detail: Detail | null
  domains: { domain: string; blocklisted: boolean }[]
}

// แยก error ให้หน้าเว็บรู้ว่าควรบอกผู้ใช้อย่างไร
// auth = Azure ปฏิเสธ key: 401 คือ key ผิด, 403 คือปิดการใช้ key หรือปิด public network (เช่น ระบบคุมงบปิดไว้)
export type ApiError = 'not_configured' | 'auth' | 'upstream'
export function errorCode(e: unknown): ApiError {
  if (e instanceof Error && e.message === 'not_configured') return 'not_configured'
  const status = (e as { status?: number } | null)?.status
  return status === 401 || status === 403 ? 'auth' : 'upstream'
}

const TRIAGE_MODEL = process.env.TRIAGE_MODEL || 'gpt-5.4-mini'
const DEEP_MODEL = process.env.DEEP_MODEL || 'gpt-5.5'

let client: OpenAI | null = null
function getClient() {
  const apiKey = process.env.FOUNDRY_API_KEY
  const resource = process.env.FOUNDRY_RESOURCE
  if (!apiKey || !resource) throw new Error('not_configured')
  client ??= new OpenAI({
    apiKey,
    // FOUNDRY_BASE_URL ใช้ตอนทดสอบกับ server จำลองเท่านั้น ปกติไม่ต้องตั้ง
    baseURL: process.env.FOUNDRY_BASE_URL || `https://${resource}.openai.azure.com/openai/v1/`,
  })
  return client
}

const TRIAGE_FORMAT = {
  type: 'json_schema',
  name: 'triage',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: ['สแกม', 'ปกติ', 'ข้อมูลบิดเบือน'] },
      scam_type: { type: 'string', enum: [...SCAM_TYPES, NOT_A_CASE] },
      confidence: { type: 'number' },
      warning_signs: { type: 'array', items: { type: 'string' } },
    },
    required: ['category', 'scam_type', 'confidence', 'warning_signs'],
    additionalProperties: false,
  },
} as const

const TRIAGE_PROMPT = `คุณคือผู้ช่วยคัดกรองข้อความหลอกลวงสำหรับคนไทย
อ่านข้อความที่ได้รับ แล้วตอบ category เป็นหนึ่งใน 3 ประเภท

- สแกม = พยายามหลอกเอาเงิน ข้อมูลส่วนตัว หรือให้กดลิงก์อันตราย
- ปกติ = ข้อความทั่วไปที่ไม่มีเจตนาหลอก
- ข้อมูลบิดเบือน = ข้อมูลเท็จหรือบิดเบือนที่ออกแบบมาให้คนแชร์ต่อ

ถ้าเป็นสแกม ให้ scam_type เป็นประเภทคดีของระบบแจ้งความออนไลน์ที่ตรงที่สุด ถ้าไม่ใช่สแกม ให้เป็น "${NOT_A_CASE}"
- ข่มขู่ทางโทรศัพท์ (คอลเซ็นเตอร์) = อ้างเป็นตำรวจ เจ้าหน้าที่รัฐ ธนาคาร หรือบริษัทขนส่ง ขู่ว่ามีคดีหรือบัญชีมีปัญหา แล้วให้โอนเงินหรือทำตามคำสั่ง
- แอบอ้างเป็นคนอื่นเพื่อยืมเงิน = อ้างเป็นญาติ เพื่อน หรือคนรู้จัก (เช่น "ลูกเปลี่ยนเบอร์") แล้วขอยืมหรือขอให้โอนเงิน
- ซื้อขายสินค้าหรือบริการ (ไม่เป็นขบวนการ) = ผู้ขายรายเดียวรับเงินแล้วไม่ส่งของ
- ซื้อขายสินค้าหรือบริการ (เป็นขบวนการ) = เพจหรือร้านปลอมที่ทำเป็นระบบ โฆษณา รีวิวปลอม
- โอนเงินเพื่อทำงาน = ชวนทำงานออนไลน์หรือพาร์ทไทม์ (กดไลก์ รีวิว ดูคลิป ทำภารกิจ) จ่ายค่าตอบแทนเล็กน้อยก่อนให้ตายใจ แล้วให้โอนเงินสำรอง เงินมัดจำ หรือเติมเงินเพื่อรับงานหรือปลดล็อกค่าคอม
- หลอกให้กู้เงิน = อ้างปล่อยเงินกู้ อนุมัติง่าย แล้วเก็บค่าธรรมเนียม ค่าเปิดวงเงิน หรือค่ามัดจำก่อนปล่อยกู้
- หลอกลงทุนผ่านระบบคอมพิวเตอร์ = ชวนลงทุนหุ้น ทอง ฟอเร็กซ์ หรือกองทุน ผ่านแอปหรือเว็บ การันตีผลตอบแทนสูง
- โอนเงินเพื่อรับรางวัล = แจ้งว่าได้รางวัล ของรางวัล หรือสิทธิพิเศษ แล้วให้จ่ายค่าภาษี ค่าส่ง หรือค่าธรรมเนียมก่อนรับ
- หลอกให้รักแล้วโอนเงิน =คนที่ทำตัวเป็นแฟนหรือคนรักที่รู้จักทางออนไลน์ ขอเงินด้วยเหตุผลใดก็ตาม (ค่าภาษีของขวัญ ค่ารักษา ค่าตั๋ว)
- ติดตั้งโปรแกรมควบคุมเครื่อง = หลอกให้โหลดแอปหรือกดอนุญาตให้ควบคุมมือถือ
- กระทำต่อระบบหรือข้อมูลคอมพิวเตอร์ = หลอกเอารหัสผ่าน OTP หรือยึดบัญชี
- ลงทุนตาม พ.ร.ก.กู้ยืมเงินฯ (แชร์ลูกโซ่) = รายได้มาจากการชวนสมาชิกใหม่ ถ้าไม่มีการชวนคนอื่นเข้าร่วม ไม่ใช่ประเภทนี้
- สินทรัพย์ดิจิทัล = คริปโต เหรียญ โทเคน
ประเภทอื่นใช้ตามชื่อ

confidence ให้เป็นเลข 0 ถึง 1
warning_signs ให้ระบุสิ่งที่ทำให้คุณตัดสินแบบนั้น เป็นวลีสั้น ๆ ภาษาไทย`

const DETAIL_FORMAT = {
  type: 'json_schema',
  name: 'scam_detail',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      explanation: { type: 'string' },
      links: { type: 'array', items: { type: 'string' } },
      phone_numbers: { type: 'array', items: { type: 'string' } },
      account_numbers: { type: 'array', items: { type: 'string' } },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
    required: ['explanation', 'links', 'phone_numbers', 'account_numbers', 'next_steps'],
    additionalProperties: false,
  },
} as const

const DETAIL_PROMPT =
  'คุณคือผู้เชี่ยวชาญด้านอาชญากรรมไซเบอร์ ' +
  'อธิบายด้วยภาษาไทยที่คนทั่วไปเข้าใจ ไม่ใช้ศัพท์เทคนิค ' +
  'ถ้าไม่พบข้อมูลประเภทไหน ให้ส่งเป็น list ว่าง ' +
  'ช่องทางแจ้งความทางการมีแค่สายด่วน 1441 และ thaipoliceonline.go.th ห้ามแต่งช่องทางอื่นขึ้นเอง'

// ฐานข้อมูลปลอมไว้สอน เหมือนใน notebook — ของจริงตรงนี้คือการต่อ API ของหน่วยงานหรือ blacklist กลาง
const BLOCKLIST = new Set(['th-parcel-pay.example', 'bank-verify-th.example', 'power-bill-th.example'])

export function findDomains(text: string) {
  const found = text.toLowerCase().match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/g) ?? []
  return [...new Set(found)].map((domain) => ({ domain, blocklisted: BLOCKLIST.has(domain) }))
}

// ตรวจว่า key ใช้ได้ไหม ด้วยการขอรายชื่อโมเดล (ไม่ใช้โทเคน ไม่เสียเงิน) จำผลไว้ 60 วินาที
let health: { at: number; result: ApiError | 'ok' } | null = null
export async function checkKey(): Promise<ApiError | 'ok'> {
  if (health && Date.now() - health.at < 60_000) return health.result
  let result: ApiError | 'ok' = 'ok'
  try {
    if (USE_CLAUDE) await claudeCheck()
    else await getClient().models.list()
  } catch (e) {
    result = errorCode(e)
  }
  health = { at: Date.now(), result }
  return result
}

async function triage(text: string): Promise<Triage> {
  if (USE_CLAUDE) {
    return claudeJson<Triage>({ model: CLAUDE_TRIAGE_MODEL, system: TRIAGE_PROMPT, text, schema: asSchema(TRIAGE_FORMAT), effort: 'low' })
  }
  const r = await getClient().responses.create({
    model: TRIAGE_MODEL,
    instructions: TRIAGE_PROMPT,
    input: text,
    reasoning: { effort: 'low' },
    text: { format: TRIAGE_FORMAT },
    max_output_tokens: 2000,
  })
  return JSON.parse(r.output_text)
}

async function analyzeDetail(text: string): Promise<Detail> {
  if (USE_CLAUDE) {
    return claudeJson<Detail>({ model: CLAUDE_DEEP_MODEL, system: DETAIL_PROMPT, text, schema: asSchema(DETAIL_FORMAT), effort: 'medium' })
  }
  const r = await getClient().responses.create({
    model: DEEP_MODEL,
    instructions: DETAIL_PROMPT,
    input: text,
    reasoning: { effort: 'medium' },
    text: { format: DETAIL_FORMAT },
    max_output_tokens: 4000,
  })
  return JSON.parse(r.output_text)
}

// สองด่านแบบใน notebook: ทุกข้อความผ่านโมเดลถูกก่อน เฉพาะที่เป็นสแกมจึงส่งต่อให้โมเดลแพง
// quick = ด่านแรกอย่างเดียว ใช้ระหว่างฟังสายที่ต้องเช็กซ้ำทุกไม่กี่วินาที
export async function checkMessage(text: string, quick = false): Promise<CheckResult> {
  const t = await triage(text)
  const detail = !quick && t.category === 'สแกม' ? await analyzeDetail(text) : null
  return { ...t, detail, domains: findDomains(text) }
}

// ---- อ่านข้อความจากภาพแคปหน้าจอ: แชต LINE/Messenger, โพสต์และโฆษณา Facebook, TikTok, IG, SMS, อีเมล, เว็บ ----
export const SCREEN_SOURCES = ['LINE', 'Facebook', 'Messenger', 'TikTok', 'Instagram', 'WhatsApp', 'SMS', 'อีเมล', 'เว็บไซต์', 'อื่น ๆ'] as const

const SCREEN_FORMAT = {
  type: 'json_schema',
  name: 'screen_ocr',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      readable: { type: 'boolean' },
      source: { type: 'string', enum: [...SCREEN_SOURCES] },
      lines: { type: 'array', items: { type: 'string' } },
    },
    required: ['readable', 'source', 'lines'],
    additionalProperties: false,
  },
} as const

const SCREEN_PROMPT = `ภาพนี้คือภาพแคปหน้าจอมือถือที่ผู้ใช้สงสัยว่าเป็นการหลอกลวง
บอก source ว่ามาจากแอปอะไร แล้วถอดข้อความที่เห็นออกมาตามลำดับจากบนลงล่าง ใส่ใน lines บรรทัดละหนึ่งรายการ

- แชต (LINE, Messenger, WhatsApp, SMS): "ชื่อผู้ส่ง: ข้อความ" ถ้าไม่เห็นชื่อ ใช้ "อีกฝ่าย" กับฟองซ้าย และ "ผู้ใช้" กับฟองขวา
- โพสต์หรือโฆษณา (Facebook, Instagram): ชื่อเพจหรือผู้โพสต์, คำว่า "ได้รับการสนับสนุน" ถ้ามี, แคปชันทั้งหมด, ข้อความบนรูป, ราคา, ปุ่ม และคอมเมนต์ที่เห็น
- TikTok: ชื่อบัญชี, แคปชัน, ข้อความที่ซ้อนบนคลิป, ลิงก์ในโปรไฟล์หรือตะกร้า, คอมเมนต์ที่เห็น
- อีเมลหรือเว็บ: ผู้ส่งหรือโดเมน, หัวข้อ, เนื้อหา, ปุ่ม
- คัดลอกตามที่เห็นจริง ห้ามแปล ห้ามสรุป ห้ามแก้คำผิด
- เก็บลิงก์ เบอร์โทร เลขบัญชี ชื่อบัญชี LINE ID และจำนวนเงินให้ครบทุกตัวอักษร
- รูปภาพ สติกเกอร์ หรือคลิป ให้บรรยายสั้น ๆ ในวงเล็บ เช่น (รูปสลิปโอนเงิน) (คลิปคนถือเงินสด)
- ไม่ต้องใส่เวลา แถบสถานะ เมนูของแอป ยอดไลก์ หรือคีย์บอร์ด
ถ้าภาพอ่านไม่ออก ให้ readable เป็น false และ lines เป็น list ว่าง`

// dataUrl = "data:image/jpeg;base64,..." ที่ย่อขนาดจากฝั่งเบราว์เซอร์แล้ว
export async function readScreenshot(dataUrl: string): Promise<string | null> {
  if (USE_CLAUDE) {
    const [head, base64] = dataUrl.split(',', 2)
    const mediaType = head.slice(5, head.indexOf(';')) as 'image/jpeg' | 'image/png' | 'image/webp'
    const out = await claudeJson<{ readable: boolean; source: string; lines: string[] }>({
      model: process.env.CLAUDE_VISION_MODEL || CLAUDE_TRIAGE_MODEL,
      system: SCREEN_PROMPT,
      image: { mediaType, base64 },
      text: 'ถอดข้อความจากภาพนี้',
      schema: asSchema(SCREEN_FORMAT),
      effort: 'low',
    })
    if (!out.readable || !out.lines.length) return null
    return `[แคปหน้าจอ ${out.source}]\n` + out.lines.join('\n')
  }
  const r = await getClient().responses.create({
    model: process.env.VISION_MODEL || TRIAGE_MODEL,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: SCREEN_PROMPT },
          { type: 'input_image', image_url: dataUrl, detail: 'high' },
        ],
      },
    ],
    reasoning: { effort: 'low' },
    text: { format: SCREEN_FORMAT },
    max_output_tokens: 4000,
  })
  const out: { readable: boolean; source: string; lines: string[] } = JSON.parse(r.output_text)
  if (!out.readable || !out.lines.length) return null
  // บอกด่านคัดกรองด้วยว่ามาจากแอปไหน (เช่น โฆษณา Facebook มีบริบทต่างจากแชต)
  return `[แคปหน้าจอ ${out.source}]\n` + out.lines.join('\n')
}

const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || 'gpt-4o-transcribe'

// gpt-4o-transcribe ยังเรียกผ่าน endpoint /openai/v1 ไม่ได้ (Azure ตอบ DeploymentNotFound)
// จึงต้องใช้ path แบบ /openai/deployments/<ชื่อ>/audio/transcriptions?api-version=... ผ่าน AzureOpenAI
let audioClient: OpenAI | null = null
function getAudioClient() {
  if (process.env.FOUNDRY_BASE_URL) return getClient() // server จำลองตอนทดสอบ
  const apiKey = process.env.FOUNDRY_API_KEY
  const resource = process.env.FOUNDRY_RESOURCE
  if (!apiKey || !resource) throw new Error('not_configured')
  audioClient ??= new AzureOpenAI({
    apiKey,
    endpoint: `https://${resource}.openai.azure.com`,
    apiVersion: '2025-03-01-preview',
    deployment: TRANSCRIBE_MODEL,
  })
  return audioClient
}

// ถอดเสียงเป็นข้อความภาษาไทย (Azure รับ mp3, mp4, m4a, wav, webm ไม่เกิน 25 MB)
export async function transcribe(file: File): Promise<string> {
  const r = await getAudioClient().audio.transcriptions.create({
    model: TRANSCRIBE_MODEL,
    file,
    language: 'th',
  })
  return r.text.trim()
}
