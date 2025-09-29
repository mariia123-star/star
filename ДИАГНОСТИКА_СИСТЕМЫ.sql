-- ДИАГНОСТИКА СИСТЕМЫ: Проверка готовности к загрузке сметы
-- Выполните этот скрипт в Supabase SQL Editor для диагностики

SELECT '=== ДИАГНОСТИКА ТЕНДЕРНОЙ СМЕТЫ ===' as status;

-- 1. Проверка существования таблицы
SELECT 
    'ТАБЛИЦА TENDER_ESTIMATES' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_estimates') 
        THEN '✅ Существует' 
        ELSE '❌ НЕ СУЩЕСТВУЕТ' 
    END as result;

-- 2. Проверка новых колонок после миграции
SELECT 
    'НОВЫЕ КОЛОНКИ' as check_name,
    string_agg(column_name, ', ') as existing_columns
FROM information_schema.columns 
WHERE table_name = 'tender_estimates' 
AND column_name IN ('record_type', 'material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'project_id');

-- 3. Подсчет ожидаемых колонок
SELECT 
    'СТАТУС МИГРАЦИИ' as check_name,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'tender_estimates' 
            AND column_name IN ('record_type', 'material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'project_id')
        ) = 7 
        THEN '✅ МИГРАЦИЯ ПРИМЕНЕНА (7/7 колонок)' 
        ELSE '❌ МИГРАЦИЯ НЕ ПРИМЕНЕНА (' || (
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'tender_estimates' 
            AND column_name IN ('record_type', 'material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'project_id')
        ) || '/7 колонок)' 
    END as result;

-- 4. Проверка индексов
SELECT 
    'ИНДЕКСЫ' as check_name,
    COUNT(*) as created_indexes
FROM pg_indexes 
WHERE tablename = 'tender_estimates' 
AND indexname LIKE 'idx_tender_estimates_%';

-- 5. Проверка ограничений
SELECT 
    'ОГРАНИЧЕНИЯ' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'tender_estimates' 
            AND constraint_name = 'check_record_type'
        ) 
        THEN '✅ check_record_type создан' 
        ELSE '❌ check_record_type НЕ СОЗДАН' 
    END as result;

-- 6. Проверка триггера
SELECT 
    'ТРИГГЕР' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = 'tender_estimates' 
            AND trigger_name = 'trigger_calculate_tender_estimate_total'
        ) 
        THEN '✅ Триггер создан' 
        ELSE '❌ Триггер НЕ СОЗДАН' 
    END as result;

-- 7. Проверка текущих данных
SELECT 
    'ТЕКУЩИЕ ДАННЫЕ' as check_name,
    COUNT(*) as total_records
FROM tender_estimates;

-- 8. Проверка типов записей (если есть данные)
SELECT 
    'ТИПЫ ЗАПИСЕЙ' as check_name,
    COALESCE(record_type, 'NULL') as record_type,
    COUNT(*) as count
FROM tender_estimates 
GROUP BY record_type;

-- 9. Проверка проектов (для связи)
SELECT 
    'ДОСТУПНЫЕ ПРОЕКТЫ' as check_name,
    COUNT(*) as project_count
FROM projects WHERE is_active = true;

-- 10. Проверка единиц измерения
SELECT 
    'ЕДИНИЦЫ ИЗМЕРЕНИЯ' as check_name,
    COUNT(*) as unit_count
FROM units WHERE is_active = true;

-- 11. Полная структура таблицы
SELECT 
    'СТРУКТУРА ТАБЛИЦЫ' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tender_estimates' 
ORDER BY ordinal_position;

-- ФИНАЛЬНАЯ ОЦЕНКА ГОТОВНОСТИ
SELECT 
    '=== ИТОГОВАЯ ГОТОВНОСТЬ СИСТЕМЫ ===' as final_check,
    CASE 
        WHEN (
            -- Проверка миграции
            (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tender_estimates' AND column_name IN ('record_type', 'material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'project_id')) = 7
            AND 
            -- Проверка триггера
            EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'tender_estimates' AND trigger_name = 'trigger_calculate_tender_estimate_total')
            AND 
            -- Проверка проектов
            (SELECT COUNT(*) FROM projects WHERE is_active = true) > 0
            AND 
            -- Проверка единиц
            (SELECT COUNT(*) FROM units WHERE is_active = true) > 0
        ) 
        THEN '🟢 СИСТЕМА ГОТОВА ДЛЯ ЗАГРУЗКИ СМЕТЫ' 
        ELSE '🔴 СИСТЕМА НЕ ГОТОВА - НУЖНЫ ИСПРАВЛЕНИЯ' 
    END as readiness_status;

SELECT '=== КОНЕЦ ДИАГНОСТИКИ ===' as status;