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
