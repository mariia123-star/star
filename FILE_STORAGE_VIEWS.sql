-- ================================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ ФАЙЛОВОГО ХРАНИЛИЩА
-- Создавать ПОСЛЕ успешного выполнения основной миграции
-- ================================================================

-- ВАЖНО: Выполняйте только после создания всех основных таблиц!

-- 1. ПРЕДСТАВЛЕНИЕ ФАЙЛОВ С ПОЛНОЙ ИНФОРМАЦИЕЙ
-- ================================================================

CREATE OR REPLACE VIEW public.v_files_detailed AS
SELECT 
    f.id,
    f.original_filename,
    f.display_name,
    f.description,
    f.file_extension,
    f.mime_type,
    f.file_size,
    f.file_hash,
    f.storage_bucket,
    f.storage_path,
    f.version,
    f.is_latest_version,
    f.is_public,
    f.access_level,
    f.download_count,
    f.view_count,
    f.uploaded_by,
    f.project_id,
    f.tender_estimate_id,
    f.rate_id,
    f.material_id,
    f.created_at,
    f.updated_at,
    
    -- Информация о категории
    fc.name as category_name,
    fc.icon as category_icon,
    fc.color as category_color,
    fc.max_file_size as category_max_size,
    
    -- Агрегированные теги
    COALESCE(
        string_agg(ft.name, ', ' ORDER BY ft.name), 
        ''
    ) as tags,
    
    -- Количество версий
    COALESCE(fv.version_count, 0) as total_versions,
    
    -- Последний доступ
    fal.last_access,
    fal.last_action,
    fal.last_user_id,
    
    -- Размер в человекочитаемом формате
    CASE 
        WHEN f.file_size >= 1073741824 THEN ROUND(f.file_size::numeric / 1073741824, 2) || ' GB'
        WHEN f.file_size >= 1048576 THEN ROUND(f.file_size::numeric / 1048576, 2) || ' MB'
        WHEN f.file_size >= 1024 THEN ROUND(f.file_size::numeric / 1024, 2) || ' KB'
        ELSE f.file_size || ' B'
    END as file_size_human
    
FROM public.files f
LEFT JOIN public.file_categories fc ON f.category_id = fc.id
LEFT JOIN public.file_tags_mapping ftm ON f.id = ftm.file_id
LEFT JOIN public.file_tags ft ON ftm.tag_id = ft.id
LEFT JOIN (
    SELECT 
        file_id, 
        COUNT(*) as version_count 
    FROM public.file_versions 
    GROUP BY file_id
) fv ON f.id = fv.file_id
LEFT JOIN (
    SELECT DISTINCT ON (file_id) 
        file_id, 
        created_at as last_access,
        action as last_action,
        user_id as last_user_id
    FROM public.file_access_logs 
    WHERE access_granted = TRUE
    ORDER BY file_id, created_at DESC
) fal ON f.id = fal.file_id

WHERE f.is_active = TRUE AND f.deleted_at IS NULL
GROUP BY 
    f.id, f.original_filename, f.display_name, f.description,
    f.file_extension, f.mime_type, f.file_size, f.file_hash,
    f.storage_bucket, f.storage_path, f.version, f.is_latest_version,
    f.is_public, f.access_level, f.download_count, f.view_count,
    f.uploaded_by, f.project_id, f.tender_estimate_id, f.rate_id, f.material_id,
    f.created_at, f.updated_at,
    fc.name, fc.icon, fc.color, fc.max_file_size,
    fv.version_count, fal.last_access, fal.last_action, fal.last_user_id;

-- 2. ПРЕДСТАВЛЕНИЕ СТАТИСТИКИ ФАЙЛОВ
-- ================================================================

CREATE OR REPLACE VIEW public.v_file_statistics AS
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN is_public = TRUE THEN 1 END) as public_files,
    COUNT(CASE WHEN is_public = FALSE THEN 1 END) as private_files,
    SUM(file_size) as total_size_bytes,
    AVG(file_size) as avg_size_bytes,
    MAX(file_size) as max_file_size,
    MIN(file_size) as min_file_size,
    SUM(download_count) as total_downloads,
    SUM(view_count) as total_views,
    COUNT(DISTINCT category_id) as categories_used,
    COUNT(DISTINCT uploaded_by) as unique_uploaders,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as files_today,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as files_this_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as files_this_month,
    
    -- Топ расширения
    (
        SELECT array_agg(file_extension ORDER BY cnt DESC) 
        FROM (
            SELECT file_extension, COUNT(*) as cnt 
            FROM public.files 
            WHERE is_active = TRUE AND deleted_at IS NULL 
            GROUP BY file_extension 
            ORDER BY cnt DESC 
            LIMIT 10
        ) top_ext
    ) as top_extensions
    
FROM public.files 
WHERE is_active = TRUE AND deleted_at IS NULL;

-- 3. ПРЕДСТАВЛЕНИЕ ПОПУЛЯРНЫХ ФАЙЛОВ
-- ================================================================

CREATE OR REPLACE VIEW public.v_popular_files AS
SELECT 
    f.id,
    f.display_name,
    f.file_extension,
    f.download_count,
    f.view_count,
    (f.download_count + f.view_count) as total_interactions,
    fc.name as category_name,
    f.created_at,
    f.file_size,
    RANK() OVER (ORDER BY (f.download_count + f.view_count) DESC) as popularity_rank
FROM public.files f
LEFT JOIN public.file_categories fc ON f.category_id = fc.id
WHERE f.is_active = TRUE AND f.deleted_at IS NULL
ORDER BY total_interactions DESC
LIMIT 50;

-- 4. ПРЕДСТАВЛЕНИЕ ИСПОЛЬЗОВАНИЯ STORAGE
-- ================================================================

CREATE OR REPLACE VIEW public.v_storage_usage AS
SELECT 
    f.storage_bucket,
    COUNT(*) as file_count,
    SUM(f.file_size) as total_size_bytes,
    ROUND(SUM(f.file_size::numeric) / 1048576, 2) as total_size_mb,
    ROUND(SUM(f.file_size::numeric) / 1073741824, 2) as total_size_gb,
    AVG(f.file_size) as avg_file_size,
    MAX(f.file_size) as max_file_size,
    MIN(f.created_at) as oldest_file,
    MAX(f.created_at) as newest_file
FROM public.files f 
WHERE f.is_active = true AND f.deleted_at IS NULL
GROUP BY f.storage_bucket
ORDER BY total_size_bytes DESC;

-- 5. ПРЕДСТАВЛЕНИЕ ДУБЛИКАТОВ ФАЙЛОВ
-- ================================================================

CREATE OR REPLACE VIEW public.v_duplicate_files AS
SELECT 
    f.file_hash,
    COUNT(*) as duplicate_count,
    array_agg(f.id) as file_ids,
    array_agg(f.display_name) as file_names,
    SUM(f.file_size) as total_wasted_bytes,
    f.file_size as file_size
FROM public.files f
WHERE f.is_active = true 
AND f.deleted_at IS NULL 
AND f.file_hash IS NOT NULL
GROUP BY f.file_hash, f.file_size
HAVING COUNT(*) > 1
ORDER BY total_wasted_bytes DESC;

-- 6. ПРЕДСТАВЛЕНИЕ ФАЙЛОВ ПО КАТЕГОРИЯМ
-- ================================================================

CREATE OR REPLACE VIEW public.v_files_by_category AS
SELECT 
    fc.id as category_id,
    fc.name as category_name,
    fc.icon as category_icon,
    fc.color as category_color,
    COUNT(f.id) as file_count,
    SUM(f.file_size) as total_size_bytes,
    ROUND(SUM(f.file_size::numeric) / 1048576, 2) as total_size_mb,
    AVG(f.file_size) as avg_file_size,
    MAX(f.created_at) as last_upload,
    SUM(f.download_count) as total_downloads,
    SUM(f.view_count) as total_views
FROM public.file_categories fc
LEFT JOIN public.files f ON fc.id = f.category_id AND f.is_active = TRUE AND f.deleted_at IS NULL
GROUP BY fc.id, fc.name, fc.icon, fc.color
ORDER BY file_count DESC;

-- 7. ПРЕДСТАВЛЕНИЕ АКТИВНОСТИ ПОЛЬЗОВАТЕЛЕЙ
-- ================================================================

CREATE OR REPLACE VIEW public.v_user_file_activity AS
SELECT 
    f.uploaded_by as user_id,
    COUNT(DISTINCT f.id) as files_uploaded,
    SUM(f.file_size) as total_size_uploaded,
    MIN(f.created_at) as first_upload,
    MAX(f.created_at) as last_upload,
    COUNT(DISTINCT f.category_id) as categories_used,
    SUM(f.download_count) as files_downloaded,
    
    -- Активность за периоды
    COUNT(CASE WHEN f.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as uploads_this_week,
    COUNT(CASE WHEN f.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as uploads_this_month,
    
    -- Популярность файлов пользователя
    ROUND(AVG(f.download_count + f.view_count), 2) as avg_file_popularity
    
FROM public.files f
WHERE f.is_active = TRUE AND f.deleted_at IS NULL AND f.uploaded_by IS NOT NULL
GROUP BY f.uploaded_by
ORDER BY files_uploaded DESC;

-- 8. ПРЕДСТАВЛЕНИЕ ПОСЛЕДНИХ АКТИВНОСТЕЙ
-- ================================================================

CREATE OR REPLACE VIEW public.v_recent_file_activities AS
SELECT 
    fal.id,
    fal.file_id,
    f.display_name as file_name,
    f.file_extension,
    fc.name as category_name,
    fc.icon as category_icon,
    fal.user_id,
    fal.action,
    fal.ip_address,
    fal.access_granted,
    fal.failure_reason,
    fal.created_at as activity_time,
    
    -- Контекст активности
    fal.access_context,
    
    -- Размер файла на момент доступа
    CASE 
        WHEN fal.file_size_at_access >= 1073741824 THEN ROUND(fal.file_size_at_access::numeric / 1073741824, 2) || ' GB'
        WHEN fal.file_size_at_access >= 1048576 THEN ROUND(fal.file_size_at_access::numeric / 1048576, 2) || ' MB'
        WHEN fal.file_size_at_access >= 1024 THEN ROUND(fal.file_size_at_access::numeric / 1024, 2) || ' KB'
        ELSE COALESCE(fal.file_size_at_access, 0) || ' B'
    END as file_size_human
    
FROM public.file_access_logs fal
JOIN public.files f ON fal.file_id = f.id
LEFT JOIN public.file_categories fc ON f.category_id = fc.id
ORDER BY fal.created_at DESC
LIMIT 1000;

-- Итоговое сообщение
SELECT '✅ Все представления для файлового хранилища созданы успешно!' as status;