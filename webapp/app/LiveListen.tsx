'use client'
import { useEffect, useRef, useState } from 'react'
import type { Category } from '@/lib/scam'
import Icon from './Icon'

// อัดเสียงเป็นช่วง ๆ ช่วงละ 6 วินาที แต่ละช่วงเป็นไฟล์สมบูรณ์ ส่งไปถอดเสียงได้ทันที
const SEGMENT_MS = 6000
// ระดับเสียงต่ำกว่านี้ทั้งช่วง = เงียบ ไม่ส่งไปถอด (โมเดลถอดเสียงมักแต่งคำขึ้นมาเองเมื่อเจอความเงียบ)
const SPEECH_RMS = 0.01
const QUIET_WARN_MS = 10000

type Status = 'starting' | 'listening' | 'finishing' | 'denied' | 'unsupported'
type Risk = { category: Category; confidence: number } | null

const RISK_TEXT: Record<Category, { tone: string; title: string }> = {
  สแกม: { tone: 'bad', title: 'สายนี้น่าจะเป็นสแกม วางสายได้เลย' },
  ข้อมูลบิดเบือน: { tone: 'warn', title: 'มีข้อมูลที่น่าสงสัย อย่าเพิ่งเชื่อ' },
  ปกติ: { tone: 'ok', title: 'ยังไม่พบสัญญาณหลอกลวง' },
}

function pickMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function LiveListen({ onDone, onCancel }: { onDone: (transcript: string) => void; onCancel: () => void }) {
  const [status, setStatus] = useState<Status>('starting')
  const [lines, setLines] = useState<string[]>([])
  const [risk, setRisk] = useState<Risk>(null)
  const [quiet, setQuiet] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  const active = useRef(false)
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const segTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const segPeak = useRef(0)
  const onStopped = useRef<(() => void) | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const transcript = useRef<string[]>([])
  const checking = useRef(false)
  const lastRisk = useRef<Category | null>(null)
  const bars = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let ctx: AudioContext | null = null
    let wake: WakeLockSentinel | null = null
    let tick: ReturnType<typeof setInterval> | undefined

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setStatus('unsupported')
        return
      }
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setStatus('denied')
        return
      }
      active.current = true
      setStatus('listening')
      wake = await navigator.wakeLock?.request('screen').catch(() => null) // กันจอดับระหว่างฟัง
      tick = setInterval(() => setElapsed((s) => s + 1), 1000)

      // วัดระดับเสียง: ขยับแถบ และจับว่าไมค์ถูกระบบปิดเสียงอยู่หรือไม่ (เช่น เครื่องนี้กำลังโทรอยู่)
      const track = stream.current.getAudioTracks()[0]
      ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      ctx.createMediaStreamSource(stream.current).connect(analyser)
      const buf = new Uint8Array(analyser.fftSize)
      let lastSound = performance.now()
      const loop = () => {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += ((v - 128) / 128) ** 2
        const rms = Math.sqrt(sum / buf.length)
        segPeak.current = Math.max(segPeak.current, rms)
        if (rms > SPEECH_RMS) lastSound = performance.now()
        bars.current?.style.setProperty('--lvl', String(Math.min(1, rms * 6)))
        const isQuiet = track.muted || performance.now() - lastSound > QUIET_WARN_MS
        setQuiet((q) => (q === isQuiet ? q : isQuiet))
        raf = requestAnimationFrame(loop)
      }
      loop()
      recordSegment()
    }

    start()
    return () => {
      active.current = false
      clearTimeout(segTimer.current)
      clearInterval(tick)
      cancelAnimationFrame(raf)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach((t) => t.stop())
      ctx?.close()
      wake?.release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [lines])

  function recordSegment() {
    if (!active.current || !stream.current) return
    const mime = pickMime()
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined)
    const parts: Blob[] = []
    segPeak.current = 0
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data)
    rec.onstop = () => {
      if (segPeak.current > SPEECH_RMS) enqueue(new Blob(parts, { type: rec.mimeType || mime }))
      if (onStopped.current) onStopped.current()
      else recordSegment()
    }
    rec.start()
    recorder.current = rec
    segTimer.current = setTimeout(() => rec.state === 'recording' && rec.stop(), SEGMENT_MS)
  }

  function enqueue(blob: Blob) {
    queue.current = queue.current.then(async () => {
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'segment')
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error === 'not_configured' ? 'ผู้ดูแลยังไม่ได้ตั้งค่าโมเดลถอดเสียง' : data.error === 'auth' ? 'API key ของ Foundry ใช้งานไม่ได้ แจ้งผู้ดูแลแอป' : 'ถอดเสียงช่วงนี้ไม่สำเร็จ')
          return
        }
        setError('')
        if (data.text) {
          transcript.current.push(data.text)
          setLines([...transcript.current])
          quickCheck()
        }
      } catch {
        setError('ไม่มีอินเทอร์เน็ต')
      }
    })
  }

  // เช็กเฉพาะด่านแรก (โมเดลถูก) กับข้อความล่าสุด ไม่ยิงซ้อนกัน
  async function quickCheck() {
    if (checking.current) return
    checking.current = true
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: transcript.current.join(' ').slice(-1500), quick: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setRisk({ category: data.category, confidence: data.confidence })
        if (data.category === 'สแกม' && lastRisk.current !== 'สแกม') navigator.vibrate?.([200, 100, 200, 100, 200])
        lastRisk.current = data.category
      }
    } catch {
      // เช็กรอบหน้าใหม่
    } finally {
      checking.current = false
    }
  }

  async function finish() {
    setStatus('finishing')
    active.current = false
    clearTimeout(segTimer.current)
    if (recorder.current?.state === 'recording') {
      await new Promise<void>((resolve) => {
        onStopped.current = resolve
        recorder.current!.stop()
      })
    }
    await queue.current
    onDone(transcript.current.join(' '))
  }

  const r = risk ? RISK_TEXT[risk.category] : null
  const blocked = status === 'denied' || status === 'unsupported'

  return (
    <div className="live" role="dialog" aria-modal="true" aria-label="ฟังสาย">
      <div className="live-top">
        <button type="button" className="live-close" onClick={onCancel} aria-label="ปิด">
          <Icon name="close" />
        </button>
        <span className="live-clock">
          {status === 'listening' && <span className="rec-dot" />}
          {status === 'listening' ? clock(elapsed) : status === 'finishing' ? 'กำลังสรุป…' : ''}
        </span>
        <span style={{ width: 40 }} />
      </div>

      {blocked ? (
        <div className="live-blocked">
          <h2>{status === 'denied' ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์' : 'เบราว์เซอร์นี้อัดเสียงไม่ได้'}</h2>
          <p>
            {status === 'denied'
              ? 'เปิดสิทธิ์ไมโครโฟนให้เว็บนี้ในการตั้งค่าของเบราว์เซอร์ แล้วลองใหม่'
              : 'ลองเปิดด้วย Chrome หรือ Safari รุ่นล่าสุด ผ่าน https'}
          </p>
          <button type="button" className="secondary" onClick={onCancel}>
            กลับ
          </button>
        </div>
      ) : (
        <>
          <div className={`live-risk ${r ? r.tone : ''}`}>
            <b>{r ? r.title : 'กำลังฟัง… ยังไม่มีข้อมูลพอ'}</b>
            {risk && <small>มั่นใจ {Math.round(risk.confidence * 100)}%</small>}
          </div>

          <div className="live-bars" ref={bars} aria-hidden>
            {[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => (
              <span key={i} style={{ '--k': k } as React.CSSProperties} />
            ))}
          </div>

          {quiet && status === 'listening' && (
            <p className="live-hint">
              ไม่ได้ยินเสียง ถ้ากำลังโทรอยู่บนเครื่องนี้ ระบบจะปิดไมค์ของแอปอื่น ให้เปิดลำโพงโทรศัพท์ แล้ววางไว้ใกล้เครื่องที่สอง
              หรือคอมพิวเตอร์ที่เปิดหน้าเว็บนี้
            </p>
          )}
          {error && <p className="live-hint err">{error}</p>}

          <div className="live-lines" ref={list}>
            {lines.length === 0 ? (
              <p className="live-empty">ข้อความที่ถอดได้จะขึ้นตรงนี้ทุก ๆ ไม่กี่วินาที</p>
            ) : (
              lines.map((l, i) => <p key={i}>{l}</p>)
            )}
          </div>

          <div className="live-bottom">
            <button type="button" className="stop-btn" onClick={finish} disabled={status !== 'listening'}>
              <span className="stop-square" />
            </button>
            <small>{status === 'finishing' ? 'กำลังถอดเสียงช่วงสุดท้าย…' : 'หยุดและวิเคราะห์'}</small>
          </div>
        </>
      )}
    </div>
  )
}
