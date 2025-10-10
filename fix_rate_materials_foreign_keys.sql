-- Проверка и исправление схемы rate_materials_mapping

-- 1. Проверяем существование таблицы
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'rate_materials_mapping'
) AS table_exists;

-- 2. Проверяем существующие foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'rate_materials_mapping';

-- 3. Удаляем старые constraint'ы если они есть (но неправильные)
DO $$
BEGIN
  -- Удаляем старый constraint на material_id если он существует
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rate_materials_mapping_material_id_fkey'
    AND table_name = 'rate_materials_mapping'
  ) THEN
    ALTER TABLE public.rate_materials_mapping
    DROP CONSTRAINT rate_materials_mapping_material_id_fkey;
  END IF;

  -- Удаляем старый constraint на rate_id если он существует
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rate_materials_mapping_rate_id_fkey'
    AND table_name = 'rate_materials_mapping'
  ) THEN
    ALTER TABLE public.rate_materials_mapping
    DROP CONSTRAINT rate_materials_mapping_rate_id_fkey;
  END IF;
END $$;

-- 4. Создаём правильные foreign keys
ALTER TABLE public.rate_materials_mapping
ADD CONSTRAINT rate_materials_mapping_rate_id_fkey
FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE CASCADE;

ALTER TABLE public.rate_materials_mapping
ADD CONSTRAINT rate_materials_mapping_material_id_fkey
FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

-- 5. Проверяем результат
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'rate_materials_mapping';
