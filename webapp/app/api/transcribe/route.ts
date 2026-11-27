import { transcribe } from '@/lib/scam'

const MAX_BYTES = 25 * 1024 * 1024 // เพดานของ Azure

// ชนิดไฟล์ที่ Azure รับ → นามสกุลที่ใช้ตั้งชื่อไฟล์ (ชื่อไฟล์ต้องเป็น ASCII)
const EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof File) || audio.size === 0) return Response.json({ error: 'empty' }, { status: 400 })
  if (audio.size > MAX_BYTES) return Response.json({ error: 'too_big' }, { status: 413 })

  const ext = EXT[audio.type.split(';')[0]]
  if (!ext) return Response.json({ error: 'bad_type' }, { status: 415 })

  try {
    const file = new File([await audio.arrayBuffer()], `audio.${ext}`, { type: audio.type })
    return Response.json({ text: await transcribe(file) })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message === 'not_configured') return Response.json({ error: 'not_configured' }, { status: 503 })
    console.error('transcribe failed:', message) // ไม่ log เนื้อเสียงหรือข้อความที่ถอดได้
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}
