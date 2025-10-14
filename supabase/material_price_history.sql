-- Таблица для истории изменения цен материалов
CREATE TABLE IF NOT EXISTS public.material_price_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    material_id uuid NOT NULL,
    price numeric(15,2) NOT NULL,
    changed_by uuid,
    source varchar(50) DEFAULT 'manual',
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT material_price_history_pkey PRIMARY KEY (id),
    CONSTRAINT material_price_history_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.material_price_history IS 'История изменения цен материалов';
COMMENT ON COLUMN public.material_price_history.material_id IS 'ID материала';
COMMENT ON COLUMN public.material_price_history.price IS 'Цена материала на момент изменения';
COMMENT ON COLUMN public.material_price_history.changed_by IS 'ID пользователя, внесшего изменение';
COMMENT ON COLUMN public.material_price_history.source IS 'Источник изменения (manual, estimate_calculator, import)';
COMMENT ON COLUMN public.material_price_history.notes IS 'Дополнительные заметки';

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_material_price_history_material_id ON public.material_price_history(material_id);
CREATE INDEX IF NOT EXISTS idx_material_price_history_created_at ON public.material_price_history(created_at DESC);

-- RLS отключен согласно требованиям проекта
ALTER TABLE public.material_price_history DISABLE ROW LEVEL SECURITY;
