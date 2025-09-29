-- Миграция для расширения структуры tender_estimates под полную тендерную смету
-- Добавляем поля из структуры файла tets1.csv

-- Добавляем новые колонки
ALTER TABLE public.tender_estimates 
ADD COLUMN IF NOT EXISTS material_type character varying(50), -- Тип материала (Основ/Вспом)
ADD COLUMN IF NOT EXISTS coefficient numeric(10,4) DEFAULT 1, -- Коэффициент расхода материала
ADD COLUMN IF NOT EXISTS work_price numeric(15,2) DEFAULT 0, -- Цена работы отдельно
ADD COLUMN IF NOT EXISTS material_price numeric(15,2) DEFAULT 0, -- Цена материала отдельно
ADD COLUMN IF NOT EXISTS delivery_cost numeric(15,2) DEFAULT 0, -- Стоимость доставки
ADD COLUMN IF NOT EXISTS record_type character varying(20) DEFAULT 'work', -- Тип записи: 'work', 'material', 'summary'
ADD COLUMN IF NOT EXISTS project_id uuid; -- Связь с проектом

-- Добавляем комментарии к новым колонкам
COMMENT ON COLUMN public.tender_estimates.material_type IS 'Тип материала (Основной/Вспомогательный)';
COMMENT ON COLUMN public.tender_estimates.coefficient IS 'Коэффициент расхода материала';
COMMENT ON COLUMN public.tender_estimates.work_price IS 'Цена работы за единицу измерения';
COMMENT ON COLUMN public.tender_estimates.material_price IS 'Цена материала с НДС без доставки';
COMMENT ON COLUMN public.tender_estimates.delivery_cost IS 'Стоимость доставки материала';
COMMENT ON COLUMN public.tender_estimates.record_type IS 'Тип записи: work (работа), material (материал), summary (итог)';
COMMENT ON COLUMN public.tender_estimates.project_id IS 'Ссылка на проект';

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tender_estimates_record_type ON public.tender_estimates(record_type);
CREATE INDEX IF NOT EXISTS idx_tender_estimates_project_id ON public.tender_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_tender_estimates_is_active ON public.tender_estimates(is_active);

-- Добавляем ограничение для record_type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_record_type') THEN
        ALTER TABLE public.tender_estimates 
        ADD CONSTRAINT check_record_type 
        CHECK (record_type IN ('work', 'material', 'summary'));
    END IF;
END $$;

-- Обновляем существующие записи
UPDATE public.tender_estimates 
SET record_type = CASE 
    WHEN materials != '' AND works = '' THEN 'material'
    WHEN works != '' AND materials = '' THEN 'work'
    ELSE 'work'
END
WHERE record_type IS NULL;

-- Создаем функцию для автоматического расчета total_price
CREATE OR REPLACE FUNCTION calculate_tender_estimate_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Для работ: total_price = quantity * work_price
    -- Для материалов: total_price = quantity * coefficient * (material_price + delivery_cost)
    IF NEW.record_type = 'work' THEN
        NEW.total_price = NEW.quantity * COALESCE(NEW.work_price, NEW.unit_price, 0);
    ELSIF NEW.record_type = 'material' THEN
        NEW.total_price = NEW.quantity * NEW.coefficient * 
                         (COALESCE(NEW.material_price, NEW.unit_price, 0) + COALESCE(NEW.delivery_cost, 0));
    END IF;
    
    -- Обновляем unit_price для обратной совместимости
    IF NEW.record_type = 'work' THEN
        NEW.unit_price = NEW.work_price;
    ELSIF NEW.record_type = 'material' THEN
        NEW.unit_price = NEW.material_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического расчета
DROP TRIGGER IF EXISTS trigger_calculate_tender_estimate_total ON public.tender_estimates;
CREATE TRIGGER trigger_calculate_tender_estimate_total
    BEFORE INSERT OR UPDATE ON public.tender_estimates
    FOR EACH ROW
    EXECUTE FUNCTION calculate_tender_estimate_total();

-- Обновляем комментарий к таблице
COMMENT ON TABLE public.tender_estimates IS 'Расширенная структура тендерных смет с поддержкой работ, материалов и расчетов';