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

-- Комментарии к таблице и полям
COMMENT ON TABLE public.rates IS 'Сборник расценок для строительных работ и материалов';
COMMENT ON COLUMN public.rates.code IS 'Уникальный код расценки';
COMMENT ON COLUMN public.rates.name IS 'Наименование работ или материала';
COMMENT ON COLUMN public.rates.description IS 'Подробное описание расценки';
COMMENT ON COLUMN public.rates.unit_id IS 'Ссылка на единицу измерения';
COMMENT ON COLUMN public.rates.base_price IS 'Базовая цена за единицу измерения';
COMMENT ON COLUMN public.rates.category IS 'Категория расценки';
COMMENT ON COLUMN public.rates.subcategory IS 'Подкатегория расценки';
COMMENT ON COLUMN public.rates.is_active IS 'Признак активности записи';

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE TRIGGER rates_updated_at
    BEFORE UPDATE ON public.rates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS rates_code_idx ON public.rates(code);
CREATE INDEX IF NOT EXISTS rates_category_idx ON public.rates(category);
CREATE INDEX IF NOT EXISTS rates_is_active_idx ON public.rates(is_active);
CREATE INDEX IF NOT EXISTS rates_created_at_idx ON public.rates(created_at);

-- Вставка тестовых данных
INSERT INTO public.rates (code, name, description, unit_id, base_price, category, subcategory) VALUES
('СР-001', 'Кладка кирпича', 'Кладка кирпича в один кирпич на цементно-песчаном растворе', (SELECT id FROM public.units WHERE short_name = 'м²' LIMIT 1), 2500.00, 'строительные_работы', 'каменные_работы'),
('СР-002', 'Монтаж металлоконструкций', 'Монтаж металлических балок и колонн', (SELECT id FROM public.units WHERE short_name = 'т' LIMIT 1), 45000.00, 'строительные_работы', 'металлоконструкции'),
('ОР-001', 'Штукатурка стен', 'Оштукатуривание стен цементно-песчаным раствором', (SELECT id FROM public.units WHERE short_name = 'м²' LIMIT 1), 850.00, 'отделочные_работы', 'штукатурные_работы'),
('ЭМ-001', 'Прокладка кабеля', 'Прокладка силового кабеля в кабель-канале', (SELECT id FROM public.units WHERE short_name = 'м.п.' LIMIT 1), 350.00, 'электромонтажные_работы', 'кабельные_работы'),
('СТ-001', 'Монтаж водопровода', 'Монтаж внутреннего водопровода из полипропиленовых труб', (SELECT id FROM public.units WHERE short_name = 'м.п.' LIMIT 1), 750.00, 'сантехнические_работы', 'водопровод'),
('МАТ-001', 'Кирпич керамический', 'Кирпич керамический рядовой полнотелый М-150', (SELECT id FROM public.units WHERE short_name = 'шт' LIMIT 1), 18.50, 'материалы', 'кирпич'),
('МАТ-002', 'Цемент М-400', 'Цемент портландский М-400', (SELECT id FROM public.units WHERE short_name = 'т' LIMIT 1), 12000.00, 'материалы', 'вяжущие'),
('ОБ-001', 'Кран башенный', 'Аренда башенного крана грузоподъемностью 8 тонн', (SELECT id FROM public.units WHERE short_name = 'шт' LIMIT 1), 150000.00, 'оборудование', 'подъемные_механизмы')
ON CONFLICT (code) DO NOTHING;