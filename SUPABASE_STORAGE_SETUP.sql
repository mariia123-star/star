-- ================================================================
-- НАСТРОЙКА SUPABASE STORAGE ДЛЯ ПОРТАЛА STAR
-- Создание бакетов, политик безопасности и настройка хранилища
-- ================================================================

-- 1. СОЗДАНИЕ STORAGE BUCKETS
-- ================================================================

-- Основной бакет для файлов портала
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'files', 
    'files',
    false, -- Приватный бакет по умолчанию
    104857600, -- 100MB лимит на файл
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Бакет для публичных файлов (аватары, логотипы и т.д.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'public-files',
    'public-files', 
    true, -- Публичный бакет
    10485760, -- 10MB лимит
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Бакет для архивов и больших файлов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'archives',
    'archives',
    false,
    1073741824, -- 1GB лимит
    ARRAY[
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Бакет для временных файлов (загрузка в процессе)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'temp-uploads',
    'temp-uploads',
    false,
    209715200, -- 200MB лимит
    ARRAY['*/*'] -- Любые типы файлов временно
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. СОЗДАНИЕ ПОЛИТИК БЕЗОПАСНОСТИ (RLS POLICIES) ДЛЯ STORAGE
-- ================================================================

-- ВАЖНО: Согласно требованиям проекта RLS отключен, но для Storage политики могут быть полезны

-- Политики для бакета 'files'
-- Пользователи могут загружать файлы в свои папки
CREATE POLICY "Users can upload files to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'files' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Пользователи могут просматривать свои файлы
CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'files' AND 
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Администраторы могут управлять всеми файлами
CREATE POLICY "Admins can manage all files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'files' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Политики для публичных файлов - всем доступ на чтение
CREATE POLICY "Public files are viewable by everyone" ON storage.objects
    FOR SELECT USING (bucket_id = 'public-files');

-- Только авторизованные пользователи могут загружать публичные файлы
CREATE POLICY "Authenticated users can upload public files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'public-files' AND 
        auth.role() = 'authenticated'
    );

-- Политики для архивов - только для авторизованных пользователей
CREATE POLICY "Authenticated users can manage archives" ON storage.objects
    FOR ALL USING (
        bucket_id = 'archives' AND 
        auth.role() = 'authenticated'
    );

-- Временные файлы доступны только их создателю
CREATE POLICY "Users can manage own temp files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'temp-uploads' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 3. ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ
-- ================================================================

-- Функция для генерации уникального пути файла
CREATE OR REPLACE FUNCTION public.generate_file_path(
    user_id uuid,
    category varchar DEFAULT 'general',
    original_filename varchar DEFAULT 'file'
)
RETURNS text AS $$
DECLARE
    file_extension varchar;
    clean_filename varchar;
    timestamp_part varchar;
    random_part varchar;
BEGIN
    -- Извлекаем расширение файла
    file_extension := LOWER(substring(original_filename from '\.([^.]*)$'));
    IF file_extension IS NULL THEN
        file_extension := '';
    ELSE
        file_extension := '.' || file_extension;
    END IF;
    
    -- Очищаем имя файла от спецсимволов
    clean_filename := regexp_replace(
        substring(original_filename from '^(.+)\.'), 
        '[^a-zA-Z0-9а-яА-Я_-]', 
        '_', 
        'g'
    );
    
    -- Генерируем временную метку
    timestamp_part := to_char(NOW(), 'YYYYMMDD_HH24MISS');
    
    -- Генерируем случайную часть
    random_part := substring(gen_random_uuid()::text from 1 for 8);
    
    -- Формируем итоговый путь
    RETURN user_id::text || '/' || 
           category || '/' || 
           timestamp_part || '_' || 
           random_part || '_' || 
           clean_filename || 
           file_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения URL файла из Storage
CREATE OR REPLACE FUNCTION public.get_file_url(
    bucket_name varchar,
    file_path varchar,
    expires_in integer DEFAULT 3600 -- 1 час по умолчанию
)
RETURNS text AS $$
BEGIN
    -- Для публичных файлов возвращаем публичный URL
    IF bucket_name = 'public-files' THEN
        RETURN 'https://' || 
               current_setting('app.supabase_project_id') || 
               '.supabase.co/storage/v1/object/public/' || 
               bucket_name || '/' || file_path;
    END IF;
    
    -- Для приватных файлов генерируем подписанный URL
    -- (это упрощенная версия, в реальности нужно использовать Supabase JavaScript SDK)
    RETURN 'https://' || 
           current_setting('app.supabase_project_id') || 
           '.supabase.co/storage/v1/object/sign/' || 
           bucket_name || '/' || file_path || 
           '?expires=' || expires_in::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для безопасного удаления файла
CREATE OR REPLACE FUNCTION public.safe_delete_file(file_id uuid)
RETURNS boolean AS $$
DECLARE
    file_record record;
    success boolean := false;
BEGIN
    -- Получаем информацию о файле
    SELECT * INTO file_record 
    FROM public.files 
    WHERE id = file_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    BEGIN
        -- Помечаем файл как удаленный (soft delete)
        UPDATE public.files 
        SET 
            is_active = false,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = file_id;
        
        -- Логируем удаление
        INSERT INTO public.file_access_logs (
            file_id, 
            user_id, 
            action, 
            access_granted,
            created_at
        ) VALUES (
            file_id,
            auth.uid(),
            'delete',
            true,
            NOW()
        );
        
        -- Удаляем связи с тегами
        DELETE FROM public.file_tags_mapping WHERE file_id = file_id;
        
        -- Удаляем из коллекций
        DELETE FROM public.file_collection_items WHERE file_id = file_id;
        
        -- Деактивируем расшаренные ссылки
        UPDATE public.file_share_links 
        SET is_active = false 
        WHERE file_id = file_id;
        
        success := true;
        
    EXCEPTION WHEN OTHERS THEN
        -- В случае ошибки логируем неуспешную попытку
        INSERT INTO public.file_access_logs (
            file_id, 
            user_id, 
            action, 
            access_granted,
            failure_reason,
            created_at
        ) VALUES (
            file_id,
            auth.uid(),
            'delete',
            false,
            SQLERRM,
            NOW()
        );
        
        success := false;
    END;
    
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для создания расшаренной ссылки
CREATE OR REPLACE FUNCTION public.create_share_link(
    file_id uuid,
    share_name varchar DEFAULT NULL,
    expires_hours integer DEFAULT 24,
    max_downloads integer DEFAULT NULL,
    password varchar DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    share_id uuid;
    share_token varchar(64);
    password_hash varchar(255) := NULL;
BEGIN
    -- Проверяем существование файла
    IF NOT EXISTS (
        SELECT 1 FROM public.files 
        WHERE id = file_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Файл не найден или неактивен';
    END IF;
    
    -- Генерируем уникальный токен
    share_token := encode(gen_random_bytes(32), 'base64');
    share_token := replace(replace(replace(share_token, '+', '-'), '/', '_'), '=', '');
    
    -- Хешируем пароль если указан
    IF password IS NOT NULL THEN
        password_hash := crypt(password, gen_salt('bf'));
    END IF;
    
    -- Создаем ссылку
    INSERT INTO public.file_share_links (
        file_id,
        share_token,
        share_name,
        password_hash,
        max_downloads,
        expires_at,
        created_by,
        is_active
    ) VALUES (
        file_id,
        share_token,
        COALESCE(share_name, 'Расшаренная ссылка'),
        password_hash,
        max_downloads,
        CASE 
            WHEN expires_hours > 0 THEN NOW() + (expires_hours || ' hours')::interval
            ELSE NULL
        END,
        auth.uid(),
        true
    ) RETURNING id INTO share_id;
    
    -- Логируем создание ссылки
    INSERT INTO public.file_access_logs (
        file_id, 
        user_id, 
        action, 
        access_granted,
        access_context
    ) VALUES (
        file_id,
        auth.uid(),
        'share',
        true,
        jsonb_build_object(
            'share_id', share_id,
            'expires_hours', expires_hours,
            'max_downloads', max_downloads,
            'password_protected', password IS NOT NULL
        )
    );
    
    RETURN share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОЙ ОЧИСТКИ
-- ================================================================

-- Функция для очистки истекших расшаренных ссылок
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS integer AS $$
DECLARE
    cleaned_count integer;
BEGIN
    -- Деактивируем истекшие ссылки
    UPDATE public.file_share_links 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Деактивируем ссылки с исчерпанными скачиваниями
    UPDATE public.file_share_links 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND max_downloads IS NOT NULL 
    AND current_downloads >= max_downloads;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для очистки старых логов доступа (хранить только последние 3 месяца)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_logs()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.file_access_logs 
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ АДМИНИСТРИРОВАНИЯ
-- ================================================================

-- Запрос для мониторинга использования Storage
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

-- Запрос для поиска дублирующихся файлов по хешу
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

-- 6. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ================================================================

/*
-- Создание файла с автоматической генерацией пути:
INSERT INTO public.files (
    original_filename,
    display_name,
    description,
    file_extension,
    mime_type,
    file_size,
    file_hash,
    storage_bucket,
    storage_path,
    category_id,
    uploaded_by
) VALUES (
    'contract.pdf',
    'Договор поставки материалов',
    'Основной договор с поставщиком',
    '.pdf',
    'application/pdf',
    1024000,
    'sha256-hash-here',
    'files',
    public.generate_file_path(auth.uid(), 'contracts', 'contract.pdf'),
    (SELECT id FROM public.file_categories WHERE name = 'Документы' LIMIT 1),
    auth.uid()
);

-- Создание расшаренной ссылки:
SELECT public.create_share_link(
    'file-uuid-here',
    'Договор для ознакомления',
    72, -- истекает через 72 часа
    5,  -- максимум 5 скачиваний
    'password123' -- с паролем
);

-- Получение URL файла:
SELECT public.get_file_url('files', 'user-id/contracts/20250912_contract.pdf');

-- Безопасное удаление файла:
SELECT public.safe_delete_file('file-uuid-here');
*/

-- Итоговое сообщение
SELECT '✅ Supabase Storage настроен успешно! Созданы бакеты, политики безопасности и вспомогательные функции.' as status;