#!/usr/bin/env bash
# Deploy แอปนี้ขึ้น Azure App Service แผน Free (F1, Linux)
# ใช้: APP_NAME=<ชื่อไม่ซ้ำใครทั้งโลก> ./deploy-azure.sh
# ต้องมี: az login แล้ว, Node 22, ไฟล์ .env.local ที่มี FOUNDRY_API_KEY และ FOUNDRY_RESOURCE
set -euo pipefail
cd "$(dirname "$0")"

: "${APP_NAME:?ตั้ง APP_NAME ก่อน เช่น APP_NAME=scam-check-yourname ./deploy-azure.sh}"
RG="${RG:-rg-scam-check}"
LOCATION="${LOCATION:-southeastasia}"
PLAN="${APP_NAME}-plan"

# อ่าน key จาก .env.local แทนการพิมพ์ในคำสั่ง (จะได้ไม่ค้างใน shell history)
set -a; source .env.local; set +a
: "${FOUNDRY_API_KEY:?ไม่มี FOUNDRY_API_KEY ใน .env.local}"
: "${FOUNDRY_RESOURCE:?ไม่มี FOUNDRY_RESOURCE ใน .env.local}"

echo "== build"
npm ci
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
rm -f deploy.zip
(cd .next/standalone && zip -qr ../../deploy.zip .)

echo "== สร้าง resource (ถ้ามีอยู่แล้วจะใช้ของเดิม)"
az group create -n "$RG" -l "$LOCATION" -o none
az appservice plan create -g "$RG" -n "$PLAN" --is-linux --sku F1 -o none
az webapp create -g "$RG" -p "$PLAN" -n "$APP_NAME" --runtime "NODE:22-lts" -o none

# HOSTNAME=0.0.0.0 ให้ server.js รับ request จากนอกเครื่อง (App Service ตั้ง HOSTNAME เป็นชื่อ container)
az webapp config set -g "$RG" -n "$APP_NAME" --startup-file "HOSTNAME=0.0.0.0 node server.js" -o none
az webapp config appsettings set -g "$RG" -n "$APP_NAME" -o none --settings \
  FOUNDRY_API_KEY="$FOUNDRY_API_KEY" \
  FOUNDRY_RESOURCE="$FOUNDRY_RESOURCE" \
  TRIAGE_MODEL="${TRIAGE_MODEL:-gpt-5.4-mini}" \
  DEEP_MODEL="${DEEP_MODEL:-gpt-5.5}" \
  TRANSCRIBE_MODEL="${TRANSCRIBE_MODEL:-gpt-4o-transcribe}" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false

echo "== อัปโหลด"
az webapp deploy -g "$RG" -n "$APP_NAME" --src-path deploy.zip --type zip -o none

echo "เสร็จแล้ว: https://${APP_NAME}.azurewebsites.net"
echo "เปิดครั้งแรกอาจรอ 20-60 วินาที (แผน Free ไม่มี Always On)"
echo "เลิกใช้แล้วลบทิ้งด้วย: az group delete -n $RG"
