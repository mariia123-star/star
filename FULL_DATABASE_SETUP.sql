-- ПОЛНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ
-- Выполните этот код в Supabase SQL Editor для создания всех необходимых таблиц

-- 1. Создание таблицы единиц измерения
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

-- 2. Создание таблицы материалов
CREATE TABLE IF NOT EXISTS public.materials (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying(50) NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    category character varying(100) NOT NULL DEFAULT 'other',
    unit_id uuid NOT NULL,
    unit_name character varying(100),
    unit_short_name character varying(20),
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

-- 3. Создание таблицы расценок
CREATE TABLE IF NOT EXISTS public.rates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying(50) NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    unit_id uuid NOT NULL,
    unit_name character varying(100),
    unit_short_name character varying(20),
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

-- 4. Создание таблицы связи расценок с материалами
CREATE TABLE IF NOT EXISTS public.rate_materials_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    rate_id uuid NOT NULL,
    material_id uuid NOT NULL,
    consumption numeric(15,3) NOT NULL DEFAULT 1,
    unit_price numeric(15,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rate_materials_mapping_pkey PRIMARY KEY (id),
    CONSTRAINT rate_materials_mapping_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE CASCADE,
    CONSTRAINT rate_materials_mapping_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE,
    CONSTRAINT rate_materials_mapping_unique UNIQUE (rate_id, material_id)
);

COMMENT ON TABLE public.rate_materials_mapping IS 'Связь расценок с материалами';
COMMENT ON COLUMN public.rate_materials_mapping.rate_id IS 'ID расценки';
COMMENT ON COLUMN public.rate_materials_mapping.material_id IS 'ID материала';
COMMENT ON COLUMN public.rate_materials_mapping.consumption IS 'Расход материала';
COMMENT ON COLUMN public.rate_materials_mapping.unit_price IS 'Цена за единицу на момент добавления';

-- 5. Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON public.materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);

CREATE INDEX IF NOT EXISTS idx_rates_unit_id ON public.rates(unit_id);
CREATE INDEX IF NOT EXISTS idx_rates_category ON public.rates(category);
CREATE INDEX IF NOT EXISTS idx_rates_is_active ON public.rates(is_active);

CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_rate_id ON public.rate_materials_mapping(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_material_id ON public.rate_materials_mapping(material_id);

-- 6. КРИТИЧЕСКИ ВАЖНО: Отключение RLS для всех таблиц
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_materials_mapping DISABLE ROW LEVEL SECURITY;

-- 7. Вставка базовых данных

-- Базовые единицы измерения
INSERT INTO public.units (name, short_name, description) VALUES
('Штука', 'шт', 'Единица штук')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.units (name, short_name, description) VALUES
('Квадратный метр', 'м²', 'Квадратный метр площади')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.units (name, short_name, description) VALUES
('Кубический метр', 'м³', 'Кубический метр объема')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.units (name, short_name, description) VALUES
('Погонный метр', 'п.м', 'Погонный метр длины')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.units (name, short_name, description) VALUES
('Килограмм', 'кг', 'Килограмм массы')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.units (name, short_name, description) VALUES
('Тонна', 'т', 'Тонна массы')
ON CONFLICT (short_name) DO NOTHING;

-- 8. Проверка создания таблиц
SELECT 
    'units' as table_name, COUNT(*) as records 
FROM public.units
UNION ALL
SELECT 
    'materials' as table_name, COUNT(*) as records 
FROM public.materials
UNION ALL
SELECT 
    'rates' as table_name, COUNT(*) as records 
FROM public.rates
UNION ALL
SELECT 
    'rate_materials_mapping' as table_name, COUNT(*) as records 
FROM public.rate_materials_mapping;

-- Сообщение об успешном создании
SELECT '✅ Все таблицы созданы успешно! Можно использовать сборник расценок.' as status;