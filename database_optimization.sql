-- ============================================
-- ОПТИМИЗАЦИЯ БАЗЫ ДАННЫХ ПОРТАЛА STAR
-- Цель: Поддержка импорта 5000 строк ≤ 30 сек, 100 пользователей
-- ============================================

-- ============================================
-- 1. НЕДОСТАЮЩИЕ ТАБЛИЦЫ ДЛЯ АРХИТЕКТУРЫ ПОРТАЛА
-- ============================================

-- Таблица проектов (referenced in API but missing)
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    description text,
    status varchar(50) DEFAULT 'active',
    start_date date,
    end_date date,
    budget numeric(15,2),
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.projects IS 'Проекты строительства';

-- Таблица блоков проекта
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    floor_count integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT blocks_pkey PRIMARY KEY (id),
    CONSTRAINT blocks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id)
);
COMMENT ON TABLE public.blocks IS 'Блоки/корпуса проектов';

-- Таблица категорий затрат
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(255) NOT NULL,
    code varchar(50) UNIQUE,
    description text,
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT cost_categories_pkey PRIMARY KEY (id),
    CONSTRAINT cost_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES cost_categories(id)
);
COMMENT ON TABLE public.cost_categories IS 'Категории затрат';

-- Таблица пользователей (extended profile)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL,
    email varchar(255) NOT NULL,
    first_name varchar(100),
    last_name varchar(100),
    role varchar(50) DEFAULT 'user',
    department varchar(100),
    is_active boolean DEFAULT true,
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.user_profiles IS 'Профили пользователей';

-- ============================================
-- 2. ИСПРАВЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ============================================

-- Исправление FK в tender_estimates (была некорректная ссылка)
ALTER TABLE tender_estimates DROP CONSTRAINT IF EXISTS tender_estimates_unit_id_fkey;
ALTER TABLE tender_estimates ADD CONSTRAINT tender_estimates_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES units(id);

-- Добавление отсутствующего поля project_id в tender_estimates
ALTER TABLE tender_estimates ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE tender_estimates ADD CONSTRAINT tender_estimates_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id);

-- Добавление дополнительных полей для лучшего анализа
ALTER TABLE tender_estimates ADD COLUMN IF NOT EXISTS cost_category_id uuid;
ALTER TABLE tender_estimates ADD CONSTRAINT tender_estimates_cost_category_id_fkey 
    FOREIGN KEY (cost_category_id) REFERENCES cost_categories(id);

ALTER TABLE tender_estimates ADD COLUMN IF NOT EXISTS block_id uuid;
ALTER TABLE tender_estimates ADD CONSTRAINT tender_estimates_block_id_fkey 
    FOREIGN KEY (block_id) REFERENCES blocks(id);

-- ============================================
-- 3. ОПТИМИЗИРОВАННЫЕ ИНДЕКСЫ
-- ============================================

-- Удаление дублирующихся индексов
DROP INDEX IF EXISTS idx_units_name;
DROP INDEX IF EXISTS idx_units_short_name;
-- Unique индексы units_name_key и units_short_name_key уже покрывают поиск

-- Составные индексы для частых запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tender_estimates_project_active 
    ON tender_estimates (project_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tender_estimates_search_text 
    ON tender_estimates USING gin (to_tsvector('russian', materials || ' ' || works)) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tender_estimates_price_range 
    ON tender_estimates (total_price DESC, created_at DESC) 
    WHERE is_active = true AND total_price > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tender_estimates_unit_category 
    ON tender_estimates (unit_id, cost_category_id, is_active) 
    WHERE is_active = true;

-- Индексы для быстрого импорта и массовых операций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tender_estimates_batch_insert 
    ON tender_estimates (created_at DESC, id) WHERE is_active = true;

-- Индексы для проектов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_active 
    ON projects (status, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_project_active 
    ON blocks (project_id, is_active) WHERE is_active = true;

-- Статистика для оптимизатора запросов
ANALYZE tender_estimates;
ANALYZE units;
ANALYZE projects;
ANALYZE blocks;

-- ============================================
-- 4. ОПТИМИЗИРОВАННЫЕ VIEWS
-- ============================================

-- Замена медленного VIEW на материализованное представление
DROP VIEW IF EXISTS v_tender_estimates;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tender_estimates AS
SELECT 
    te.id,
    te.project_id,
    p.name as project_name,
    te.block_id,
    b.name as block_name,
    te.materials,
    te.works,
    te.quantity,
    te.unit_id,
    u.name AS unit_name,
    u.short_name AS unit_short_name,
    te.unit_price,
    te.total_price,
    te.cost_category_id,
    cc.name as cost_category_name,
    te.notes,
    te.created_at,
    te.updated_at,
    -- Дополнительные вычисляемые поля для аналитики
    CASE 
        WHEN te.total_price > 0 AND te.quantity > 0 
        THEN te.total_price / te.quantity 
        ELSE 0 
    END as calculated_unit_price,
    to_tsvector('russian', te.materials || ' ' || te.works) as search_vector
FROM tender_estimates te
LEFT JOIN units u ON te.unit_id = u.id
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN blocks b ON te.block_id = b.id
LEFT JOIN cost_categories cc ON te.cost_category_id = cc.id
WHERE te.is_active = true;

-- Индексы на материализованное представление
CREATE INDEX idx_mv_tender_estimates_project ON mv_tender_estimates (project_id);
CREATE INDEX idx_mv_tender_estimates_search ON mv_tender_estimates USING gin (search_vector);
CREATE INDEX idx_mv_tender_estimates_price ON mv_tender_estimates (total_price DESC);
CREATE INDEX idx_mv_tender_estimates_created ON mv_tender_estimates (created_at DESC);

-- Функция обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_tender_estimates_mv()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tender_estimates;
    PERFORM pg_notify('mv_refreshed', 'tender_estimates');
END;
$function$;

-- Триггер для автоматического обновления материализованного представления
CREATE OR REPLACE FUNCTION trigger_refresh_tender_estimates_mv()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Асинхронное обновление через pg_notify для избежания блокировок
    PERFORM pg_notify('refresh_mv', 'tender_estimates');
    RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS refresh_mv_on_tender_estimates ON tender_estimates;
CREATE TRIGGER refresh_mv_on_tender_estimates
    AFTER INSERT OR UPDATE OR DELETE ON tender_estimates
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_tender_estimates_mv();

-- ============================================
-- 5. ОПТИМИЗАЦИЯ ФУНКЦИЙ
-- ============================================

-- Оптимизированная функция расчета стоимости
CREATE OR REPLACE FUNCTION calculate_total_price_optimized()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Быстрый расчет с проверкой на NULL
    NEW.total_price = COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 0);
    
    -- Обновление timestamp только если данные изменились
    IF TG_OP = 'UPDATE' AND (
        OLD.unit_price IS DISTINCT FROM NEW.unit_price OR
        OLD.quantity IS DISTINCT FROM NEW.quantity
    ) THEN
        NEW.updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Замена триггера на оптимизированную версию
DROP TRIGGER IF EXISTS calculate_tender_estimates_total ON tender_estimates;
CREATE TRIGGER calculate_tender_estimates_total_optimized 
    BEFORE INSERT OR UPDATE OF unit_price, quantity ON tender_estimates 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_total_price_optimized();

-- ============================================
-- 6. ПРОЦЕДУРЫ ДЛЯ МАССОВЫХ ОПЕРАЦИЙ
-- ============================================

-- Функция для массового импорта (batch insert)
CREATE OR REPLACE FUNCTION bulk_insert_tender_estimates(
    estimates jsonb[]
)
RETURNS TABLE(inserted_count integer, error_count integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    batch_size constant integer := 1000;
    inserted_cnt integer := 0;
    error_cnt integer := 0;
    batch_start integer := 1;
    batch_end integer;
    current_batch jsonb[];
BEGIN
    -- Обработка батчами для избежания блокировки таблицы
    WHILE batch_start <= array_length(estimates, 1) LOOP
        batch_end := LEAST(batch_start + batch_size - 1, array_length(estimates, 1));
        current_batch := estimates[batch_start:batch_end];
        
        BEGIN
            INSERT INTO tender_estimates (
                project_id, materials, works, quantity, 
                unit_id, unit_price, cost_category_id, block_id, notes
            )
            SELECT 
                (elem->>'project_id')::uuid,
                elem->>'materials',
                elem->>'works',
                (elem->>'quantity')::numeric,
                (elem->>'unit_id')::uuid,
                (elem->>'unit_price')::numeric,
                (elem->>'cost_category_id')::uuid,
                (elem->>'block_id')::uuid,
                elem->>'notes'
            FROM unnest(current_batch) as elem;
            
            inserted_cnt := inserted_cnt + (batch_end - batch_start + 1);
            
        EXCEPTION WHEN OTHERS THEN
            error_cnt := error_cnt + (batch_end - batch_start + 1);
            RAISE NOTICE 'Batch failed: %', SQLERRM;
        END;
        
        batch_start := batch_end + 1;
    END LOOP;
    
    -- Обновляем материализованное представление
    PERFORM refresh_tender_estimates_mv();
    
    RETURN QUERY SELECT inserted_cnt, error_cnt;
END;
$function$;

-- Функция для массового обновления статусов
CREATE OR REPLACE FUNCTION bulk_update_active_status(
    estimate_ids uuid[],
    new_status boolean
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    updated_count integer;
BEGIN
    UPDATE tender_estimates 
    SET is_active = new_status,
        updated_at = now()
    WHERE id = ANY(estimate_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Асинхронное обновление MV
    PERFORM pg_notify('refresh_mv', 'tender_estimates');
    
    RETURN updated_count;
END;
$function$;

-- ============================================
-- 7. ПАРТИЦИОНИРОВАНИЕ (ДЛЯ ОЧЕНЬ БОЛЬШИХ ОБЪЕМОВ)
-- ============================================

-- Если данных станет более 10 млн записей, можно включить партиционирование по датам
/*
-- Создание партиционированной таблицы (закомментировано, включать по необходимости)
CREATE TABLE tender_estimates_partitioned (
    LIKE tender_estimates INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (created_at);

-- Создание партиций по месяцам
CREATE TABLE tender_estimates_2024_01 PARTITION OF tender_estimates_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    
CREATE TABLE tender_estimates_2024_02 PARTITION OF tender_estimates_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... и так далее
*/

-- ============================================
-- 8. НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Настройки для оптимизации массовых операций
SET work_mem = '256MB';
SET maintenance_work_mem = '1GB';
SET effective_cache_size = '4GB';
SET random_page_cost = 1.1;
SET checkpoint_completion_target = 0.9;

-- Настройки подключений
SET max_connections = 200;
SET shared_buffers = '2GB';

-- ============================================
-- 9. МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Представление для анализа медленных запросов
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 10 
ORDER BY mean_time DESC;

-- Функция для анализа использования индексов
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    usage_ratio numeric
)
LANGUAGE sql
AS $function$
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE WHEN idx_scan > 0 
             THEN round(100.0 * idx_tup_fetch / idx_scan, 2) 
             ELSE 0 
        END as usage_ratio
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC, usage_ratio DESC;
$function$;

-- ============================================
-- 10. ФИНАЛЬНАЯ ВАЛИДАЦИЯ
-- ============================================

-- Добавление триггеров обновления updated_at для новых таблиц
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at 
    BEFORE UPDATE ON blocks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_categories_updated_at 
    BEFORE UPDATE ON cost_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Обновление статистик
ANALYZE;

-- Выводы по времени выполнения
SELECT 'Оптимизация базы данных завершена' as status,
       now() as completed_at;