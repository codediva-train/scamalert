import { checkMessage } from '@/lib/scam'

const MAX_CHARS = 4000

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return Response.json({ error: 'empty' }, { status: 400 })
  if (text.length > MAX_CHARS) return Response.json({ error: 'too_long' }, { status: 413 })

  try {
    return Response.json(await checkMessage(text, body?.quick === true))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message === 'not_configured') return Response.json({ error: 'not_configured' }, { status: 503 })
    // ไม่ log ข้อความของผู้ใช้ — log แค่ชนิดของ error
    console.error('check failed:', message)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}
