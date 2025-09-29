-- ПРОВЕРКА СТАТУСА МИГРАЦИИ TENDER_ESTIMATES
-- Скопируйте и выполните этот запрос в SQL Editor вашего Supabase проекта

-- 1. Проверяем все колонки таблицы tender_estimates
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
ORDER BY ordinal_position;

-- 2. Проверяем наличие новых колонок из миграции
SELECT 
    CASE 
        WHEN COUNT(*) = 7 THEN 'МИГРАЦИЯ ПРИМЕНЕНА: Все новые колонки присутствуют'
        ELSE 'МИГРАЦИЯ НЕ ПРИМЕНЕНА: Найдено только ' || COUNT(*) || ' из 7 новых колонок'
    END as migration_status,
    STRING_AGG(column_name, ', ') as found_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
AND column_name IN (
    'material_type', 'coefficient', 'work_price', 
    'material_price', 'delivery_cost', 'record_type', 'project_id'
);

-- 3. Если таблица существует, проверяем количество записей и их типы
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN record_type = 'work' THEN 1 END) as work_records,
    COUNT(CASE WHEN record_type = 'material' THEN 1 END) as material_records,
    COUNT(CASE WHEN record_type = 'summary' THEN 1 END) as summary_records,
    COUNT(CASE WHEN record_type IS NULL THEN 1 END) as null_records
FROM public.tender_estimates;

-- 4. Проверяем существование индексов
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tender_estimates'
AND indexname LIKE 'idx_tender_estimates_%';

-- 5. Проверяем триггеры
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tender_estimates'
AND trigger_name LIKE '%tender%';