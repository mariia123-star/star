-- БЫСТРОЕ ИСПРАВЛЕНИЕ: Выполните этот код в Supabase SQL Editor

-- 1. Создание таблицы для связи расценок и материалов
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

-- 2. Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_rate_id ON public.rate_materials_mapping(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_material_id ON public.rate_materials_mapping(material_id);

-- 3. КРИТИЧЕСКИ ВАЖНО: Отключение RLS
ALTER TABLE public.rate_materials_mapping DISABLE ROW LEVEL SECURITY;

-- 4. Проверка создания таблицы
SELECT 'Таблица создана успешно' as result, COUNT(*) as existing_records FROM public.rate_materials_mapping;