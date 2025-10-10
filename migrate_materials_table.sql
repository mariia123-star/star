-- =====================================================
-- Миграция таблицы materials на правильную структуру
-- =====================================================

-- ВАЖНО: Этот скрипт пересоздает таблицу materials!
-- Все существующие данные будут потеряны!
-- Если нужно сохранить данные - сделайте backup перед выполнением!

-- Шаг 1: Удаляем старую таблицу materials
DROP TABLE IF EXISTS public.materials CASCADE;

-- Шаг 2: Создаем таблицу materials с правильной структурой
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

-- Шаг 3: Добавляем комментарии
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

-- Шаг 4: Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON public.materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_code ON public.materials(code);

-- Шаг 5: Отключаем RLS согласно требованиям проекта
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;

-- Шаг 6: Добавляем несколько тестовых материалов
-- Сначала получаем ID единицы измерения "Метр"
DO $$
DECLARE
    unit_meter_id uuid;
    unit_m2_id uuid;
    unit_m3_id uuid;
    unit_kg_id uuid;
    unit_sht_id uuid;
BEGIN
    -- Находим нужные единицы измерения
    SELECT id INTO unit_meter_id FROM public.units WHERE short_name = 'м' LIMIT 1;
    SELECT id INTO unit_m2_id FROM public.units WHERE short_name = 'м²' LIMIT 1;
    SELECT id INTO unit_m3_id FROM public.units WHERE short_name = 'м³' LIMIT 1;
    SELECT id INTO unit_kg_id FROM public.units WHERE short_name = 'кг' LIMIT 1;
    SELECT id INTO unit_sht_id FROM public.units WHERE short_name = 'шт' LIMIT 1;

    -- Если найдены единицы измерения, добавляем тестовые материалы
    IF unit_meter_id IS NOT NULL THEN
        INSERT INTO public.materials (code, name, description, category, unit_id, last_purchase_price, supplier, is_active)
        VALUES
            ('БЖБ-001', 'Бетон М300', 'Бетонная смесь марки М300', 'concrete',
             COALESCE(unit_m3_id, unit_meter_id), 4500.00, 'ООО "БетонСтройМикс"', true),
            ('МК-001', 'Арматура А500С ⌀12мм', 'Стальная арматура класса А500С диаметром 12мм', 'metal',
             COALESCE(unit_kg_id, unit_meter_id), 65.80, 'ОАО "МеталлТорг"', true),
            ('КК-001', 'Кирпич керамический рядовой', 'Кирпич керамический рядовой полнотелый марки М150', 'brick',
             COALESCE(unit_sht_id, unit_meter_id), 12.50, 'ЗАО "КерамСтрой"', true),
            ('ДМ-001', 'Доска обрезная 50x150x6000', 'Доска обрезная хвойная 1 сорт', 'wood',
             COALESCE(unit_m3_id, unit_meter_id), 8500.00, 'ООО "ЛесПром"', true),
            ('КР-001', 'Профнастил С21-1000', 'Профилированный лист оцинкованный', 'roofing',
             COALESCE(unit_m2_id, unit_meter_id), 450.00, 'ООО "КровляПрофи"', true)
        ON CONFLICT (code) DO NOTHING;

        RAISE NOTICE 'Тестовые материалы успешно добавлены';
    ELSE
        RAISE WARNING 'Не найдены единицы измерения - тестовые материалы не добавлены';
    END IF;
END $$;

-- Проверяем результат
SELECT
    'Таблица materials успешно создана' as message,
    COUNT(*) as materials_count
FROM public.materials;
