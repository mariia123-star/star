-- ================================================================
-- БЕЗОПАСНАЯ МИГРАЦИЯ: Файловое хранилище без конфликтов
-- Использует существующие функции и создает только новые объекты
-- ================================================================

-- 1. ВКЛЮЧЕНИЕ НЕОБХОДИМЫХ РАСШИРЕНИЙ
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. БЕЗОПАСНОЕ УДАЛЕНИЕ ТОЛЬКО НОВЫХ ТРИГГЕРОВ
-- ================================================================
DROP TRIGGER IF EXISTS update_file_categories_updated_at ON public.file_categories;
DROP TRIGGER IF EXISTS update_files_updated_at ON public.files;
DROP TRIGGER IF EXISTS update_file_access_counters_trigger ON public.file_access_logs;
DROP TRIGGER IF EXISTS update_tag_usage_insert ON public.file_tags_mapping;
DROP TRIGGER IF EXISTS update_tag_usage_delete ON public.file_tags_mapping;
DROP TRIGGER IF EXISTS create_file_version_trigger ON public.files;

-- 3. УДАЛЯЕМ ТОЛЬКО НОВЫЕ ФУНКЦИИ (НЕ ТРОГАЕМ update_updated_at_column)
-- ================================================================
DROP FUNCTION IF EXISTS public.update_file_access_counters();
DROP FUNCTION IF EXISTS public.update_tag_usage_count();
DROP FUNCTION IF EXISTS public.create_file_version();

-- 4. СОЗДАНИЕ ОСНОВНЫХ ТАБЛИЦ ФАЙЛОВОГО ХРАНИЛИЩА
-- ================================================================

-- Категории файлов
CREATE TABLE IF NOT EXISTS public.file_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL,
    description text,
    icon varchar(50) DEFAULT 'file-text',
    color varchar(7) DEFAULT '#1677ff',
    max_file_size bigint DEFAULT 104857600,
    allowed_extensions text[] DEFAULT ARRAY['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_categories_pkey PRIMARY KEY (id)
);

-- Добавляем UNIQUE constraint только если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_categories' 
        AND constraint_name = 'file_categories_name_key'
    ) THEN
        ALTER TABLE public.file_categories ADD CONSTRAINT file_categories_name_key UNIQUE (name);
    END IF;
END $$;

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
    file_hash varchar(64),
    
    -- Supabase Storage информация
    storage_bucket varchar(100) DEFAULT 'files',
    storage_path text NOT NULL,
    supabase_object_id varchar(200),
    is_public boolean DEFAULT false,
    
    -- Категоризация и метаданные
    category_id uuid,
    metadata jsonb DEFAULT '{}',
    
    -- Версионирование
    version integer DEFAULT 1,
    is_latest_version boolean DEFAULT true,
    parent_file_id uuid,
    
    -- Проекты и пользователи
    uploaded_by uuid,
    project_id uuid,
    tender_estimate_id uuid,
    rate_id uuid,
    material_id uuid,
    
    -- Права доступа
    access_level varchar(20) DEFAULT 'private',
    expires_at timestamp with time zone,
    
    -- Статистика и статусы
    download_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    
    -- Временные метки
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    
    CONSTRAINT files_pkey PRIMARY KEY (id)
);

-- Добавляем внешние ключи только если их нет
DO $$
BEGIN
    -- Добавляем FK для category_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'files' 
        AND constraint_name = 'files_category_id_fkey'
    ) THEN
        ALTER TABLE public.files ADD CONSTRAINT files_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES public.file_categories(id) ON DELETE SET NULL;
    END IF;
    
    -- Добавляем FK для parent_file_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'files' 
        AND constraint_name = 'files_parent_file_id_fkey'
    ) THEN
        ALTER TABLE public.files ADD CONSTRAINT files_parent_file_id_fkey 
        FOREIGN KEY (parent_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
    END IF;
END $$;

-- История версий файлов
CREATE TABLE IF NOT EXISTS public.file_versions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL,
    version_number integer NOT NULL,
    
    original_filename varchar(500) NOT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64),
    storage_path text NOT NULL,
    storage_bucket varchar(100),
    
    change_description text,
    change_type varchar(50) DEFAULT 'update',
    uploaded_by uuid,
    
    version_metadata jsonb DEFAULT '{}',
    
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT file_versions_pkey PRIMARY KEY (id)
);

-- Добавляем FK и UNIQUE constraint для file_versions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_versions' 
        AND constraint_name = 'file_versions_file_id_fkey'
    ) THEN
        ALTER TABLE public.file_versions ADD CONSTRAINT file_versions_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_versions' 
        AND constraint_name = 'file_versions_unique_version'
    ) THEN
        ALTER TABLE public.file_versions ADD CONSTRAINT file_versions_unique_version 
        UNIQUE (file_id, version_number);
    END IF;
END $$;

-- Теги для файлов
CREATE TABLE IF NOT EXISTS public.file_tags (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL,
    color varchar(7) DEFAULT '#87d068',
    description text,
    usage_count integer DEFAULT 0,
    is_system_tag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_pkey PRIMARY KEY (id)
);

-- Добавляем UNIQUE constraint для file_tags
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_tags' 
        AND constraint_name = 'file_tags_name_key'
    ) THEN
        ALTER TABLE public.file_tags ADD CONSTRAINT file_tags_name_key UNIQUE (name);
    END IF;
END $$;

-- Связь файлов с тегами
CREATE TABLE IF NOT EXISTS public.file_tags_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    tagged_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_mapping_pkey PRIMARY KEY (id)
);

-- Добавляем FK и UNIQUE constraint для file_tags_mapping
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_tags_mapping' 
        AND constraint_name = 'file_tags_mapping_file_id_fkey'
    ) THEN
        ALTER TABLE public.file_tags_mapping ADD CONSTRAINT file_tags_mapping_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_tags_mapping' 
        AND constraint_name = 'file_tags_mapping_tag_id_fkey'
    ) THEN
        ALTER TABLE public.file_tags_mapping ADD CONSTRAINT file_tags_mapping_tag_id_fkey 
        FOREIGN KEY (tag_id) REFERENCES public.file_tags(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_tags_mapping' 
        AND constraint_name = 'file_tags_mapping_unique'
    ) THEN
        ALTER TABLE public.file_tags_mapping ADD CONSTRAINT file_tags_mapping_unique 
        UNIQUE (file_id, tag_id);
    END IF;
END $$;

-- Логи доступа к файлам
CREATE TABLE IF NOT EXISTS public.file_access_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL,
    user_id uuid,
    
    action varchar(50) NOT NULL,
    ip_address inet,
    user_agent text,
    referrer text,
    
    file_size_at_access bigint,
    download_duration integer,
    access_granted boolean DEFAULT true,
    failure_reason text,
    
    access_context jsonb DEFAULT '{}',
    
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_access_logs_pkey PRIMARY KEY (id)
);

-- Добавляем FK для file_access_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'file_access_logs' 
        AND constraint_name = 'file_access_logs_file_id_fkey'
    ) THEN
        ALTER TABLE public.file_access_logs ADD CONSTRAINT file_access_logs_file_id_fkey 
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. СОЗДАНИЕ ИНДЕКСОВ (только если их нет)
-- ================================================================

-- Функция для безопасного создания индексов
CREATE OR REPLACE FUNCTION create_index_if_not_exists(index_name text, table_name text, columns text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = index_name) THEN
        EXECUTE format('CREATE INDEX %I ON %s (%s)', index_name, table_name, columns);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Создаем индексы
SELECT create_index_if_not_exists('idx_files_category_id', 'public.files', 'category_id');
SELECT create_index_if_not_exists('idx_files_uploaded_by', 'public.files', 'uploaded_by');
SELECT create_index_if_not_exists('idx_files_project_id', 'public.files', 'project_id');
SELECT create_index_if_not_exists('idx_files_is_active', 'public.files', 'is_active');
SELECT create_index_if_not_exists('idx_files_created_at', 'public.files', 'created_at DESC');
SELECT create_index_if_not_exists('idx_files_file_extension', 'public.files', 'file_extension');
SELECT create_index_if_not_exists('idx_files_tender_estimate_id', 'public.files', 'tender_estimate_id');
SELECT create_index_if_not_exists('idx_files_rate_id', 'public.files', 'rate_id');
SELECT create_index_if_not_exists('idx_files_material_id', 'public.files', 'material_id');

SELECT create_index_if_not_exists('idx_file_versions_file_id', 'public.file_versions', 'file_id');
SELECT create_index_if_not_exists('idx_file_tags_mapping_file_id', 'public.file_tags_mapping', 'file_id');
SELECT create_index_if_not_exists('idx_file_tags_mapping_tag_id', 'public.file_tags_mapping', 'tag_id');
SELECT create_index_if_not_exists('idx_file_access_logs_file_id', 'public.file_access_logs', 'file_id');
SELECT create_index_if_not_exists('idx_file_access_logs_user_id', 'public.file_access_logs', 'user_id');

-- Удаляем вспомогательную функцию
DROP FUNCTION create_index_if_not_exists(text, text, text);

-- 6. СОЗДАНИЕ НОВЫХ ФУНКЦИЙ И ТРИГГЕРОВ
-- ================================================================

-- НЕ СОЗДАЕМ update_updated_at_column() - она уже существует!

-- Создаем триггеры для updated_at с использованием СУЩЕСТВУЮЩЕЙ функции
CREATE TRIGGER update_file_categories_updated_at 
    BEFORE UPDATE ON public.file_categories 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON public.files 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Функция для счетчиков доступа
CREATE OR REPLACE FUNCTION public.update_file_access_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'download' AND NEW.access_granted = TRUE THEN
        UPDATE public.files 
        SET download_count = download_count + 1 
        WHERE id = NEW.file_id;
    ELSIF NEW.action = 'view' AND NEW.access_granted = TRUE THEN
        UPDATE public.files 
        SET view_count = view_count + 1 
        WHERE id = NEW.file_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_file_access_counters_trigger
    AFTER INSERT ON public.file_access_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_file_access_counters();

-- Функция для счетчиков тегов
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

CREATE TRIGGER update_tag_usage_insert
    AFTER INSERT ON public.file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

CREATE TRIGGER update_tag_usage_delete
    AFTER DELETE ON public.file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

-- 7. ОТКЛЮЧЕНИЕ RLS
-- ================================================================

ALTER TABLE public.file_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags_mapping DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_logs DISABLE ROW LEVEL SECURITY;

-- 8. ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
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

-- 9. КОММЕНТАРИИ К СТРУКТУРЕ
-- ================================================================

COMMENT ON TABLE public.file_categories IS 'Категории файлов для организации и управления';
COMMENT ON TABLE public.files IS 'Основная таблица метаданных файлов с поддержкой Supabase Storage';
COMMENT ON TABLE public.file_versions IS 'История версий файлов с автоматическим созданием';
COMMENT ON TABLE public.file_tags IS 'Система тегов для маркировки и поиска файлов';
COMMENT ON TABLE public.file_tags_mapping IS 'Связь многие-ко-многим между файлами и тегами';
COMMENT ON TABLE public.file_access_logs IS 'Детальный аудит всех операций с файлами';

-- 10. ПРОВЕРКА СОЗДАНИЯ ТАБЛИЦ
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
FROM public.file_access_logs;

-- Итоговое сообщение
SELECT '✅ Файловое хранилище успешно создано! Использованы существующие функции, избежаны конфликты зависимостей.' as status;