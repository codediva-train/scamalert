# Cyber Challenge Lab — ScamAlert

แอปเช็กข้อความและสายหลอกลวงภาษาไทย ด้วย AI บน Microsoft Foundry
เขียนด้วย Next.js เป็นเว็บที่ติดตั้งลงมือถือได้ (PWA) และแพ็กขึ้น Store ได้

แล็บสำหรับ Online Workshop 2 · Thailand Cyber & Digital Innovation Challenge
เสาร์ 28 พฤศจิกายน 2569 · 09.00–12.00 น. · อบรมออนไลน์ผ่าน Google Meet

## ในนี้มีอะไร

| โฟลเดอร์ | คืออะไร |
|---|---|
| `webapp/` | **แอป ScamAlert** (Next.js) ตรวจได้ 4 ทาง: วางข้อความ · แคปหน้าจอ LINE / Facebook / TikTok · ไฟล์เสียง · ฟังสายสด รายละเอียดทั้งหมดอยู่ใน [`webapp/README.md`](webapp/README.md) |
| `.devcontainer/` | ตั้งค่า Codespaces: Node 22 และติดตั้งแพ็กเกจของแอปให้ตอนสร้าง |

## ก่อนวันอบรม (pre-work) — ต้องมี Azure ของตัวเอง

โครงการนี้ไม่มีผู้สนับสนุนค่าใช้จ่าย Azure ผู้เรียนสร้างบัญชีและ resource เอง (ทีมละหนึ่งบัญชีก็พอ)

1. **สมัคร Azure free account** ที่ https://azure.microsoft.com/free
   ต้องมีบัญชี Microsoft หรือ GitHub, เบอร์โทรศัพท์ และบัตรเครดิตหรือเดบิตที่ไม่ใช่แบบเติมเงิน
   ตอนสมัครระบบอาจกันวงเงินราว 1 ดอลลาร์ชั่วคราวแล้วคืนให้ (ไม่ใช่การตัดเงิน)
2. **สร้าง project ใน Microsoft Foundry** ที่ https://ai.azure.com ระบบจะสร้าง Foundry resource ให้พร้อมกัน
   ตั้งไว้ใน resource group แยกของแล็บ จะได้ลบทิ้งทั้งกลุ่มได้ง่ายหลังอบรม
3. **Deploy โมเดล** จากแค็ตตาล็อกของ Foundry แบบ Global Standard และตั้งชื่อ deployment ให้ตรงกับชื่อโมเดล
   - `gpt-5.4-mini` — คัดกรองทุกข้อความ และอ่านข้อความจากภาพแคปหน้าจอ
   - `gpt-5.5` — วิเคราะห์ละเอียดเฉพาะเคสสแกม · ถ้าไม่มีโควตา ให้ deploy `gpt-5.4` แทน แล้วแก้ `DEEP_MODEL` ใน `.env.local`
   - `gpt-4o-transcribe` (ไม่บังคับ) — ถอดเสียงสำหรับไฟล์เสียงและฟังสาย ยังเป็น Preview และมีเฉพาะบาง region
     (เช่น East US 2, Sweden Central) ถ้า deploy ไม่ได้ แอปยังตรวจข้อความและแคปหน้าจอได้ปกติ
   - ถ้าโมเดลไหนขึ้นว่าไม่มีโควตาใน region นั้น ให้ลองสร้าง project ใน region อื่น
4. **คัดลอก key และ endpoint** จากหน้า *Keys and Endpoint* ของ resource
   ชื่อ resource คือส่วนหน้าของ endpoint เช่น `https://my-scam-lab.openai.azure.com/` ชื่อคือ `my-scam-lab`
5. **ตั้งงบและแจ้งเตือน** ที่ Cost Management → Budgets ก่อนเริ่มใช้งาน

## เริ่มใช้งานในวันอบรม

1. กดปุ่ม **Code** สีเขียวด้านบน แล้วเลือกแท็บ **Codespaces** → **Create codespace on main** รอ 2–3 นาที
   (ระบบติดตั้งแพ็กเกจของแอปให้ระหว่างสร้าง)
2. ถ้า VS Code ถามว่า *Do you trust the authors of the files in this folder?* ให้กด **Trust Folder & Continue**
3. เปิด Terminal (เมนู ☰ → Terminal → New Terminal) แล้วพิมพ์

   ```bash
   cd webapp
   cp .env.example .env.local
   ```

4. เปิดไฟล์ `webapp/.env.local` ใส่ `FOUNDRY_API_KEY` และ `FOUNDRY_RESOURCE` ของคุณ แล้วบันทึก
5. กลับไปที่ Terminal พิมพ์ `npm run dev` แอปจะเปิดในแท็บใหม่ให้เอง (หรือดูที่แท็บ **Ports** → พอร์ต 3000)

คู่มือทำตามทีละขั้น: https://training.codediva.co/workshops/cyber-challenge (รหัสเข้าดูแจ้งในห้องอบรม)
อยากเปิดบนมือถือและติดตั้งเป็นแอป: deploy ขึ้น Azure App Service แผนฟรีด้วย `webapp/deploy-azure.sh` (ดู `webapp/README.md`)

## กันไม่ให้เสียเงิน (อ่านให้ครบ)

- **Free account ไม่ตัดเงินเอง** เมื่อครบ 30 วันหรือใช้เครดิตหมด subscription จะถูกปิดใช้งาน ถ้าคุณไม่กด Upgrade
- **อย่ากด Upgrade to pay-as-you-go** ถ้ายังไม่ตั้งใจจ่ายเงินจริง
- **หลังอบรม ถ้าจะไม่ทำต่อ ลบ resource group ของแล็บ** Azure portal → Resource groups → เลือกกลุ่ม → Delete resource group
- **ถ้าจะเลิกใช้ Azure** Cost Management + Billing → Subscriptions → เลือก subscription → Cancel subscription
- **ห้าม commit key ลง repository** และห้ามวาง key ในแชต key ที่หลุดคือเงินในบัตรของคุณ (`.env.local` ถูกกันไม่ให้ commit แล้ว)
- **อย่าตั้งพอร์ต 3000 ใน Codespaces เป็น Public** ใครมีลิงก์ก็เรียกโมเดลด้วย key ของคุณได้
- หยุด Codespace ที่ https://github.com/codespaces เมื่อเลิกใช้

ข้อความตัวอย่างทั้งหมดแต่งขึ้นเพื่อการสอน เบอร์โทร ลิงก์ และเลขบัญชีเป็นของปลอม ภาพคนในแอปสร้างด้วย AI

---

วิทยากร นายเอกพงษ์ ขัติยะ · กรรมการผู้จัดการ บริษัท โค้ดดีวา จำกัด
Microsoft Partner · Microsoft AI Cloud Partner Program

---

## English

A hands-on lab: **ScamAlert**, a Next.js app that checks Thai scam messages and calls with AI models on Microsoft Foundry.
It installs on phones as a PWA and can be packaged for app stores.
Online Workshop 2 · Thailand Cyber & Digital Innovation Challenge · Saturday 28 November 2026 · online via Google Meet

### What's here

| Folder | What it is |
|---|---|
| `webapp/` | **The ScamAlert app** (Next.js). Four ways to check: paste text · screenshot of LINE / Facebook / TikTok · audio file · live call. Full details in [`webapp/README.md`](webapp/README.md) (Thai) |
| `.devcontainer/` | Codespaces setup: Node 22, installs the app's packages on creation |

### Before the day (pre-work): your own Azure

There is no sponsor for Azure costs; each learner (or one person per team) sets up their own.

1. **Create an Azure free account** at https://azure.microsoft.com/free — you need a Microsoft or GitHub account,
   a phone number and a non-prepaid credit or debit card. Sign-up may place a temporary hold of about USD 1, which is released.
2. **Create a project in Microsoft Foundry** at https://ai.azure.com (it creates the Foundry resource too),
   in a resource group of its own so you can delete it in one go afterwards.
3. **Deploy models** from the Foundry catalogue as Global Standard, naming each deployment after the model:
   `gpt-5.4-mini` (triage and reading screenshots) and `gpt-5.5` (deep analysis; if it has no quota, deploy `gpt-5.4`
   and change `DEEP_MODEL` in `.env.local`). Optional: `gpt-4o-transcribe` for audio — it is in preview and only in some
   regions (e.g. East US 2, Sweden Central); without it, text and screenshots still work.
4. **Copy the key and endpoint** from the resource's *Keys and Endpoint* page. The resource name is the first part of the
   endpoint: for `https://my-scam-lab.openai.azure.com/` it is `my-scam-lab`.
5. **Set a budget and alert** under Cost Management → Budgets before you start.

### On the day

1. Click the green **Code** button → **Codespaces** → **Create codespace on main** (2–3 minutes; it installs the app's packages)
2. If VS Code asks *Do you trust the authors of the files in this folder?*, click **Trust Folder & Continue**
3. Open a terminal and run `cd webapp && cp .env.example .env.local`
4. Put your `FOUNDRY_API_KEY` and `FOUNDRY_RESOURCE` in `webapp/.env.local` and save
5. Run `npm run dev`; the app opens in a new tab (or see the **Ports** tab, port 3000)

Step-by-step guide: https://training.codediva.co/en/workshops/cyber-challenge (password given in the session)
To use it on a phone and install it as an app, deploy to the free Azure App Service tier with `webapp/deploy-azure.sh`.

### Avoiding charges

- **A free account never charges you on its own**: after 30 days or when the credit runs out, the subscription is disabled unless you upgrade
- **Do not press Upgrade to pay-as-you-go** unless you mean to pay
- **After the workshop, delete the lab's resource group**: Azure portal → Resource groups → your group → Delete resource group
- **Leaving Azure?** Cost Management + Billing → Subscriptions → your subscription → Cancel subscription
- **Never commit your key** or paste it in chat; a leaked key spends money on your card (`.env.local` is already git-ignored)
- **Do not make port 3000 Public in Codespaces**: anyone with the link could call the models on your key
- Stop your Codespace at https://github.com/codespaces when you are done

The sample messages are made up for teaching; every number, link and account in them is fake. People in the app's images are AI-generated.
