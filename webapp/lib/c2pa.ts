// ตรวจ Content Credentials (C2PA) ของภาพ ในเบราว์เซอร์ล้วน ๆ — ภาพไม่ถูกส่งไปไหน
// ไลบรารีทางการ @contentauth/c2pa-web (WASM ~9 MB) โหลดเฉพาะตอนเรียกครั้งแรก
// ไฟล์ WASM ถูกคัดลอกไป public/c2pa/ ด้วย scripts/copy-c2pa-wasm.mjs ตอน npm run dev / build
//
// ข้อจำกัดที่ต้องบอกผู้ใช้เสมอ: ไม่พบ C2PA ≠ ภาพจริง — แคปหน้าจอ และภาพที่ส่งผ่าน LINE / Facebook / TikTok
// ถูกลบข้อมูลนี้ทิ้งเกือบทุกครั้ง C2PA ใช้ยืนยัน "ที่มา" เมื่อมีข้อมูลเท่านั้น
import type { C2pa } from '@contentauth/c2pa-web'

export type C2paInfo =
  | { status: 'none' }
  | {
      status: 'found'
      ai: boolean // digitalSourceType บอกว่าสร้างหรือประกอบด้วย AI
      sourceType: string | null // ชื่อท้ายของ IPTC digitalSourceType เช่น trainedAlgorithmicMedia
      tool: string | null // softwareAgent หรือ claim generator
      signer: string | null // ใครเซ็น (common name / issuer ของใบรับรอง)
      tampered: boolean // ภาพถูกแก้หลังเซ็น (hash ไม่ตรง)
      trusted: boolean // ผู้เซ็นอยู่ในรายชื่อที่เชื่อถือได้
    }

const AI_TYPES = /trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia|algorithmicMedia/

let c2paPromise: Promise<C2pa> | null = null

export async function readC2pa(file: Blob): Promise<C2paInfo> {
  const { createC2pa, Reader } = await import('@contentauth/c2pa-web')
  c2paPromise ??= createC2pa({ wasmSrc: '/c2pa/c2pa_bg.wasm' })
  const c2pa = await c2paPromise

  const reader = await Reader.fromBlob(c2pa, file.type || undefined, file).catch(() => null)
  if (!reader) return { status: 'none' }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store: any = await reader.manifestStore()
    const active = store.manifests?.[store.active_manifest] ?? {}

    // หา digitalSourceType จาก c2pa.actions / c2pa.actions.v2
    let sourceType: string | null = null
    let agent: string | null = null
    for (const a of active.assertions ?? []) {
      if (!String(a.label).startsWith('c2pa.actions')) continue
      for (const act of a.data?.actions ?? []) {
        if (act.digitalSourceType && !sourceType) sourceType = String(act.digitalSourceType)
        const sa = act.softwareAgent
        if (sa && !agent) agent = typeof sa === 'string' ? sa : (sa.name ?? null)
      }
    }
    const generator = active.claim_generator_info?.[0]?.name ?? active.claim_generator ?? null
    const sig = active.signature_info ?? {}
    const failures: string[] = (store.validation_results?.activeManifest?.failure ?? []).map((f: { code: string }) => f.code)

    return {
      status: 'found',
      ai: !!sourceType && AI_TYPES.test(sourceType),
      sourceType: sourceType ? sourceType.split('/').pop()! : null,
      tool: agent ?? generator,
      signer: [sig.common_name, sig.issuer].filter(Boolean).join(' · ') || null,
      tampered: store.validation_state === 'Invalid' || failures.some((c) => c.includes('mismatch')),
      trusted: store.validation_state === 'Trusted',
    }
  } finally {
    await reader.free()
  }
}
