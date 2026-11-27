import { errorCode, readScreenshot } from '@/lib/scam'

const MAX_BYTES = 8 * 1024 * 1024 // เบราว์เซอร์ย่อรูปก่อนส่งแล้ว ปกติไม่เกิน 1 MB
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const image = form?.get('image')
  if (!(image instanceof File) || image.size === 0) return Response.json({ error: 'empty' }, { status: 400 })
  if (image.size > MAX_BYTES) return Response.json({ error: 'too_big_image' }, { status: 413 })
  if (!TYPES.has(image.type)) return Response.json({ error: 'bad_image' }, { status: 415 })

  try {
    const b64 = Buffer.from(await image.arrayBuffer()).toString('base64')
    const text = await readScreenshot(`data:${image.type};base64,${b64}`)
    return Response.json({ text })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const code = errorCode(e)
    if (code !== 'upstream') return Response.json({ error: code }, { status: 503 })
    console.error('read-image failed:', message) // ไม่ log รูปหรือข้อความที่อ่านได้
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}
