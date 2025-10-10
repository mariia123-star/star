-- =====================================================
-- Миграция таблицы materials с сохранением данных (ИСПРАВЛЕНО)
-- =====================================================

-- Шаг 1: Создаем временную таблицу для backup старых данных
CREATE TABLE IF NOT EXISTS public.materials_backup AS
SELECT * FROM public.materials;

-- Шаг 2: Удаляем старую таблицу
DROP TABLE IF EXISTS public.materials CASCADE;

-- Шаг 3: Создаем таблицу materials с правильной структурой
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

-- Шаг 4: Добавляем комментарии
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

-- Шаг 5: Мигрируем данные из backup
DO $$
DECLARE
    unit_default_id uuid;
    old_material_record record;
    matching_unit_id uuid;
BEGIN
    -- Получаем ID первой доступной единицы измерения
    SELECT id INTO unit_default_id FROM public.units LIMIT 1;

    IF unit_default_id IS NULL THEN
        RAISE WARNING 'Нет единиц измерения - данные не могут быть мигрированы';
        RETURN;
    END IF;

    -- Пытаемся мигрировать старые данные
    FOR old_material_record IN SELECT * FROM public.materials_backup LOOP
        BEGIN
            -- Сбрасываем matching_unit_id для каждой итерации
            matching_unit_id := NULL;

            -- Пытаемся найти unit_id по short_name из старой колонки unit
            IF old_material_record.unit IS NOT NULL THEN
                SELECT id INTO matching_unit_id
                FROM public.units
                WHERE short_name = old_material_record.unit
                LIMIT 1;
            END IF;

            -- Если не нашли, используем дефолтный
            IF matching_unit_id IS NULL THEN
                matching_unit_id := unit_default_id;
            END IF;

            -- Вставляем материал с новой структурой
            INSERT INTO public.materials (
                code,
                name,
                description,
                category,
                unit_id,
                last_purchase_price,
                supplier,
                is_active,
                created_at,
                updated_at
            )
            VALUES (
                old_material_record.code,
                old_material_record.name,
                old_material_record.description,
                COALESCE(old_material_record.category, 'other'),
                matching_unit_id,
                old_material_record.price,
                old_material_record.supplier,
                true,
                COALESCE(old_material_record.created_at, NOW()),
                COALESCE(old_material_record.updated_at, NOW())
            )
            ON CONFLICT (code) DO NOTHING;

            RAISE NOTICE 'Мигрирован материал: %', old_material_record.code;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Ошибка миграции материала %: %', old_material_record.code, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Миграция данных завершена';
END $$;

-- Шаг 6: Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON public.materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON public.materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_code ON public.materials(code);

-- Шаг 7: Отключаем RLS согласно требованиям проекта
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;

-- Шаг 8: Проверяем результат
SELECT
    'Миграция завершена' as message,
    (SELECT COUNT(*) FROM public.materials) as new_materials_count,
    (SELECT COUNT(*) FROM public.materials_backup) as old_materials_count;

-- Опционально: Удаляем backup таблицу если миграция прошла успешно
-- Раскомментируйте следующую строку после проверки что все данные мигрировали корректно:
-- DROP TABLE IF EXISTS public.materials_backup;
