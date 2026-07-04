-- =====================================================================
--  M-T TRANSPORT — MVP DATABASE SCHEMA (PostgreSQL 14+)
--  Avtopark: 38 ta transport vositasi (Isuzu 10t, Isuzu 5t, Changan, Labo)
--
--  Ushbu skript quyidagilarni ta'minlaydi:
--   1. RBAC uchun poydevor (rol maydoni + audit)
--   2. Odometr/kilometraj yaxlitligi (trigger orqali)
--   3. To'liq audit_log (INSERT/UPDATE avtomatik yoziladi)
--   4. Ko'p valyutali moliya tuzilmasi (UZS/USD aralashmaydi)
--   5. Xavfsiz parol saqlash uchun VARCHAR(255) — hash bcrypt bilan
--      ilova (backend) tomonida amalga oshiriladi
-- =====================================================================

BEGIN;

-- =====================================================================
-- 0. TOZALASH (development uchun, productionda o'chirib qo'yiladi)
-- =====================================================================
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS car_type;
DROP TYPE IF EXISTS car_status;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS currency_type;
DROP TYPE IF EXISTS expense_type;

-- =====================================================================
-- 1. ENUM TIPLARI
-- =====================================================================
CREATE TYPE user_role AS ENUM ('FOUNDER', 'MANAGER', 'CHIEF_MECHANIC', 'MECHANIC');
CREATE TYPE user_status AS ENUM ('Aktiv', 'Bloklangan');
CREATE TYPE car_type AS ENUM ('Isuzu 10t', 'Isuzu 5t', 'Changan', 'Labo');
CREATE TYPE car_status AS ENUM ('Aktiv', 'Ta''mirlashda', 'Nosoz');
CREATE TYPE transaction_type AS ENUM ('Kirim', 'Chiqim');
CREATE TYPE currency_type AS ENUM ('UZS', 'USD');
CREATE TYPE expense_type AS ENUM ('Ta''mirlash', 'Yoqilg''i', 'Ehtiyot qism', 'Boshqa', 'Kirim_Moliya');

-- =====================================================================
-- 2. USERS
-- =====================================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    ism_sharif      VARCHAR(150) NOT NULL,
    username        VARCHAR(50)  UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- faqat bcrypt hash saqlanadi, hech qachon plain-text emas
    rol             user_role    NOT NULL,
    status          user_status  NOT NULL DEFAULT 'Aktiv',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 3. CARS
-- =====================================================================
CREATE TABLE cars (
    id                              SERIAL PRIMARY KEY,
    tur                             car_type   NOT NULL,
    davlat_raqami                   VARCHAR(20) UNIQUE NOT NULL,
    ishlab_chiqarilgan_yili         INT        NOT NULL
        CHECK (ishlab_chiqarilgan_yili BETWEEN 1980 AND (EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1)),
    boshlangich_yurgan_masofasi     INT        NOT NULL CHECK (boshlangich_yurgan_masofasi >= 0),
    joriy_yurgan_masofasi           INT        NOT NULL CHECK (joriy_yurgan_masofasi >= 0),
    texnik_holat                    car_status NOT NULL DEFAULT 'Aktiv',
    created_at                      TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Masofa zanjiri hech qachon orqaga qaytmasligi kerak
    CONSTRAINT chk_masofa_ketma_ketligi CHECK (joriy_yurgan_masofasi >= boshlangich_yurgan_masofasi)
);

-- =====================================================================
-- 4. DRIVERS
-- =====================================================================
CREATE TABLE drivers (
    id                      SERIAL PRIMARY KEY,
    ism_sharif              VARCHAR(150) NOT NULL,
    telefon_raqam           VARCHAR(20)  NOT NULL,
    biriktirilgan_avto_id   INT REFERENCES cars(id) ON DELETE SET NULL,
    created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 5. TRANSACTIONS (moliyaviy va texnik amallar)
-- =====================================================================
CREATE TABLE transactions (
    id                          SERIAL PRIMARY KEY,
    turi                        transaction_type NOT NULL,
    valyuta                     currency_type    NOT NULL,
    summa                       NUMERIC(15,2)    NOT NULL CHECK (summa > 0),
    avto_id                     INT REFERENCES cars(id) ON DELETE CASCADE,
    xarajat_turi                expense_type     NOT NULL,
    amaldagi_yurgan_masofa      INT,                       -- ta'mirlash vaqtidagi odometr ko'rsatkichi
    tavsif                      TEXT,
    kim_kiritdi                 INT NOT NULL REFERENCES users(id),
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 6. AUDIT LOG
-- =====================================================================
CREATE TABLE audit_log (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id),
    harakat         VARCHAR(50) NOT NULL,   -- masalan: 'INSERT_TRANSACTION', 'UPDATE_CAR'
    eski_malumot    JSONB,
    yangi_malumot   JSONB,
    vaqt            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 7. INDEKSLAR (tezkor filtrlash va qidiruv uchun)
-- =====================================================================

-- Davlat raqami bo'yicha tezkor qidiruv (UNIQUE constraint allaqachon index yaratadi,
-- lekin qisman/case-insensitive qidiruv uchun qo'shimcha index foydali)
CREATE INDEX idx_cars_davlat_raqami_trgm ON cars (davlat_raqami);
CREATE INDEX idx_cars_tur ON cars (tur);
CREATE INDEX idx_cars_texnik_holat ON cars (texnik_holat);

-- Transactions — eng ko'p filtrlanadigan ustunlar
CREATE INDEX idx_transactions_avto_id ON transactions (avto_id);
CREATE INDEX idx_transactions_valyuta ON transactions (valyuta);
CREATE INDEX idx_transactions_turi ON transactions (turi);
CREATE INDEX idx_transactions_xarajat_turi ON transactions (xarajat_turi);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_transactions_kim_kiritdi ON transactions (kim_kiritdi);
-- Compare/hisobot funksiyalari uchun composite index (avto + valyuta bo'yicha guruhlash)
CREATE INDEX idx_transactions_avto_valyuta ON transactions (avto_id, valyuta);

-- Drivers
CREATE INDEX idx_drivers_biriktirilgan_avto ON drivers (biriktirilgan_avto_id);

-- Audit log
CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX idx_audit_log_harakat ON audit_log (harakat);
CREATE INDEX idx_audit_log_vaqt ON audit_log (vaqt DESC);

-- Users
CREATE INDEX idx_users_rol ON users (rol);

-- =====================================================================
-- 8. FUNKSIYA: joriy foydalanuvchini sessiyadan olish
--    Ilova har bir so'rov boshida quyidagini bajarishi shart:
--    SELECT set_config('app.current_user_id', '<user_id>', true);
--    Shunda trigger'lar audit_log'ga to'g'ri user_id yozadi.
-- =====================================================================
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS INT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::INT;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 9. TRIGGER: updated_at avtomatik yangilanishi (cars jadvali uchun)
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cars_updated_at
    BEFORE UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 10. TRIGGER: ODOMETR / KILOMETRAJ YAXLITLIGI
--     Qoida: ta'mirlash/ehtiyot qism kiritilganda amaldagi_yurgan_masofa
--     avtomobilning joriy_yurgan_masofasi'dan kam bo'lishi mumkin emas.
--     Yozuv qabul qilinganda cars.joriy_yurgan_masofasi avtomatik yangilanadi.
-- =====================================================================
CREATE OR REPLACE FUNCTION check_and_apply_mileage() RETURNS TRIGGER AS $$
DECLARE
    v_joriy_masofa INT;
BEGIN
    -- Faqat avto_id va amaldagi_yurgan_masofa ko'rsatilgan yozuvlar tekshiriladi
    IF NEW.avto_id IS NOT NULL AND NEW.amaldagi_yurgan_masofa IS NOT NULL THEN

        SELECT joriy_yurgan_masofasi INTO v_joriy_masofa
        FROM cars
        WHERE id = NEW.avto_id
        FOR UPDATE;  -- race-condition'larni oldini olish uchun qatorni bloklaymiz

        IF v_joriy_masofa IS NULL THEN
            RAISE EXCEPTION 'avto_id = % topilmadi', NEW.avto_id;
        END IF;

        IF NEW.amaldagi_yurgan_masofa < v_joriy_masofa THEN
            RAISE EXCEPTION
                'Masofa xatosi: kiritilgan qiymat (%) avtomobilning oxirgi qayd etilgan masofasidan (%) kam bo''lishi mumkin emas',
                NEW.amaldagi_yurgan_masofa, v_joriy_masofa;
        END IF;

        -- Avtomobilning joriy masofasini yangilaymiz
        UPDATE cars
        SET joriy_yurgan_masofasi = NEW.amaldagi_yurgan_masofa
        WHERE id = NEW.avto_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_mileage_check
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_and_apply_mileage();

-- =====================================================================
-- 11. TRIGGER: AUDIT LOG (cars va transactions uchun umumiy funksiya)
--     Har bir INSERT/UPDATE avtomatik audit_log'ga yoziladi.
-- =====================================================================
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS TRIGGER AS $$
DECLARE
    v_harakat VARCHAR(50);
BEGIN
    v_harakat := TG_OP || '_' || UPPER(TG_TABLE_NAME);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (user_id, harakat, eski_malumot, yangi_malumot)
        VALUES (get_current_user_id(), v_harakat, NULL, to_jsonb(NEW));
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, harakat, eski_malumot, yangi_malumot)
        VALUES (get_current_user_id(), v_harakat, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, harakat, eski_malumot, yangi_malumot)
        VALUES (get_current_user_id(), v_harakat, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_cars
    AFTER INSERT OR UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_audit_transactions
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

COMMIT;

-- =====================================================================
-- MUHIM ESLATMALAR (README sifatida):
--
-- 1) RBAC (403 Forbidden) — bu qatlam SQL darajasida emas, backend
--    middleware darajasida amalga oshiriladi (masalan Express/FastAPI
--    dagi auth middleware). Baza faqat NOT NULL/FK orqali yaxlitlikni
--    ta'minlaydi. Agar PostgreSQL darajasida ham qo'shimcha himoya
--    kerak bo'lsa, ROW LEVEL SECURITY (RLS) siyosatlarini qo'shish
--    mumkin — buni alohida so'rasangiz tayyorlab beraman.
--
-- 2) Har bir so'rov (request) boshida backend ushbu buyruqni yuborishi
--    shart, aks holda audit_log'da user_id NULL bo'lib qoladi:
--        SELECT set_config('app.current_user_id', '<foydalanuvchi_id>', true);
--
-- 3) Valyuta konvertatsiyasi (UZS <-> USD) uchun alohida
--    `exchange_rates` jadvali kerak bo'ladi (joriy kurs saqlash uchun).
--    Buni MVP'ning keyingi bosqichida qo'shishni tavsiya qilaman.
--
-- 4) Parolni bcrypt bilan hash qilish, SQL Injection'dan himoya
--    (parameterized queries/ORM) va JSON response formati — bularning
--    barchasi backend (ilova) qatlamida amalga oshiriladi, bu skript
--    faqat ma'lumotlar bazasi tuzilmasini ta'minlaydi.
-- =====================================================================

-- =====================================================================
-- 12. EXCHANGE_RATES — valyuta kursi tarixi (4-qoidaga qo'shimcha modul)
--     MUHIM: bu jadval UZS/USD'ni "qo'shish" uchun emas — faqat
--     KO'RSATISH maqsadida ixtiyoriy konvertatsiya qiymati berish uchun.
--     Xom (raw) UZS va USD summalar har doim alohida-alohida saqlanadi
--     va hisoblanadi (4-qoida o'zgarmaydi).
-- =====================================================================
CREATE TABLE exchange_rates (
    id                  SERIAL PRIMARY KEY,
    kurs                NUMERIC(15,4) NOT NULL CHECK (kurs > 0), -- 1 USD = necha UZS
    amal_qilish_sanasi  DATE NOT NULL DEFAULT CURRENT_DATE,
    kim_kiritdi         INT REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exchange_rates_sana ON exchange_rates (amal_qilish_sanasi DESC);

CREATE TRIGGER trg_audit_exchange_rates
    AFTER INSERT ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- =====================================================================
-- 13. AUDIT TRIGGER — users jadvali uchun ham (bloklash/faollashtirish
--     kabi o'zgarishlar ham audit tarixida ko'rinishi uchun)
-- =====================================================================
CREATE TRIGGER trg_audit_users
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- =====================================================================
-- 14. AUDIT TUZATISHLARI (moliyaviy audit ko'rib chiqishi asosida)
-- =====================================================================

-- 14.1) Tranzaksiyalar HECH QACHON haqiqiy o'chirilmaydi (moliyaviy audit
--       talabi) — faqat "bekor qilingan" deb belgilanadi. Bu izsiz
--       yo'qolishning oldini oladi va kim/qachon bekor qilganini saqlaydi.
ALTER TABLE transactions
    ADD COLUMN bekor_qilindi BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN bekor_qilingan_vaqt TIMESTAMP,
    ADD COLUMN bekor_qilgan_user_id INT REFERENCES users(id);

-- 14.2) DELETE amali ham audit_log'ga yozilishi shart (avval faqat
--       INSERT/UPDATE yozilar edi — endi har qanday to'g'ridan-to'g'ri
--       bazaviy DELETE ham iz qoldiradi, himoyaning qo'shimcha qatlami)
DROP TRIGGER IF EXISTS trg_audit_cars ON cars;
CREATE TRIGGER trg_audit_cars
    AFTER INSERT OR UPDATE OR DELETE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- 14.3) Avtoni o'chirish uning tranzaksiya tarixini avtomatik yo'q
--       qilmasligi kerak (CASCADE xavfli) — endi tranzaksiyasi bor avtoni
--       o'chirib bo'lmaydi (RESTRICT), avval uning tarixi ko'rib chiqilishi
--       yoki avto shunchaki "Nosoz"/nofaol holatga o'tkazilishi kerak.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_avto_id_fkey;
ALTER TABLE transactions
    ADD CONSTRAINT transactions_avto_id_fkey
    FOREIGN KEY (avto_id) REFERENCES cars(id) ON DELETE RESTRICT;

-- =====================================================================
-- 15. XARAJAT TURLARINI KENGAYTIRISH (C-bosqich)
--     Yangi turlar: Moy, YTX (Yo'l-transport xodisasi/avariya),
--     Kapital ta'mir, Diagnostika
-- =====================================================================
ALTER TYPE expense_type ADD VALUE IF NOT EXISTS 'Moy';
ALTER TYPE expense_type ADD VALUE IF NOT EXISTS 'YTX';
ALTER TYPE expense_type ADD VALUE IF NOT EXISTS 'Kapital ta''mir';
ALTER TYPE expense_type ADD VALUE IF NOT EXISTS 'Diagnostika';

-- =====================================================================
-- 16. AVTO TURLARI — endi kengaytiriladigan jadval (ENUM emas)
--     Foydalanuvchi (FOUNDER/MANAGER) interfeys orqali istalgan vaqtda
--     yangi turi qo'sha oladi, kod o'zgartirishga hojat qolmaydi.
-- =====================================================================
CREATE TABLE car_types (
    nomi        VARCHAR(50) PRIMARY KEY,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mavjud 4 ta turi bilan boshlang'ich to'ldirish
INSERT INTO car_types (nomi) VALUES ('Isuzu 10t'), ('Isuzu 5t'), ('Changan'), ('Labo')
ON CONFLICT (nomi) DO NOTHING;

-- cars.tur ustunini ENUM'dan VARCHAR'ga o'tkazish va car_types'ga bog'lash
ALTER TABLE cars ALTER COLUMN tur TYPE VARCHAR(50);
ALTER TABLE cars ADD CONSTRAINT cars_tur_fkey FOREIGN KEY (tur) REFERENCES car_types(nomi);

-- Endi ishlatilmaydigan ENUM turini tozalash
DROP TYPE IF EXISTS car_type;

-- =====================================================================
-- 17. OMBOR TIZIMI (F-bosqich) — Yoqilg'i/Moy va Ehtiyot qismlar
--     miqdor/qoldiq kuzatuvi bilan.
-- =====================================================================

CREATE TABLE ombor_mahsulotlari (
    id              SERIAL PRIMARY KEY,
    nomi            VARCHAR(100) NOT NULL UNIQUE,
    toifa           VARCHAR(30) NOT NULL,              -- masalan: 'Ehtiyot qism', 'Yoqilg'i', 'Moy'
    olchov_birligi  VARCHAR(20) NOT NULL,               -- dona, litr, kg
    joriy_qoldiq    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (joriy_qoldiq >= 0),
    minimal_qoldiq  NUMERIC(12,2) NOT NULL DEFAULT 0,   -- shundan kam qolsa ogohlantirish
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ombor_harakatlari (
    id              SERIAL PRIMARY KEY,
    mahsulot_id     INT NOT NULL REFERENCES ombor_mahsulotlari(id) ON DELETE RESTRICT,
    harakat_turi    VARCHAR(10) NOT NULL CHECK (harakat_turi IN ('Kirim', 'Chiqim')),
    miqdor          NUMERIC(12,2) NOT NULL CHECK (miqdor > 0),
    narx            NUMERIC(15,2),
    valyuta         VARCHAR(3) CHECK (valyuta IN ('UZS', 'USD')),
    avto_id         INT REFERENCES cars(id) ON DELETE SET NULL,  -- Chiqim qaysi avtoga ishlatilgani (ixtiyoriy)
    tavsif          TEXT,
    kim_kiritdi     INT REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ombor_harakatlari_mahsulot ON ombor_harakatlari (mahsulot_id);
CREATE INDEX idx_ombor_harakatlari_created ON ombor_harakatlari (created_at DESC);
CREATE INDEX idx_ombor_harakatlari_avto ON ombor_harakatlari (avto_id);

-- Yaxlitlik qoidasi (2-qoidaga o'xshash): Chiqim qoldiqdan ortiq bo'lsa
-- bloklanadi; Kirim/Chiqim qabul qilinganda qoldiq avtomatik yangilanadi.
CREATE OR REPLACE FUNCTION apply_ombor_harakat() RETURNS TRIGGER AS $$
DECLARE
  joriy NUMERIC;
BEGIN
  SELECT joriy_qoldiq INTO joriy FROM ombor_mahsulotlari WHERE id = NEW.mahsulot_id FOR UPDATE;

  IF joriy IS NULL THEN
    RAISE EXCEPTION 'mahsulot_id = % topilmadi', NEW.mahsulot_id;
  END IF;

  IF NEW.harakat_turi = 'Chiqim' AND joriy < NEW.miqdor THEN
    RAISE EXCEPTION 'Omborda yetarli mahsulot yo''q: joriy qoldiq %, so''ralgan %', joriy, NEW.miqdor;
  END IF;

  IF NEW.harakat_turi = 'Kirim' THEN
    UPDATE ombor_mahsulotlari SET joriy_qoldiq = joriy_qoldiq + NEW.miqdor WHERE id = NEW.mahsulot_id;
  ELSE
    UPDATE ombor_mahsulotlari SET joriy_qoldiq = joriy_qoldiq - NEW.miqdor WHERE id = NEW.mahsulot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ombor_harakat
    BEFORE INSERT ON ombor_harakatlari
    FOR EACH ROW
    EXECUTE FUNCTION apply_ombor_harakat();

-- Audit (3-qoida): ombor jadvallaridagi barcha o'zgarishlar ham yoziladi
CREATE TRIGGER trg_audit_ombor_mahsulotlari
    AFTER INSERT OR UPDATE OR DELETE ON ombor_mahsulotlari
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_audit_ombor_harakatlari
    AFTER INSERT OR UPDATE OR DELETE ON ombor_harakatlari
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- =====================================================================
-- 18. AUTH XAVFSIZLIGI — brute-force himoyasi
--     5 marta noto'g'ri parol kiritilsa, 15 daqiqaga bloklanadi.
-- =====================================================================
ALTER TABLE users
    ADD COLUMN muvaffaqiyatsiz_urinishlar INT NOT NULL DEFAULT 0,
    ADD COLUMN bloklangan_gacha TIMESTAMP;

-- =====================================================================
-- 19. AUDIT LOG TOZALASH — users jadvali uchun alohida trigger.
--     Login paytida ichki hisoblagichlar (muvaffaqiyatsiz_urinishlar,
--     bloklangan_gacha) yangilanishi HAR safar audit_log'ga keraksiz
--     "UPDATE_USERS" yozuvi qo'shib, jurnalni chalkashtirar edi.
--     Endi FAQAT haqiqiy o'zgarishlar (ism, rol, status, parol) yoziladi.
-- =====================================================================
CREATE OR REPLACE FUNCTION log_audit_trail_users() RETURNS TRIGGER AS $$
DECLARE
  eski_tozalangan JSONB;
  yangi_tozalangan JSONB;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    eski_tozalangan := to_jsonb(OLD) - 'muvaffaqiyatsiz_urinishlar' - 'bloklangan_gacha';
    yangi_tozalangan := to_jsonb(NEW) - 'muvaffaqiyatsiz_urinishlar' - 'bloklangan_gacha';
    IF eski_tozalangan = yangi_tozalangan THEN
      RETURN NEW; -- faqat ichki hisoblagich o'zgargan — bu muhim emas, yozilmaydi
    END IF;
  END IF;

  INSERT INTO audit_log (user_id, harakat, eski_malumot, yangi_malumot)
  VALUES (
    get_current_user_id(),
    TG_OP || '_USERS',
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_users ON users;
CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail_users();

-- =====================================================================
-- 20. AVTO HUJJATLARI (car_documents) — Sug'urta, Texnik ko'rik,
--     Gaz ballon sinovi, Ishonchnoma muddatlari
-- =====================================================================
CREATE TABLE car_documents (
    id                    SERIAL PRIMARY KEY,
    avto_id               INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    hujjat_turi           VARCHAR(30) NOT NULL CHECK (hujjat_turi IN ('OSAGO', 'Texnik korik', 'Gaz ballon sinovi', 'Ishonchnoma')),
    amal_qilish_muddati   DATE NOT NULL,
    izoh                  TEXT,
    kim_kiritdi           INT REFERENCES users(id),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_car_documents_avto ON car_documents (avto_id);
CREATE INDEX idx_car_documents_muddat ON car_documents (amal_qilish_muddati);

CREATE TRIGGER trg_audit_car_documents
    AFTER INSERT OR UPDATE OR DELETE ON car_documents
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Avto operatsion holatiga "Zaxirada" (rezerv) qo'shildi.
-- ("Aktiv" qiymati o'zgarmaydi, lekin interfeysda "Liniyada" deb ko'rsatiladi)
ALTER TYPE car_status ADD VALUE IF NOT EXISTS 'Zaxirada';
