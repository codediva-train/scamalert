'use client'
import { CASES, TOTAL_CASES, caseImage } from '@/lib/samples'
import Icon from './Icon'

// แกลเลอรี 14 ประเภทคดีออนไลน์ เป็น bottom sheet: แตะการ์ด = ใส่ข้อความตัวอย่างของประเภทนั้นลงช่อง
export default function TypesGallery({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (text: string) => void
}) {
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden />
      <section className={`sheet gallery ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="14 ประเภทคดีออนไลน์" inert={!open}>
        <div className="gallery-head">
          <div>
            <h2>14 ประเภทคดีออนไลน์</h2>
            <p>จากระบบแจ้งความออนไลน์ · รวม {TOTAL_CASES.toLocaleString()} คดี (มี.ค. 65 – พ.ย. 66)</p>
          </div>
          <button type="button" className="live-close gallery-close" onClick={onClose} aria-label="ปิด">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="sheet-body">
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
          <p className="fine gallery-note">ข้อความตัวอย่างทั้งหมดแต่งขึ้นเพื่อทดลองใช้ แตะการ์ดเพื่อใส่ข้อความลงช่องตรวจ</p>
        </div>
      </section>
    </>
  )
}
