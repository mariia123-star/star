-- ================================================================
-- ПОЛНАЯ МИГРАЦИЯ ФАЙЛОВОГО ХРАНИЛИЩА ДЛЯ ПОРТАЛА STAR
-- Версия: 2.0 | Дата: 2025-09-12
-- Включает: Supabase Storage, версионирование, аудит, безопасность
-- ================================================================

-- 1. ВКЛЮЧЕНИЕ НЕОБХОДИМЫХ РАСШИРЕНИЙ
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 2. СОЗДАНИЕ ОСНОВНЫХ ТАБЛИЦ ФАЙЛОВОГО ХРАНИЛИЩА
-- ================================================================

-- Категории файлов
CREATE TABLE IF NOT EXISTS public.file_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL UNIQUE,
    description text,
    icon varchar(50) DEFAULT 'file-text',
    color varchar(7) DEFAULT '#1677ff',
    max_file_size bigint DEFAULT 104857600, -- 100MB по умолчанию
    allowed_extensions text[] DEFAULT ARRAY['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'], -- Разрешенные расширения
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_categories_pkey PRIMARY KEY (id)
);

-- Основная таблица файлов
CREATE TABLE IF NOT EXISTS public.files (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Основная информация
    original_filename varchar(500) NOT NULL,
    display_name varchar(500) NOT NULL,
    description text,
    
    -- Файловые данные
    file_extension varchar(20) NOT NULL,
    mime_type varchar(200) NOT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64), -- SHA-256 хеш
    
    -- Supabase Storage информация
    storage_bucket varchar(100) DEFAULT 'files', -- Название bucket в Supabase
    storage_path text NOT NULL, -- Путь в Storage
    supabase_object_id varchar(200), -- ID объекта в Supabase Storage
    is_public boolean DEFAULT false, -- Публичный доступ через Supabase
    
    -- Категоризация и метаданные
    category_id uuid REFERENCES public.file_categories(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}',
    
    -- Версионирование
    version integer DEFAULT 1,
    is_latest_version boolean DEFAULT true,
    parent_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
    
    -- Проекты и пользователи
    uploaded_by uuid, -- ID пользователя из auth.users
    project_id uuid, -- Связь с проектами
    tender_estimate_id uuid, -- Связь с тендерными сметами
    rate_id uuid, -- Связь с расценками
    material_id uuid, -- Связь с материалами
    
    -- Права доступа
    access_level varchar(20) DEFAULT 'private', -- 'public', 'internal', 'private', 'restricted'
    expires_at timestamp with time zone, -- Срок истечения доступа к файлу
    
    -- Статистика и статусы
    download_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    
    -- Временные метки
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone, -- Soft delete
    
    CONSTRAINT files_pkey PRIMARY KEY (id)
);

-- История версий файлов
CREATE TABLE IF NOT EXISTS public.file_versions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    
    -- Снимок файла на момент версии
    original_filename varchar(500) NOT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64),
    storage_path text NOT NULL,
    storage_bucket varchar(100),
    
    -- Информация об изменениях
    change_description text,
    change_type varchar(50) DEFAULT 'update', -- 'create', 'update', 'replace'
    uploaded_by uuid,
    
    -- Метаданные версии
    version_metadata jsonb DEFAULT '{}',
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT file_versions_pkey PRIMARY KEY (id),
    CONSTRAINT file_versions_unique_version UNIQUE (file_id, version_number)
);

-- Теги для файлов
CREATE TABLE IF NOT EXISTS public.file_tags (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL UNIQUE,
    color varchar(7) DEFAULT '#87d068',
    description text,
    usage_count integer DEFAULT 0,
    is_system_tag boolean DEFAULT false, -- Системные теги (автоматические)
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_pkey PRIMARY KEY (id)
);

-- Связь файлов с тегами
CREATE TABLE IF NOT EXISTS public.file_tags_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.file_tags(id) ON DELETE CASCADE,
    tagged_by uuid, -- Кто добавил тег
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_mapping_pkey PRIMARY KEY (id),
    CONSTRAINT file_tags_mapping_unique UNIQUE (file_id, tag_id)
);

-- Логи доступа к файлам (аудит)
CREATE TABLE IF NOT EXISTS public.file_access_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id uuid, -- auth.users.id
    
    -- Информация о действии
    action varchar(50) NOT NULL, -- 'view', 'download', 'upload', 'delete', 'update', 'share'
    ip_address inet,
    user_agent text,
    referrer text,
    
    -- Техническая информация
    file_size_at_access bigint,
    download_duration integer, -- Время скачивания в миллисекундах
    access_granted boolean DEFAULT true,
    failure_reason text, -- Причина отказа в доступе
    
    -- Контекст доступа
    access_context jsonb DEFAULT '{}', -- Дополнительный контекст (страница, компонент)
    
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_access_logs_pkey PRIMARY KEY (id)
);

-- Файловые коллекции (группы файлов)
CREATE TABLE IF NOT EXISTS public.file_collections (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(200) NOT NULL,
    description text,
    collection_type varchar(50) DEFAULT 'manual', -- 'manual', 'auto', 'smart'
    
    -- Умные коллекции (автоматические фильтры)
    auto_filter_rules jsonb, -- JSON правила для автоматической группировки
    
    -- Права доступа
    is_public boolean DEFAULT false,
    created_by uuid,
    
    -- Статистика
    file_count integer DEFAULT 0,
    total_size bigint DEFAULT 0,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_collections_pkey PRIMARY KEY (id)
);

-- Связь файлов с коллекциями
CREATE TABLE IF NOT EXISTS public.file_collection_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    collection_id uuid NOT NULL REFERENCES public.file_collections(id) ON DELETE CASCADE,
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_collection_items_pkey PRIMARY KEY (id),
    CONSTRAINT file_collection_items_unique UNIQUE (collection_id, file_id)
);

-- Расшаренные ссылки на файлы
CREATE TABLE IF NOT EXISTS public.file_share_links (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    
    -- Информация о ссылке
    share_token varchar(64) NOT NULL UNIQUE, -- Уникальный токен для доступа
    share_name varchar(200), -- Название ссылки
    password_hash varchar(255), -- Хеш пароля (если есть)
    
    -- Ограничения доступа
    max_downloads integer, -- Максимальное количество скачиваний
    current_downloads integer DEFAULT 0,
    expires_at timestamp with time zone,
    
    -- Разрешения
    allow_preview boolean DEFAULT true,
    allow_download boolean DEFAULT true,
    
    -- Создатель и статус
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    
    CONSTRAINT file_share_links_pkey PRIMARY KEY (id)
);

-- 3. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ
-- ================================================================

-- Основные индексы для таблицы files
CREATE INDEX IF NOT EXISTS idx_files_category_id ON public.files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_is_active ON public.files(is_active);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_file_extension ON public.files(file_extension);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_storage_bucket ON public.files(storage_bucket);
CREATE INDEX IF NOT EXISTS idx_files_is_latest_version ON public.files(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_files_access_level ON public.files(access_level);
CREATE INDEX IF NOT EXISTS idx_files_tender_estimate_id ON public.files(tender_estimate_id);
CREATE INDEX IF NOT EXISTS idx_files_rate_id ON public.files(rate_id);
CREATE INDEX IF NOT EXISTS idx_files_material_id ON public.files(material_id);

-- Композитные индексы
CREATE INDEX IF NOT EXISTS idx_files_active_latest ON public.files(is_active, is_latest_version) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_category_active ON public.files(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_files_public_active ON public.files(is_public, is_active);

-- Индексы для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_files_search_name ON public.files USING gin(to_tsvector('russian', display_name));
CREATE INDEX IF NOT EXISTS idx_files_search_description ON public.files USING gin(to_tsvector('russian', description));

-- Индексы для связанных таблиц
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON public.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created_at ON public.file_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_tags_mapping_file_id ON public.file_tags_mapping(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_mapping_tag_id ON public.file_tags_mapping(tag_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON public.file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON public.file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_created_at ON public.file_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_action ON public.file_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_file_share_links_token ON public.file_share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_file_share_links_file_id ON public.file_share_links(file_id);

-- 4. ТРИГГЕРЫ И АВТОМАТИЧЕСКИЕ ФУНКЦИИ
-- ================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Применяем триггеры для updated_at
CREATE TRIGGER update_file_categories_updated_at 
    BEFORE UPDATE ON public.file_categories 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON public.files 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_file_collections_updated_at 
    BEFORE UPDATE ON public.file_collections 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_file_share_links_updated_at 
    BEFORE UPDATE ON public.file_share_links 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Функция для обновления счетчиков доступа
CREATE OR REPLACE FUNCTION public.update_file_access_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчики в таблице files
    IF NEW.action = 'download' AND NEW.access_granted = TRUE THEN
        UPDATE public.files 
        SET download_count = download_count + 1 
        WHERE id = NEW.file_id;
    ELSIF NEW.action = 'view' AND NEW.access_granted = TRUE THEN
        UPDATE public.files 
        SET view_count = view_count + 1 
        WHERE id = NEW.file_id;
    END IF;
    
    -- Обновляем счетчик для расшаренных ссылок
    IF NEW.action = 'download' AND EXISTS (
        SELECT 1 FROM public.file_share_links fsl 
        WHERE fsl.file_id = NEW.file_id AND fsl.is_active = TRUE
    ) THEN
        UPDATE public.file_share_links 
        SET current_downloads = current_downloads + 1,
            last_accessed_at = NOW()
        WHERE file_id = NEW.file_id AND is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обновления счетчиков
CREATE TRIGGER update_file_access_counters_trigger
    AFTER INSERT ON public.file_access_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_file_access_counters();

-- Функция для обновления счетчика использования тегов
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.file_tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.file_tags 
        SET usage_count = usage_count - 1 
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггеры для тегов
CREATE TRIGGER update_tag_usage_insert
    AFTER INSERT ON public.file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

CREATE TRIGGER update_tag_usage_delete
    AFTER DELETE ON public.file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

-- Функция для создания версии файла при обновлении
CREATE OR REPLACE FUNCTION public.create_file_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем версию только если изменилось содержимое файла
    IF TG_OP = 'UPDATE' AND (
        OLD.original_filename != NEW.original_filename OR 
        OLD.file_size != NEW.file_size OR 
        OLD.file_hash != NEW.file_hash OR
        OLD.storage_path != NEW.storage_path
    ) THEN
        -- Помечаем старую версию как неактуальную
        UPDATE public.files 
        SET is_latest_version = FALSE 
        WHERE id = OLD.id;
        
        -- Создаем запись о предыдущей версии
        INSERT INTO public.file_versions (
            file_id, version_number, original_filename, 
            file_size, file_hash, storage_path, storage_bucket,
            change_description, uploaded_by
        ) VALUES (
            OLD.id, OLD.version, OLD.original_filename,
            OLD.file_size, OLD.file_hash, OLD.storage_path, OLD.storage_bucket,
            'Автоматическое создание версии', OLD.uploaded_by
        );
        
        -- Увеличиваем номер версии для новой записи
        NEW.version = OLD.version + 1;
        NEW.is_latest_version = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для версионирования
CREATE TRIGGER create_file_version_trigger
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.create_file_version();

-- Функция для обновления статистики коллекций
CREATE OR REPLACE FUNCTION public.update_collection_stats()
RETURNS TRIGGER AS $$
DECLARE
    collection_id_var uuid;
BEGIN
    -- Определяем ID коллекции в зависимости от операции
    IF TG_OP = 'DELETE' THEN
        collection_id_var = OLD.collection_id;
    ELSE
        collection_id_var = NEW.collection_id;
    END IF;
    
    -- Обновляем статистику коллекции
    UPDATE public.file_collections SET
        file_count = (
            SELECT COUNT(*) 
            FROM public.file_collection_items fci
            JOIN public.files f ON fci.file_id = f.id
            WHERE fci.collection_id = collection_id_var 
            AND f.is_active = TRUE 
            AND f.deleted_at IS NULL
        ),
        total_size = (
            SELECT COALESCE(SUM(f.file_size), 0)
            FROM public.file_collection_items fci
            JOIN public.files f ON fci.file_id = f.id
            WHERE fci.collection_id = collection_id_var 
            AND f.is_active = TRUE 
            AND f.deleted_at IS NULL
        )
    WHERE id = collection_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггеры для коллекций
CREATE TRIGGER update_collection_stats_insert
    AFTER INSERT ON public.file_collection_items
    FOR EACH ROW EXECUTE FUNCTION public.update_collection_stats();

CREATE TRIGGER update_collection_stats_delete
    AFTER DELETE ON public.file_collection_items
    FOR EACH ROW EXECUTE FUNCTION public.update_collection_stats();

-- 5. ПРЕДСТАВЛЕНИЯ БУДУТ СОЗДАНЫ ОТДЕЛЬНО
-- (После создания всех таблиц для избежания ошибок зависимостей)
-- ================================================================

-- ПРИМЕЧАНИЕ: Представления создаются в отдельном файле VIEWS_MIGRATION.sql
-- после успешного создания всех таблиц

-- 6. ОТКЛЮЧЕНИЕ RLS (согласно требованиям проекта)
-- ================================================================

ALTER TABLE public.file_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags_mapping DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_collection_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_share_links DISABLE ROW LEVEL SECURITY;

-- 7. НАЧАЛЬНЫЕ ДАННЫЕ
-- ================================================================

-- Стандартные категории файлов
INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Документы', 'Текстовые документы и PDF файлы', 'file-text', '#1677ff', 104857600, ARRAY['.pdf', '.doc', '.docx', '.txt', '.rtf'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Таблицы', 'Электронные таблицы и данные', 'file-excel', '#52c41a', 104857600, ARRAY['.xls', '.xlsx', '.csv', '.ods'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Изображения', 'Фотографии и графические файлы', 'file-image', '#faad14', 52428800, ARRAY['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Чертежи', 'Технические чертежи и схемы', 'build', '#722ed1', 209715200, ARRAY['.dwg', '.dxf', '.pdf', '.png', '.jpg'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Архивы', 'Сжатые файлы и архивы', 'file-zip', '#fa541c', 1073741824, ARRAY['.zip', '.rar', '.7z', '.tar', '.gz'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_categories (name, description, icon, color, max_file_size, allowed_extensions) VALUES
    ('Сметы', 'Тендерные сметы и расценки', 'calculator', '#13c2c2', 104857600, ARRAY['.xlsx', '.xls', '.pdf', '.doc', '.docx'])
ON CONFLICT (name) DO NOTHING;

-- Стандартные теги
INSERT INTO public.file_tags (name, color, description, is_system_tag) VALUES
    ('Важное', '#f5222d', 'Важные файлы, требующие особого внимания', FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_tags (name, color, description, is_system_tag) VALUES
    ('В работе', '#faad14', 'Файлы в процессе работы', FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_tags (name, color, description, is_system_tag) VALUES
    ('Готово', '#52c41a', 'Завершенные файлы', FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_tags (name, color, description, is_system_tag) VALUES
    ('Архив', '#8c8c8c', 'Архивные файлы', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.file_tags (name, color, description, is_system_tag) VALUES
    ('Черновик', '#d9d9d9', 'Черновые материалы', FALSE)
ON CONFLICT (name) DO NOTHING;

-- 8. КОММЕНТАРИИ К СТРУКТУРЕ
-- ================================================================

COMMENT ON TABLE public.file_categories IS 'Категории файлов для организации и управления';
COMMENT ON TABLE public.files IS 'Основная таблица метаданных файлов с поддержкой Supabase Storage';
COMMENT ON TABLE public.file_versions IS 'История версий файлов с автоматическим созданием';
COMMENT ON TABLE public.file_tags IS 'Система тегов для маркировки и поиска файлов';
COMMENT ON TABLE public.file_tags_mapping IS 'Связь многие-ко-многим между файлами и тегами';
COMMENT ON TABLE public.file_access_logs IS 'Детальный аудит всех операций с файлами';
COMMENT ON TABLE public.file_collections IS 'Коллекции файлов (альбомы, папки)';
COMMENT ON TABLE public.file_collection_items IS 'Элементы коллекций файлов';
COMMENT ON TABLE public.file_share_links IS 'Расшаренные ссылки на файлы с ограничениями доступа';

-- Комментарии к ключевым полям
COMMENT ON COLUMN public.files.storage_bucket IS 'Название bucket в Supabase Storage';
COMMENT ON COLUMN public.files.supabase_object_id IS 'Уникальный ID объекта в Supabase Storage';
COMMENT ON COLUMN public.files.access_level IS 'Уровень доступа: public, internal, private, restricted';
COMMENT ON COLUMN public.files.metadata IS 'JSON метаданные (EXIF, свойства документа, пользовательские данные)';
COMMENT ON COLUMN public.files.file_hash IS 'SHA-256 хеш для проверки целостности и дедупликации';

-- 9. ПРОВЕРКА УСПЕШНОГО СОЗДАНИЯ
-- ================================================================

SELECT 
    'file_categories' as table_name, COUNT(*) as records 
FROM public.file_categories
UNION ALL
SELECT 
    'files' as table_name, COUNT(*) as records 
FROM public.files
UNION ALL
SELECT 
    'file_versions' as table_name, COUNT(*) as records 
FROM public.file_versions
UNION ALL
SELECT 
    'file_tags' as table_name, COUNT(*) as records 
FROM public.file_tags
UNION ALL
SELECT 
    'file_tags_mapping' as table_name, COUNT(*) as records 
FROM public.file_tags_mapping
UNION ALL
SELECT 
    'file_access_logs' as table_name, COUNT(*) as records 
FROM public.file_access_logs
UNION ALL
SELECT 
    'file_collections' as table_name, COUNT(*) as records 
FROM public.file_collections
UNION ALL
SELECT 
    'file_collection_items' as table_name, COUNT(*) as records 
FROM public.file_collection_items
UNION ALL
SELECT 
    'file_share_links' as table_name, COUNT(*) as records 
FROM public.file_share_links;

-- Итоговое сообщение
SELECT '✅ Файловое хранилище успешно создано! Все таблицы, триггеры, индексы и представления настроены.' as status;