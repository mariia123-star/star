-- ПРОВЕРКА РЕЗУЛЬТАТОВ МИГРАЦИИ TENDER_ESTIMATES
-- Выполните эти запросы после выполнения основной миграции

-- Проверка 1: Структура таблицы (новые колонки)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
AND column_name IN (
    'material_type', 'coefficient', 'work_price', 
    'material_price', 'delivery_cost', 'record_type', 'project_id'
)
ORDER BY ordinal_position;

-- Проверка 2: Индексы
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tender_estimates'
AND indexname LIKE 'idx_tender_estimates_%';

-- Проверка 3: Ограничения (constraints)
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'tender_estimates'
AND tc.constraint_name = 'check_record_type';

-- Проверка 4: Функции и триггеры
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tender_estimates'
AND trigger_name = 'trigger_calculate_tender_estimate_total';

-- Проверка 5: Комментарии к колонкам
SELECT 
    c.column_name,
    pgd.description
FROM pg_class pc
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
JOIN pg_attribute pa ON pa.attrelid = pc.oid
JOIN information_schema.columns c ON c.column_name = pa.attname 
    AND c.table_name = pc.relname AND c.table_schema = pn.nspname
LEFT JOIN pg_description pgd ON pgd.objoid = pc.oid AND pgd.objsubid = pa.attnum
WHERE pn.nspname = 'public'
AND pc.relname = 'tender_estimates'
AND c.column_name IN (
    'material_type', 'coefficient', 'work_price', 
    'material_price', 'delivery_cost', 'record_type', 'project_id'
)
ORDER BY c.ordinal_position;

-- Проверка 6: Тестовые данные (если есть)
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN record_type = 'work' THEN 1 END) as work_records,
    COUNT(CASE WHEN record_type = 'material' THEN 1 END) as material_records,
    COUNT(CASE WHEN record_type = 'summary' THEN 1 END) as summary_records,
    COUNT(CASE WHEN record_type IS NULL THEN 1 END) as null_records
FROM public.tender_estimates;

-- Проверка 7: Статистика по новым полям
SELECT 
    'coefficient' as field_name,
    MIN(coefficient) as min_value,
    MAX(coefficient) as max_value,
    AVG(coefficient) as avg_value,
    COUNT(CASE WHEN coefficient IS NOT NULL THEN 1 END) as not_null_count
FROM public.tender_estimates
WHERE coefficient IS NOT NULL

UNION ALL

SELECT 
    'work_price' as field_name,
    MIN(work_price) as min_value,
    MAX(work_price) as max_value,
    AVG(work_price) as avg_value,
    COUNT(CASE WHEN work_price IS NOT NULL THEN 1 END) as not_null_count
FROM public.tender_estimates
WHERE work_price IS NOT NULL

UNION ALL

SELECT 
    'material_price' as field_name,
    MIN(material_price) as min_value,
    MAX(material_price) as max_value,
    AVG(material_price) as avg_value,
    COUNT(CASE WHEN material_price IS NOT NULL THEN 1 END) as not_null_count
FROM public.tender_estimates
WHERE material_price IS NOT NULL;