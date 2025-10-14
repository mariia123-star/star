-- Добавляем поле rate_category в таблицу materials для связи с расценками
-- Это поле будет хранить название из subcategory расценки

ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS rate_category character varying(200);

COMMENT ON COLUMN public.materials.rate_category IS 'Категория расценки для автоматической связи материала с расценками (значение из subcategory)';

-- Создаём индекс для ускорения поиска по категории расценок
CREATE INDEX IF NOT EXISTS idx_materials_rate_category ON public.materials(rate_category);

-- Обновляем триггер для updated_at если нужно
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер к таблице materials если его нет
DROP TRIGGER IF EXISTS update_materials_modtime ON public.materials;
CREATE TRIGGER update_materials_modtime
    BEFORE UPDATE ON public.materials
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
