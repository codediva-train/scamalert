import { checkKey } from '@/lib/scam'

// หน้าเว็บเรียกตอนเปิด เพื่อเตือนทันทีถ้า key ของ Foundry ใช้ไม่ได้ (ขอรายชื่อโมเดล ไม่ใช้โทเคน)
export async function GET() {
  const result = await checkKey()
  return result === 'ok' ? Response.json({ ok: true }) : Response.json({ error: result }, { status: 503 })
}
