'use client'
import { useEffect, useRef, useState } from 'react'
import type { Category, CheckResult } from '@/lib/scam'
import LiveListen from './LiveListen'
import Icon from './Icon'
import TypesGallery from './TypesGallery'
import { CASES, NOT_A_CASE, OTHER_SAMPLES, caseImage } from '@/lib/samples'

const ERRORS: Record<string, string> = {
  too_long: 'ข้อความยาวเกินไป (ไม่เกิน 4,000 ตัวอักษร)',
  too_big: 'ไฟล์เสียงใหญ่เกิน 25 MB',
  bad_type: 'รองรับไฟล์ mp3, m4a, mp4, wav และ webm',
  too_big_image: 'รูปใหญ่เกินไป',
  bad_image: 'รองรับรูป JPG, PNG และ WebP',
  not_configured: 'ผู้ดูแลยังไม่ได้ตั้งค่า FOUNDRY_API_KEY และ FOUNDRY_RESOURCE',
  upstream: 'เรียกโมเดลไม่สำเร็จ ลองใหม่อีกครั้ง',
  network: 'ไม่มีอินเทอร์เน็ต ลองใหม่อีกครั้ง',
}


const VERDICT: Record<Category, { tone: 'bad' | 'warn' | 'ok'; title: string; sub: string }> = {
  สแกม: { tone: 'bad', title: 'น่าจะเป็นสแกม', sub: 'อย่ากดลิงก์ อย่าโอนเงิน อย่าให้ข้อมูลส่วนตัว' },
  ข้อมูลบิดเบือน: { tone: 'warn', title: 'อาจเป็นข้อมูลบิดเบือน', sub: 'ตรวจกับแหล่งข่าวทางการก่อนแชร์ต่อ' },
  ปกติ: { tone: 'ok', title: 'ไม่พบสัญญาณหลอกลวง', sub: 'แต่ถ้ามีคนขอเงินหรือรหัส OTP ให้ระวังเสมอ' },
}

const SHEET_HASH = '#result'
const TYPES_HASH = '#types'

export default function Checker({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState('') // ข้อความบนปุ่มขณะทำงาน ว่าง = ว่าง
  const [liveOpen, setLiveOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // ปุ่ม Back ของ Android (และปัดย้อนกลับบน iOS) ปิด sheet แทนการออกจากแอป
  useEffect(() => {
    const onPop = () => {
      if (location.hash !== SHEET_HASH) setSheetOpen(false)
      if (location.hash !== TYPES_HASH) setGalleryOpen(false)
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  // ล็อกการเลื่อนหน้าหลักขณะ sheet เปิด
  useEffect(() => {
    document.documentElement.classList.toggle('lock', sheetOpen || galleryOpen)
  }, [sheetOpen, galleryOpen])

  function openSheet() {
    setSheetOpen(true)
    history.pushState(null, '', SHEET_HASH)
  }

  function openGallery() {
    setGalleryOpen(true)
    history.pushState(null, '', TYPES_HASH)
  }

  function closeGallery() {
    if (location.hash === TYPES_HASH) history.back()
    else setGalleryOpen(false)
  }

  function pickSample(t: string) {
    setText(t)
    closeGallery()
  }

  // ตัวอย่างภาพหน้าจอ / คลิปเสียงจาก public/samples — ส่งเข้าเส้นทางเดียวกับไฟล์ที่ผู้ใช้อัปโหลดเอง
  async function pickSampleFile(src: string, kind: 'image' | 'audio') {
    closeGallery()
    try {
      const blob = await (await fetch(src)).blob()
      const file = new File([blob], src.split('/').pop()!, {
        type: blob.type || (kind === 'audio' ? 'audio/mpeg' : 'image/webp'),
      })
      if (kind === 'image') await uploadImage(file)
      else await uploadAudio(file)
    } catch {
      setToast(ERRORS.network)
    }
  }

  function closeSheet() {
    if (location.hash === SHEET_HASH) history.back()
    else setSheetOpen(false)
  }

  async function check(t = text) {
    if (!t.trim()) return
    inputRef.current?.blur() // เก็บคีย์บอร์ดลง
    setBusy('กำลังตรวจ…')
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast(ERRORS[data.error] ?? ERRORS.upstream)
        return
      }
      setResult(data)
      navigator.vibrate?.(data.category === 'ปกติ' ? 15 : [30, 60, 30])
      openSheet()
    } catch {
      setToast(ERRORS.network)
    } finally {
      setBusy('')
    }
  }

  // ไฟล์เสียง (ข้อความเสียงจาก LINE, ไฟล์อัดสาย) → ถอดเป็นข้อความ → ตรวจต่อทันที
  async function uploadAudio(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (file.size > 25 * 1024 * 1024) return setToast(ERRORS.too_big)
    setBusy('กำลังถอดเสียง…')
    try {
      const fd = new FormData()
      fd.append('audio', file)
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) return setToast(ERRORS[data.error] ?? ERRORS.upstream)
      if (!data.text) return setToast('ไม่ได้ยินคำพูดในไฟล์นี้')
      setText(data.text)
      await check(data.text)
    } catch {
      setToast(ERRORS.network)
    } finally {
      setBusy('')
    }
  }

  // ภาพแคปหน้าจอ (แชต LINE, โพสต์ Facebook, TikTok ฯลฯ) → ย่อในเครื่อง → AI อ่านข้อความออกมา → ใส่ในช่อง แล้วตรวจต่อทันที
  async function uploadImage(file: File | undefined) {
    if (imageRef.current) imageRef.current.value = ''
    if (!file) return
    setBusy('กำลังอ่านรูป…')
    try {
      const small = await shrinkImage(file)
      if (!small) return setToast(ERRORS.bad_image)
      const fd = new FormData()
      fd.append('image', small, 'chat.jpg')
      const res = await fetch('/api/read-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) return setToast(ERRORS[data.error] ?? ERRORS.upstream)
      if (!data.text) return setToast('อ่านข้อความในภาพไม่ได้ ลองแคปให้เห็นข้อความชัด ๆ')
      setText(data.text)
      await check(data.text)
    } catch {
      setToast(ERRORS.network)
    } finally {
      setBusy('')
    }
  }

  function liveDone(transcript: string) {
    setLiveOpen(false)
    if (!transcript) return setToast('ไม่ได้ยินคำพูดระหว่างฟัง')
    setText(transcript)
    check(transcript)
  }

  async function paste() {
    try {
      const t = await navigator.clipboard.readText()
      if (t) setText(t)
      else setToast('คลิปบอร์ดว่าง')
    } catch {
      setToast('แตะค้างในช่องข้อความแล้วเลือก "วาง"')
    }
  }

  async function share() {
    if (!result) return
    const v = VERDICT[result.category]
    const lines = [`ผลตรวจ: ${v.title} (มั่นใจ ${Math.round(result.confidence * 100)}%)`, v.sub]
    if (result.warning_signs.length) lines.push('สัญญาณที่เห็น: ' + result.warning_signs.join(', '))
    const body = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'เช็กสแกม', text: body, url: location.origin })
      else {
        await navigator.clipboard.writeText(body)
        setToast('คัดลอกผลตรวจแล้ว')
      }
    } catch {
      // ผู้ใช้กดยกเลิก share sheet
    }
  }

  function startOver() {
    closeSheet()
    setText('')
    history.replaceState(null, '', '/') // ล้าง ?text= ที่มาจากการแชร์
    setTimeout(() => inputRef.current?.focus(), 350)
  }

  // ปัด sheet ลงเพื่อปิด (จับได้ที่แถบด้านบนของ sheet)
  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      dragStart.current = e.clientY
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (dragStart.current !== null) setDrag(Math.max(0, e.clientY - dragStart.current))
    },
    onPointerUp: () => {
      if (drag > 110) closeSheet()
      dragStart.current = null
      setDrag(0)
    },
    onPointerCancel: () => {
      dragStart.current = null
      setDrag(0)
    },
  }

  const v = result ? VERDICT[result.category] : null
  const pct = result ? Math.round(result.confidence * 100) : 0
  const caseIndex =
    result?.category === 'สแกม' && result.scam_type !== NOT_A_CASE ? CASES.findIndex((c) => c.type === result.scam_type) : -1

  return (
    <>
      <main className="content">
        <div className="hero">
          <img src="/img/hero-family.webp" alt="" width={1200} height={669} fetchPriority="high" />
          <div className="hero-text">
            <h1 className="large-title">เช็กก่อนเชื่อ</h1>
            <p className="lead">วางข้อความที่น่าสงสัย แล้วให้ AI ช่วยดู</p>
          </div>
        </div>

        <div className="field">
          <textarea
            ref={inputRef}
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="วางข้อความจาก SMS, LINE หรืออีเมลที่นี่…"
            maxLength={4000}
            enterKeyHint="done"
          />
          <div className="field-foot">
            <span className="count">{text.length.toLocaleString()}/4,000</span>
            {text && (
              <button type="button" className="clear" onClick={() => setText('')} aria-label="ล้างข้อความ">
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="chips" role="list" aria-label="ลองตัวอย่าง">
          <button type="button" role="listitem" className="chip chip-all" onClick={openGallery}>
            📚 ตัวอย่างทั้งหมด
          </button>
          {[...CASES, ...OTHER_SAMPLES].map((s) => (
            <button key={s.label} type="button" role="listitem" className="chip" onClick={() => setText(s.text)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="tiles">
          <button type="button" className="tile" onClick={() => setLiveOpen(true)} disabled={!!busy}>
            <span className="row-icon live-ic">
              <Icon name="mic" size={20} />
            </span>
            <span className="tile-text">
              <b>ฟังสายสด</b>
              <small>ผ่านอีกเครื่อง</small>
            </span>
          </button>
          <button type="button" className="tile" onClick={() => imageRef.current?.click()} disabled={!!busy}>
            <span className="row-icon line-ic">
              <Icon name="chat-screenshot" size={20} />
            </span>
            <span className="tile-text">
              <b>แคปหน้าจอ</b>
              <small>LINE, FB, TikTok</small>
            </span>
          </button>
          <button type="button" className="tile" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <span className="row-icon brand">
              <Icon name="audio-file" size={20} />
            </span>
            <span className="tile-text">
              <b>ไฟล์เสียง</b>
              <small>LINE, อัดสาย</small>
            </span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.webm,.mp4"
          hidden
          onChange={(e) => uploadAudio(e.target.files?.[0])}
        />
        <input ref={imageRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage(e.target.files?.[0])} />

        <p className="fine">AI อาจผิดได้ · ไม่เก็บข้อความหรือเสียงที่ตรวจ</p>
      </main>

      <div className="action-bar">
        <button type="button" className="icon-btn" onClick={paste} aria-label="วางจากคลิปบอร์ด">
          <Icon name="clipboard" />
        </button>
        <button type="button" className="primary" onClick={() => check()} disabled={!!busy || !text.trim()}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden /> {busy}
            </>
          ) : (
            'ตรวจข้อความ'
          )}
        </button>
      </div>

      <TypesGallery
        open={galleryOpen}
        onClose={closeGallery}
        onPick={pickSample}
        onPickScreen={(src) => pickSampleFile(src, 'image')}
        onPickAudio={(src) => pickSampleFile(src, 'audio')}
      />

      {liveOpen && <LiveListen onDone={liveDone} onCancel={() => setLiveOpen(false)} />}

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      <div className={`scrim ${sheetOpen ? 'show' : ''}`} onClick={closeSheet} aria-hidden />
      <section
        className={`sheet ${sheetOpen ? 'open' : ''} ${v ? v.tone : ''}`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="ผลตรวจ"
        inert={!sheetOpen}
      >
        <div className="sheet-grab" {...grab}>
          <span className="handle" />
        </div>
        {result && v && (
          <div className="sheet-body">
            {caseIndex >= 0 && (
              <figure className="case-pic">
                <img src={caseImage(caseIndex)} alt="" />
              </figure>
            )}
            <div className="verdict">
              <span className="verdict-icon"><Icon name={v.tone === 'ok' ? 'verdict-safe' : v.tone === 'warn' ? 'verdict-misinfo' : 'verdict-scam'} size={36} /></span>
              <h2>{v.title}</h2>
              <p>{v.sub}</p>
              <div className="meter" aria-label={`มั่นใจ ${pct}%`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <small className="meter-label">มั่นใจ {pct}%</small>
              {caseIndex >= 0 && (
                <p className="case-type">
                  ประเภทคดี: <b>{CASES[caseIndex].type}</b>
                  <small>ใช้เลือกประเภทตอนแจ้งความออนไลน์</small>
                </p>
              )}
            </div>

            {result.warning_signs.length > 0 && (
              <Group title="สัญญาณที่เห็น">
                {result.warning_signs.map((s, i) => (
                  <li key={i} className="item">
                    {s}
                  </li>
                ))}
              </Group>
            )}

            {result.domains.length > 0 && (
              <Group title="ลิงก์ในข้อความ">
                {result.domains.map((d) => (
                  <li key={d.domain} className="item split">
                    <code>{d.domain}</code>
                    <span className={`tag ${d.blocklisted ? 'bad' : ''}`}>{d.blocklisted ? 'บัญชีดำ' : 'ไม่พบในบัญชีดำ'}</span>
                  </li>
                ))}
              </Group>
            )}

            {result.detail && (
              <>
                <Group title="ทำไมถึงน่าสงสัย">
                  <li className="item">{result.detail.explanation}</li>
                </Group>
                {(result.detail.phone_numbers.length > 0 || result.detail.account_numbers.length > 0) && (
                  <Group title="ข้อมูลที่พบในข้อความ">
                    {result.detail.phone_numbers.map((p) => (
                      <li key={p} className="item split">
                        <span>เบอร์โทร</span>
                        <code>{p}</code>
                      </li>
                    ))}
                    {result.detail.account_numbers.map((a) => (
                      <li key={a} className="item split">
                        <span>เลขบัญชี</span>
                        <code>{a}</code>
                      </li>
                    ))}
                  </Group>
                )}
                {result.detail.next_steps.length > 0 && (
                  <Group title="ควรทำอย่างไรต่อ">
                    {result.detail.next_steps.map((s, i) => (
                      <li key={i} className="item step">
                        <span className="step-no">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </Group>
                )}
              </>
            )}

            <div className="sheet-actions">
              {result.category === 'สแกม' && (
                <a href="tel:1441" className="primary danger">
                  <Icon name="phone" size={20} /> โทร 1441
                </a>
              )}
              {result.category === 'สแกม' && (
                <a href="https://thaipoliceonline.go.th" target="_blank" rel="noreferrer" className="secondary">
                  <Icon name="report" size={20} /> แจ้งความออนไลน์
                </a>
              )}
              <button type="button" className="secondary" onClick={share}>
                <Icon name="share" size={20} /> แชร์เตือนคนอื่น
              </button>
              <button type="button" className="plain" onClick={startOver}>
                ตรวจข้อความใหม่
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

// ย่อรูปให้กว้างไม่เกิน 1080px แล้วบีบเป็น JPEG — แคปจอ iPhone (1170×2532 PNG หลาย MB) เหลือราว 200–500 KB
// ตัวอักษรในแชตยังอ่านออก และอัปโหลดเร็วบนเน็ตมือถือ
async function shrinkImage(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1080 / bmp.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  } catch {
    return null // เบราว์เซอร์เปิดรูปชนิดนี้ไม่ได้ (เช่น HEIC บนเครื่องที่ไม่รองรับ)
  }
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <p className="section-label">{title}</p>
      <ul className="group">{children}</ul>
    </>
  )
}
