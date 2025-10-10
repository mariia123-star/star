-- Сброс кэша схемы в Supabase/PostgREST

-- 1. Убедимся, что foreign keys существуют
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
  AND tc.table_name = 'rate_materials_mapping'
  AND tc.table_schema = 'public';

-- 2. Отправить сигнал PostgREST для перезагрузки кэша схемы
-- Это работает если у вас есть доступ к функции reload
NOTIFY pgrst, 'reload schema';

-- 3. Альтернативный метод - изменить комментарий таблицы, что заставит PostgREST обновить кэш
COMMENT ON TABLE public.rate_materials_mapping IS 'Связь расценок с материалами - обновлено';

-- 4. Или можно временно изменить и вернуть название constraint
DO $$
BEGIN
  -- Переименовываем и возвращаем обратно, чтобы PostgREST заметил изменение
  ALTER TABLE public.rate_materials_mapping
  RENAME CONSTRAINT rate_materials_mapping_material_id_fkey
  TO rate_materials_mapping_material_id_fkey_temp;

  ALTER TABLE public.rate_materials_mapping
  RENAME CONSTRAINT rate_materials_mapping_material_id_fkey_temp
  TO rate_materials_mapping_material_id_fkey;
END $$;

-- 5. Проверим структуру через system catalog
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  a.attname AS column_name,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND conrelid = 'public.rate_materials_mapping'::regclass;
