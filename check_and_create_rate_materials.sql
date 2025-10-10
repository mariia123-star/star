-- Проверка и создание таблицы rate_materials_mapping
-- Выполнить в Supabase SQL Editor

-- Проверяем существование таблицы
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'rate_materials_mapping'
);

-- Если таблица не существует, создаем её
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

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_rate_id ON public.rate_materials_mapping(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_material_id ON public.rate_materials_mapping(material_id);

-- RLS отключен согласно требованиям проекта
ALTER TABLE public.rate_materials_mapping DISABLE ROW LEVEL SECURITY;

-- Проверяем что таблица создана
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rate_materials_mapping'
ORDER BY ordinal_position;
