# 📋 ROPA — ระบบบันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล

ระบบสำหรับติดตั้งใช้งานเอง (self-hosted) เพื่อบันทึกและบริหารจัดการ
**Record of Processing Activities** ตามแนวทาง GDPR มาตรา 30 / PDPA ของไทย
รองรับการแบ่งข้อมูลตามหน่วยงาน มีขั้นตอนอนุมัติแบบ แบบร่าง → ส่งขออนุมัติ →
อนุมัติ/ตีกลับ กำหนดสิทธิ์การใช้งานด้วยตารางสิทธิ์ (permission matrix)
ที่แก้ไขได้จากหน้าเว็บ, บังคับยืนยันตัวตนสองขั้นตอน (2FA) ทุกบัญชี, เสิร์ฟผ่าน
HTTPS เสมอ และรองรับ 3 ภาษา: ไทย / อังกฤษ / จีน

## 🛠️ เทคโนโลยีที่ใช้

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| 🎨 หน้าบ้าน (Frontend) | SvelteKit 5 + Tailwind CSS v4 (ธีมเทา/ทอง/เหลือง พร้อม Dark Mode) |
| ⚙️ หลังบ้าน (Backend) | Node.js + Express + TypeScript, Prisma ORM |
| 🗄️ ฐานข้อมูล | PostgreSQL |
| 🌐 Reverse proxy | nginx (ส่ง `/api/*` ไปที่ backend ส่วนที่เหลือส่งไปที่ frontend) |
| 🐳 การรัน | ทุกอย่างรันผ่าน `docker compose` |

## 🚀 เริ่มต้นใช้งานอย่างรวดเร็ว

```bash
cp .env.example .env      # ปรับ secrets ทั้งหมดตามคำแนะนำในไฟล์ (ดูด้านล่าง)
docker compose up -d --build
```

จากนั้นเปิด **https://localhost:8443** (หรือพอร์ตที่ตั้งไว้ใน `PUBLIC_HTTPS_PORT`) — ระบบ
ใช้ใบรับรอง **self-signed** ที่สร้างขึ้นอัตโนมัติในการรันครั้งแรก เบราว์เซอร์จะเตือนว่า
ใบรับรองไม่น่าเชื่อถือ (เพราะไม่ได้ออกโดย CA จริง) กด "ดำเนินการต่อ/Advanced → Proceed"
ได้ตามปกติสำหรับการใช้งานภายใน หากต้องเปิดให้เข้าถึงจากอินเทอร์เน็ตจริง ให้เปลี่ยนไปใช้
ใบรับรองจริง (เช่น Let's Encrypt) แทน

ก่อนรัน ต้องสร้างค่า secret ที่จำเป็นใน `.env`:

```bash
# ACCESS_TOKEN_SECRET และ PRE_AUTH_TOKEN_SECRET
openssl rand -hex 32
# TOTP_ENCRYPTION_KEY (ต้องเป็น 64 hex characters / 32 bytes)
openssl rand -hex 32
```

เข้าสู่ระบบด้วยบัญชีแอดมินเริ่มต้น (กำหนดค่าได้ใน `.env` ค่าเริ่มต้นคือ):

- 📧 อีเมล: `admin@ropa.local`
- 🔑 รหัสผ่าน: `ChangeMe123!`

การเข้าสู่ระบบครั้งแรกจะถูก**บังคับให้ตั้งค่า 2FA** (สแกน QR ด้วยแอปอย่าง Google
Authenticator หรือ Authy) ก่อนเข้าใช้งานได้ — ดูรายละเอียดที่หัวข้อ
[การยืนยันตัวตนสองขั้นตอน](#-การยืนยันตัวตนสองขั้นตอน-2fa) ด้านล่าง

> ⚠️ **สำคัญ:** เปลี่ยนรหัสผ่านแอดมินทันทีหลังเข้าสู่ระบบครั้งแรก

เมื่อรันครั้งแรก container ของ backend จะรัน migration และ seed ข้อมูลเริ่มต้นให้อัตโนมัติ ได้แก่

- 🔐 **สิทธิ์การใช้งาน** และ **บทบาท** เริ่มต้น
- 🏢 **หน่วยงาน** เริ่มต้น: สำนักงานส่วนกลาง, IT, HR (เพิ่ม/แก้ไขได้จากหน้า "หน่วยงาน")
- 👤 บัญชีผู้ดูแลระบบเริ่มต้น (bootstrap admin)

### 👥 บทบาทเริ่มต้นในระบบ

| บทบาท | สิทธิ์โดยสรุป |
|---|---|
| 👑 ผู้ดูแลระบบสูงสุด (Super Admin) | ทำได้ทุกอย่างในระบบ |
| 🛡️ เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) | ดู/แก้ไข ROPA ได้ทุกหน่วยงาน, อนุมัติ/ตีกลับ, ดูประวัติการใช้งาน |
| ✍️ ผู้บันทึกข้อมูลหน่วยงาน (Department Editor) | สร้าง/แก้ไข/ส่งขออนุมัติ ROPA เฉพาะหน่วยงานตนเอง |
| 👁️ ผู้ตรวจสอบ/ผู้เยี่ยมชม (Viewer / Auditor) | ดู ROPA ได้ทุกหน่วยงานและดูประวัติการใช้งาน (อ่านอย่างเดียว) |

สามารถสร้างบทบาทใหม่หรือปรับตารางสิทธิ์ได้เองจากหน้า **บทบาทและสิทธิ์** โดยไม่ต้องแก้โค้ด

## 🔒 การยืนยันตัวตนสองขั้นตอน (2FA)

ทุกบัญชี**บังคับ**เปิดใช้ TOTP (มาตรฐานเดียวกับ Google Authenticator/Authy) — ไม่มีทาง
ข้ามได้ ผู้ใช้ใหม่ที่ยังไม่ตั้งค่าจะถูกพาไปหน้าสแกน QR ทันทีหลังใส่รหัสผ่านถูกต้อง

- **รหัสลับ TOTP เข้ารหัสไว้ในฐานข้อมูล** ด้วย AES-256-GCM (ไม่เก็บเป็น plaintext)
- **รหัสสำรอง (backup codes)** 10 ชุด ใช้ได้ครั้งเดียวต่อชุด แสดงให้เห็นครั้งเดียวตอนตั้งค่าเสร็จ
  และสร้างใหม่ได้จากหน้าโปรไฟล์ (ชุดเดิมจะใช้ไม่ได้ทันที)
- มี **rate limit** ทั้งตอนล็อกอินและตอนยืนยันโค้ด เพื่อป้องกันการเดารหัส
- ถ้าผู้ใช้ทำอุปกรณ์หาย ผู้มีสิทธิ์ `users.manage` สามารถกด **"Reset 2FA"** จากหน้าผู้ใช้งาน
  เพื่อบังคับให้ตั้งค่าใหม่ในการเข้าสู่ระบบครั้งถัดไป

## 🏗️ สถาปัตยกรรมระบบ

```
                 :8080 (http, 301 redirect only)
                 :8443 (https, self-signed cert)
                 ┌────────┐
  ผู้ใช้ (browser) ─▶ │ nginx  │
                 └───┬────┘
              /api/*  │  เส้นทางอื่นทั้งหมด
                 ┌────▼────┐        ┌──────────┐
                 │ backend │  ───▶  │ postgres │
                 │ :4000   │        │  :5432   │
                 └─────────┘        └──────────┘
                 ┌──────────┐
                 │ frontend │  (SvelteKit SSR, Node)
                 │  :3000   │
                 └──────────┘
```

- **HTTPS is always on.** nginx terminates TLS with a certificate generated
  by a one-off `certs` container on first boot (see `docker-compose.yml`) and
  redirects all plain HTTP to HTTPS. Cookies are flagged `Secure`, so this
  isn't optional — login simply won't work over plain HTTP in production.
- **เบราว์เซอร์ของผู้ใช้** จะคุยกับ origin เดียวเท่านั้น (ผ่าน nginx) ไม่ได้ยิงตรงไป
  backend เลย ทำให้ไม่ต้องตั้งค่า CORS ในระบบจริง
- **การเรนเดอร์ฝั่งเซิร์ฟเวอร์ (SSR)** เช่นการตรวจสอบสถานะล็อกอินใน root layout
  จะเรียก backend ตรงผ่านเครือข่ายภายในของ Docker (`BACKEND_ORIGIN`) และส่งต่อ
  cookie ของ request เองด้วยมือ — ดูที่ `frontend/src/lib/server/backend.ts`
- ส่วนที่เหลือ (หน้าจอ CRUD ต่าง ๆ) เรียก API ฝั่ง client ผ่าน path แบบ relative
  `/api/*` — ดูที่ `frontend/src/lib/api/client.ts` ซึ่งจัดการ refresh access
  token ให้อัตโนมัติเมื่อได้รับ 401

## 🔐 ระบบสิทธิ์การใช้งาน (Permission Matrix)

การควบคุมสิทธิ์ใช้แนวคิด **ตารางสิทธิ์ (permission matrix)**: `permissions`
(รวม module + action เช่น `ropa.read_own`, `ropa.approve`, `users.manage`)
จะถูกจัดกลุ่มเข้ากับ `roles` ผ่านตาราง `role_permissions` และผู้ใช้แต่ละคน
(`user`) มีได้ 1 บทบาท พร้อมหน่วยงาน (ไม่บังคับ) สิทธิ์ที่เกี่ยวกับหน่วยงาน
จะมาเป็นคู่ `_own` / `_all` (เช่น `ropa.read_own` กับ `ropa.read_all`)
ทำให้กำหนดได้ว่าบทบาทนั้นเห็นเฉพาะหน่วยงานตนเอง หรือเห็นได้ทั้งองค์กร

ดูรายการสิทธิ์ทั้งหมดและการกำหนดบทบาทเริ่มต้นได้ที่
`backend/src/constants/permissions.ts`

## 🔄 ขั้นตอนการทำงานของ ROPA

แต่ละรายการจะไล่สถานะตาม `แบบร่าง (DRAFT) → รอการอนุมัติ (SUBMITTED) →
อนุมัติแล้ว (APPROVED)` หรือ `ถูกตีกลับ (REJECTED)` ซึ่งจะกลับไปแก้ไขได้อีกครั้ง
ผู้บันทึกข้อมูลหน่วยงานสร้าง/แก้ไขแบบร่างและส่งขออนุมัติ ส่วนผู้ที่มีสิทธิ์
`ropa.approve` (เช่นบทบาท DPO) จะเป็นผู้อนุมัติหรือตีกลับพร้อมระบุเหตุผล
ทุกการกระทำจะถูกบันทึกลงประวัติการใช้งาน (audit log) โดยอัตโนมัติ

## 🛡️ ความปลอดภัยและ CI/CD

ทุก push/PR จะรันผ่านไปป์ไลน์อัตโนมัติ: ตรวจ secret รั่วไหล → build/typecheck →
สแกน dependency (npm audit) + static analysis (CodeQL) → build image และสแกนด้วย
Trivy → ให้ Claude อ่าน diff แล้วคอมเมนต์รีวิวความปลอดภัย/ความถูกต้องของโค้ด
รายละเอียดทั้งหมดอยู่ที่ [`docs/ci-cd.md`](docs/ci-cd.md) และมาตรการความปลอดภัย
ที่ระบบใช้อยู่ตอนนี้อยู่ที่ [`SECURITY.md`](SECURITY.md)

## 💻 การพัฒนาในเครื่อง (ไม่ใช้ Docker ทั้งหมด)

```bash
# รัน Postgres อย่างเดียวผ่าน compose
docker compose up -d postgres

# Backend
cd backend
cp .env.example .env   # ชี้ DATABASE_URL ไปที่ postgres ของตนเอง + ใส่ secrets (ดูคอมเมนต์ในไฟล์)
npm install
npx prisma migrate deploy
npm run seed
npm run dev             # http://localhost:4000

# Frontend (เปิดอีก terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173, proxy /api ไปที่ :4000
```

## 📁 โครงสร้างโปรเจกต์

```
backend/
  prisma/schema.prisma       โมเดลข้อมูล (users, roles, permissions, departments, ropa_records, backup_codes, audit_logs)
  src/modules/                 1 โฟลเดอร์ต่อ 1 resource: auth, users, roles, departments, ropa, audit
  src/middleware/               requireAuth / requireAnyPermission / requirePreAuth (ขั้น 2FA) / rateLimit
  src/utils/totp.ts             เข้ารหัส/ตรวจรหัส TOTP + สร้าง QR code
  src/utils/backupCodes.ts      สร้าง/ตรวจ/เก็บรหัสสำรอง (bcrypt hash, ใช้ครั้งเดียว)
  src/db/seed/                   สร้างบทบาท/สิทธิ์/หน่วยงาน/แอดมินเริ่มต้น
frontend/
  src/routes/(app)/             ส่วนของแอปที่ต้องล็อกอิน (sidebar/topbar) + หน้าต่าง ๆ
  src/routes/login/             เข้าสู่ระบบ + ขั้นตอน 2FA (setup-2fa, verify-2fa, backup-codes)
  src/lib/i18n/                  ไฟล์คำแปล th/en/zh และ locale context
  src/lib/components/            UI ที่ใช้ร่วมกัน (Button, Card, Dialog, TagInput, ...) และฟอร์ม ROPA
nginx/
  nginx.conf                    main config (include conf.d/*.conf)
  templates/default.conf.template  HTTP→HTTPS redirect + HTTPS reverse proxy (envsubst ตอน container start)
.github/workflows/             ci.yml (build/scan pipeline) + claude-review.yml (Claude รีวิว PR)
docs/ci-cd.md                  รายละเอียดไปป์ไลน์ CI/CD
SECURITY.md                    นโยบายความปลอดภัยและวิธีรายงานช่องโหว่
```
