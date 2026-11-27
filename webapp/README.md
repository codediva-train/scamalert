# แอปเช็กสแกม (Next.js + PWA)

ต่อยอดจาก notebook ของแล็บให้เป็นแอปบนมือถือ ติดตั้งลงหน้าจอได้ และแพ็กขึ้น Store ได้
ใช้ตรรกะเดียวกับ notebook: **gpt-5.4-mini** คัดกรองทุกข้อความ แล้วส่งเฉพาะข้อความที่เป็นสแกมต่อให้ **gpt-5.5** อธิบายและบอกว่าควรทำอะไรต่อ

ตรวจได้ 4 ทาง:

1. **วางข้อความ** จาก SMS, LINE หรืออีเมล (บน Android แชร์ข้อความเข้าแอปได้เลย)
2. **แคปหน้าจอ** แชต LINE / Messenger, โพสต์และโฆษณา Facebook, TikTok, Instagram, อีเมล หรือหน้าเว็บ
   เบราว์เซอร์ย่อรูปก่อนส่ง โมเดลอ่านข้อความออกมา (บอกด้วยว่ามาจากแอปไหน) ใส่ในช่องให้ผู้ใช้เห็น แล้วตรวจต่อ
3. **อัปโหลดไฟล์เสียง** เช่น ข้อความเสียงจาก LINE หรือไฟล์อัดสาย ระบบถอดเสียงเป็นข้อความแล้วตรวจต่อ
4. **ฟังสายสด** เปิดลำโพงโทรศัพท์ระหว่างคุย แล้ววางไว้ใกล้ **เครื่องที่สอง หรือคอมพิวเตอร์ที่เปิดหน้าเว็บนี้**
   แอปถอดเสียงทุก 6 วินาที คัดกรองต่อเนื่อง และสั่นเตือนเมื่อเริ่มดูเหมือนสแกม กดหยุดแล้วได้ผลวิเคราะห์เต็ม

ผลตรวจบอก **ประเภทคดี** ตาม 14 ประเภทของระบบแจ้งความออนไลน์ (thaipoliceonline.go.th) ใช้เลือกประเภทตอนแจ้งความได้เลย
หน้าแรกมีตัวอย่างข้อความครบ 14 ประเภท + แกลเลอรีพร้อมภาพประกอบและจำนวนคดี (`lib/samples.ts`, ภาพ `public/img/types/`)

> **ทำไมต้องเป็นเครื่องที่สอง:** ระหว่างโทร ทั้ง Android และ iOS ปิดไมค์ของแอปอื่นทุกตัว (Android ส่งเสียงเงียบให้,
> iOS ระงับไมค์ของหน้าเว็บ) แอปจะขึ้นเตือนเองถ้าไมค์เงียบเกิน 10 วินาที

```
lib/scam.ts                 prompt, JSON schema, บัญชีดำโดเมน, การเรียกโมเดล และการถอดเสียง (ฝั่ง server เท่านั้น)
app/api/check/route.ts      POST {text, quick?} → ผลตรวจ (quick = ด่านแรกอย่างเดียว ใช้ระหว่างฟังสาย)
app/api/transcribe/route.ts POST multipart audio → {text}
app/api/read-image/route.ts POST multipart image → {text} (อ่านแคปหน้าจอ)
lib/samples.ts              14 ประเภทคดี, จำนวนคดี, ข้อความตัวอย่าง
lib/icons.ts                icon pack (npm run icons → design/icons/)
app/TypesGallery.tsx        แกลเลอรี 14 ประเภทคดี
app/page.tsx                หน้าแอป (รับข้อความที่แชร์มาทาง ?text=)
app/Checker.tsx             ช่องวางข้อความ, ตัวอย่าง, ปุ่มล่าง, bottom sheet ผลตรวจ
app/LiveListen.tsx          หน้าจอฟังสาย: อัดเป็นช่วง, ถอดเสียง, ป้ายความเสี่ยง
app/manifest.ts             web app manifest: ชื่อแอป ไอคอน share target
public/sw.js                service worker ขั้นต่ำ
deploy-azure.sh             deploy ขึ้น Azure App Service แผน Free
```

## ต้องมีใน Foundry resource

| deployment | ใช้ทำอะไร |
|---|---|
| `gpt-5.4-mini` | คัดกรองทุกข้อความ (ตัวเดียวกับใน notebook) |
| `gpt-5.5` (หรือ `gpt-5.4`) | วิเคราะห์ละเอียดเฉพาะเคสสแกม |
| `gpt-4o-transcribe` | ถอดเสียง (ใช้กับไฟล์เสียงและฟังสาย) ตั้งชื่ออื่นได้ทาง `TRANSCRIBE_MODEL` |

อ่านแคปหน้าจอใช้ `gpt-5.4-mini` ตัวเดียวกับด่านคัดกรอง (รับรูปได้) เปลี่ยนได้ทาง `VISION_MODEL`

ถอดเสียงคิดเงินตามความยาวเสียง ฟังสาย 10 นาทีคือถอดเสียง 10 นาที บวกการคัดกรองทุก ๆ 6 วินาที

## รันในเครื่อง หรือใน Codespace

ต้องใช้ Node 22 ขึ้นไป

```bash
cd webapp
cp .env.example .env.local    # ใส่ FOUNDRY_API_KEY และ FOUNDRY_RESOURCE ตัวเดียวกับใน notebook
npm ci
npm run dev                   # เปิด http://localhost:3000
```

key อยู่ใน `.env.local` ฝั่ง server เท่านั้น ไม่ถูกส่งไปที่เบราว์เซอร์ และไฟล์นี้ไม่ถูก commit
ไมค์ใช้ได้เฉพาะบน `https://` หรือ `localhost` เท่านั้น

## Deploy ขึ้น Azure App Service (ฟรี)

```bash
az login --use-device-code        # ใน Codespace ใช้แบบ device code
APP_NAME=scam-check-<ชื่อคุณ> ./deploy-azure.sh
```

สคริปต์สร้าง resource group `rg-scam-check`, App Service plan แผน **F1 (Free)** และ web app แบบ Node 22
แล้ว build แบบ `output: 'standalone'` และอัปโหลดขึ้นไป ได้เว็บที่ `https://<APP_NAME>.azurewebsites.net`

ข้อจำกัดของแผน Free ที่ควรรู้:

- CPU รวม 60 นาทีต่อวัน ถ้าใช้เกิน แอปจะหยุดและตอบ 403 จนถึงรอบรีเซ็ตของวัน (โหมดฟังสายยิง server ทุก 6 วินาที)
- ใช้ได้แค่โดเมน `*.azurewebsites.net` แต่เป็น HTTPS อยู่แล้ว จึงติดตั้งเป็นแอปและใช้ไมค์ได้
- ไม่มี Always On คนแรกที่เปิดหลังแอปว่างไปสักพักต้องรอนานกว่าปกติ
- **อย่าเปิด Always On และอย่ากด Scale up** แผนจะเปลี่ยนเป็นแบบเสียเงิน
- Microsoft ไม่รองรับแผน Free สำหรับงาน production ถ้าจะเปิดให้คนทั่วไปใช้ ให้ย้ายไปแผน B1 ขึ้นไป

เลิกใช้แล้วลบทิ้งทั้งหมด: `az group delete -n rg-scam-check`

## ติดตั้งลงมือถือ และขึ้น Store

- **Android (Chrome):** เปิดเว็บ → เมนู ⋮ → ติดตั้งแอป หลังติดตั้ง กด "แชร์" ข้อความจาก SMS หรือ LINE แล้วเลือกแอปนี้ได้เลย
- **iPhone (Safari):** เปิดเว็บ → ปุ่มแชร์ → เพิ่มไปยังหน้าจอโฮม (iOS ยังไม่รองรับการแชร์เข้าแอป ต้องคัดลอกมาวาง)
- **ขึ้น Store ด้วย [PWABuilder](https://www.pwabuilder.com):** ใส่ URL ที่ deploy แล้ว → Package For Stores
  - **Google Play:** ได้ไฟล์ .aab (Trusted Web Activity) และไฟล์ `assetlinks.json`
    วาง `assetlinks.json` ไว้ที่ `public/.well-known/assetlinks.json` แล้ว deploy ใหม่ แถบ URL ด้านบนของแอปจะหายไป
  - **App Store:** ได้โปรเจกต์ Xcode ต้อง build บน Mac และมีบัญชี Apple Developer
  - **Microsoft Store:** ได้แพ็กเกจ MSIX ส่งผ่าน Partner Center

## ก่อนเปิดให้คนทั่วไปใช้

- **ค่าใช้จ่าย:** ใครก็กดเรียกโมเดลได้ ควรใส่ rate limit หรือ CAPTCHA และตั้งงบใน Azure Cost Management
- **ข้อมูลส่วนบุคคล:** ข้อความและเสียงมักมีชื่อ เบอร์ หรือเลขบัญชี แอปนี้ไม่เก็บข้อความหรือเสียง และไม่ log เนื้อหา
  ถ้าจะเก็บต้องแจ้งผู้ใช้และทำตาม PDPA (ดูเซลล์สุดท้ายของ notebook)
- **บัญชีดำโดเมน** ใน `lib/scam.ts` เป็นข้อมูลปลอมไว้สอน ของจริงต้องต่อกับแหล่งข้อมูลของหน่วยงาน

## แบรนด์และภาพ

- โลโก้ `design/logo/` · ไอคอน `design/icons/` · ฟอนต์ Anuphan (next/font เก็บไว้ในแอปตอน build)
- ภาพคนในแอปสร้างด้วย AI (SparkThai Model Studio, qwen-image-3.0-pro) ไม่ใช่บุคคลจริง
- `design/fixtures/` ภาพแคปจอจำลอง (แชต, โพสต์) ไว้ทดสอบการอ่านแคปหน้าจอกับโมเดลจริง

