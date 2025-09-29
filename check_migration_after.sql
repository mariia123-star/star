-- ПРОВЕРКА РЕЗУЛЬТАТОВ МИГРАЦИИ
-- Выполните этот скрипт после применения миграции

-- Проверка 1: Новые колонки
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
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
    constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.table_name = 'tender_estimates'
AND tc.constraint_name = 'check_record_type';

-- Проверка 4: Функция и триггер
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tender_estimates'
AND trigger_name = 'trigger_calculate_tender_estimate_total';

-- Проверка 5: Данные по типам записей
SELECT 
    record_type,
    COUNT(*) as count
FROM public.tender_estimates 
GROUP BY record_type;

-- Проверка 6: Общая статистика таблицы
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN record_type = 'work' THEN 1 END) as work_records,
    COUNT(CASE WHEN record_type = 'material' THEN 1 END) as material_records,
    COUNT(CASE WHEN record_type = 'summary' THEN 1 END) as summary_records,
    COUNT(CASE WHEN record_type IS NULL THEN 1 END) as null_records
FROM public.tender_estimates;

SELECT 'ПРОВЕРКА ЗАВЕРШЕНА. Если все данные отображаются, миграция применена успешно!' as check_status;