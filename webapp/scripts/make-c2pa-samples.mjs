// สร้างภาพตัวอย่าง C2PA 3 แบบใน public/samples/c2pa/ (รันครั้งเดียว ไม่ได้เป็นส่วนของแอป)
//
// ต้องมี: npm i -E @contentauth/c2pa-node@0.12.2 (ในโฟลเดอร์แยก) และใบรับรองทดสอบ ES256:
//   openssl ecparam -name prime256v1 -genkey -noout -out ca.key
//   openssl req -x509 -new -key ca.key -sha256 -days 3650 -subj "/CN=ScamAlert Lab Test Root CA/O=ScamAlert Lab (test only)" \
//     -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" -out ca.pem
//   openssl ecparam -name prime256v1 -genkey -noout -out leaf.ec.key && openssl pkcs8 -topk8 -nocrypt -in leaf.ec.key -out leaf.key
//   openssl req -new -key leaf.key -subj "/CN=ScamAlert Lab Test Signer/O=ScamAlert Lab (test only)" -out leaf.csr
//   (leaf.ext: basicConstraints=critical,CA:FALSE / keyUsage=critical,digitalSignature / extendedKeyUsage=emailProtection
//    / subjectKeyIdentifier=hash / authorityKeyIdentifier=keyid)
//   openssl x509 -req -in leaf.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 730 -sha256 -extfile leaf.ext -out leaf.pem
//   cat leaf.pem ca.pem > chain.pem
// ใบรับรองนี้ไม่อยู่ในรายชื่อที่เชื่อถือได้ (trust list) แอปจึงขึ้นว่า "ผู้เซ็นไม่อยู่ในรายชื่อที่เชื่อถือได้" — ตั้งใจ ไว้สอน
// กุญแจไม่ได้อยู่ใน repo
//
// ผลลัพธ์: 01 เซ็นแล้ว (สร้างด้วย AI) · 02 ภาพเดียวกันไม่มี C2PA · 03 แก้ไบต์ภาพหลังเซ็น (hash ไม่ตรง)
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { Builder, LocalSigner } from '@contentauth/c2pa-node'

const [input = 'in.jpg', out = '.'] = process.argv.slice(2)
const signer = LocalSigner.newSigner(readFileSync('chain.pem'), readFileSync('leaf.key'), 'es256')
const builder = await Builder.withJsonAsync({
  claim_generator_info: [{ name: 'ScamAlert lab sample', version: '1.0' }],
  title: 'investment-scam-illustration.jpg',
  format: 'image/jpeg',
  assertions: [
    {
      label: 'c2pa.actions',
      data: {
        actions: [
          {
            action: 'c2pa.created',
            digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
            softwareAgent: { name: 'qwen-image-3.0-pro (SparkThai Model Studio)' },
          },
        ],
      },
    },
  ],
})
builder.sign(signer, { path: input }, { path: `${out}/01-ai-signed.jpg` })
copyFileSync(input, `${out}/02-ai-stripped.jpg`)
const b = readFileSync(`${out}/01-ai-signed.jpg`)
for (let i = Math.floor(b.length * 0.8); i < Math.floor(b.length * 0.8) + 40; i += 4) b[i] ^= 0x10
writeFileSync(`${out}/03-ai-tampered.jpg`, b)
console.log('wrote 3 samples to', out)
