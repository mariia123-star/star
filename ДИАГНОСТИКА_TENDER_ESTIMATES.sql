-- ПОЛНАЯ ДИАГНОСТИКА ТАБЛИЦЫ TENDER_ESTIMATES
-- Выполните этот SQL запрос в SQL Editor вашего Supabase проекта

-- =============================================================================
-- 1. ПРОВЕРКА СУЩЕСТВОВАНИЯ ТАБЛИЦЫ
-- =============================================================================
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tender_estimates' AND table_schema = 'public')
        THEN 'ТАБЛИЦА СУЩЕСТВУЕТ' 
        ELSE 'ТАБЛИЦА НЕ НАЙДЕНА' 
    END as table_status;

-- =============================================================================
-- 2. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ - ВСЕ КОЛОНКИ
-- =============================================================================
SELECT 
    ordinal_position,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('record_type', 'material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'project_id')
        THEN '🟢 НОВОЕ ПОЛЕ'
        ELSE '⚪ БАЗОВОЕ ПОЛЕ'
    END as field_category
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
ORDER BY ordinal_position;

-- =============================================================================
-- 3. ПРОВЕРКА СТАТУСА МИГРАЦИИ - НАЛИЧИЕ НОВЫХ ПОЛЕЙ
-- =============================================================================
SELECT 
    CASE 
        WHEN COUNT(*) = 7 THEN '✅ МИГРАЦИЯ ПРИМЕНЕНА: Все 7 новых полей найдены'
        WHEN COUNT(*) = 0 THEN '❌ МИГРАЦИЯ НЕ ПРИМЕНЕНА: Новые поля отсутствуют'
        ELSE '⚠️ МИГРАЦИЯ ЧАСТИЧНО ПРИМЕНЕНА: Найдено ' || COUNT(*) || ' из 7 полей'
    END as migration_status,
    STRING_AGG(column_name, ', ' ORDER BY column_name) as found_new_fields
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
AND column_name IN ('material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'record_type', 'project_id');

-- =============================================================================
-- 4. ОБЩАЯ СТАТИСТИКА ЗАПИСЕЙ
-- =============================================================================
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records
FROM public.tender_estimates;

-- =============================================================================
-- 5. АНАЛИЗ ПОЛЯ RECORD_TYPE (ЕСЛИ СУЩЕСТВУЕТ)
-- =============================================================================
-- Сначала проверим, существует ли колонка record_type
DO $$
DECLARE
    col_exists boolean := false;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tender_estimates' 
        AND column_name = 'record_type'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE '✅ Колонка record_type найдена, выполняем анализ...';
    ELSE
        RAISE NOTICE '❌ Колонка record_type НЕ НАЙДЕНА в таблице';
    END IF;
END
$$;

-- Если record_type существует, выполним группировку:
SELECT 
    'ГРУППИРОВКА ПО RECORD_TYPE' as analysis_type,
    COALESCE(record_type, 'NULL') as record_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.tender_estimates
GROUP BY record_type
ORDER BY COUNT(*) DESC;

-- =============================================================================
-- 6. АНАЛИЗ ЗАПОЛНЕННОСТИ НОВЫХ ПОЛЕЙ (ЕСЛИ СУЩЕСТВУЮТ)
-- =============================================================================
-- Этот запрос покажет процент заполненности новых полей
SELECT 
    'material_type' as field_name,
    COUNT(CASE WHEN material_type IS NOT NULL AND material_type != '' THEN 1 END) as filled_count,
    COUNT(*) as total_count,
    ROUND(COUNT(CASE WHEN material_type IS NOT NULL AND material_type != '' THEN 1 END) * 100.0 / COUNT(*), 2) as fill_percentage
FROM public.tender_estimates
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'material_type')

UNION ALL

SELECT 
    'coefficient' as field_name,
    COUNT(CASE WHEN coefficient IS NOT NULL AND coefficient != 0 THEN 1 END) as filled_count,
    COUNT(*) as total_count,
    ROUND(COUNT(CASE WHEN coefficient IS NOT NULL AND coefficient != 0 THEN 1 END) * 100.0 / COUNT(*), 2) as fill_percentage
FROM public.tender_estimates
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'coefficient')

UNION ALL

SELECT 
    'work_price' as field_name,
    COUNT(CASE WHEN work_price IS NOT NULL AND work_price != 0 THEN 1 END) as filled_count,
    COUNT(*) as total_count,
    ROUND(COUNT(CASE WHEN work_price IS NOT NULL AND work_price != 0 THEN 1 END) * 100.0 / COUNT(*), 2) as fill_percentage
FROM public.tender_estimates
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'work_price')

UNION ALL

SELECT 
    'material_price' as field_name,
    COUNT(CASE WHEN material_price IS NOT NULL AND material_price != 0 THEN 1 END) as filled_count,
    COUNT(*) as total_count,
    ROUND(COUNT(CASE WHEN material_price IS NOT NULL AND material_price != 0 THEN 1 END) * 100.0 / COUNT(*), 2) as fill_percentage
FROM public.tender_estimates
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'material_price')

UNION ALL

SELECT 
    'delivery_cost' as field_name,
    COUNT(CASE WHEN delivery_cost IS NOT NULL AND delivery_cost != 0 THEN 1 END) as filled_count,
    COUNT(*) as total_count,
    ROUND(COUNT(CASE WHEN delivery_cost IS NOT NULL AND delivery_cost != 0 THEN 1 END) * 100.0 / COUNT(*), 2) as fill_percentage
FROM public.tender_estimates
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'delivery_cost');

-- =============================================================================
-- 7. ПОСЛЕДНИЕ 10 ЗАПИСЕЙ ДЛЯ АНАЛИЗА
-- =============================================================================
SELECT 
    id,
    materials,
    works,
    quantity,
    unit_price,
    total_price,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tender_estimates' AND column_name = 'record_type')
         THEN record_type::text ELSE 'НЕТ ПОЛЯ' END as record_type,
    created_at,
    updated_at
FROM public.tender_estimates
ORDER BY created_at DESC
LIMIT 10;

-- =============================================================================
-- 8. ПРОВЕРКА ИНДЕКСОВ
-- =============================================================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tender_estimates'
AND schemaname = 'public'
ORDER BY indexname;

-- =============================================================================
-- 9. ПРОВЕРКА ТРИГГЕРОВ
-- =============================================================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tender_estimates'
AND event_object_schema = 'public'
ORDER BY trigger_name;

-- =============================================================================
-- 10. ПРОВЕРКА ОГРАНИЧЕНИЙ (CONSTRAINTS)
-- =============================================================================
SELECT 
    constraint_name,
    constraint_type,
    CASE 
        WHEN constraint_type = 'CHECK' THEN check_clause 
        ELSE 'N/A'
    END as constraint_definition
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'tender_estimates'
AND tc.table_schema = 'public'
ORDER BY constraint_type, constraint_name;

-- =============================================================================
-- ИТОГОВЫЙ ДИАГНОСТИЧЕСКИЙ ОТЧЕТ
-- =============================================================================
SELECT '=================== ИТОГОВЫЙ ОТЧЕТ ===================' as report;

-- Проверка состояния таблицы
SELECT 
    'СОСТОЯНИЕ ТАБЛИЦЫ' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active THEN 1 END) as active_records,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ ТАБЛИЦА ПУСТА'
        WHEN COUNT(*) < 10 THEN '⚠️ МАЛО ДАННЫХ (' || COUNT(*) || ' записей)'
        ELSE '✅ НОРМАЛЬНОЕ КОЛИЧЕСТВО ДАННЫХ (' || COUNT(*) || ' записей)'
    END as status
FROM public.tender_estimates;

-- Проверка миграции
SELECT 
    'СТАТУС МИГРАЦИИ' as check_type,
    COUNT(*) as new_fields_found,
    CASE 
        WHEN COUNT(*) = 7 THEN '✅ МИГРАЦИЯ ПОЛНОСТЬЮ ПРИМЕНЕНА'
        WHEN COUNT(*) = 0 THEN '❌ МИГРАЦИЯ НЕ ПРИМЕНЕНА'
        ELSE '⚠️ МИГРАЦИЯ ЧАСТИЧНО ПРИМЕНЕНА (' || COUNT(*) || ' из 7 полей)'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tender_estimates'
AND column_name IN ('material_type', 'coefficient', 'work_price', 'material_price', 'delivery_cost', 'record_type', 'project_id');

SELECT '======================================================' as report;