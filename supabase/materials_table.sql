-- ============================================
-- MATERIALS TABLE SQL SCRIPT
-- ============================================
-- Description: Справочник материалов для корпоративного портала STAR
-- Created: 2025-09-08
-- PostgreSQL compatible script

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE CREATION
-- ============================================

-- Table: public.materials
-- Description: Справочник материалов с категориями, ценами и поставщиками
CREATE TABLE IF NOT EXISTS public.materials (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying(100),
    name character varying(500) NOT NULL,
    description text,
    category character varying(200) NOT NULL,
    subcategory character varying(200),
    unit_id uuid NOT NULL,
    last_purchase_price numeric(15,2) DEFAULT 0,
    supplier character varying(300),
    supplier_article character varying(100),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT materials_pkey PRIMARY KEY (id),
    CONSTRAINT materials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
    CONSTRAINT materials_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT materials_category_not_empty CHECK (length(trim(category)) > 0),
    CONSTRAINT materials_price_non_negative CHECK (last_purchase_price >= 0)
);

-- Table comments
COMMENT ON TABLE public.materials IS 'Справочник материалов с категориями, ценами и поставщиками';
COMMENT ON COLUMN public.materials.id IS 'Уникальный идентификатор материала';
COMMENT ON COLUMN public.materials.code IS 'Код материала (артикул, номенклатурный номер)';
COMMENT ON COLUMN public.materials.name IS 'Наименование материала';
COMMENT ON COLUMN public.materials.description IS 'Подробное описание материала';
COMMENT ON COLUMN public.materials.category IS 'Основная категория материала';
COMMENT ON COLUMN public.materials.subcategory IS 'Подкатегория материала';
COMMENT ON COLUMN public.materials.unit_id IS 'Ссылка на единицу измерения';
COMMENT ON COLUMN public.materials.last_purchase_price IS 'Последняя закупочная цена';
COMMENT ON COLUMN public.materials.supplier IS 'Поставщик материала';
COMMENT ON COLUMN public.materials.supplier_article IS 'Артикул поставщика';
COMMENT ON COLUMN public.materials.notes IS 'Дополнительные заметки';
COMMENT ON COLUMN public.materials.is_active IS 'Признак активности записи';
COMMENT ON COLUMN public.materials.created_at IS 'Дата и время создания записи';
COMMENT ON COLUMN public.materials.updated_at IS 'Дата и время последнего обновления';

-- ============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================

-- Index for name search (most common search operation)
CREATE INDEX idx_materials_name ON public.materials USING gin(name gin_trgm_ops);
CREATE INDEX idx_materials_name_btree ON public.materials USING btree (name);

-- Index for category filtering
CREATE INDEX idx_materials_category ON public.materials USING btree (category);

-- Index for subcategory filtering
CREATE INDEX idx_materials_subcategory ON public.materials USING btree (subcategory);

-- Index for code search (unique material lookup)
CREATE INDEX idx_materials_code ON public.materials USING btree (code) WHERE code IS NOT NULL;

-- Index for active materials filtering
CREATE INDEX idx_materials_is_active ON public.materials USING btree (is_active);

-- Index for sorting by creation date
CREATE INDEX idx_materials_created_at ON public.materials USING btree (created_at DESC);

-- Index for foreign key performance
CREATE INDEX idx_materials_unit_id ON public.materials USING btree (unit_id);

-- Composite index for category + active status
CREATE INDEX idx_materials_category_active ON public.materials USING btree (category, is_active);

-- Index for supplier search
CREATE INDEX idx_materials_supplier ON public.materials USING btree (supplier) WHERE supplier IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for automatic updated_at timestamp update
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON public.materials 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- VIEW CREATION
-- ============================================

-- View: public.v_materials
-- Description: Представление материалов с информацией о единицах измерения
CREATE OR REPLACE VIEW public.v_materials AS
SELECT 
    m.id,
    m.code,
    m.name,
    m.description,
    m.category,
    m.subcategory,
    m.unit_id,
    u.name AS unit_name,
    u.short_name AS unit_short_name,
    m.last_purchase_price,
    m.supplier,
    m.supplier_article,
    m.notes,
    m.is_active,
    m.created_at,
    m.updated_at
FROM public.materials m
    LEFT JOIN public.units u ON (m.unit_id = u.id)
WHERE m.is_active = true
ORDER BY m.category, m.name;

COMMENT ON VIEW public.v_materials IS 'Представление активных материалов с информацией о единицах измерения';

-- ============================================
-- TEST DATA
-- ============================================

-- Insert test data for materials (only if units table has data)
DO $$
DECLARE
    unit_kg uuid;
    unit_m uuid;
    unit_m2 uuid;
    unit_m3 uuid;
    unit_pcs uuid;
    unit_l uuid;
BEGIN
    -- Get unit IDs (assuming they exist from units table)
    SELECT id INTO unit_kg FROM public.units WHERE short_name = 'кг' LIMIT 1;
    SELECT id INTO unit_m FROM public.units WHERE short_name = 'м' LIMIT 1;
    SELECT id INTO unit_m2 FROM public.units WHERE short_name = 'м²' LIMIT 1;
    SELECT id INTO unit_m3 FROM public.units WHERE short_name = 'м³' LIMIT 1;
    SELECT id INTO unit_pcs FROM public.units WHERE short_name = 'шт' LIMIT 1;
    SELECT id INTO unit_l FROM public.units WHERE short_name = 'л' LIMIT 1;

    -- Only insert if we have at least one unit
    IF unit_kg IS NOT NULL OR unit_m IS NOT NULL OR unit_pcs IS NOT NULL THEN
        
        -- Cement and concrete materials
        IF unit_kg IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('CEM001', 'Цемент портландский М400', 'Портландский цемент марки 400 для общестроительных работ', 'Вяжущие материалы', 'Цемент', unit_kg, 8.50, 'ООО "СтройМатериалы"', 'СМ-ЦЕМ-400', 'Соответствует ГОСТ 31108-2003'),
            ('CEM002', 'Цемент портландский М500', 'Портландский цемент марки 500 для ответственных конструкций', 'Вяжущие материалы', 'Цемент', unit_kg, 9.75, 'ООО "СтройМатериалы"', 'СМ-ЦЕМ-500', 'Высокая прочность, быстрое схватывание');
        END IF;

        -- Reinforcement materials
        IF unit_kg IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('ARM001', 'Арматура А500С диаметр 12мм', 'Горячекатаная арматурная сталь периодического профиля', 'Металлоизделия', 'Арматура', unit_kg, 45.20, 'Металлургический завод', 'МЗ-А500-12', 'Класс А500С, ГОСТ 34028-2016'),
            ('ARM002', 'Арматура А500С диаметр 16мм', 'Горячекатаная арматурная сталь периодического профиля', 'Металлоизделия', 'Арматура', unit_kg, 44.80, 'Металлургический завод', 'МЗ-А500-16', 'Класс А500С, для монолитных конструкций');
        END IF;

        -- Insulation materials
        IF unit_m3 IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('INS001', 'Пенополистирол ПСБ-С-25', 'Пенополистирольные плиты для утепления фасадов', 'Теплоизоляция', 'Пенополистирол', unit_m3, 2850.00, 'ТеплоИзол ЛТД', 'ТИ-ПСБ-25', 'Толщина 50мм, плотность 25 кг/м³');
        END IF;

        -- Paint materials
        IF unit_l IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('PAINT001', 'Краска фасадная акриловая белая', 'Акриловая водно-дисперсионная краска для наружных работ', 'Лакокрасочные материалы', 'Фасадные краски', unit_l, 185.00, 'Краски и Покрытия', 'КП-ФАС-БЕЛ', 'Расход 120-150 г/м², морозостойкая');
        END IF;

        -- Fasteners
        IF unit_pcs IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('FAST001', 'Саморез по металлу 4.8x19 мм', 'Саморезы с острым наконечником для крепления к металлу', 'Крепежные изделия', 'Саморезы', unit_pcs, 0.85, 'Крепеж-Сервис', 'КС-САМ-4819', 'Оцинкованные, со сверлящим наконечником'),
            ('FAST002', 'Дюбель распорный 8x60 мм', 'Пластиковый дюбель с распорным механизмом', 'Крепежные изделия', 'Дюбели', unit_pcs, 1.25, 'Крепеж-Сервис', 'КС-ДЮБ-860', 'Для бетона и кирпича, нагрузка до 50 кг');
        END IF;

        -- Electrical materials  
        IF unit_m IS NOT NULL THEN
            INSERT INTO public.materials (code, name, description, category, subcategory, unit_id, last_purchase_price, supplier, supplier_article, notes) VALUES
            ('ELEC001', 'Кабель ВВГ 3x2.5 мм²', 'Силовой кабель с медными жилами в ПВХ изоляции', 'Электротехнические материалы', 'Кабели', unit_m, 45.60, 'ЭлектроКомплект', 'ЭК-ВВГ-3-25', 'Для стационарной прокладки, до 660В');
        END IF;

        RAISE NOTICE 'Тестовые данные для материалов добавлены успешно';
    ELSE
        RAISE NOTICE 'Таблица units пуста или не содержит ожидаемых единиц измерения. Тестовые данные не добавлены.';
    END IF;
END $$;

-- ============================================
-- PERMISSIONS AND GRANTS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT ON public.v_materials TO authenticated;
GRANT USAGE ON SEQUENCE public.materials_id_seq TO authenticated;

-- Grant read-only permissions to anonymous users
GRANT SELECT ON public.v_materials TO anon;

-- ============================================
-- ADDITIONAL FUNCTIONS
-- ============================================

-- Function to get materials by category
CREATE OR REPLACE FUNCTION public.get_materials_by_category(category_name text)
RETURNS TABLE (
    id uuid,
    code varchar(100),
    name varchar(500),
    description text,
    subcategory varchar(200),
    unit_name varchar(100),
    unit_short_name varchar(20),
    last_purchase_price numeric(15,2),
    supplier varchar(300)
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        m.id,
        m.code,
        m.name,
        m.description,
        m.subcategory,
        u.name as unit_name,
        u.short_name as unit_short_name,
        m.last_purchase_price,
        m.supplier
    FROM public.materials m
    LEFT JOIN public.units u ON m.unit_id = u.id
    WHERE m.category = category_name 
      AND m.is_active = true
    ORDER BY m.name;
$$;

COMMENT ON FUNCTION public.get_materials_by_category(text) IS 'Получает список активных материалов по категории';

-- Function to search materials by name
CREATE OR REPLACE FUNCTION public.search_materials(search_text text)
RETURNS TABLE (
    id uuid,
    code varchar(100),
    name varchar(500),
    category varchar(200),
    unit_short_name varchar(20),
    last_purchase_price numeric(15,2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        m.id,
        m.code,
        m.name,
        m.category,
        u.short_name as unit_short_name,
        m.last_purchase_price
    FROM public.materials m
    LEFT JOIN public.units u ON m.unit_id = u.id
    WHERE m.is_active = true 
      AND (
          m.name ILIKE '%' || search_text || '%' 
          OR m.code ILIKE '%' || search_text || '%'
          OR m.description ILIKE '%' || search_text || '%'
      )
    ORDER BY 
        CASE WHEN m.name ILIKE search_text || '%' THEN 1 ELSE 2 END,
        m.name;
$$;

COMMENT ON FUNCTION public.search_materials(text) IS 'Поиск материалов по наименованию, коду или описанию';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'MATERIALS TABLE SETUP COMPLETED SUCCESSFULLY';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Created: materials table with constraints';
    RAISE NOTICE 'Created: 9 performance indexes';
    RAISE NOTICE 'Created: v_materials view';
    RAISE NOTICE 'Created: update trigger';
    RAISE NOTICE 'Created: helper functions';
    RAISE NOTICE 'Added: test data (if units available)';
    RAISE NOTICE 'Set: appropriate permissions';
    RAISE NOTICE '=================================================';
END $$;