-- Database Schema SQL Export
-- Generated: 2025-09-06T10:53:55.863203
-- Database: postgres
-- Host: aws-1-eu-north-1.pooler.supabase.com

-- ============================================
-- TABLES
-- ============================================

-- Table: public.tender_estimates
-- Description: Тендерные сметы (документы)
CREATE TABLE IF NOT EXISTS public.tender_estimates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    materials character varying(500) NOT NULL,
    works character varying(500) NOT NULL,
    quantity numeric(15,4) NOT NULL DEFAULT 0,
    unit_id uuid NOT NULL,
    unit_price numeric(15,2) DEFAULT 0,
    total_price numeric(15,2) DEFAULT 0,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tender_estimates_pkey PRIMARY KEY (id),
    CONSTRAINT tender_estimates_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.tender_estimates IS 'Тендерные сметы (документы)';
COMMENT ON COLUMN public.tender_estimates.materials IS 'Наименование материалов';
COMMENT ON COLUMN public.tender_estimates.works IS 'Описание выполняемых работ';
COMMENT ON COLUMN public.tender_estimates.quantity IS 'Количество с точностью до 4 знаков после запятой';
COMMENT ON COLUMN public.tender_estimates.unit_price IS 'Цена за единицу измерения';
COMMENT ON COLUMN public.tender_estimates.total_price IS 'Общая стоимость (рассчитывается автоматически)';

-- Table: public.units
-- Description: Справочник единиц измерения
CREATE TABLE IF NOT EXISTS public.units (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying(100) NOT NULL,
    short_name character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT units_name_key UNIQUE (name),
    CONSTRAINT units_pkey PRIMARY KEY (id),
    CONSTRAINT units_short_name_key UNIQUE (short_name)
);
COMMENT ON TABLE public.units IS 'Справочник единиц измерения';
COMMENT ON COLUMN public.units.name IS 'Полное наименование единицы измерения';
COMMENT ON COLUMN public.units.short_name IS 'Краткое обозначение единицы измерения';
COMMENT ON COLUMN public.units.is_active IS 'Признак активности записи';

-- Table: public.materials
-- Description: Справочник материалов
CREATE TABLE IF NOT EXISTS public.materials (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying(50) NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    category character varying(100) NOT NULL DEFAULT 'other',
    unit_id uuid NOT NULL,
    last_purchase_price numeric(15,2),
    supplier character varying(255),
    supplier_article character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT materials_pkey PRIMARY KEY (id),
    CONSTRAINT materials_code_key UNIQUE (code),
    CONSTRAINT materials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);

COMMENT ON TABLE public.materials IS 'Справочник материалов';
COMMENT ON COLUMN public.materials.code IS 'Уникальный код материала';
COMMENT ON COLUMN public.materials.name IS 'Наименование материала';
COMMENT ON COLUMN public.materials.description IS 'Подробное описание материала';
COMMENT ON COLUMN public.materials.category IS 'Категория материала (concrete, metal, brick, etc.)';
COMMENT ON COLUMN public.materials.unit_id IS 'Ссылка на единицу измерения';
COMMENT ON COLUMN public.materials.last_purchase_price IS 'Последняя цена закупки за единицу измерения';
COMMENT ON COLUMN public.materials.supplier IS 'Поставщик материала';
COMMENT ON COLUMN public.materials.supplier_article IS 'Артикул поставщика';
COMMENT ON COLUMN public.materials.is_active IS 'Признак активности материала';

-- Создание таблицы rates (Сборник расценок)
CREATE TABLE IF NOT EXISTS public.rates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying(50) NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    unit_id uuid NOT NULL,
    base_price numeric(15,2) NOT NULL DEFAULT 0,
    category character varying(100) NOT NULL,
    subcategory character varying(200),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rates_pkey PRIMARY KEY (id),
    CONSTRAINT rates_code_key UNIQUE (code),
    CONSTRAINT rates_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);

COMMENT ON TABLE public.rates IS 'Сборник расценок на материалы и работы';
COMMENT ON COLUMN public.rates.code IS 'Уникальный код расценки';
COMMENT ON COLUMN public.rates.name IS 'Наименование расценки';
COMMENT ON COLUMN public.rates.description IS 'Подробное описание расценки';
COMMENT ON COLUMN public.rates.unit_id IS 'Ссылка на единицу измерения';
COMMENT ON COLUMN public.rates.base_price IS 'Базовая цена за единицу измерения';
COMMENT ON COLUMN public.rates.category IS 'Категория расценки (материал, работы и т.д.)';
COMMENT ON COLUMN public.rates.subcategory IS 'Подкатегория расценки';
COMMENT ON COLUMN public.rates.is_active IS 'Признак активности расценки';


-- ============================================
-- VIEWS
-- ============================================

-- View: public.v_tender_estimates
CREATE OR REPLACE VIEW public.v_tender_estimates AS
 SELECT te.id,
    te.materials,
    te.works,
    te.quantity,
    u.name AS unit_name,
    u.short_name AS unit_short_name,
    te.unit_price,
    te.total_price,
    te.notes,
    te.created_at,
    te.updated_at
   FROM (tender_estimates te
     JOIN units u ON ((te.unit_id = u.id)))
  WHERE (te.is_active = true)
  ORDER BY te.created_at DESC;


-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: public.calculate_total_price
CREATE OR REPLACE FUNCTION public.calculate_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Автоматически рассчитываем общую стоимость
    IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.total_price = NEW.unit_price * NEW.quantity;
    END IF;
    RETURN NEW;
END;
$function$


-- Function: public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$



-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: calculate_tender_estimates_total on public.tender_estimates
CREATE TRIGGER calculate_tender_estimates_total BEFORE INSERT OR UPDATE ON public.tender_estimates FOR EACH ROW EXECUTE FUNCTION calculate_total_price()

-- Trigger: update_tender_estimates_updated_at on public.tender_estimates
CREATE TRIGGER update_tender_estimates_updated_at BEFORE UPDATE ON public.tender_estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

-- Trigger: update_units_updated_at on public.units
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()

-- Trigger: update_materials_updated_at on public.materials
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()


-- ============================================
-- INDEXES
-- ============================================

-- Index on public.tender_estimates
CREATE INDEX idx_tender_estimates_created_at ON public.tender_estimates USING btree (created_at DESC);

-- Index on public.tender_estimates
CREATE INDEX idx_tender_estimates_is_active ON public.tender_estimates USING btree (is_active);

-- Index on public.tender_estimates
CREATE INDEX idx_tender_estimates_unit_id ON public.tender_estimates USING btree (unit_id);

-- Index on public.units
CREATE INDEX idx_units_is_active ON public.units USING btree (is_active);

-- Index on public.units
CREATE INDEX idx_units_name ON public.units USING btree (name);

-- Index on public.units
CREATE INDEX idx_units_short_name ON public.units USING btree (short_name);

-- Index on public.units
CREATE UNIQUE INDEX units_name_key ON public.units USING btree (name);

-- Index on public.units
CREATE UNIQUE INDEX units_short_name_key ON public.units USING btree (short_name);

-- Index on public.materials
CREATE INDEX idx_materials_created_at ON public.materials USING btree (created_at DESC);

-- Index on public.materials
CREATE INDEX idx_materials_is_active ON public.materials USING btree (is_active);

-- Index on public.materials
CREATE INDEX idx_materials_unit_id ON public.materials USING btree (unit_id);

-- Index on public.materials
CREATE INDEX idx_materials_category ON public.materials USING btree (category);

-- Index on public.materials
CREATE INDEX idx_materials_name ON public.materials USING btree (name);

-- Index on public.materials
CREATE UNIQUE INDEX materials_code_key ON public.materials USING btree (code);


-- ============================================
-- ROLES AND PRIVILEGES
-- ============================================

-- Role: anon
CREATE ROLE anon;
-- Members of role anon:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for anon:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO anon;
-- Schema privileges for anon:
-- GRANT USAGE ON SCHEMA auth TO anon;
-- GRANT USAGE ON SCHEMA extensions TO anon;
-- GRANT USAGE ON SCHEMA graphql TO anon;
-- GRANT USAGE ON SCHEMA graphql_public TO anon;
-- GRANT USAGE ON SCHEMA public TO anon;
-- GRANT USAGE ON SCHEMA realtime TO anon;
-- GRANT USAGE ON SCHEMA storage TO anon;

-- Role: authenticated
CREATE ROLE authenticated;
-- Members of role authenticated:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for authenticated:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO authenticated;
-- Schema privileges for authenticated:
-- GRANT USAGE ON SCHEMA auth TO authenticated;
-- GRANT USAGE ON SCHEMA extensions TO authenticated;
-- GRANT USAGE ON SCHEMA graphql TO authenticated;
-- GRANT USAGE ON SCHEMA graphql_public TO authenticated;
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT USAGE ON SCHEMA realtime TO authenticated;
-- GRANT USAGE ON SCHEMA storage TO authenticated;

-- Role: authenticator
CREATE ROLE authenticator WITH LOGIN NOINHERIT;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
-- Members of role authenticator:
-- - postgres (WITH ADMIN OPTION)
-- - supabase_storage_admin
-- Database privileges for authenticator:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO authenticator;
-- Schema privileges for authenticator:
-- GRANT USAGE ON SCHEMA public TO authenticator;

-- Role: dashboard_user
CREATE ROLE dashboard_user WITH CREATEDB CREATEROLE REPLICATION;
-- Database privileges for dashboard_user:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO dashboard_user;
-- Schema privileges for dashboard_user:
-- GRANT CREATE, USAGE ON SCHEMA auth TO dashboard_user;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO dashboard_user;
-- GRANT USAGE ON SCHEMA public TO dashboard_user;
-- GRANT CREATE, USAGE ON SCHEMA storage TO dashboard_user;

-- Role: postgres
CREATE ROLE postgres WITH CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
GRANT anon TO postgres WITH ADMIN OPTION;
GRANT authenticated TO postgres WITH ADMIN OPTION;
GRANT authenticator TO postgres WITH ADMIN OPTION;
GRANT pg_create_subscription TO postgres;
GRANT pg_monitor TO postgres WITH ADMIN OPTION;
GRANT pg_read_all_data TO postgres WITH ADMIN OPTION;
GRANT pg_signal_backend TO postgres WITH ADMIN OPTION;
GRANT service_role TO postgres WITH ADMIN OPTION;
GRANT supabase_realtime_admin TO postgres;
-- Database privileges for postgres:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO postgres;
-- Schema privileges for postgres:
-- GRANT USAGE ON SCHEMA auth TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO postgres;
-- GRANT USAGE ON SCHEMA graphql TO postgres;
-- GRANT USAGE ON SCHEMA graphql_public TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_23 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_3 TO postgres;
-- GRANT USAGE ON SCHEMA pg_temp_46 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_23 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_3 TO postgres;
-- GRANT USAGE ON SCHEMA pg_toast_temp_46 TO postgres;
-- GRANT USAGE ON SCHEMA pgbouncer TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA public TO postgres;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO postgres;
-- GRANT USAGE ON SCHEMA storage TO postgres;
-- GRANT USAGE ON SCHEMA vault TO postgres;

-- Role: service_role
CREATE ROLE service_role WITH BYPASSRLS;
-- Members of role service_role:
-- - authenticator
-- - postgres (WITH ADMIN OPTION)
-- Database privileges for service_role:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO service_role;
-- Schema privileges for service_role:
-- GRANT USAGE ON SCHEMA auth TO service_role;
-- GRANT USAGE ON SCHEMA extensions TO service_role;
-- GRANT USAGE ON SCHEMA graphql TO service_role;
-- GRANT USAGE ON SCHEMA graphql_public TO service_role;
-- GRANT USAGE ON SCHEMA public TO service_role;
-- GRANT USAGE ON SCHEMA realtime TO service_role;
-- GRANT USAGE ON SCHEMA storage TO service_role;
-- GRANT USAGE ON SCHEMA vault TO service_role;

-- Role: supabase_admin
CREATE ROLE supabase_admin WITH SUPERUSER CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS;
-- Database privileges for supabase_admin:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO supabase_admin;
-- Schema privileges for supabase_admin:
-- GRANT CREATE, USAGE ON SCHEMA auth TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA extensions TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA graphql TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA graphql_public TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_23 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_3 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_temp_46 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_23 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_3 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pg_toast_temp_46 TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA pgbouncer TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA public TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA storage TO supabase_admin;
-- GRANT CREATE, USAGE ON SCHEMA vault TO supabase_admin;

-- Role: supabase_auth_admin
CREATE ROLE supabase_auth_admin WITH CREATEROLE LOGIN NOINHERIT;
-- Database privileges for supabase_auth_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_auth_admin;
-- Schema privileges for supabase_auth_admin:
-- GRANT CREATE, USAGE ON SCHEMA auth TO supabase_auth_admin;
-- GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Role: supabase_etl_admin
CREATE ROLE supabase_etl_admin WITH LOGIN REPLICATION;
GRANT pg_read_all_data TO supabase_etl_admin;
-- Database privileges for supabase_etl_admin:
-- GRANT CONNECT, CREATE, TEMP ON DATABASE postgres TO supabase_etl_admin;
-- Schema privileges for supabase_etl_admin:
-- GRANT USAGE ON SCHEMA auth TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA extensions TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA graphql TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA graphql_public TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_temp_23 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_temp_3 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_temp_46 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_toast_temp_23 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_toast_temp_3 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pg_toast_temp_46 TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA pgbouncer TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA public TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA realtime TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA storage TO supabase_etl_admin;
-- GRANT USAGE ON SCHEMA vault TO supabase_etl_admin;

-- Role: supabase_read_only_user
CREATE ROLE supabase_read_only_user WITH LOGIN BYPASSRLS;
GRANT pg_read_all_data TO supabase_read_only_user;
-- Database privileges for supabase_read_only_user:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_read_only_user;
-- Schema privileges for supabase_read_only_user:
-- GRANT USAGE ON SCHEMA auth TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA extensions TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA graphql TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA graphql_public TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_23 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_3 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_temp_46 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_23 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_3 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pg_toast_temp_46 TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA pgbouncer TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA public TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA realtime TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA storage TO supabase_read_only_user;
-- GRANT USAGE ON SCHEMA vault TO supabase_read_only_user;

-- Role: supabase_realtime_admin
CREATE ROLE supabase_realtime_admin WITH NOINHERIT;
-- Members of role supabase_realtime_admin:
-- - postgres
-- Database privileges for supabase_realtime_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_realtime_admin;
-- Schema privileges for supabase_realtime_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_realtime_admin;
-- GRANT CREATE, USAGE ON SCHEMA realtime TO supabase_realtime_admin;

-- Role: supabase_replication_admin
CREATE ROLE supabase_replication_admin WITH LOGIN REPLICATION;
-- Database privileges for supabase_replication_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_replication_admin;
-- Schema privileges for supabase_replication_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_replication_admin;

-- Role: supabase_storage_admin
CREATE ROLE supabase_storage_admin WITH CREATEROLE LOGIN NOINHERIT;
GRANT authenticator TO supabase_storage_admin;
-- Database privileges for supabase_storage_admin:
-- GRANT CONNECT, TEMP ON DATABASE postgres TO supabase_storage_admin;
-- Schema privileges for supabase_storage_admin:
-- GRANT USAGE ON SCHEMA public TO supabase_storage_admin;
-- GRANT CREATE, USAGE ON SCHEMA storage TO supabase_storage_admin;

-- ============================================
-- INITIAL DATA / ТЕСТОВЫЕ ДАННЫЕ
-- ============================================

-- Тестовые данные для единиц измерения
INSERT INTO public.units (id, name, short_name, description, is_active) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'штука', 'шт', 'Единица для штучного товара', true),
  ('22222222-2222-2222-2222-222222222222', 'метр квадратный', 'м²', 'Единица площади', true),
  ('33333333-3333-3333-3333-333333333333', 'метр кубический', 'м³', 'Единица объема', true),
  ('44444444-4444-4444-4444-444444444444', 'метр погонный', 'м.п.', 'Единица длины для погонных материалов', true),
  ('55555555-5555-5555-5555-555555555555', 'килограмм', 'кг', 'Единица массы', true),
  ('66666666-6666-6666-6666-666666666666', 'тонна', 'т', 'Единица массы для больших объемов', true),
  ('77777777-7777-7777-7777-777777777777', 'литр', 'л', 'Единица объема жидкости', true),
  ('88888888-8888-8888-8888-888888888888', 'метр', 'м', 'Единица длины', true),
  ('99999999-9999-9999-9999-999999999999', 'комплект', 'комп', 'Единица для комплектов', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'упаковка', 'упак', 'Единица для упакованных товаров', true)
ON CONFLICT (id) DO NOTHING;

-- Тестовые данные для расценок
INSERT INTO public.rates (id, code, name, description, unit_id, base_price, category, subcategory, is_active) 
VALUES 
  ('r1111111-1111-1111-1111-111111111111', 'СР-001', 'Кирпич керамический лицевой', 'Кирпич керамический лицевой одинарный М150', '11111111-1111-1111-1111-111111111111', 25.50, 'материал', 'кирпич', true),
  ('r2222222-2222-2222-2222-222222222222', 'СР-002', 'Цемент М500', 'Цемент портландский М500 Д0', '55555555-5555-5555-5555-555555555555', 450.00, 'материал', 'вяжущие', true),
  ('r3333333-3333-3333-3333-333333333333', 'СР-003', 'Песок строительный', 'Песок строительный речной фр. 0-5 мм', '33333333-3333-3333-3333-333333333333', 1200.00, 'материал', 'нерудные', true),
  ('r4444444-4444-4444-4444-444444444444', 'СР-004', 'Щебень гранитный фр. 5-20', 'Щебень гранитный фракция 5-20 мм', '33333333-3333-3333-3333-333333333333', 1800.00, 'материал', 'нерудные', true),
  ('r5555555-5555-5555-5555-555555555555', 'ОР-001', 'Кладка кирпичная', 'Кладка стен из керамического кирпича на цементном растворе', '33333333-3333-3333-3333-333333333333', 3500.00, 'общестроительные_работы', 'каменные работы', true),
  ('r6666666-6666-6666-6666-666666666666', 'ОР-002', 'Устройство стяжки', 'Устройство цементно-песчаной стяжки толщиной 50 мм', '22222222-2222-2222-2222-222222222222', 450.00, 'общестроительные_работы', 'бетонные работы', true),
  ('r7777777-7777-7777-7777-777777777777', 'ФР-001', 'Штукатурка фасадная', 'Оштукатуривание фасадов цементно-известковым раствором', '22222222-2222-2222-2222-222222222222', 650.00, 'фасадные_работы', 'штукатурные работы', true),
  ('r8888888-8888-8888-8888-888888888888', 'ЭР-001', 'Прокладка кабеля', 'Прокладка кабеля ВВГ в гофротрубе', '88888888-8888-8888-8888-888888888888', 120.00, 'электромонтажные_работы', 'кабельные работы', true),
  ('r9999999-9999-9999-9999-999999999999', 'МР-001', 'Установка радиатора', 'Установка радиатора отопления чугунного', '11111111-1111-1111-1111-111111111111', 2500.00, 'механические_работы', 'отопление', true),
  ('raaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'БР-001', 'Благоустройство территории', 'Планировка территории с подсыпкой и трамбовкой', '22222222-2222-2222-2222-222222222222', 180.00, 'благоустройство', 'земляные работы', true)
ON CONFLICT (id) DO NOTHING;

-- Тестовые данные для материалов
INSERT INTO public.materials (id, code, name, description, category, unit_id, last_purchase_price, supplier, supplier_article, is_active) 
VALUES 
  ('m1111111-1111-1111-1111-111111111111', 'МТ-001', 'Кирпич керамический обыкновенный', 'Кирпич керамический обыкновенный полнотелый одинарный М100', 'brick', '11111111-1111-1111-1111-111111111111', 18.50, 'ООО Кирпичный завод', 'КЗ-100-О', true),
  ('m2222222-2222-2222-2222-222222222222', 'МТ-002', 'Цемент ПЦ 500-Д0', 'Цемент портландский ПЦ 500-Д0 в мешках по 50 кг', 'concrete', '55555555-5555-5555-5555-555555555555', 420.00, 'ОАО Цементный завод', 'ЦЗ-500-50', true),
  ('m3333333-3333-3333-3333-333333333333', 'МТ-003', 'Песок карьерный', 'Песок карьерный строительный фракция 0-5 мм', 'concrete', '33333333-3333-3333-3333-333333333333', 950.00, 'ИП Песков С.А.', 'ПК-05', true),
  ('m4444444-4444-4444-4444-444444444444', 'МТ-004', 'Арматура А500С диаметр 12', 'Арматурная сталь класса А500С диаметр 12 мм', 'metal', '55555555-5555-5555-5555-555555555555', 52000.00, 'ММК', 'А500С-12', true),
  ('m5555555-5555-5555-5555-555555555555', 'МТ-005', 'Доска обрезная 25x150', 'Доска обрезная сосна 25x150x6000 мм сорт 1', 'wood', '33333333-3333-3333-3333-333333333333', 15000.00, 'Лесопильня "Сосна"', 'ДО-25х150-6', true),
  ('m6666666-6666-6666-6666-666666666666', 'МТ-006', 'Рубероид РКП-350', 'Рубероид кровельный подкладочный РКП-350', 'roofing', '22222222-2222-2222-2222-222222222222', 85.00, 'Кровельные материалы', 'РКП-350-15', true),
  ('m7777777-7777-7777-7777-777777777777', 'МТ-007', 'Минвата Роклайт 100 мм', 'Теплоизоляция минераловатная Роклайт толщина 100 мм', 'insulation', '22222222-2222-2222-2222-222222222222', 180.00, 'ROCKWOOL', 'РЛ-100-1200х600', true),
  ('m8888888-8888-8888-8888-888888888888', 'МТ-008', 'Плитка керамическая 300x300', 'Плитка керамическая напольная 300x300 мм белая', 'finishing', '22222222-2222-2222-2222-222222222222', 450.00, 'Керамика-М', 'КП-300-Б', true),
  ('m9999999-9999-9999-9999-999999999999', 'МТ-009', 'Труба ПВХ 110 мм', 'Труба канализационная ПВХ диаметр 110 мм длина 3 м', 'plumbing', '88888888-8888-8888-8888-888888888888', 850.00, 'Пластик-Труба', 'ПВХ-110-3', true),
  ('maaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'МТ-010', 'Кабель ВВГ 3x2.5', 'Кабель силовой ВВГ 3x2.5 мм² медный', 'electrical', '88888888-8888-8888-8888-888888888888', 120.00, 'Электро-Кабель', 'ВВГ-3х2.5', true)
ON CONFLICT (id) DO NOTHING;
