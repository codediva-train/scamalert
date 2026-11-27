'use client'
import { useState } from 'react'
import { AUDIO_SAMPLES, CASES, SCREEN_SAMPLES, TOTAL_CASES, caseImage } from '@/lib/samples'
import Icon from './Icon'

type Tab = 'text' | 'screen' | 'audio'

// sheet ตัวอย่างทั้งหมด 3 แท็บ: ข้อความ 14 ประเภทคดี · ภาพหน้าจอโซเชียลจำลอง · คลิปเสียงโทรหลอกจำลอง
export default function TypesGallery({
  open,
  onClose,
  onPick,
  onPickScreen,
  onPickAudio,
}: {
  open: boolean
  onClose: () => void
  onPick: (text: string) => void
  onPickScreen: (src: string) => void
  onPickAudio: (src: string) => void
}) {
  const [tab, setTab] = useState<Tab>('text')

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden />
      <section className={`sheet gallery ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="ตัวอย่าง" inert={!open}>
        <div className="gallery-head">
          <div>
            <h2>ตัวอย่างให้ลอง</h2>
            <p>แตะเพื่อใส่ลงช่องตรวจ · ตัวอย่างทั้งหมดแต่งขึ้น ไม่ใช่ของจริง</p>
          </div>
          <button type="button" className="live-close gallery-close" onClick={onClose} aria-label="ปิด">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="seg" role="tablist">
          {(
            [
              ['text', '💬 ข้อความ'],
              ['screen', '📸 ภาพหน้าจอ'],
              ['audio', '🎙️ คลิปเสียง'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="sheet-body">
          {tab === 'text' && (
            <>
              <p className="fine gallery-intro">14 ประเภทคดีของระบบแจ้งความออนไลน์ · รวม {TOTAL_CASES.toLocaleString()} คดี (มี.ค. 65 – พ.ย. 66)</p>
              <div className="cases">
                {CASES.map((c, i) => (
                  <button key={c.type} type="button" className="case" onClick={() => onPick(c.text)}>
                    <span className="case-img">
                      <img src={caseImage(i)} alt="" loading="lazy" />
                      <span className="case-rank">{i + 1}</span>
                    </span>
                    <span className="case-body">
                      <b>{c.label}</b>
                      <small>{c.type}</small>
                      <small className="case-count">{c.count.toLocaleString()} คดี</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'screen' && (
            <>
              <p className="fine gallery-intro">หน้าจอจำลองแบบแชต โพสต์ คลิปสั้น และ SMS — แตะเพื่อให้ AI อ่านข้อความในภาพแล้วตรวจ</p>
              <div className="screens">
                {SCREEN_SAMPLES.map((s) => (
                  <button key={s.src} type="button" className="screen" onClick={() => onPickScreen(s.src)}>
                    <img src={s.src} alt={s.label} loading="lazy" />
                    <b>{s.label}</b>
                    <small>{s.where}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              <p className="fine gallery-intro">เสียงสังเคราะห์ด้วย AI ไม่ใช่เสียงคนจริง — กดฟังก่อนได้ แล้วกด "ตรวจคลิปนี้"</p>
              <ul className="group">
                {AUDIO_SAMPLES.map((a) => (
                  <li key={a.src} className="clip">
                    <div className="clip-head">
                      <span className={`row-icon ${a.scam ? 'live-ic' : 'ok-ic'}`}>
                        <Icon name={a.scam ? 'phone' : 'verdict-safe'} size={20} />
                      </span>
                      <span className="row-text">
                        <b>{a.label}</b>
                        <small>{a.desc}</small>
                      </span>
                    </div>
                    <audio controls preload="none" src={a.src} />
                    <button type="button" className="secondary clip-btn" onClick={() => onPickAudio(a.src)}>
                      <Icon name="waveform" size={18} /> ตรวจคลิปนี้
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  )
}
