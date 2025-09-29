-- ================================================================
-- БЫСТРОЕ ИСПРАВЛЕНИЕ: Создание основных таблиц файлового хранилища
-- Выполните этот код в Supabase SQL Editor
-- ================================================================

-- 1. ВКЛЮЧЕНИЕ НЕОБХОДИМЫХ РАСШИРЕНИЙ
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. СОЗДАНИЕ ОСНОВНЫХ ТАБЛИЦ ФАЙЛОВОГО ХРАНИЛИЩА
-- ================================================================

-- Категории файлов
CREATE TABLE IF NOT EXISTS public.file_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL UNIQUE,
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
    category_id uuid REFERENCES public.file_categories(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}',
    
    -- Версионирование
    version integer DEFAULT 1,
    is_latest_version boolean DEFAULT true,
    parent_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
    
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

-- История версий файлов
CREATE TABLE IF NOT EXISTS public.file_versions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
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
    is_system_tag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_pkey PRIMARY KEY (id)
);

-- Связь файлов с тегами
CREATE TABLE IF NOT EXISTS public.file_tags_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.file_tags(id) ON DELETE CASCADE,
    tagged_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_tags_mapping_pkey PRIMARY KEY (id),
    CONSTRAINT file_tags_mapping_unique UNIQUE (file_id, tag_id)
);

-- Логи доступа к файлам
CREATE TABLE IF NOT EXISTS public.file_access_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
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

-- 3. ОСНОВНЫЕ ИНДЕКСЫ
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_files_category_id ON public.files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_is_active ON public.files(is_active);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_file_extension ON public.files(file_extension);
CREATE INDEX IF NOT EXISTS idx_files_tender_estimate_id ON public.files(tender_estimate_id);
CREATE INDEX IF NOT EXISTS idx_files_rate_id ON public.files(rate_id);
CREATE INDEX IF NOT EXISTS idx_files_material_id ON public.files(material_id);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON public.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_mapping_file_id ON public.file_tags_mapping(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_mapping_tag_id ON public.file_tags_mapping(tag_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON public.file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON public.file_access_logs(user_id);

-- 4. ОСНОВНЫЕ ТРИГГЕРЫ
-- ================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Применяем триггеры
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

-- 5. ОТКЛЮЧЕНИЕ RLS
-- ================================================================

ALTER TABLE public.file_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags_mapping DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_logs DISABLE ROW LEVEL SECURITY;

-- 6. НАЧАЛЬНЫЕ ДАННЫЕ
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

-- 7. КОММЕНТАРИИ К ТАБЛИЦАМ
-- ================================================================

COMMENT ON TABLE public.file_categories IS 'Категории файлов для организации и управления';
COMMENT ON TABLE public.files IS 'Основная таблица метаданных файлов с поддержкой Supabase Storage';
COMMENT ON TABLE public.file_versions IS 'История версий файлов с автоматическим созданием';
COMMENT ON TABLE public.file_tags IS 'Система тегов для маркировки и поиска файлов';
COMMENT ON TABLE public.file_tags_mapping IS 'Связь многие-ко-многим между файлами и тегами';
COMMENT ON TABLE public.file_access_logs IS 'Детальный аудит всех операций с файлами';

COMMENT ON COLUMN public.files.storage_bucket IS 'Название bucket в Supabase Storage';
COMMENT ON COLUMN public.files.supabase_object_id IS 'Уникальный ID объекта в Supabase Storage';
COMMENT ON COLUMN public.files.access_level IS 'Уровень доступа: public, internal, private, restricted';
COMMENT ON COLUMN public.files.metadata IS 'JSON метаданные (EXIF, свойства документа, пользовательские данные)';
COMMENT ON COLUMN public.files.file_hash IS 'SHA-256 хеш для проверки целостности и дедупликации';

-- 8. ПРОВЕРКА СОЗДАНИЯ ТАБЛИЦ
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
SELECT '✅ Основные таблицы файлового хранилища созданы успешно!' as status;