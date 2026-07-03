# M-T Transport — Web App (Next.js + Supabase + Vercel)

Bu loyiha "GitHub → Supabase → Vercel" ish jarayoni uchun tayyorlangan —
oldingi ERP loyihalaringiz bilan bir xil tizim.

## Arxitektura

```
Brauzer  →  Vercel (Next.js API route'lari, serverless)  →  Supabase (PostgreSQL)
```

- **Supabase** — faqat ma'lumotlar bazasi (PostgreSQL) sifatida ishlatiladi.
  Sxema o'zgarishsiz: avvalgi `mt_transport_schema.sql` shu yerda ham bor.
- **Vercel** — Next.js loyihasini hostlaydi, har bir `/api/...` yo'li avtomatik
  serverless funksiyaga aylanadi (Express server kerak emas).
- **GitHub** — kodni saqlaydi; Vercel GitHub repo bilan ulanib, har `git push`da
  avtomatik qayta deploy qiladi.

---

## 1-QADAM: Supabase loyihasini yaratish

1. [supabase.com](https://supabase.com) → **New Project**.
2. Loyiha nomi, parol (eslab qoling!) va region tanlang (masalan Frankfurt —
   O'zbekistonga eng yaqin).
3. Loyiha tayyor bo'lgach: **SQL Editor** bo'limiga o'ting.
4. `sql/mt_transport_schema.sql` faylining butun mazmunini nusxalab,
   SQL Editor'ga joylashtiring va **Run** bosing.
5. **Project Settings → Database → Connection string** bo'limiga o'ting.
   - **"Connection pooling"** rejimini tanlang (Transaction mode, port `6543`) —
     bu Vercel'ning serverless funksiyalari uchun majburiy (oddiy to'g'ridan-to'g'ri
     ulanish serverless'da tezda connection limitiga uriladi).
   - URI'ni nusxalab oling, masalan:
     `postgresql://postgres.xxxx:PAROL@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`

## 2-QADAM: Kodni GitHub'ga yuklash

Agar hali git repo bo'lmasa:

```bash
cd mt-transport-webapp
git init
git add .
git commit -m "M-T Transport MVP: RBAC, audit, masofa yaxlitligi, valyuta ajratish"
```

GitHub'da yangi (bo'sh) repository yarating, so'ng:

```bash
git remote add origin https://github.com/<username>/mt-transport-webapp.git
git branch -M main
git push -u origin main
```

## 3-QADAM: Vercel'ga ulash

1. [vercel.com](https://vercel.com) → **Add New → Project**.
2. GitHub repo'ingizni tanlang (`mt-transport-webapp`).
3. Framework avtomatik **Next.js** deb aniqlanadi — hech narsa o'zgartirmang.
4. **Environment Variables** bo'limida quyidagilarni qo'shing:
   | Nomi | Qiymati |
   |---|---|
   | `DATABASE_URL` | Supabase'dan olingan pooler URI (1-qadam) |
   | `JWT_SECRET` | Uzun tasodifiy satr (masalan `openssl rand -hex 32` natijasi) |
   | `JWT_EXPIRES_IN` | `8h` |
5. **Deploy** bosing. 1-2 daqiqada loyihangiz jonli bo'ladi:
   `https://mt-transport-webapp.vercel.app`

Shundan keyin har safar `git push` qilganingizda Vercel avtomatik qayta
deploy qiladi — qo'lda hech narsa qilish shart emas.

## 4-QADAM: Birinchi FOUNDER foydalanuvchisini yaratish

Ro'yxatdan o'tish endpointi RBAC bilan himoyalangan (faqat FOUNDER yangi
foydalanuvchi qo'sha oladi), lekin bazada hali birorta ham FOUNDER yo'q.
Shu sababli birinchisini Supabase SQL Editor orqali qo'lda qo'shamiz:

```sql
-- Avval parolni bcrypt bilan hash qiling. Buni mahalliy kompyuteringizda
-- (agar Node.js o'rnatilgan bo'lsa) shu buyruq bilan qilishingiz mumkin:
--   node -e "console.log(require('bcryptjs').hashSync('parolingiz', 12))"

INSERT INTO users (ism_sharif, username, password_hash, rol)
VALUES ('Asoschi Ism', 'founder', '<bcrypt_hash_shu_yerga>', 'FOUNDER');
```

Node.js o'rnatilmagan bo'lsa, [replit.com](https://replit.com) yoki shunga
o'xshash onlayn muhitda bitta buyruq bilan hash generatsiya qilish mumkin —
agar kerak bo'lsa shuni ham tayyorlab beraman.

## 5-QADAM: Tekshirish

```bash
# Login
curl -X POST https://mt-transport-webapp.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"founder","password":"parolingiz"}'

# Javobdagi "token"ni oling, keyin:
curl https://mt-transport-webapp.vercel.app/api/cars \
  -H "Authorization: Bearer <token>"
```

---

## Lokal (kompyuteringizda) ishga tushirish

```bash
npm install
cp .env.example .env.local   # DATABASE_URL va JWT_SECRET'ni to'ldiring
npm run dev
```

`http://localhost:3000/api/health` orqali ishlayotganini tekshiring.

---

## Loyihaning 5 ta asosiy qoidasi qanday amalga oshirilgan

1. **RBAC** — `src/permissions/permissions.ts` markaziy ruxsatlar matritsasi.
   `transactions` uchun POST/PUT/DELETE FAQAT `CHIEF_MECHANIC` roliga ochiq;
   `requirePermission()` har bir route'da chaqirilib, mos kelmasa 403
   Forbidden qaytaradi (`src/app/api/transactions/route.ts`).
2. **Masofa yaxlitligi** — ikki qatlam: (a) `sql/mt_transport_schema.sql`dagi
   `trg_transactions_mileage_check` trigger'i bazada bloklaydi, (b)
   `src/validators/transactions.validators.ts` zod orqali oldindan tekshiradi.
3. **Audit log** — `trg_audit_cars`/`trg_audit_transactions` trigger'lari
   avtomatik yozadi; `getClientWithUser()` (`src/lib/db.ts`) har so'rovda
   `app.current_user_id` sessiya o'zgaruvchisini o'rnatadi.
4. **Valyuta ajratish** — `src/services/reports.service.ts`dagi
   `compareByCurrency()` UZS/USD'ni ALOHIDA guruhlaydi, qo'shib yubormaydi.
5. **Clean code** — bcryptjs (12 round, sof JS — kompilyatsiya talab
   qilmaydi), parameterized SQL (`$1, $2...`), zod validatsiya, standart
   JSON javob formati (`{success, data}` / `{success:false, error}`).

## Papka tuzilishi

```
src/
  lib/          — db.ts (Supabase pool), auth.ts (JWT), apiHandler.ts (xato
                   ushlagich), AppError.ts, response.ts
  permissions/   — RBAC markaziy matritsasi
  services/      — biznes mantiq (Express versiyasidagi bilan bir xil)
  validators/    — zod sxemalari
  app/api/       — Next.js route'lari (Express controller+routes o'rnini bosadi)
sql/
  mt_transport_schema.sql — to'liq DDL (o'zgarishsiz)
```

## Keyingi bosqich (taklif)

Hozircha bu faqat API qatlami (`/` sahifasi bo'sh). Agar xohlasangiz, keyingi
qadam sifatida login formasi va dashboard (avtoparklar ro'yxati, tranzaksiya
kiritish formasi, Compare hisobot grafigi) UI'sini quramiz.
